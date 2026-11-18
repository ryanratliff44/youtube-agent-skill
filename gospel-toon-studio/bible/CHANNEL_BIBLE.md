# Channel Bible

## Mission
Short, warm, cartoon retellings of the life of Jesus and other Bible stories that are faithful to
scripture, easy for all ages, and leave viewers wanting to read the passage themselves.

## Formats
- **Short (default):** 40–70 s, a funny, fast explainer (title patterns: "Levels of…", "The ___ That…", "Why…"), 9:16, one story or one idea. Posts to TikTok, YouTube Shorts, Instagram Reels.
- **Long (optional):** 4–8 min, 16:9, a full narrative arc (e.g. "The Last Week of Jesus").

## Theology rules (non-negotiable)
1. **Scripture first.** Every scene is anchored to a passage. Cite it on screen (e.g. *Luke 15:11–32*).
2. **Mark what isn't in the text.** Tradition, historical background and imagined details are
   fine, but narration must signal them ("Tradition says…", "Historians believe…").
3. **Quote accurately.** Quote from a public-domain translation (KJV or WEB) unless the owner chooses
   another; note the translation in `script.md`. Do not paraphrase inside quotation marks.
4. **Reverent, never mocking.** Humor comes from human characters (disciples, crowds), never from God or Jesus.
5. **Ecumenical by default.** Avoid denominational disputes unless the episode is about them and the owner asked.
6. **Hard scenes for all ages.** The crucifixion and violence are shown with restraint: silhouettes,
   shadows, reactions, symbolic imagery. No gore.
7. **End with the source.** Close each video with the reference so viewers can read it.

## Voice & tone
**Gen Z storytime.** A fast, casual, attention-grabbing friend telling you the craziest story you've
ever heard. Present tense, short punchy sentences, ~175-190 words per minute. Open with a hook in the
first 2 seconds ("Bro. Professional fishermen thought they were about to die. And Jesus? Asleep.").
Use everyday slang sparingly ("bro", "literally", "dude"), never slang that mocks anyone.
- Humor comes from how the people react (panicking disciples, confused crowds), never from Jesus or God.
- Scripture quotes stay word for word (KJV/WEB); the casual voice goes around them, not inside them.
- Keep the hard parts (crucifixion, death) calm and respectful: drop the slang, slow down.
- No clickbait that misrepresents scripture.
- Default narrator voice: Kokoro `am_liam` (see tools/narrate_kokoro.py).

## Art style (from the owner's favorite references — see references/STYLE_NOTES.md)
Simple "bean people" characters in front of rich, painterly, moodily lit backgrounds.

**Style prompt prefix** (the B-roll artist prepends this to every shot):
> high quality 2D cartoon animation, smooth fluid motion, charming appealing characters with soft
> rounded features, big friendly expressive eyes and simple clean faces, thick clean outlines, vibrant
> but harmonious colors, beautifully detailed painterly background with depth, warm cinematic lighting,
> first-century Judea setting, vertical 9:16 composition, consistent character design

**Negative prompt:**
> ugly, distorted face, deformed, melted, bad anatomy, extra limbs, creepy, scary face, realistic skin,
> photorealistic, 3d render, anime, blurry, low quality, jittery, flickering, text, watermark, logo,
> subtitles, gore, blood, modern clothing, modern buildings, cars, phones

- Aspect: 9:16 (1080×1920) for shorts.
- Shots: alternate wide establishing shot → medium character shot → reaction close-up. Cut every 1.5–3 s.
- Every scene has a lighting idea: golden sunset, lantern glow in a dark room, stormy blue night
  lit by lightning, soft dawn at the tomb.
- Divine moments use a soft warm glow around Jesus, never lens flares or neon.
- Jesus is drawn in the same simple style, with calm and kind expressions. He is never the punchline.

## Characters
Character sheets live in `bible/characters/<id>.md`. Each has a fixed **prompt token** that the
B-roll artist pastes verbatim so the character looks the same in every shot. Add new characters
there before using them.
