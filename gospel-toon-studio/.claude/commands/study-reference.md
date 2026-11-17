---
description: Study a reference video and update the style notes the team follows
argument-hint: <path or URL to a reference video>
---

Reference video: $ARGUMENTS

1. If it's a URL, download it into `bible/references/` with `yt-dlp` (personal reference use only).
2. Run `python tools/study_reference.py <file>`. It extracts scene keyframes and a transcript.
3. Look at the keyframes and read the transcript. Note: art style (line, shading, palette), shot
   length and cut rhythm, camera moves, caption font/size/position/animation, narration voice and
   pace (words per minute), hook pattern in the first 3 seconds, music style, ending/CTA.
4. Update `bible/references/STYLE_NOTES.md` with what we should adopt, and adjust the style prompt
   prefix in `bible/CHANNEL_BIBLE.md` if the art direction should change. Learn the style; never copy
   another channel's characters, artwork, script or branding.
5. Summarize for me what changed.
