"""Narrator (free alternative): narration.txt -> narration.wav + narration_segments.json using Kokoro TTS.

python tools/narrate_kokoro.py episodes/<slug> [--voice am_santa] [--speed 0.9] [--pitch 0.94] [--pause 0.55]

Voices to try: am_santa, bm_fable (British storyteller), bm_george, bm_lewis, am_michael, am_adam.
American voices start with "a", British with "b". --pitch below 1 makes the voice deeper (pitch only, speed kept).
Run this with the Kokoro environment (.venv-kokoro), which is separate from the Chatterbox one.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import tempfile

import numpy as np
import soundfile as sf

from common import beats, episode_dir, write_json

SR = 24000


def synth(text: str, voice: str, speed: float) -> np.ndarray:
    if os.environ.get("TOON_FAKE_TTS"):  # offline test hook
        t = np.linspace(0, max(1.0, len(text) / 15), int(SR * max(1.0, len(text) / 15)), endpoint=False)
        return (0.2 * np.sin(2 * np.pi * 180 * t)).astype(np.float32)
    from kokoro import KPipeline

    pipe = synth.__dict__.setdefault("pipe", {}).get(voice[0])
    if pipe is None:
        pipe = KPipeline(lang_code=voice[0], repo_id="hexgrad/Kokoro-82M")
        synth.pipe[voice[0]] = pipe
    chunks = [np.asarray(a.cpu() if hasattr(a, "cpu") else a, dtype=np.float32) for _, _, a in pipe(text, voice=voice, speed=speed)]
    return np.concatenate(chunks)


def shape(path_in: str, path_out: str, pitch: float, warmth: bool) -> None:
    """Lower the pitch without changing speed, add a little low-end warmth."""
    filters = []
    if abs(pitch - 1.0) > 0.005:
        filters += [f"asetrate={int(SR * pitch)}", f"aresample={SR}", f"atempo={1 / pitch:.4f}"]
    if warmth:
        filters += ["equalizer=f=140:t=q:w=1:g=3", "equalizer=f=6000:t=q:w=1:g=-2"]
    if not filters:
        filters = ["anull"]
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path_in, "-filter:a", ",".join(filters), path_out], check=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--voice", default="am_santa")
    ap.add_argument("--speed", type=float, default=0.9, help="Kokoro speaking speed (0.8-1.1)")
    ap.add_argument("--pitch", type=float, default=0.94, help="below 1 = deeper (0.88-1.0)")
    ap.add_argument("--pause", type=float, default=0.55, help="seconds of silence between beats")
    ap.add_argument("--no-warmth", action="store_true")
    args = ap.parse_args()

    ep = episode_dir(args.episode)
    texts = beats(ep)
    parts = ep / "narration_parts"
    parts.mkdir(exist_ok=True)
    print(f"engine=kokoro voice={args.voice} beats={len(texts)}")

    silence = np.zeros(int(SR * args.pause), dtype=np.float32)
    out, segments, t = [], [], 0.0
    for i, text in enumerate(texts):
        raw = os.path.join(tempfile.gettempdir(), f"kokoro_raw_{i:02d}.wav")
        sf.write(raw, synth(text, args.voice, args.speed), SR)
        final = str(parts / f"beat{i:02d}.wav")
        shape(raw, final, args.pitch, not args.no_warmth)
        wav, sr = sf.read(final, dtype="float32")
        if wav.ndim > 1:
            wav = wav.mean(axis=1)
        dur = len(wav) / sr
        segments.append({"beat": i, "start": round(t, 3), "end": round(t + dur, 3), "text": text})
        out += [wav, silence]
        t += dur + args.pause
        print(f"beat {i}: {dur:.1f}s")
    sf.write(str(ep / "narration.wav"), np.concatenate(out), SR)
    write_json(ep / "narration_segments.json", {"duration": round(t, 3), "segments": segments})
    print(f"narration.wav: {t:.1f}s")


if __name__ == "__main__":
    main()
