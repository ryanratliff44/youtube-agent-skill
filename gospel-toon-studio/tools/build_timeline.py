"""Editor: build timeline.json from narration timing, shot list, B-roll and captions.

python tools/build_timeline.py episodes/<slug> [--outro 3.0]
"""

from __future__ import annotations

import argparse
import itertools

from common import episode_dir, read_json, write_json

MOTIONS = ["punch", "pulse", "punch-out", "pulse"]  # default: quick zooms, varied shot to shot
CAMERA = {  # shotlist "camera" value -> editor motion
    "punch in": "punch", "punch out": "punch-out", "pulse": "pulse",
    "slow push in": "zoom-in", "pull out": "zoom-out", "pan left": "pan-left", "pan right": "pan-right",
}
FLOOR_Y = 0.80  # where characters' feet stand (fraction of frame height)
EXPR_ANIM = {"asleep": "sway", "worried": "shake", "surprised": "hop", "angry": "bob"}


HEAD_FROM_TOP = 0.17  # head centre, as a fraction of sprite height from its top
CHAR_FRAC = 880 / 1920  # sprite height at scale 1, as a fraction of frame height


def face_point(a: dict) -> tuple[float, float]:
    """Where an actor's face is in the frame (0-1)."""
    h = CHAR_FRAC * a["scale"]
    return a["x"], a["y"] - h * (1 - HEAD_FROM_TOP)


def angles(actors: list[dict], n: int) -> list[dict | None]:
    """Camera angles for n back-to-back cuts of one scene: wide, close-ups on faces, medium, and so on."""
    seq: list[dict | None] = [None]
    if actors:
        fx, fy = face_point(actors[0])
        seq.append({"x": fx, "y": fy, "s": 1.6})
        cx = sum(a["x"] for a in actors) / len(actors)
        seq.append({"x": cx, "y": actors[0]["y"] - CHAR_FRAC * actors[0]["scale"] * 0.45, "s": 1.25})
        if len(actors) > 1:
            lx, ly = face_point(actors[-1])
            seq.append({"x": lx, "y": ly, "s": 1.6})
    else:
        seq += [{"x": 0.5, "y": 0.55, "s": 1.35}, {"x": 0.3, "y": 0.5, "s": 1.3}, {"x": 0.7, "y": 0.5, "s": 1.3}]
    return [seq[i % len(seq)] for i in range(n)]


def build_actors(shot: dict) -> list[dict]:
    """Turn a shot's actors (or its plain characters list) into editor actors with sensible defaults."""
    raw = shot.get("actors")
    if raw is None:
        raw = [{"char": c} for c in shot.get("characters", [])]
    n = len(raw)
    out = []
    for i, a in enumerate(raw):
        expr = a.get("expr", "neutral")
        out.append({
            "src": f"_chars/{a['char']}_{expr}.svg",
            "x": a.get("x", (i + 1) / (n + 1)),
            "y": a.get("y", FLOOR_Y),
            "scale": a.get("scale", 1.0 if n <= 2 else 0.85),
            "flip": a.get("flip", i >= n / 2 and n > 1),
            "anim": a.get("anim", EXPR_ANIM.get(expr, "bob")),
            "glow": a.get("glow", a["char"] == "jesus"),
        })
    return out
VIDEO_EXT = (".mp4", ".webm", ".mov")
IMAGE_EXT = (".png", ".jpg", ".jpeg", ".webp")


def find_media(ep, shot_id: str):
    for ext in VIDEO_EXT + IMAGE_EXT:
        p = ep / "broll" / f"{shot_id}{ext}"
        if p.exists():
            return f"broll/{p.name}", ("video" if ext in VIDEO_EXT else "image")
    return None, "card"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--outro", type=float, default=3.0, help="seconds for the closing scripture card")
    ap.add_argument("--max-shot", type=float, default=1.6, help="longest time one camera angle stays on screen (s)")
    ap.add_argument("--hook-shot", type=float, default=0.8, help="longest angle in the first 3 s (fast hook)")
    args = ap.parse_args()

    ep = episode_dir(args.episode)
    seg = read_json(ep / "narration_segments.json")
    shots = read_json(ep / "shotlist.json")["shots"]
    caps = read_json(ep / "captions.json", {"captions": []})["captions"]
    meta = read_json(ep / "metadata.json", {})
    motion = itertools.cycle(MOTIONS)

    timeline, missing = [], []
    segments = seg["segments"]
    for k, s in enumerate(segments):
        beat_shots = [x for x in shots if x["beat"] == s["beat"]] or [{"id": f"beat{s['beat']}", "prompt": s["text"]}]
        start = s["start"]
        end = segments[k + 1]["start"] if k + 1 < len(segments) else seg["duration"]
        step = (end - start) / len(beat_shots)
        for j, shot in enumerate(beat_shots):
            src, kind = find_media(ep, shot["id"])
            actors = build_actors(shot)
            if kind == "card" and actors:
                kind = "scene"  # no background picture yet: sky/grass placeholder behind the characters
                missing.append(shot["id"])
            elif kind in ("image", "video") and actors:
                kind = "scene" if kind == "image" else kind
            elif kind == "card":
                missing.append(shot["id"])
            s0, s1 = round(start + j * step, 3), round(start + (j + 1) * step, 3)
            motion_main = CAMERA.get(str(shot.get("camera", "")).lower()) or next(motion)
            # Cut the scene into quick angle changes: fast in the hook, a bit slower after.
            pieces, cur = [], s0
            while cur < s1 - 0.05:
                limit = args.hook_shot if cur < 3.0 else args.max_shot
                nxt = min(s1, cur + limit)
                if s1 - nxt < limit * 0.45:  # don't leave a tiny sliver at the end
                    nxt = s1
                pieces.append((round(cur, 3), round(nxt, 3)))
                cur = nxt
            angs = angles(actors, len(pieces))
            for k, (a0, a1) in enumerate(pieces):
                timeline.append({
                    "id": shot["id"] if k == 0 else f"{shot['id']}.{k}", "src": src, "type": kind,
                    "start": a0, "end": a1,
                    "motion": motion_main if k == 0 else ("punch", "zoom-in", "pulse")[k % 3],
                    "text": shot.get("onscreen_text", "") if k == 0 else "",
                    "actors": actors, "mood": shot.get("mood"),
                    "focus": angs[k], "cont": k > 0,
                })

    total = seg["duration"] + args.outro
    write_json(ep / "timeline.json", {
        "fps": 30, "width": 1080, "height": 1920,
        "duration": round(total, 3),
        "title": meta.get("title", ""),
        "narration": "narration.wav",
        "music": None, "musicVolume": 0.12,
        "shots": timeline,
        "captions": [{"text": c["text"], "start": c["start"], "end": c["end"]} for c in caps],
        "outro": {"start": round(seg["duration"], 3), "references": meta.get("references", [])},
    })
    print(f"timeline.json: {len(timeline)} shots, {total:.1f}s")
    if missing:
        print(f"No background picture yet (placeholder used): {', '.join(missing)}")


if __name__ == "__main__":
    main()
