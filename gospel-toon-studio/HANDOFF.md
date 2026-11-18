# Gospel Toon Studio: handoff

Everything a new session needs to continue this project. Read this first, then `CLAUDE.md` and
`bible/CHANNEL_BIBLE.md`.

## The goal
A team of AI agents (scriptwriter, narrator, B-roll artist, editor, publisher) that makes short vertical
cartoon videos about the life of Jesus and other Bible stories, and posts them to TikTok, YouTube Shorts and
Instagram Reels. The owner wants to make many videos over the coming years, so the pipeline must be repeatable.

## Where the code is
- GitHub repo `ryanratliff44/youtube-agent-skill`, branch `claude/tender-mendel-2sb14y`, folder `gospel-toon-studio/`.
- Last commit at handoff: `565f0d9` ("Restart: flat 2D character kit ...").
- On the owner's Windows PC it is cloned at `C:\Users\<you>\youtube-agent-skill\gospel-toon-studio`.

## The owner (how to work with them)
- Not technical. Give one small step at a time, exact commands to paste, and say what they should see.
  They send phone photos of the screen; read those carefully.
- They want results that look like their references, and they are frustrated by versions that miss.
  Before building a whole video, show one frame and get approval (see "Plan" below).
- Be honest about what was and was not tested.

## The look they want (most important)
References (Ricks Clips channel and similar): "How One Cart Stopped an Entire Army", "Levels of Pirate
Cannonballs", "The Window That Breaks Japan's Gambling Law", and "Why Samurai Feared The Flying Thunder".
Owner chose a **mix of both styles** (Samurai night look and the sunny Ricks Clips day look).
Details are in `bible/references/STYLE_NOTES.md`. In short:
- **Characters are fake and flat:** pure white round faces (never skin color, no blush), thick black outline,
  dot eyes with heavy half-closed lids and thick brows, small mouth, thin black stick arms and legs, flat
  colored clothes. Big readable expressions: toothy grins, smirks, wide ring eyes when shocked.
- **The world around them looks realistic:** game-engine look with real materials, light, haze, moon, fire.
- One word of caption at a time, bold white with black outline, about 70% down the screen.

## Owner feedback that must not be repeated
- One quick zoom at the very start onto the main character; after that NO random cuts or zoom jumps.
  Cuts only when the story changes. Then keep attention with the characters' movement and faces.
- Characters must not jump, flail or look frantic. Movement natural and human: weight shifts, small gestures.
- Facial expressions must match what the narrator is saying at that moment.
- Every shot must have a character in it. No empty landscapes, no unrelated scenes.
- Each shot must show what the narration is talking about (shots are pinned to narration words).
- No scripture text on screen. References go in the video description only.
- Clothing must read as robes/tunics, not "a barrel" (no vertical stripes on a capsule body).
- They disliked: the AI text-to-video clips (looked "AI"), the full 3D code-built version (looked too simple and
  "nothing like" the references).

## Current method (v2, after a restart)
1. **Voice:** Kokoro TTS, voice `am_liam` (young, energetic "Gen Z storytime" narrator). Own Python env
   `.venv-kokoro`. Command: `python tools/narrate_kokoro.py episodes/<slug>`.
2. **Captions:** faster-whisper word timings, main env `.venv`: `python tools/captions.py episodes/<slug>`.
3. **Backgrounds:** one AI picture per shot (no people in it). `python tools/broll.py episodes/<slug>` sends
   prompts to ComfyUI with `comfy/sdxl_bg_api.json` (SDXL base). Owner is considering **Higgsfield** instead
   (better image models, paid, manual). Any picture saved as `episodes/<slug>/broll/<shot id>.png` is used.
4. **Timeline:** `python tools/build_timeline.py episodes/<slug>`. Every shot in `shotlist.json` has `at` =
   the first words of the narration sentence where it starts; the first shot gets the opening zoom.
5. **Render:** Remotion editor in `editor/`. `python tools/render.py episodes/<slug> --preview 10`, then full.
   Characters: `editor/src/two/Char2D.tsx` (david, goliath, saul, soldier, israelite, jesus, peter, john,
   mary, crowd) with emotions neutral, calm, warm, joy, laugh, fear, panic, anger, sad, awe, sleep, smug,
   command. Actor options in a shot: `char`, `emotion`, `x`, `y`, `scale`, `flip`, `fall`; shot `speaker`
   makes that character's mouth move.
6. **Publish:** `python tools/publish.py episodes/<slug>` (dry run; `--publish` only after owner says yes).
   Accounts not connected yet.
- The older 3D engine (`editor/src/world/`) still exists but is not used by default.

## Episode in progress: David and Goliath (`episodes/david-and-goliath`)
- Script (Gen Z voice, KJV quotes 1 Sam 17:43 and 17:45 verbatim) in `narration.txt`, notes in `script.md`.
- 18 shots in `shotlist.json`, each pinned to narration words, with background prompts and characters.
- Verified in the cloud with placeholder backgrounds only.

## Owner's PC (Windows, already set up)
- GPU: NVIDIA RTX 4060 (8 GB). 32 GB RAM. Large drive.
- ComfyUI Desktop installed (local instance, port 8188). Manager enabled. WanVideoWrapper + VideoHelperSuite
  installed. Wan 2.1 1.3B T2V model, umt5 text encoder and Wan VAE downloaded and working.
- Models folder: `%LOCALAPPDATA%\Comfy-Desktop\ComfyUI-Shared\models`.
- Installed: Python 3.11 (via `py -3.11`), Node.js, ffmpeg, Git, Claude Code. PowerShell scripts allowed.
- Use `python -m pip ...` (plain `pip` fails in the venv). `.env` holds `COMFYUI_URL=http://127.0.0.1:8188`
  and `REMOTION_BROWSER=C:\Program Files\Google\Chrome\Application\chrome.exe` (Remotion could not download
  its own browser).

## Where we stopped
The owner was about to download the SDXL model
(`https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors`,
about 7 GB, into `models\checkpoints`) and asked whether Higgsfield would be better.
Recommendation given: make the first David and Goliath background (`s01`) both ways, compare, keep the winner.

## Plan (one approval at a time)
1. One background picture (`s01`) that matches the references. Approve.
2. All backgrounds for David and Goliath. Approve.
3. A 10-second preview with voice, characters and captions. Approve.
4. Full video, then set up posting accounts and publish.
5. Later: music bed, more characters/places, a batch queue for many videos.
