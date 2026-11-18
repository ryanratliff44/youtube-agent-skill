"""Shared helpers for Gospel Toon Studio tools."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

STUDIO = Path(__file__).resolve().parent.parent
BIBLE = STUDIO / "bible"


def load_env() -> None:
    """Load STUDIO/.env into os.environ (simple KEY=VALUE lines, no override)."""
    env = STUDIO / ".env"
    if not env.exists():
        return
    for line in env.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def episode_dir(arg: str) -> Path:
    path = Path(arg)
    if not path.exists():
        path = STUDIO / "episodes" / arg
    if not path.is_dir():
        raise SystemExit(f"Episode folder not found: {arg}")
    return path.resolve()


def read_json(path: Path, default=None):
    if not path.exists():
        if default is not None:
            return default
        raise SystemExit(f"Missing {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def beats(episode: Path) -> list[str]:
    text = (episode / "narration.txt").read_text(encoding="utf-8").strip()
    return [" ".join(p.split()) for p in re.split(r"\n\s*\n", text) if p.strip()]


def _blockquote_after(md: str, label: str) -> str:
    idx = md.find(label)
    if idx < 0:
        return ""
    lines = []
    for line in md[idx:].splitlines()[1:]:
        if line.startswith(">"):
            lines.append(line.lstrip("> ").strip())
        elif lines:
            break
    return " ".join(lines)


def style_prompts() -> tuple[str, str]:
    md = (BIBLE / "CHANNEL_BIBLE.md").read_text(encoding="utf-8")
    return (
        _blockquote_after(md, "**Style prompt prefix**"),
        _blockquote_after(md, "**Negative prompt:**"),
    )


def character_token(char_id: str) -> str:
    sheet = BIBLE / "characters" / f"{char_id}.md"
    if not sheet.exists():
        raise SystemExit(f"No character sheet for '{char_id}' (expected {sheet})")
    return _blockquote_after(sheet.read_text(encoding="utf-8"), "**Prompt token:**")


def background_prompts() -> tuple[str, str]:
    md = (BIBLE / "CHANNEL_BIBLE.md").read_text(encoding="utf-8")
    return (
        _blockquote_after(md, "**Background prompt prefix**"),
        _blockquote_after(md, "**Background negative prompt:**"),
    )
