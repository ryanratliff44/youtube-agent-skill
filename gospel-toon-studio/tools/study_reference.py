"""Study a reference video: scene keyframes + transcript + basic stats.

python tools/study_reference.py bible/references/<video> [--max-frames 24] [--no-transcript]
Writes bible/references/<name>_study/ with frames/*.jpg, transcript.txt and stats.json.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path


def probe(video: Path) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=width,height,r_frame_rate",
         "-of", "json", str(video)], capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--max-frames", type=int, default=24)
    ap.add_argument("--threshold", type=float, default=0.3, help="scene-change sensitivity (lower = more cuts)")
    ap.add_argument("--no-transcript", action="store_true")
    args = ap.parse_args()

    video = Path(args.video).resolve()
    out = video.parent / f"{video.stem}_study"
    frames = out / "frames"
    frames.mkdir(parents=True, exist_ok=True)

    # Scene-change keyframes with their timestamps
    log = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(video), "-vf",
         f"select='gt(scene,{args.threshold})',showinfo,scale=540:-2", "-vsync", "vfr",
         "-frames:v", str(args.max_frames), str(frames / "cut_%03d.jpg"), "-y"],
        capture_output=True, text=True)
    cuts = [float(l.split("pts_time:")[1].split()[0]) for l in log.stderr.splitlines() if "pts_time:" in l]
    # Always include the hook frame (0.5 s)
    subprocess.run(["ffmpeg", "-v", "error", "-ss", "0.5", "-i", str(video), "-frames:v", "1",
                    "-vf", "scale=540:-2", str(frames / "hook.jpg"), "-y"], check=True)

    info = probe(video)
    duration = float(info["format"]["duration"])
    stats = {"duration_s": round(duration, 2), "streams": info.get("streams", []),
             "scene_cuts_s": cuts, "cuts_found": len(cuts),
             "avg_shot_length_s": round(duration / (len(cuts) + 1), 2)}

    if not args.no_transcript:
        try:
            import whisperx
            audio = whisperx.load_audio(str(video))
            model = whisperx.load_model("small", "cpu", compute_type="int8")
            segs = model.transcribe(audio, batch_size=8)["segments"]
            text = "\n".join(f"[{s['start']:.1f}] {s['text'].strip()}" for s in segs)
            (out / "transcript.txt").write_text(text + "\n")
            words = sum(len(s["text"].split()) for s in segs)
            stats["words_per_minute"] = round(words / (duration / 60), 1)
        except Exception as e:  # transcript is optional
            stats["transcript_error"] = str(e)

    (out / "stats.json").write_text(json.dumps(stats, indent=2) + "\n")
    print(f"{out}  ({len(cuts)} cuts, avg shot {stats['avg_shot_length_s']} s)")


if __name__ == "__main__":
    main()
