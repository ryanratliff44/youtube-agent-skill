"""Draw the channel's flat 2D "bean" characters as SVG sprites: assets/characters/<id>_<expression>.svg

python tools/make_characters.py

Characters are defined in CHARACTERS below. Add a new one by adding an entry; expressions are shared.
Sprites are 300x560 with the feet at the bottom edge, so the editor can stand them on a floor line.
"""

from __future__ import annotations

from pathlib import Path

from common import STUDIO

OUT = STUDIO / "assets" / "characters"
INK = "#2b1b12"
SKIN = {"light": "#f2c9a0", "olive": "#d9a273", "tan": "#c98f5e"}

CHARACTERS = {
    "jesus": dict(skin="olive", robe="#f3ead8", sash="#3f6fb5", hair="#5a3a22", style="long", beard="#5a3a22"),
    "peter": dict(skin="tan", robe="#9b6b3c", sash="#6b4423", hair="#2c1b12", style="curly", beard="#2c1b12", beard_big=True),
    "john": dict(skin="olive", robe="#d8c196", sash="#8a6d3b", hair="#4a3322", style="short", beard=None),
    "mary": dict(skin="olive", robe="#f3ead8", sash=None, hair=None, style="veil", beard=None, veil="#3f6fb5"),
    "crowd": dict(skin="light", robe="#7d8f5a", sash="#5b6a3e", hair="#6b4a2a", style="short", beard=None),
}


def face(expr: str, mc: str = INK) -> str:
    eyes_open = f'<circle cx="124" cy="92" r="7.5" fill="{INK}"/><circle cx="176" cy="92" r="7.5" fill="{INK}"/>'
    eyes_closed = (f'<path d="M114 94 q10 8 20 0" stroke="{INK}" stroke-width="5" fill="none" stroke-linecap="round"/>'
                   f'<path d="M166 94 q10 8 20 0" stroke="{INK}" stroke-width="5" fill="none" stroke-linecap="round"/>')
    brow = lambda l, r: (f'<path d="{l}" stroke="{INK}" stroke-width="5" fill="none" stroke-linecap="round"/>'
                         f'<path d="{r}" stroke="{INK}" stroke-width="5" fill="none" stroke-linecap="round"/>')
    flat = brow("M112 76 q12 -5 24 0", "M164 76 q12 -5 24 0")
    mouth = lambda d: f'<path d="{d}" stroke="{mc}" stroke-width="5" fill="none" stroke-linecap="round"/>'
    if expr == "smile":
        return eyes_open + flat + mouth("M132 120 q18 16 36 0")
    if expr == "worried":
        return (f'<circle cx="124" cy="94" r="8.5" fill="{INK}"/><circle cx="176" cy="94" r="8.5" fill="{INK}"/>'
                + brow("M110 80 q12 -2 26 -12", "M164 68 q14 10 26 12") + mouth("M134 126 q8 -9 16 0 q8 9 16 0"))
    if expr == "surprised":
        return (f'<circle cx="124" cy="92" r="10" fill="#fff" stroke="{INK}" stroke-width="4"/><circle cx="124" cy="92" r="4.5" fill="{INK}"/>'
                f'<circle cx="176" cy="92" r="10" fill="#fff" stroke="{INK}" stroke-width="4"/><circle cx="176" cy="92" r="4.5" fill="{INK}"/>'
                + brow("M110 68 q12 -9 26 0", "M164 68 q12 -9 26 0") + f'<ellipse cx="150" cy="124" rx="9" ry="12" fill="{mc}"/>')
    if expr == "asleep":
        return eyes_closed + mouth("M140 122 q10 6 20 0")
    if expr == "angry":
        return eyes_open + brow("M110 70 q14 6 26 10", "M164 80 q14 -4 26 -10") + mouth("M134 126 q16 -10 32 0")
    if expr == "calm":
        return eyes_open + brow("M112 74 q12 -4 24 0", "M164 74 q12 -4 24 0") + mouth("M138 122 q12 6 24 0")
    return eyes_open + flat + mouth("M138 122 l24 0")  # neutral


def hair_back(c: dict) -> str:
    if c["style"] == "long":
        return f'<path d="M78 100 q-8 -66 72 -70 q80 4 72 70 l6 76 q-16 14 -34 6 l-4 -60 l-80 0 l-4 60 q-18 8 -34 -6z" fill="{c["hair"]}" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>'
    if c["style"] == "veil":
        return f'<path d="M74 104 q-4 -78 76 -80 q80 2 76 80 l10 120 q-86 24 -172 0z" fill="{c["veil"]}" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>'
    return ""


def hair_front(c: dict) -> str:
    s = c["style"]
    if s == "long":
        return f'<path d="M82 88 q4 -52 68 -54 q64 2 68 54 q-34 -28 -68 -22 q-34 -6 -68 22z" fill="{c["hair"]}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
    if s == "curly":
        return "".join(f'<circle cx="{x}" cy="{y}" r="22" fill="{c["hair"]}" stroke="{INK}" stroke-width="5"/>'
                       for x, y in [(96, 52), (122, 38), (150, 34), (178, 38), (204, 52), (84, 80), (216, 80)])
    if s == "short":
        return f'<path d="M80 84 q2 -50 70 -52 q68 2 70 52 q-22 -22 -70 -22 q-48 0 -70 22z" fill="{c["hair"]}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
    if s == "veil":
        return f'<path d="M80 80 q4 -50 70 -52 q66 2 70 52 q-30 -26 -70 -24 q-40 -2 -70 24z" fill="{c["veil"]}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
    return ""


def beard(c: dict) -> str:
    if not c.get("beard"):
        return ""
    if c.get("beard_big"):
        return f'<path d="M84 112 q4 62 66 64 q62 -2 66 -64 q-22 28 -66 26 q-44 2 -66 -26z" fill="{c["beard"]}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
    return f'<path d="M96 118 q6 48 54 50 q48 -2 54 -50 q-20 22 -54 20 q-34 2 -54 -20z" fill="{c["beard"]}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'


def sprite(name: str, c: dict, expr: str) -> str:
    skin = SKIN[c["skin"]]
    limb = f'stroke="{INK}" stroke-width="16" stroke-linecap="round" fill="none"'
    glow = ('<defs><radialGradient id="g"><stop offset="0" stop-color="#fff3b0" stop-opacity=".75"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0"/></radialGradient></defs>'
            '<circle cx="150" cy="250" r="147" fill="url(#g)"/>') if c.get("glow") else ""
    sash = (f'<rect x="96" y="268" width="108" height="26" fill="{c["sash"]}" stroke="{INK}" stroke-width="6"/>' if c.get("sash") else "")
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 560" width="300" height="560">
{glow}
<path d="M130 400 L126 530" {limb}/><path d="M170 400 L174 530" {limb}/>
<ellipse cx="120" cy="540" rx="26" ry="12" fill="#3b2a1c" stroke="{INK}" stroke-width="6"/><ellipse cx="180" cy="540" rx="26" ry="12" fill="#3b2a1c" stroke="{INK}" stroke-width="6"/>
<path d="M104 206 L58 322" {limb}/><path d="M196 206 L242 322" {limb}/>
<circle cx="56" cy="328" r="14" fill="{skin}" stroke="{INK}" stroke-width="6"/><circle cx="244" cy="328" r="14" fill="{skin}" stroke="{INK}" stroke-width="6"/>
{hair_back(c)}
<rect x="92" y="176" width="116" height="236" rx="58" fill="{c["robe"]}" stroke="{INK}" stroke-width="8"/>
{sash}
<circle cx="150" cy="96" r="72" fill="{skin}" stroke="{INK}" stroke-width="8"/>
{beard(c)}
{hair_front(c)}
{face(expr, "#f6dcc0" if c.get("beard") else INK)}
</svg>'''


EXPRESSIONS = ["neutral", "smile", "worried", "surprised", "asleep", "angry", "calm"]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    n = 0
    for name, c in CHARACTERS.items():
        for expr in EXPRESSIONS:
            (OUT / f"{name}_{expr}.svg").write_text(sprite(name, c, expr), encoding="utf-8")
            n += 1
    print(f"wrote {n} sprites to {OUT}")


if __name__ == "__main__":
    main()
