"""Make the app icons from the bunny in the OnSound card art.

Usage: python3 tools/make_icons.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "icons"
CX, CY, SIZE = 168, 705, 280  # bunny head in public/assets/backs/OnSound.webp

art = Image.open(ROOT / "public" / "assets" / "backs" / "OnSound.webp").convert("RGB")
square = art.crop((CX - SIZE // 2, CY - SIZE // 2, CX + SIZE // 2, CY + SIZE // 2))
OUT.mkdir(parents=True, exist_ok=True)
for name, px in [("apple-touch-icon.png", 180), ("bunny-192.png", 192), ("bunny-512.png", 512)]:
    square.resize((px, px), Image.LANCZOS).save(OUT / name, optimize=True)
square.resize((64, 64), Image.LANCZOS).save(OUT / "favicon.png", optimize=True)
print("icons written to", OUT)
