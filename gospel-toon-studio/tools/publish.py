"""Publisher: upload final.mp4 to TikTok, YouTube and Instagram.

Dry run (default):  python tools/publish.py episodes/<slug> --platforms tiktok,youtube,instagram
Really post:        python tools/publish.py episodes/<slug> --platforms tiktok,youtube,instagram --publish
Schedule:           --schedule 2026-11-20T18:00:00-05:00   (YouTube + TikTok)
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import time
import urllib.parse
import urllib.request
from pathlib import Path

from common import STUDIO, episode_dir, load_env, read_json, write_json

GRAPH = "https://graph.facebook.com/v21.0"


def caption_for(meta: dict, platform: str) -> dict:
    custom = meta.get("platforms", {}).get(platform, {})
    tags = " ".join(meta.get("hashtags", []))
    refs = " · ".join(meta.get("references", []))
    title = custom.get("title") or meta.get("title", "")
    desc = custom.get("description") or meta.get("description", "")
    if platform == "tiktok":
        text = custom.get("caption") or f"{title}\n{refs}\n{tags}".strip()
        return {"caption": text[:2200]}
    if platform == "youtube":
        yt = meta.get("youtube", {})
        body = f"{desc}\n\n{refs}\n\n{tags} #Shorts".strip()
        return {"title": title[:100], "description": body[:5000], "tags": yt.get("tags", []),
                "category_id": yt.get("category_id", "27"), "made_for_kids": yt.get("made_for_kids", False)}
    text = custom.get("caption") or f"{title}\n\n{refs}\n\n{tags}".strip()
    return {"caption": text[:2200]}


# ---------------------------------------------------------------- TikTok
def post_tiktok(video: Path, c: dict, schedule: dt.datetime | None) -> dict:
    from tiktok_uploader.upload import upload_video

    cookies = os.environ.get("TIKTOK_COOKIES")
    if not cookies or not Path(cookies).exists():
        raise RuntimeError("TIKTOK_COOKIES must point to a cookies.txt exported from a logged-in browser")
    failed = upload_video(str(video), description=c["caption"], cookies=cookies, schedule=schedule,
                          headless=os.environ.get("TIKTOK_HEADLESS", "0") == "1")
    if failed:
        raise RuntimeError("tiktok-uploader reported the upload failed (cookies expired?)")
    return {"status": "uploaded"}


# ---------------------------------------------------------------- YouTube
def post_youtube(video: Path, c: dict, schedule: dt.datetime | None) -> dict:
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload

    scopes = ["https://www.googleapis.com/auth/youtube.upload"]
    token = Path(os.environ.get("YOUTUBE_TOKEN", STUDIO / "secrets" / "youtube_token.json"))
    creds = Credentials.from_authorized_user_file(str(token), scopes) if token.exists() else None
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    if not creds or not creds.valid:
        secrets = os.environ.get("YOUTUBE_CLIENT_SECRETS")
        if not secrets or not Path(secrets).exists():
            raise RuntimeError("YOUTUBE_CLIENT_SECRETS must point to your OAuth client JSON")
        creds = InstalledAppFlow.from_client_secrets_file(secrets, scopes).run_local_server(port=0)
        token.parent.mkdir(parents=True, exist_ok=True)
        token.write_text(creds.to_json(), encoding="utf-8")

    status = {"privacyStatus": "public", "selfDeclaredMadeForKids": c["made_for_kids"]}
    if schedule:
        status.update(privacyStatus="private", publishAt=schedule.astimezone(dt.timezone.utc).isoformat())
    body = {"snippet": {"title": c["title"], "description": c["description"], "tags": c["tags"],
                        "categoryId": c["category_id"]}, "status": status}
    yt = build("youtube", "v3", credentials=creds)
    req = yt.videos().insert(part="snippet,status", body=body,
                             media_body=MediaFileUpload(str(video), chunksize=-1, resumable=True))
    resp = None
    while resp is None:
        _, resp = req.next_chunk()
    return {"status": "uploaded", "id": resp["id"], "url": f"https://youtube.com/shorts/{resp['id']}"}


# ---------------------------------------------------------------- Instagram
def _graph(method: str, url: str, params: dict | None = None, headers: dict | None = None, data: bytes | None = None):
    if params:
        url += ("&" if "?" in url else "?") + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, method=method, data=data, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Instagram API {e.code}: {e.read().decode()[:500]}") from None


def post_instagram(video: Path, c: dict, schedule: dt.datetime | None) -> dict:
    user, token = os.environ.get("IG_USER_ID"), os.environ.get("IG_ACCESS_TOKEN")
    if not user or not token:
        raise RuntimeError("IG_USER_ID and IG_ACCESS_TOKEN are required")
    if schedule:
        print("instagram: the Graph API cannot schedule Reels; posting now")
    container = _graph("POST", f"{GRAPH}/{user}/media", {
        "media_type": "REELS", "upload_type": "resumable", "caption": c["caption"],
        "share_to_feed": "true", "access_token": token})
    cid = container["id"]
    data = video.read_bytes()
    _graph("POST", container.get("uri") or f"https://rupload.facebook.com/ig-api-upload/v21.0/{cid}",
           headers={"Authorization": f"OAuth {token}", "offset": "0", "file_size": str(len(data))}, data=data)
    for _ in range(60):  # wait for processing (up to ~5 min)
        st = _graph("GET", f"{GRAPH}/{cid}", {"fields": "status_code,status", "access_token": token})
        if st.get("status_code") == "FINISHED":
            break
        if st.get("status_code") == "ERROR":
            raise RuntimeError(f"Instagram processing error: {st.get('status')}")
        time.sleep(5)
    else:
        raise RuntimeError("Instagram processing timed out")
    pub = _graph("POST", f"{GRAPH}/{user}/media_publish", {"creation_id": cid, "access_token": token})
    link = _graph("GET", f"{GRAPH}/{pub['id']}", {"fields": "permalink", "access_token": token})
    return {"status": "uploaded", "id": pub["id"], "url": link.get("permalink")}


POSTERS = {"tiktok": post_tiktok, "youtube": post_youtube, "instagram": post_instagram}


def main() -> None:
    load_env()
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--platforms", default="tiktok,youtube,instagram")
    ap.add_argument("--publish", action="store_true", help="actually post (default is a dry run)")
    ap.add_argument("--schedule", help="ISO time with offset, e.g. 2026-11-20T18:00:00-05:00")
    ap.add_argument("--force", action="store_true", help="re-post even if publish_log says it's done")
    args = ap.parse_args()

    ep = episode_dir(args.episode)
    video = ep / "final.mp4"
    if not video.exists():
        raise SystemExit("final.mp4 not found — run the editor first")
    meta = read_json(ep / "metadata.json")
    schedule = dt.datetime.fromisoformat(args.schedule) if args.schedule else None
    log_path = ep / "publish_log.json"
    log = read_json(log_path, {})

    for p in [x.strip() for x in args.platforms.split(",") if x.strip()]:
        if p not in POSTERS:
            print(f"{p}: unknown platform (use tiktok, youtube, instagram)")
            continue
        c = caption_for(meta, p)
        if log.get(p, {}).get("status") == "uploaded" and not args.force:
            print(f"{p}: already posted {log[p].get('url', '')} — skipping (use --force to re-post)")
            continue
        if not args.publish:
            print(f"--- {p} (DRY RUN)\n{json.dumps(c, indent=2, ensure_ascii=False)}\n")
            continue
        try:
            result = POSTERS[p](video, c, schedule)
        except Exception as e:
            result = {"status": "failed", "error": str(e)}
        result["at"] = dt.datetime.now(dt.timezone.utc).isoformat()
        log[p] = result
        write_json(log_path, log)
        print(f"{p}: {result}")
    if not args.publish:
        print("Dry run only. Re-run with --publish after the owner approves.")


if __name__ == "__main__":
    main()
