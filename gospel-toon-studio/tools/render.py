"""Editor: render final.mp4 + thumbnail.png from timeline.json with the Remotion project in editor/.

python tools/render.py episodes/<slug> [--thumb-frame 15]
"""

from __future__ import annotations

import argparse
import shutil
import subprocess

from common import STUDIO, episode_dir


def run(cmd: list[str]) -> None:
    print("$", " ".join(cmd), flush=True)
    subprocess.run(cmd, cwd=STUDIO / "editor", check=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--thumb-frame", type=int, default=15)
    ap.add_argument("--preview", type=float, default=0, help="render only the first N seconds, half size, to preview.mp4")
    args = ap.parse_args()

    ep = episode_dir(args.episode)
    timeline = ep / "timeline.json"
    if not timeline.exists():
        raise SystemExit("Run tools/build_timeline.py first")
    chars = STUDIO / "assets" / "characters"
    if not chars.exists() or not any(chars.glob("*.svg")):
        raise SystemExit("No character art. Run: python tools/make_characters.py")
    shutil.copytree(chars, ep / "_chars", dirs_exist_ok=True)
    npx = shutil.which("npx") or "npx"
    if not (STUDIO / "editor" / "node_modules").exists():
        run([shutil.which("npm") or "npm", "install", "--no-audit", "--no-fund"])
    common = ["--props", str(timeline), "--public-dir", str(ep)]
    if args.preview:
        last = int(args.preview * 30) - 1
        out = ep / "preview.mp4"
        run([npx, "remotion", "render", "src/index.ts", "Episode", str(out), *common, "--codec", "h264", f"--frames=0-{last}", "--scale", "0.5"])
        if not out.exists():
            raise SystemExit("Remotion finished but wrote no video. Run the command shown above by hand in the editor folder to see the real error.")
        print(out)
        return
    run([npx, "remotion", "render", "src/index.ts", "Episode", str(ep / "final.mp4"), *common, "--codec", "h264"])
    run([npx, "remotion", "still", "src/index.ts", "Episode", str(ep / "thumbnail.png"), *common, "--frame", str(args.thumb_frame)])
    if not (ep / "final.mp4").exists():
        raise SystemExit("Remotion finished but wrote no video. Run the command shown above by hand in the editor folder to see the real error.")
    print(ep / "final.mp4")


if __name__ == "__main__":
    main()
