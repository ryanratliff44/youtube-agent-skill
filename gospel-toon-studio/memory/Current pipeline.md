---
tags: [gospel-toon-studio, how-to]
---
# Current pipeline
Back to [Gospel Toon Studio](Gospel%20Toon%20Studio.md)

All commands run in PowerShell in `C:\Users\immar\youtube-agent-skill\gospel-toon-studio`.

1. Voice, in `.venv-kokoro`: `python tools/narrate_kokoro.py episodes/<slug>`
2. Captions, in `.venv` (main): `python tools/captions.py episodes/<slug>` (exact script words, 1-3 per caption)
3. Backgrounds: Unreal clip saved as `episodes/<slug>/broll/<shot>.mp4` (preferred), or a picture `<shot>.png`
   (`python tools/broll.py episodes/<slug>` makes SDXL pictures through ComfyUI).
4. Layout: `python tools/build_timeline.py episodes/<slug>` (shots pinned by `at` = first words of the sentence).
5. Render: `python tools/render.py episodes/<slug> --preview 10`, then without `--preview`.
6. Post: `python tools/publish.py episodes/<slug>` (dry run), `--publish` only after Ryan approves.

Rule: `.venv-kokoro` only for the voice; everything else in `.venv`. Use `python -m pip`, not `pip`.
Other tools: `tools/watch_video.py` turns any video into frame sheets + a report so Claude can "watch" it.
