"""Editor: build timeline.json from narration timing, shot list, B-roll and captions.

python tools/build_timeline.py episodes/<slug> [--outro 3.0]
"""

from __future__ import annotations

import argparse
import itertools

from common import episode_dir, read_json, write_json

MOTIONS = ["punch", "whip", "pulse", "punch-out", "handheld", "dutch", "pulse"]  # default: dynamic camera, varied shot to shot
CAMERA = {  # shotlist "camera" value -> editor motion
    "punch in": "punch", "punch out": "punch-out", "pulse": "pulse", "whip": "whip", "whip pan": "whip", "dutch": "dutch",
    "handheld": "handheld",
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


EXPR_TO_EMOTION = {"neutral": "neutral", "calm": "calm", "smile": "joy", "worried": "fear", "surprised": "awe",
                   "asleep": "sleep", "angry": "anger", "sad": "sad"}
EMOTIONS = ["neutral", "calm", "joy", "laugh", "fear", "panic", "anger", "sad", "awe", "sleep", "smug", "command"]


WORLD_STAGE = {  # default standing spots (x along the boat/shore, z across); the mast is at x=1.5, keep clear of it
    "boat": {1: [[-0.8, 0.1]], 2: [[-1.7, 0.1], [-0.2, 0.35]], 3: [[-2.3, 0.05], [-1.1, 0.35], [0.1, 0.1]]},
    "shore": {1: [[0, 0.3]], 2: [[-0.9, 0.3], [0.9, 0.5]], 3: [[-1.5, 0.5], [0, 0.2], [1.4, 0.6]]},
    "camp": {1: [[0, 0.3]], 2: [[-0.9, 0.4], [0.9, 0.6]], 3: [[-1.6, 0.6], [0, 0.3], [1.5, 0.7]]},
}
# Camera: ONE big pivotal zoom at the very start, then only calm, slow moves.
CALM_CAMS = {"whip": "medium", "dutch": "low_hero", "pulse": "medium", "punch": "medium", "punch-out": "wide", "handheld": "medium",
             "orbit": "medium", "crane_up": "wide", "reveal": "wide", "zoom-in": "medium", "zoom-out": "wide", "slow push in": "medium",
             "pull out": "wide", "static": "medium", "punch in": "medium", "pan left": "medium", "pan right": "medium"}
FOLLOW_UPS = ["medium", "close", "medium", "close", "low_hero", "close"]  # after an establishing shot: faces and a little variety


def place_in_world(actors: list[dict], world: str) -> None:
    kind = {"dusk_shore": "shore", "camp_night": "camp"}.get(world, "boat")
    spots = WORLD_STAGE[kind].get(min(len(actors), 3), [])
    for i, a in enumerate(actors):
        if a.get("at") is None and i < len(spots):
            a["at"] = spots[i]


def world_fields(world: str, shot: dict, k: int, a0: float, n_act: int, speaker: int, first_shot: bool) -> dict:
    raw = shot.get("cam", "medium")
    base = CALM_CAMS.get(raw, raw if raw in ("wide", "medium", "close", "low_hero", "push_in", "pull_back", "over_water") else "medium")
    if first_shot and k == 0:
        cam = "pivot"  # the one opening zoom
    elif k == 0:
        cam = base
    else:
        cam = FOLLOW_UPS[(k - 1) % len(FOLLOW_UPS)]
    close_up = cam in ("close", "push_in", "pivot", "low_hero")
    return {"world": world, "cam": cam, "focusActor": (speaker if close_up and n_act > 0 else None)}


def build_actors(shot: dict) -> list[dict]:
    """Turn a shot's actors (or its plain characters list) into editor actors with sensible defaults.

    Each actor: char, emotion (see EMOTIONS), optional x, y, scale, flip, glow, move {x, y}.
    shot["speaker"] (a character id) says whose mouth moves with the narration; default = the first actor.
    """
    raw = shot.get("actors")
    if raw is None:
        raw = [{"char": c} for c in shot.get("characters", [])]
    n = len(raw)
    speaker = shot.get("speaker")
    out = []
    for i, a in enumerate(raw):
        emo = a.get("emotion") or EXPR_TO_EMOTION.get(a.get("expr", "neutral"), "neutral")
        if emo not in EMOTIONS:
            raise SystemExit(f"Unknown emotion '{emo}' in shot {shot.get('id')}. Use one of: {', '.join(EMOTIONS)}")
        actor = {
            "char": a["char"], "emotion": emo,
            "x": a.get("x", (i + 1) / (n + 1)),
            "y": a.get("y", FLOOR_Y),
            "scale": a.get("scale", 1.0 if n <= 2 else 0.85),
            "flip": a.get("flip", False),
            "glow": a.get("glow", a["char"] == "jesus"),
            "speak": a.get("speak", (a["char"] == speaker) if speaker else i == 0),
        }
        for k in ("at", "lift", "move"):
            if a.get(k) is not None:
                actor[k] = a[k]
        out.append(actor)
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
    ap.add_argument("--max-shot", type=float, default=3.4, help="longest time one camera angle stays on screen (s)")
    ap.add_argument("--hook-shot", type=float, default=1.4, help="length of the opening zoom shot (s)")
    args = ap.parse_args()

    ep = episode_dir(args.episode)
    seg = read_json(ep / "narration_segments.json")
    shots = read_json(ep / "shotlist.json")["shots"]
    caps = read_json(ep / "captions.json", {"captions": []})["captions"]
    meta = read_json(ep / "metadata.json", {})
    motion = itertools.cycle(MOTIONS)

    main = next((c for s in shots for c in (a["char"] for a in (s.get("actors") or [])) if c), None) or (shots[0].get("characters") or ["jesus"])[0]
    for s in shots:
        if not (s.get("actors") or s.get("characters")):
            s["actors"] = [{"char": main, "emotion": "calm"}]
            print(f"  note: shot {s['id']} had no character, added {main} so the story is always told by someone")
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
                limit = args.hook_shot if (cur < 0.05 and not timeline) else args.max_shot
                nxt = min(s1, cur + limit)
                if s1 - nxt < limit * 0.5:  # don't leave a short sliver at the end
                    nxt = s1
                pieces.append((round(cur, 3), round(nxt, 3)))
                cur = nxt
            angs = angles(actors, len(pieces))
            world = shot.get("world")
            if world:
                place_in_world(actors, world)
                n_act = len(actors)
                sp = next((i for i, a in enumerate(actors) if a.get("speak")), 0)
            for k, (a0, a1) in enumerate(pieces):
                timeline.append({
                    "id": shot["id"] if k == 0 else f"{shot['id']}.{k}", "src": src, "type": kind,
                    "start": a0, "end": a1,
                    "motion": motion_main if k == 0 else ("punch", "pulse", "handheld", "whip")[k % 4],
                    "text": shot.get("onscreen_text", "") if k == 0 else "",
                    "actors": actors, "mood": shot.get("mood"),
                    "focus": None if world else angs[k], "cont": k > 0,
                    **(world_fields(world, shot, k, a0, n_act, sp, first_shot=not timeline) if world else {}),
                })

    total = seg["duration"] + args.outro
    if timeline:
        timeline[-1]["end"] = round(total, 3)  # the last shot stays on screen under the closing reference
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
