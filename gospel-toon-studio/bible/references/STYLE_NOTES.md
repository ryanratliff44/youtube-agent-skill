# Style notes from reference videos

These notes override the defaults in CHANNEL_BIBLE.md where they differ.

## References (owner's ranking)
| Rank | Video | Channel | Notes |
|---|---|---|---|
| ★ favorite | "The Window That Breaks Japan's Gambling Law" (youtube.com/shorts/eQR3pgMiUF0) | Ricks Clips | **Primary style target** |
| ★ favorite | "Levels of Pirate Cannonballs" (youtube.com/shorts/lnYLIWP2l-I) | Ricks Clips | **Primary style target** |
| ★ favorite | "How One Cart Stopped an Entire Army" (youtube.com/shorts/i4hYq1oSXTg) | Ricks Clips | Same style, clearest example |
| secondary | "Kicked Off The Bus" (youtu.be/tmIE38_v3r0) | brewstewfilms | Flat, crude 2D, 16:9 sketch comedy |
| secondary | "College Party Problems" (youtu.be/kLxH4Swrk8c) | Guad | Cartoon mixed with real meme clips |

Studied from YouTube's preview frames (cover image plus frames at about 25/50/75%). YouTube
blocked full downloads from the cloud server, so pacing and voice below are inferred. Put the MP4s
in this folder and run `tools/study_reference.py` to measure them exactly.

We learn the *style*. We never copy Ricks Clips' characters, backgrounds or scripts.

## Art style (from the two favorites)
- **Characters are minimal "bean people":** a big round head with a flat skin tone, simple dot or
  short-line eyes with expressive brows, a tiny mouth, no nose, a pill-shaped torso in one solid
  color, thin stick arms and legs. Thick dark-brown outlines. Each character is recognizable by one
  or two props or colors (hat, headscarf, beard, robe color).
- **Backgrounds are rich and painterly:** detailed environments with depth, texture and props,
  in a more polished style than the characters. The contrast between simple characters and
  detailed settings is the look.
- **Light sets the mood:** warm interiors, glowing doorways, purple/orange sunset skies, blue night
  scenes with one warm light source. Every scene has a clear lighting idea.
- **Action beats:** debris and particles (wood splinters, splashes), quick close-ups on a
  character's face for reactions, and a cutaway "diagram" shot for explaining how something works.
- Faces react big (smug half-smile, panicked wide eyes, side-eye) while bodies stay simple.

## Format & hook pattern
- Funny, fast **explainers** in a story. Title formulas that fit our channel:
  - "Levels of …" (*Levels of Miracles Jesus Did*, *Levels of Faith in the Bible*)
  - "The ___ That …" (*The Boat That Should Have Sunk*, *The Tax Collector Who Climbed a Tree*)
  - "Why …" / "How …" (*Why Fishermen Panicked but Jesus Slept*)
- The first frame shows the main character with the key prop in a strong setting (hook frame = thumbnail).
- Humor comes from people's reactions (disciples, crowds, Pharisees), never from God or Jesus (see the Bible's rules).

## Pacing (estimated)
- Vertical 9:16, roughly 40–70 s.
- Cuts every ~1.5–3 s, alternating wide establishing shots, medium character shots and reaction close-ups.

## Captions
- **One word at a time**, centered horizontally, about 65–70% down the screen.
- Bold white sans-serif, thick black outline, no box. Medium size (≈ 1/4 screen width per word).
- Lowercase as spoken; punctuation kept ("see," / "Japan.").

## Narration
- One storyteller voice, conversational and confident, quick (about 170–190 wpm), with
  light humor in the delivery. Characters seldom speak on screen.

## Music
- Light, playful background bed under the voice; drops out or hits on punchlines. (Inferred.)

## From the secondary references
- *Kicked Off The Bus*: crude flat 2D in 16:9 and slow. Not for us, except a bold title card for long-form.
- *College Party Problems*: mixes in real-world meme clips. **Don't use** (copyright, and it clashes with the tone).

## Key finding: how the favorites are really made (from "How One Cart Stopped an Entire Army")
- **Two layers.** Flat 2D "bean" characters (round head, dot eyes, stick limbs, one solid-color body,
  hats/armor as the identifier) are placed over **real-time 3D-rendered environments** (game-engine look:
  realistic grass, stone walls, volumetric light, sky, mountains). It is NOT one AI-generated video.
- The characters barely animate: slides, bobs, head turns, blinks. The camera and cuts carry the motion.
  Crowd shots repeat the same character many times. Banners and props identify factions.
- Captions: one or two words at a time, white with black outline, lower-middle of frame.
- **What this means for us:** a text-to-video model will not match this. The reliable way to match it is a
  layered pipeline: (1) one still background image per scene, (2) a small set of consistent 2D character
  sprites, (3) simple motion in the editor (slide, bob, zoom, parallax). It is also much faster and
  fluid, and characters stay identical in every shot.

## Measured from the real file: "How One Cart Stopped an Entire Army" (15 s, 1080x1920, 30 fps)
(Watched via tools/watch_video.py picture sheets. Audio could not be heard; sound notes come from loudness only.)
- **Starts mid-action at frame 1.** No title card, no fade-in. The first caption word shows at 0.0 s.
- **Fast hook:** in the first 3 s the picture changes about 6 times (a new camera angle every ~0.5 s): wide
  of the character, quick zoom onto his face, extreme close-up of the prop, cutaway to the wall, a
  pagoda, then a wide landscape. After the hook, angles last about 1-1.5 s; one 3 s stretch holds a single
  shot while expressions change. Overall about 12 angles in 15 s (average ~1.2 s).
- **Angles are camera moves in a 3D scene** (push-in, crane, close-up on a prop), not just zooms on a flat
  image. Close-ups on faces when someone speaks. Characters barely move; faces carry the emotion.
- **Captions:** exactly one word at a time, bold white sans-serif with a thick black outline, no box, centered
  horizontally at about 70% of the height. Roughly 3.3 words a second (about 190-200 wpm). Timed to the word.
- **Characters:** big round head (about a third of the body height), small dot eyes with heavy lids or
  brows doing the acting, tiny mouth, tiny hands, thin stick legs, a flat colored bean body with clothing
  details (patterns, armor, belts). Faces are plain and pale; props and clothes identify the role.
- **Backgrounds:** bright, sunny, saturated 3D look with real depth (grass, stone, sky, hills), strong
  directional light and shallow haze. Characters sit on it with thin outlines and no outlined background.
- **Sound:** loudness stays between about -15 and -22 dB the whole way with no big dips: a steady music or
  effects bed under constant narration. No silences.
- **Humor:** deadpan one-liners ("Are we fighting them or cheese?"), delivered straight.

## What the studio now does about it
- Auto angle cuts: `tools/build_timeline.py` splits every scene into quick camera angles (0.8 s in the first
  3 s, 1.6 s after): wide, face close-up, medium, second face. `--hook-shot` and `--max-shot` change this.
- Characters stay put while the camera moves, like the reference. Captions sit at about 67-70% height.

## Second clip, 34 s (same channel, same video, longer cut): what it adds
- **Story shape:** deadpan hook line -> the problem, with characters talking to each other -> a long
  cinematic stretch **explaining how the thing works** with no characters at all (tight macro shots of the
  mechanism, speed ramps, bursts of light) -> a dry punchline with one character smirking in front of the
  explosion. About half the runtime is "explainer" shots with no characters.
- **Scene changes use short dissolves (~0.2-0.5 s);** angle changes inside a scene are hard cuts.
- **Mood changes through the story:** rainy night with warm lanterns -> golden sunset -> bright day.
  Haze, glow and bloom on light sources; saturated, high-contrast color.
- **Several characters per shot** (2-4, crowds of dozens) with a different expression on each; the speaker's
  face changes every word (mouth open/closed, brows) so he looks like he is talking.
- **Captions** again one word at a time at ~70% height, sentence punctuation kept ("umbrella.", "rocket.").
- **Sound level** again steady (-15 to -21 dB, no drops): one constant bed under narration.

## Studio changes from this clip
- New scenes now dissolve in (0.2 s); angle changes stay hard cuts. (editor)
- Next: mouth-flap talking animation, a no-character "explainer" scene type, and a music bed.

## KEY STYLE RULE (from "Why Samurai Feared The Flying Thunder", 30 s)
**Fake, flat characters in a realistic world.** The characters are deliberately NOT realistic and NOT shaded:
- Pure white (never skin-colored) round faces; thick black outline; black dot eyes with heavy half-closed lids
  and thick brows; tiny mouth; no cheeks/blush/sparkles.
- Thin black stick arms and legs, tiny black hands. A flat-colored bean body with a few clothing details.
- Flat, unlit look; they are dimmed to match the light of the scene, nothing more.
Everything around them is realistic: real materials (wood grain, cloth, stone), real water and sky, volumetric
clouds, a moon, fire and smoke, interiors with props and rugs. The contrast is the style.
- Many characters in one shot (3-4 seated around a fire), each with its own expression.
- Camera: wide establishing shot, a drone-like fly-over, then medium shots of the speaker; close-ups for punchlines.
