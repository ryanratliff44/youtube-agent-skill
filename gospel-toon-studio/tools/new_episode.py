"""Create a new episode folder: python tools/new_episode.py <slug> "<title>"."""

import re
import shutil
import sys

from common import STUDIO, write_json


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit('usage: new_episode.py <slug> "<title>"')
    slug = re.sub(r"[^a-z0-9-]+", "-", sys.argv[1].lower()).strip("-")
    title = sys.argv[2] if len(sys.argv) > 2 else slug.replace("-", " ").title()
    dest = STUDIO / "episodes" / slug
    if dest.exists():
        raise SystemExit(f"{dest} already exists")
    shutil.copytree(STUDIO / "episodes" / "_template", dest)
    (dest / "broll").mkdir(exist_ok=True)
    (dest / "notes").mkdir(exist_ok=True)
    write_json(dest / "metadata.json", {"title": title, "description": "", "hashtags": [], "references": []})
    print(dest)


if __name__ == "__main__":
    main()
