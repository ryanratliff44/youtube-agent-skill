---
tags: [gospel-toon-studio, unreal]
---
# Unreal plan
Back to [Gospel Toon Studio](Gospel%20Toon%20Studio.md)

- Project `GospelToon` (open-world landscape), level `Valley`. Plugins: Movie Render Queue, Python Editor Script.
- Unreal renders each shot's background as a 9:16 clip; the studio composites the 2D characters, voice and captions.
- `unreal/valley_setup.py`: golden dawn sun, haze, sky light, grade, and a 9:16 camera on the ground that the view
  pilots. Not yet confirmed to run on 5.8.
- Ryan wants Claude to do ALL the Unreal work. A cloud session can't reach his PC, so the plan is a **local Claude
  Code session** started from the Claude desktop app in `gospel-toon-studio`, driving Unreal through Python Remote
  Execution (Edit > Project Settings > Enable Remote Execution). Details in `HANDOFF.md`.
- Still needs Ryan's hands: Epic sign-in, permission prompts, possibly adding free Fab assets to his library.
- Free assets: Poly Haven (CC0) has boulders, cliffs, trees, a stone fire pit, barrels, crates, lanterns, a shield.
