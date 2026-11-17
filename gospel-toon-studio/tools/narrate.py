"""Narrator: narration.txt -> narration.wav + narration_segments.json using Chatterbox TTS.

python tools/narrate.py episodes/<slug> [--beats 2,5] [--exaggeration 0.5] [--cfg 0.5] [--pause 0.45]
"""

from __future__ import annotations

import argparse

from common import BIBLE, beats, episode_dir, write_json


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--beats", help="comma-separated beat indexes to regenerate (others reused)")
    ap.add_argument("--exaggeration", type=float, default=0.5)
    ap.add_argument("--cfg", type=float, default=0.5)
    ap.add_argument("--pause", type=float, default=0.45, help="seconds of silence between beats")
    ap.add_argument("--voice", default=str(BIBLE / "voice" / "narrator_ref.wav"))
    args = ap.parse_args()

    import torch
    import torchaudio as ta
    from chatterbox.tts import ChatterboxTTS

    ep = episode_dir(args.episode)
    texts = beats(ep)
    parts = ep / "narration_parts"
    parts.mkdir(exist_ok=True)
    only = {int(b) for b in args.beats.split(",")} if args.beats else None

    device = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
    model = ChatterboxTTS.from_pretrained(device=device)
    voice = args.voice if __import__("os").path.exists(args.voice) else None
    print(f"device={device} voice={'cloned' if voice else 'default'} beats={len(texts)}")

    for i, text in enumerate(texts):
        out = parts / f"beat{i:02d}.wav"
        if out.exists() and only is not None and i not in only:
            continue
        wav = model.generate(text, audio_prompt_path=voice, exaggeration=args.exaggeration, cfg_weight=args.cfg)
        ta.save(str(out), wav, model.sr)
        print(f"beat {i}: {wav.shape[-1] / model.sr:.1f}s")

    silence = torch.zeros(1, int(model.sr * args.pause))
    chunks, segments, t = [], [], 0.0
    for i, text in enumerate(texts):
        wav, sr = ta.load(str(parts / f"beat{i:02d}.wav"))
        if sr != model.sr:
            wav = ta.functional.resample(wav, sr, model.sr)
        wav = wav.mean(0, keepdim=True)
        dur = wav.shape[-1] / model.sr
        segments.append({"beat": i, "start": round(t, 3), "end": round(t + dur, 3), "text": text})
        chunks += [wav, silence]
        t += dur + args.pause
    ta.save(str(ep / "narration.wav"), torch.cat(chunks, dim=-1), model.sr)
    write_json(ep / "narration_segments.json", {"duration": round(t, 3), "segments": segments})
    print(f"narration.wav: {t:.1f}s")


if __name__ == "__main__":
    main()
