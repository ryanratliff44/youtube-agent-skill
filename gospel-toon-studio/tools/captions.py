"""Word-timed captions: narration.wav -> captions.json using faster-whisper word timestamps.

python tools/captions.py episodes/<slug> [--words 1] [--model small.en] [--device cpu]

CPU with int8 is fast enough for a one-minute narration and avoids CUDA library setup on Windows.
"""

from __future__ import annotations

import argparse

from common import episode_dir, write_json


def transcribe_words(path: str, model_name: str, device: str) -> list[dict]:
    from faster_whisper import WhisperModel

    compute = "float16" if device == "cuda" else "int8"
    model = WhisperModel(model_name, device=device, compute_type=compute)
    segments, _info = model.transcribe(path, language="en", word_timestamps=True)
    words = []
    for seg in segments:
        for w in seg.words or []:
            words.append({"word": w.word.strip(), "start": float(w.start), "end": float(w.end)})
    return words


def group(words: list[dict], size: int) -> list[dict]:
    out, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) >= size or w["word"].endswith((".", ",", "?", "!", ";", ":")):
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return [
        {
            "text": " ".join(w["word"] for w in g),
            "start": round(g[0]["start"], 3),
            "end": round(g[-1]["end"], 3),
            "words": [{"word": w["word"], "start": w["start"], "end": w["end"]} for w in g],
        }
        for g in out
    ]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--words", type=int, default=1, help="words per caption (1 = one word at a time, like the references)")
    ap.add_argument("--model", default="small.en")
    ap.add_argument("--device", default="cpu", choices=["cpu", "cuda"])
    args = ap.parse_args()

    ep = episode_dir(args.episode)
    words = transcribe_words(str(ep / "narration.wav"), args.model, args.device)
    caps = group(words, args.words)
    write_json(ep / "captions.json", {"captions": caps})
    print(f"captions.json: {len(caps)} captions from {len(words)} words")


if __name__ == "__main__":
    main()
