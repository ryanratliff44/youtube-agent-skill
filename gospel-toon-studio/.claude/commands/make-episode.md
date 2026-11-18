---
description: Make a full cartoon Bible episode with the whole team (script → voice + B-roll → edit → publish)
argument-hint: <topic, e.g. "Jesus feeds the 5,000">
---

Produce an episode about: $ARGUMENTS

Follow CLAUDE.md as the Producer:
1. Pick a short kebab-case slug and run `python tools/new_episode.py <slug> "<title>"`.
2. Use the **scriptwriter** agent. Show me the script, references and shot list, then wait for my approval
   unless I wrote "auto".
3. Run the **narrator** and **broll-artist** agents in parallel.
4. Run the **editor** agent, then show me the final video path, duration and three frames.
5. Run the **publisher** agent as a dry run and wait for my "publish" before posting.
