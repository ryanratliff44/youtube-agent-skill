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


import difflib
import re

PUNCT_END = (".", ",", "?", "!", ";", ":")
SMALL = {"a", "an", "the", "of", "to", "in", "on", "and", "or", "but", "is", "it", "at", "by", "for", "with", "his", "her", "my", "so"}


def norm(w: str) -> str:
    return re.sub(r"[^a-z0-9']", "", w.lower())


def clean(w: str) -> str:
    """How a word is shown: no quotation marks or dashes around it."""
    return w.strip('"\u201c\u201d\u2018\u2019-\u2014')


def align_to_script(heard: list[dict], script: list[str]) -> list[dict]:
    """Use the exact words of the script, with the timing of the words the speech recognizer heard."""
    a = [norm(w["word"]) for w in heard]
    b = [norm(w) for w in script]
    times: list[tuple[float, float] | None] = [None] * len(script)
    for blk in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
        for k in range(blk.size):
            h = heard[blk.a + k]
            times[blk.b + k] = (h["start"], h["end"])
    # words the recognizer missed or misheard: share the time between their neighbours
    i = 0
    while i < len(script):
        if times[i] is not None:
            i += 1
            continue
        j = i
        while j < len(script) and times[j] is None:
            j += 1
        t0 = times[i - 1][1] if i > 0 else (times[j][0] - 0.3 * (j - i) if j < len(script) else 0.0)
        t1 = times[j][0] if j < len(script) else t0 + 0.3 * (j - i)
        step = max(0.05, (t1 - t0) / (j - i))
        for k in range(i, j):
            times[k] = (t0 + (k - i) * step, t0 + (k - i + 1) * step)
        i = j
    return [{"word": w, "start": float(t[0]), "end": float(t[1])} for w, t in zip(script, times)]


def group(words: list[dict], size: int, max_chars: int = 16) -> list[dict]:
    """1 to `size` words per caption, the way popular Shorts do it: break at punctuation and pauses,
    keep little words with the next word, and never leave the screen empty between captions."""
    out, cur = [], []
    for i, w in enumerate(words):
        text = " ".join(clean(x["word"]) for x in cur + [w])
        pause = cur and w["start"] - cur[-1]["end"] > 0.35
        if cur and (len(cur) >= size or len(text) > max_chars or pause or clean(cur[-1]["word"]).endswith(PUNCT_END)):
            carry = []
            # don't end a caption on a little word like "a" or "the": move it to the next caption
            if len(cur) > 1 and norm(cur[-1]["word"]) in SMALL and not clean(cur[-1]["word"]).endswith(PUNCT_END) and not pause:
                carry = [cur.pop()]
            out.append(cur)
            cur = carry
        cur.append(w)
    if cur:
        out.append(cur)
    caps = []
    for k, g in enumerate(out):
        start = g[0]["start"]
        end = g[-1]["end"]
        if k + 1 < len(out):
            nxt = out[k + 1][0]["start"]
            end = nxt if nxt - end < 0.7 else end + 0.15  # flow straight into the next caption
        caps.append({
            "text": " ".join(clean(x["word"]) for x in g).strip(),
            "start": round(start, 3),
            "end": round(max(end, start + 0.12), 3),
            "words": [{"word": clean(x["word"]), "start": x["start"], "end": x["end"]} for x in g],
        })
    return [c for c in caps if c["text"]]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--words", type=int, default=3, help="most words on screen at once (1-3)")
    ap.add_argument("--model", default="small.en")
    ap.add_argument("--device", default="cpu", choices=["cpu", "cuda"])
    args = ap.parse_args()

    ep = episode_dir(args.episode)
    words = transcribe_words(str(ep / "narration.wav"), args.model, args.device)
    script = (ep / "narration.txt").read_text(encoding="utf-8").split()
    if script:
        words = align_to_script(words, script)
    caps = group(words, args.words)
    write_json(ep / "captions.json", {"captions": caps})
    print(f"captions.json: {len(caps)} captions from {len(words)} script words")


if __name__ == "__main__":
    main()
