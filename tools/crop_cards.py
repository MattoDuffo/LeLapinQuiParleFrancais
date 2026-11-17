"""Cut individual card faces and back illustrations out of the printed sheets.

Card boxes are detected on each sheet's back image (the illustrated cards have
clear edges) and reused for the front image, which is printed on the same grid.
Every card is saved with rounded transparent corners like a real playing card.

Usage: python3 tools/crop_cards.py
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "cards.json"
OUT_FRONT = ROOT / "assets" / "cards"
OUT_BACK = ROOT / "assets" / "backs"
CORNER_RATIO = 0.06  # outer corner radius as a fraction of card width
BORDER_RATIO = 0.035  # white border width as a fraction of the art width
INNER_CORNER_RATIO = 0.025  # small rounding on the art inside the border
OUTLINE = (215, 215, 215, 255)  # faint edge so the white border shows on light backgrounds
INSET = 2  # px trimmed from every edge to drop the soft anti-aliased border


def runs(idx):
    out, start, prev = [], idx[0], idx[0]
    for v in idx[1:]:
        if v != prev + 1:
            out.append((start, prev))
            start = v
        prev = v
    out.append((start, prev))
    return out


def card_boxes(back_path):
    a = np.asarray(Image.open(back_path).convert("RGB")).astype(int)
    diff = np.abs(a - a[5, 5]).sum(2) > 40
    cols = [r for r in runs(np.where(diff.mean(0) > 0.05)[0]) if r[1] - r[0] > 100]
    rows = [r for r in runs(np.where(diff.mean(1) > 0.05)[0]) if r[1] - r[0] > 100]
    assert len(cols) == 6 and len(rows) == 3, (back_path, cols, rows)
    # Use one common card size so every card image is identical in size.
    w = max(c[1] - c[0] for c in cols) + 1
    h = max(r[1] - r[0] for r in rows) + 1
    return {(ri + 1, ci + 1): (c[0] + INSET, r[0] + INSET, c[0] + w - INSET, r[0] + h - INSET)
            for ri, r in enumerate(rows) for ci, c in enumerate(cols)}


def _round_mask(size, radius, scale=4):
    w, h = size
    mask = Image.new("L", (w * scale, h * scale), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, w * scale - 1, h * scale - 1), radius=round(radius * scale), fill=255)
    return mask.resize((w, h), Image.LANCZOS)


def rounded(art):
    """Frame the art in a white border with rounded corners, like a playing card."""
    art = art.convert("RGBA")
    aw, ah = art.size
    b = round(aw * BORDER_RATIO)
    w, h = aw + 2 * b, ah + 2 * b
    art.putalpha(_round_mask(art.size, aw * INNER_CORNER_RATIO))
    outline = Image.new("RGBA", (w, h), OUTLINE)
    white = Image.new("RGBA", (w - 4, h - 4), (255, 255, 255, 255))
    radius = w * CORNER_RATIO
    outline.paste(white, (2, 2), _round_mask(white.size, radius - 2))
    outline.alpha_composite(art, (b, b))
    outline.putalpha(_round_mask((w, h), radius))
    return outline


def main():
    data = json.loads(DATA.read_text())
    OUT_FRONT.mkdir(parents=True, exist_ok=True)
    OUT_BACK.mkdir(parents=True, exist_ok=True)
    boxes, backs_done = {}, set()
    for sheet in data["sheets"]:
        b = card_boxes(ROOT / sheet["back"])
        boxes[sheet["sheet"]] = b
        if sheet["category"] not in backs_done:
            back = Image.open(ROOT / sheet["back"]).crop(b[(1, 1)])
            rounded(back).save(OUT_BACK / f"{sheet['category']}.webp", quality=90, method=6)
            backs_done.add(sheet["category"])
        sheet["backImage"] = f"assets/backs/{sheet['category']}.webp"
    fronts = {s["sheet"]: Image.open(ROOT / s["front"]) for s in data["sheets"]}
    for card in data["cards"]:
        box = boxes[card["sheet"]][(card["row"], card["col"])]
        name = f"{card['id']}.webp"
        rounded(fronts[card["sheet"]].crop(box)).save(OUT_FRONT / name, quality=90, method=6)
        card["frontImage"] = f"assets/cards/{name}"
        card["backImage"] = f"assets/backs/{card['category']}.webp"
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print(f"{len(data['cards'])} card faces, {len(backs_done)} backs")


if __name__ == "__main__":
    main()
