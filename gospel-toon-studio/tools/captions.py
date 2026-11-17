"""Word-timed captions: narration.wav -> captions.json using WhisperX.

python tools/captions.py episodes/<slug> [--words 3] [--model large-v3]
"""

from __future__ import annotations

import argparse

from common import episode_dir, write_json


def group(words: list[dict], size: int) -> list[dict]:
    out, cur = [], []
    for w in words:
        if "start" not in w:  # unaligned token (numbers etc.): attach to current group
            if cur:
                cur.append(w)
            continue
        cur.append(w)
        if len(cur) >= size or w["word"].rstrip().endswith((".", ",", "?", "!", ";", ":")):
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    caps = []
    for g in out:
        timed = [w for w in g if "start" in w]
        caps.append({
            "text": " ".join(w["word"].strip() for w in g),
            "start": round(timed[0]["start"], 3),
            "end": round(timed[-1]["end"], 3),
            "words": [{"word": w["word"].strip(), "start": w["start"], "end": w["end"]} for w in timed],
        })
    return caps


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--words", type=int, default=3)
    ap.add_argument("--model", default="large-v3")
    args = ap.parse_args()

    import torch
    import whisperx

    ep = episode_dir(args.episode)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    audio = whisperx.load_audio(str(ep / "narration.wav"))
    model = whisperx.load_model(args.model, device, compute_type="float16" if device == "cuda" else "int8")
    result = model.transcribe(audio, batch_size=8, language="en")
    align_model, meta = whisperx.load_align_model(language_code="en", device=device)
    result = whisperx.align(result["segments"], align_model, meta, audio, device)
    words = [w for seg in result["segments"] for w in seg.get("words", [])]
    caps = group(words, args.words)
    write_json(ep / "captions.json", {"captions": caps})
    print(f"captions.json: {len(caps)} captions")


if __name__ == "__main__":
    main()
