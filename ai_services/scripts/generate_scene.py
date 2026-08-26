"""
Dev-time asset generation for the case-file/detective-board desk scene.

This is NOT part of the running app -- it's a one-off (re-runnable) tool
that produces the base background photo used by the frontend's escape-room
desk view. Run it manually, review the output, and only move an approved
image into frontend/public/scenes/ by hand. Draft output lands in
ai_services/generated/ (gitignored) so iteration doesn't pollute git
history.

Usage:
    ai_services/.venv/Scripts/python.exe ai_services/scripts/generate_scene.py [name]
"""

import base64
import sys
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=_ROOT / ".env")

OUT_DIR = _ROOT / "generated"

BASE_SCENE_PROMPT = """
A photorealistic wide photograph of a single cybersecurity SOC analyst's
desk at night, shot straight-on at eye level, symmetrical composition,
35mm lens, shallow depth of field with the far background softly blurred
and the desk surface in sharp focus.

Background: a dark server rack partially visible on the left edge; a cork
bulletin board and a whiteboard behind the desk showing only abstract
diagram lines, boxes, and unreadable scribble marks -- absolutely no
legible text, words, letters, or logos anywhere in the image.

Center-back: three identical widescreen monitors on articulating desk
arms. All three screens are OFF / in a dim standby state -- a faint dark
teal-green glow only, no readable interface, no visible UI, no icons, no
text on any screen.

Desk surface: dark worn walnut wood. On it: a mechanical keyboard, a
mouse, a closed black desk phone, an empty black ceramic mug, an
adjustable desk lamp that is switched OFF, and a small stack of blank
plain manila folders pushed to one side.

Reserve a clear, empty, evenly-lit rectangular area in the lower-left
third of the desk with absolutely nothing on it -- bare wood only, no
objects, no strong shadows crossing it -- this area will have items
composited onto it later, so it must stay clean and well lit, not dark
or underexposed.

Lighting: moody, cool dark teal-green ambient glow from the standby
monitors, low-key but with the reserved empty desk area still clearly
and evenly visible.

Style: realistic photography, not illustration, not a 3D render, not
CGI. No text anywhere in the frame. No people, no hands, no arms.
""".strip()


def generate(prompt: str, out_name: str) -> Path:
    client = OpenAI()
    result = client.images.generate(
        model="gpt-image-1",
        prompt=prompt,
        size="1536x1024",
        n=1,
    )
    image_bytes = base64.b64decode(result.data[0].b64_json)

    OUT_DIR.mkdir(exist_ok=True)
    out_path = OUT_DIR / out_name
    out_path.write_bytes(image_bytes)
    return out_path


if __name__ == "__main__":
    name = sys.argv[1] if len(sys.argv) > 1 else "desk_base_v1.png"
    path = generate(BASE_SCENE_PROMPT, name)
    print(f"Saved: {path}")
