"""B-roll: shotlist.json -> broll/<id>.mp4 via a Wan workflow on ComfyUI.

python tools/broll.py episodes/<slug> [--dry-run] [--only s01,s02] [--seed 42] [--workflow comfy/wan_t2v_api.json]

The workflow must be exported from ComfyUI with "Save (API Format)". The script fills every
WanVideoTextEncode node (positive_prompt / negative_prompt), every node with a "seed" input,
and, if present, the width/height/num_frames inputs on WanVideoEmptyEmbeds.
"""

from __future__ import annotations

import argparse
import copy
import json
import os
import re
import subprocess
import time
import urllib.parse
import urllib.request
import uuid

from common import STUDIO, character_token, episode_dir, load_env, read_json, style_prompts

CAMERA_HINTS = {
    "slow push in": "slow cinematic dolly in",
    "pull out": "slow dolly out revealing the scene",
    "pan left": "slow pan left",
    "pan right": "slow pan right",
    "static": "static camera, gentle ambient motion",
}


def build_prompt(shot: dict, prefix: str) -> str:
    chars = "; ".join(character_token(c) for c in shot.get("characters", []))
    camera = CAMERA_HINTS.get(shot.get("camera", "").lower(), shot.get("camera", ""))
    return ". ".join(p for p in [prefix, chars, shot["prompt"], camera] if p)


CJK = re.compile(r"[\u4e00-\u9fff]")


def fill_workflow(wf: dict, positive: str, negative: str, seed: int, frames: int, w: int, h: int) -> dict:
    """Fill prompts, seed and size. Handles WanVideo text-encode nodes and native CLIPTextEncode nodes
    (in the Wan examples the native negative prompt is the Chinese one)."""
    wf = copy.deepcopy(wf)
    found = False
    for node in wf.values():
        inputs = node.get("inputs", {})
        kind = node.get("class_type")
        if kind == "WanVideoTextEncode":
            inputs["positive_prompt"] = positive
            inputs["negative_prompt"] = negative
            found = True
        elif kind == "CLIPTextEncode" and isinstance(inputs.get("text"), str):
            inputs["text"] = negative if CJK.search(inputs["text"]) else positive
            found = True
        if "seed" in inputs and not isinstance(inputs["seed"], list):
            inputs["seed"] = seed
        if kind == "WanVideoEmptyEmbeds":
            inputs.update({"width": w, "height": h, "num_frames": frames})
    if not found:
        raise SystemExit("Workflow has no text-prompt node. Was it exported with Export (API)?")
    return wf


def comfy(url: str, path: str, data: dict | None = None):
    req = urllib.request.Request(
        url + path,
        data=json.dumps(data).encode() if data is not None else None,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def run_shot(url: str, wf: dict, dest_base: str) -> str:
    prompt_id = comfy(url, "/prompt", {"prompt": wf, "client_id": str(uuid.uuid4())})["prompt_id"]
    while True:
        hist = comfy(url, f"/history/{prompt_id}")
        if prompt_id in hist:
            break
        time.sleep(3)
    entry = hist[prompt_id]
    if entry.get("status", {}).get("status_str") == "error":
        raise RuntimeError(json.dumps(entry["status"].get("messages", []))[:800])
    for out in entry["outputs"].values():
        for f in out.get("gifs", []) + out.get("videos", []) + out.get("images", []):
            q = urllib.parse.urlencode({"filename": f["filename"], "subfolder": f.get("subfolder", ""), "type": f.get("type", "output")})
            ext = os.path.splitext(f["filename"])[1] or ".mp4"
            dest = dest_base + ext
            urllib.request.urlretrieve(f"{url}/view?{q}", dest)
            return dest
    raise RuntimeError("ComfyUI finished but returned no output file")


def smooth(path: str, fps: int) -> None:
    """Interpolate frames (16 -> 32 fps) so motion looks fluid; keeps the original if ffmpeg fails."""
    tmp = path + ".smooth.mp4"
    cmd = ["ffmpeg", "-v", "error", "-y", "-i", path, "-vf",
           f"minterpolate=fps={fps}:mi_mode=mci:mc_mode=aobmc:vsbmc=1", "-c:v", "libx264", "-crf", "17",
           "-pix_fmt", "yuv420p", tmp]
    try:
        subprocess.run(cmd, check=True)
        os.replace(tmp, path)
    except Exception as e:
        print(f"  (smoothing skipped: {e})")


def main() -> None:
    load_env()
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--no-smooth", action="store_true", help="skip frame interpolation")
    ap.add_argument("--fps", type=int, default=32, help="smoothed frame rate")
    ap.add_argument("--only")
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--workflow", default=str(STUDIO / "comfy" / "wan_t2v_api.json"))
    ap.add_argument("--frames", type=int, default=33, help="33 frames ≈ 2 s at 16 fps (81 ≈ 5 s)")
    ap.add_argument("--width", type=int, default=480)
    ap.add_argument("--height", type=int, default=832)
    args = ap.parse_args()

    ep = episode_dir(args.episode)
    shots = read_json(ep / "shotlist.json")["shots"]
    if args.only:
        wanted = set(args.only.split(","))
        shots = [s for s in shots if s["id"] in wanted]
    prefix, negative = style_prompts()
    url = os.environ.get("COMFYUI_URL", "http://127.0.0.1:8000").rstrip("/")

    if args.dry_run:
        for s in shots:
            print(f"--- {s['id']} (beat {s['beat']})\n{build_prompt(s, prefix)}\n")
        print(f"NEGATIVE: {negative}")
        return

    if not os.path.exists(args.workflow):
        raise SystemExit(f"Missing {args.workflow}. See comfy/README.md to export one.")
    base_wf = read_json(__import__("pathlib").Path(args.workflow))
    (ep / "broll").mkdir(exist_ok=True)
    failed = []
    for i, s in enumerate(shots):
        seed = args.seed if args.seed is not None else int(time.time()) + i
        wf = fill_workflow(base_wf, build_prompt(s, prefix), negative, seed, args.frames, args.width, args.height)
        print(f"{s['id']}: generating (seed {seed}) ...", flush=True)
        try:
            out = run_shot(url, wf, str(ep / 'broll' / s['id']))
            if not args.no_smooth and out.endswith('.mp4'):
                smooth(out, args.fps)
            print(f"{s['id']}: {out}")
        except Exception as e:  # keep going; report at the end
            failed.append(s["id"])
            print(f"{s['id']}: FAILED {e}")
    if failed:
        raise SystemExit(f"Failed shots: {','.join(failed)} (re-run with --only)")


if __name__ == "__main__":
    main()
