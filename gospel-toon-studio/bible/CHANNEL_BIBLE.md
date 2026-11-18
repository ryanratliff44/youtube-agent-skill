# Channel Bible

## Mission
Short, warm, cartoon retellings of the life of Jesus and other Bible stories that are faithful to
scripture, easy for all ages, and leave viewers wanting to read the passage themselves.

## Formats
- **Short (default):** 40–70 s, a funny, fast explainer (title patterns: "Levels of…", "The ___ That…", "Why…"), 9:16, one story or one idea. Posts to TikTok, YouTube Shorts, Instagram Reels.
- **Long (optional):** 4–8 min, 16:9, a full narrative arc (e.g. "The Last Week of Jesus").

## Theology rules (non-negotiable)
1. **Scripture first.** Every scene is anchored to a passage. Cite it in the video description (e.g. *Luke 15:11–32*), never as text on the screen: the screen is only the story.
2. **Mark what isn't in the text.** Tradition, historical background and imagined details are
   fine, but narration must signal them ("Tradition says…", "Historians believe…").
3. **Quote accurately.** Quote from a public-domain translation (KJV or WEB) unless the owner chooses
   another; note the translation in `script.md`. Do not paraphrase inside quotation marks.
4. **Reverent, never mocking.** Humor comes from human characters (disciples, crowds), never from God or Jesus.
5. **Ecumenical by default.** Avoid denominational disputes unless the episode is about them and the owner asked.
6. **Hard scenes for all ages.** The crucifixion and violence are shown with restraint: silhouettes,
   shadows, reactions, symbolic imagery. No gore.
7. **No scripture text on screen.** Viewers see only the story and the one-word captions. List the references in the description; the narrator may say the book and chapter at the end.

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

**Background prompt prefix** (scenes are built in layers: AI-made background picture + flat 2D character art):
> stylized realistic 3D game environment render, Unreal Engine look, cinematic lighting, volumetric haze,
> detailed textures, moody atmosphere, shallow depth of field, ancient Israel, empty scene, vertical 9:16 composition

**Background negative prompt:**
> people, characters, humans, faces, figures, animals, text, watermark, logo, signature, cartoon, anime,
> drawing, blurry, low quality, deformed, modern buildings, cars, phones

## Background lessons (what works / what failed)
- **Works best:** atmospheric scenes dominated by water, sky and light (e.g. "calm glassy lake under clearing
  clouds, bright stars, moonlight on the water" made the best picture of the first episode).
- **Fails:** objects "beside" or "next to" a thing (a boat "beside the shore" floated in the air). Say where an
  object *rests*: "hull resting in the shallow water at the shore".
- Keep one main subject per background and describe the light and the weather first.
