# Gospel Toon Studio

A five-agent Claude Code team that makes cartoon videos about the life of Jesus and other Bible
stories, then posts them to TikTok, YouTube Shorts and Instagram Reels.

| Agent | What it does | Tool underneath |
|---|---|---|
| **Scriptwriter** | Scripture-accurate script, shot list, titles, hashtags | Claude + KJV/WEB text |
| **Narrator** | Warm voice-over in a consistent (optionally cloned) voice + word-timed captions | Chatterbox TTS, faster-whisper |
| **B-roll Artist** | Painted background picture for every scene (the characters are drawn once and reused) | Wan on ComfyUI (WanVideoWrapper) |
| **Editor** | Cuts it together: motion, captions, scripture cards, music, thumbnail | Remotion |
| **Publisher** | Platform-tailored captions and uploads; dry run first, posts only on your OK | tiktok-uploader, YouTube Data API, Instagram Graph API |

Claude itself plays **Producer** (see `CLAUDE.md`): it runs the team, stops for your approval of the
script and before anything is posted.

## Use it

```bash
cd gospel-toon-studio
claude
```
Then:
```
/make-episode Jesus feeds the 5,000
/study-reference https://www.tiktok.com/@somechannel/video/123   # or a file you drop in bible/references/
```
You can also call one agent directly: "use the scriptwriter to rewrite the hook of jesus-calms-the-storm".

An example episode (script, narration text, shot list, metadata) is in
`episodes/jesus-calms-the-storm/` — ready for the narrator and B-roll artist.

## One-time setup (on your computer)

1. **Python tools:** `pip install -r requirements.txt` (Python 3.10+, ffmpeg on PATH).
2. **Editor:** Node 18+. `tools/render.py` installs Remotion on first run.
3. **B-roll:** a GPU machine with ComfyUI + WanVideoWrapper; export a workflow as described in
   `comfy/README.md`. No GPU? The artist can drop still images in `broll/` and the editor animates them.
4. **Voice (optional):** `bible/voice/narrator_ref.wav`, 10–20 s of the voice you want.
5. **Accounts:** `cp .env.example .env` and fill it in (TikTok cookies, YouTube OAuth client, Instagram
   Business account token). Secrets go in `secrets/`, which is git-ignored.

## The house rules
`bible/CHANNEL_BIBLE.md` holds the theology rules (scripture first, mark tradition as tradition,
reverent, restrained violence), the art-style prompt, and the voice. `bible/characters/` keeps every
character looking the same. Edit those files to change the channel; every agent reads them.

## Pipeline by hand
```bash
python tools/new_episode.py <slug> "<title>"
python tools/narrate.py   episodes/<slug>
python tools/captions.py  episodes/<slug>
python tools/broll.py     episodes/<slug> --dry-run   # then without --dry-run
python tools/build_timeline.py episodes/<slug>
python tools/render.py    episodes/<slug>
python tools/publish.py   episodes/<slug>             # dry run; add --publish to post
```
