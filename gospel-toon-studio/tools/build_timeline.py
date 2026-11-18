"""Editor: build timeline.json from narration timing, shot list, B-roll and captions.

python tools/build_timeline.py episodes/<slug> [--outro 3.0]
"""

from __future__ import annotations

import argparse
import itertools

from common import episode_dir, read_json, write_json

MOTIONS = ["zoom-in", "pan-left", "zoom-out", "pan-right"]
FLOOR_Y = 0.80  # where characters' feet stand (fraction of frame height)
EXPR_ANIM = {"asleep": "sway", "worried": "shake", "surprised": "hop", "angry": "bob"}


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
            timeline.append({
                "id": shot["id"], "src": src, "type": kind,
                "start": round(start + j * step, 3), "end": round(start + (j + 1) * step, 3),
                "motion": next(motion), "text": shot.get("onscreen_text", ""),
                "actors": actors, "mood": shot.get("mood"),
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
