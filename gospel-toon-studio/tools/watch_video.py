"""Make a video "watchable" by Claude: contact sheets of frames + a text report of pacing, speech and sound.

python tools/watch_video.py <URL or video file> [--out folder] [--every 1.0] [--browser chrome]

Output folder (default: bible/references/watch/<name>/):
  report.md         pacing, cuts, speech/words-per-minute, hook, transcript, loudness  (paste this to Claude)
  sheet_01.jpg ...  grids of frames with timestamps                                   (attach these to Claude)
  hook.jpg          the first 3 seconds, a frame every 0.25 s
Works with YouTube, TikTok, Instagram and anything else yt-dlp supports, or a local .mp4.
If a site says "sign in to confirm you're not a bot", add --browser chrome (uses your logged-in browser).
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

from common import BIBLE


def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", **kw)


def download(url: str, out: Path, browser: str | None) -> tuple[Path, dict]:
    cmd = [sys.executable, "-m", "yt_dlp", "--no-playlist", "-f", "bv*[height<=1080]+ba/b[height<=1080]/b",
           "--merge-output-format", "mp4", "--write-info-json", "-o", str(out / "source.%(ext)s"), url]
    if browser:
        cmd[3:3] = ["--cookies-from-browser", browser]
    print("downloading ...", flush=True)
    r = run(cmd)
    if r.returncode != 0:
        raise SystemExit("Download failed:\n" + r.stderr[-1500:] + "\nTip: add --browser chrome, or download the video yourself and pass the file.")
    video = next(out.glob("source.mp4"), None) or next(p for p in out.glob("source.*") if p.suffix not in (".json",))
    info = {}
    j = out / "source.info.json"
    if j.exists():
        info = json.loads(j.read_text(encoding="utf-8"))
    return video, info


def probe(video: Path) -> dict:
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height,r_frame_rate",
             "-of", "json", str(video)])
    d = json.loads(r.stdout)
    v = next((s for s in d["streams"] if s["codec_type"] == "video"), {})
    num, _, den = v.get("r_frame_rate", "30/1").partition("/")
    return {"duration": float(d["format"]["duration"]), "width": v.get("width"), "height": v.get("height"),
            "fps": round(float(num) / float(den or 1), 2), "has_audio": any(s["codec_type"] == "audio" for s in d["streams"])}


def scene_cuts(video: Path, threshold: float) -> list[float]:
    r = run(["ffmpeg", "-hide_banner", "-i", str(video), "-vf", f"select='gt(scene,{threshold})',showinfo", "-an", "-f", "null", "-"])
    return [float(m.group(1)) for m in re.finditer(r"pts_time:([\d.]+)", r.stderr)]


def frames(video: Path, dest: Path, every: float, width: int = 270, start: float = 0, length: float | None = None) -> list[Path]:
    dest.mkdir(parents=True, exist_ok=True)
    for f in dest.glob("*.jpg"):
        f.unlink()
    cmd = ["ffmpeg", "-v", "error", "-y", "-ss", str(start), "-i", str(video)]
    if length:
        cmd += ["-t", str(length)]
    cmd += ["-vf", f"fps=1/{every},scale={width}:-2", "-q:v", "3", str(dest / "f_%04d.jpg")]
    run(cmd)
    return sorted(dest.glob("f_*.jpg"))


def make_sheets(files: list[Path], every: float, start: float, out: Path, prefix: str, cols: int, rows: int) -> list[Path]:
    from PIL import Image, ImageDraw, ImageFont

    try:
        font = ImageFont.load_default(size=18)
    except TypeError:
        font = ImageFont.load_default()
    per = cols * rows
    made = []
    for n in range(0, len(files), per):
        chunk = files[n:n + per]
        ims = [Image.open(f) for f in chunk]
        w, h = ims[0].size
        sheet = Image.new("RGB", (cols * w, ((len(ims) + cols - 1) // cols) * h), (20, 20, 20))
        d = ImageDraw.Draw(sheet)
        for i, im in enumerate(ims):
            x, y = (i % cols) * w, (i // cols) * h
            sheet.paste(im, (x, y))
            t = start + (n + i) * every
            d.rectangle([x, y, x + 62, y + 24], fill=(0, 0, 0))
            d.text((x + 4, y + 2), f"{t:5.2f}s", fill=(255, 255, 0), font=font)
        p = out / (f"{prefix}.jpg" if prefix == "hook" else f"{prefix}_{n // per + 1:02d}.jpg")
        sheet.save(p, quality=88)
        made.append(p)
    return made


def loudness(video: Path) -> list[float]:
    import numpy as np

    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(video), "-vn", "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
                       capture_output=True)
    a = np.frombuffer(r.stdout, dtype=np.int16).astype("float32") / 32768
    if a.size == 0:
        return []
    sec = a[: (a.size // 16000) * 16000].reshape(-1, 16000)
    rms = np.sqrt((sec ** 2).mean(axis=1) + 1e-12)
    return [round(float(20 * np.log10(x)), 1) for x in rms]


def transcribe(video: Path) -> list[dict]:
    from faster_whisper import WhisperModel

    model = WhisperModel("small", device="cpu", compute_type="int8")
    segs, info = model.transcribe(str(video), word_timestamps=True)
    out = []
    for s in segs:
        out.append({"start": s.start, "end": s.end, "text": s.text.strip(),
                    "words": [{"w": w.word.strip(), "s": w.start, "e": w.end} for w in (s.words or [])]})
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("--out")
    ap.add_argument("--every", type=float, default=1.0, help="seconds between frames in the sheets")
    ap.add_argument("--cut-threshold", type=float, default=0.04, help="lower = detects more cuts")
    ap.add_argument("--browser", help="chrome, edge or firefox: borrow your logged-in browser's cookies for the download")
    ap.add_argument("--no-transcript", action="store_true")
    args = ap.parse_args()

    is_url = args.source.startswith(("http://", "https://"))
    name = re.sub(r"[^A-Za-z0-9_-]+", "_", (args.source.rstrip("/").split("/")[-1].split("?")[0] if is_url else Path(args.source).stem))[:40] or "video"
    out = Path(args.out) if args.out else BIBLE / "references" / "watch" / name
    out.mkdir(parents=True, exist_ok=True)

    info: dict = {}
    if is_url:
        video, info = download(args.source, out, args.browser)
    else:
        video = Path(args.source).resolve()
    meta = probe(video)
    dur = meta["duration"]

    cuts = scene_cuts(video, args.cut_threshold)
    bounds = [0.0] + [c for c in cuts if 0.2 < c < dur - 0.2] + [dur]
    lens = [round(b - a, 2) for a, b in zip(bounds, bounds[1:])]
    avg = round(sum(lens) / len(lens), 2)

    tmp = out / "_frames"
    files = frames(video, tmp, args.every)
    sheets = make_sheets(files, args.every, 0.0, out, "sheet", cols=5, rows=3)
    hook_files = frames(video, out / "_hook", 0.25, start=0, length=3)
    hook = make_sheets(hook_files, 0.25, 0.0, out, "hook", cols=6, rows=2)
    loud = loudness(video) if meta["has_audio"] else []

    transcript, tr_err = [], None
    if meta["has_audio"] and not args.no_transcript:
        try:
            transcript = transcribe(video)
        except Exception as e:
            tr_err = str(e)[:300]

    words = [w for s in transcript for w in s["words"]]
    wpm = round(len(words) / (dur / 60), 0) if words else None
    hook_words = " ".join(w["w"] for w in words if w["s"] < 3.0)
    pauses = [(round(a["end"], 1), round(b["start"] - a["end"], 1)) for a, b in zip(words, words[1:]) if b["s"] - a["e"] > 0.6]

    L = [f"# Watch report: {info.get('title') or video.name}", ""]
    if info:
        L += [f"- Channel: {info.get('uploader') or info.get('channel')}",
              f"- Views: {info.get('view_count')}  Likes: {info.get('like_count')}  Uploaded: {info.get('upload_date')}",
              f"- Description: {(info.get('description') or '')[:300]!r}", f"- Tags: {', '.join((info.get('tags') or [])[:12])}"]
    L += [f"- Format: {meta['width']}x{meta['height']} at {meta['fps']} fps, {dur:.1f} s", "",
          "## Pacing", f"- Cuts detected: {len(cuts)}  Average shot length: {avg} s  Shortest: {min(lens)} s  Longest: {max(lens)} s",
          f"- Cut times (s): {', '.join(f'{c:.1f}' for c in cuts)}", "- NOTE: automatic cut detection misses cuts between similar-looking scenes (3D/animated videos). Trust the picture sheets for real pacing.", f"- Shot lengths (s): {lens}", "",
          "## Speech", f"- Words per minute: {wpm}", f"- First 3 seconds (hook): {hook_words!r}",
          f"- Pauses over 0.6 s (at s, length s): {pauses}"]
    if tr_err:
        L.append(f"- (transcript failed: {tr_err})")
    L += ["", "## Transcript"] + [f"[{s['start']:5.1f}] {s['text']}" for s in transcript]
    if loud:
        L += ["", "## Loudness per second (dB, closer to 0 = louder)", " ".join(f"{x:.0f}" for x in loud),
              "Big dips under speech often mean the music drops out; a steady floor under speech means a music bed."]
    L += ["", "## Files to send Claude", "- This report (paste it), plus " + ", ".join(p.name for p in hook + sheets)]
    (out / "report.md").write_text("\n".join(L) + "\n", encoding="utf-8")
    for d in (tmp, out / "_hook"):
        for f in d.glob("*.jpg"):
            f.unlink()
        d.rmdir()
    print(f"\nDone: {out}\nSend Claude: report.md (paste it) and the pictures {', '.join(p.name for p in hook + sheets)}")


if __name__ == "__main__":
    main()
