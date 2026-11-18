"""Build the printable sheets for the Numbers category (0 to 20).

Writes three sheets on the same 3 x 6 grid as the other printed sheets:
  source-sheets/Front_Numbers.png   cards 0-17
  source-sheets/Front_Numbers2.png  cards 18-20 (the other cells are left blank)
  source-sheets/Back_NUMBERS.png    the illustration from Art_Numbers.png in every cell

The fronts are drawn on Front_TEMPLATE.png: French in the top half, English
upside down in the bottom half. The template's placeholder "Lorem" is removed
by keeping the lightest pixel of one cell of the template and of two printed
sheets, whose words sit in different places, so only the shared background
survives; that clean card is then reused for every cell.

Run tools/crop_cards.py afterwards to cut the card images.

Usage: python3 tools/make_number_sheets.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFont

from crop_cards import card_boxes

ROOT = Path(__file__).resolve().parent.parent
SHEETS = ROOT / "source-sheets"
FONT = Path(__file__).resolve().parent / "fonts" / "ComicNeue-Regular.woff"
GRID = SHEETS / "Back_ERSOUNDS.png"  # the template is printed on this grid
CLEAN_FROM = ["Front_ErSound.png", "Front_Vowels.png"]
CLEAN_CELL = (1, 1)  # a cell where both sheets hold a plain French/English card

NUMBERS = [
    ("Zéro", "Zero"), ("Un", "One"), ("Deux", "Two"), ("Trois", "Three"),
    ("Quatre", "Four"), ("Cinq", "Five"), ("Six", "Six"), ("Sept", "Seven"),
    ("Huit", "Eight"), ("Neuf", "Nine"), ("Dix", "Ten"), ("Onze", "Eleven"),
    ("Douze", "Twelve"), ("Treize", "Thirteen"), ("Quatorze", "Fourteen"),
    ("Quinze", "Fifteen"), ("Seize", "Sixteen"), ("Dix-sept", "Seventeen"),
    ("Dix-huit", "Eighteen"), ("Dix-neuf", "Nineteen"), ("Vingt", "Twenty"),
]
FRENCH_Y, ENGLISH_Y = 0.335, 0.745  # text centres as a fraction of card height
FONT_SIZE, MAX_WIDTH = 92, 0.78
ART_CORNER = 0.03  # corner radius of the art on the back sheet, fraction of width


def blank_card(box):
    """One clean card face, used for every cell (all cells share one design)."""
    card = Image.open(SHEETS / "Front_TEMPLATE.png").convert("RGB").crop(box)
    for name in CLEAN_FROM:
        card = ImageChops.lighter(card, Image.open(SHEETS / name).convert("RGB").crop(box))
    return card


def fitted_font(text, width):
    size = FONT_SIZE
    while size > 20:
        font = ImageFont.truetype(str(FONT), size)
        left, _, right, _ = font.getbbox(text)
        if right - left <= width * MAX_WIDTH:
            return font
        size -= 4
    return font


def write_words(card, french, english):
    w, h = card.size
    for text, cy, flip in ((french, FRENCH_Y, False), (english, ENGLISH_Y, True)):
        layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        y = h * (1 - cy) if flip else h * cy  # rotating 180° mirrors the position
        ImageDraw.Draw(layer).text((w / 2, y), text, font=fitted_font(text, w),
                                   fill=(0, 0, 0, 255), anchor="mm")
        if flip:
            layer = layer.rotate(180)
        card.paste(layer, (0, 0), layer)
    return card


def front_sheets(boxes):
    clean = blank_card(boxes[CLEAN_CELL])
    background = Image.open(SHEETS / "Front_TEMPLATE.png").convert("RGB")
    cells = sorted(boxes)  # (row, col) in reading order
    pages = []
    for start in range(0, len(NUMBERS), len(cells)):
        sheet = background.copy()
        for pos in cells:
            box = boxes[pos]
            card = clean.copy()
            i = start + cells.index(pos)
            if i < len(NUMBERS):
                write_words(card, *NUMBERS[i])
            sheet.paste(card, box[:2])
        pages.append(sheet)
    return pages


def trim_border(art):
    """Drop the white frame the illustration was delivered with."""
    a = np.asarray(art.convert("RGB")).astype(int)
    ink = (255 - a).sum(2) > 60
    cols = np.where(ink.mean(0) > 0.6)[0]
    rows = np.where(ink.mean(1) > 0.6)[0]
    inset = 6
    return art.crop((cols[0] + inset, rows[0] + inset, cols[-1] - inset, rows[-1] - inset))


def back_sheet(boxes):
    grid = Image.open(GRID).convert("RGB")
    bg = grid.getpixel((5, 5))
    sheet = Image.new("RGB", grid.size, bg)
    art = trim_border(Image.open(SHEETS / "Art_Numbers.png"))
    x0, y0, x1, y1 = next(iter(boxes.values()))
    # Cover the box exactly, cropping the art evenly if the aspect ratio differs.
    w, h = x1 - x0 + 4, y1 - y0 + 4  # card_boxes trims 2px per edge; undo it
    scale = max(w / art.width, h / art.height)
    art = art.resize((round(art.width * scale), round(art.height * scale)), Image.LANCZOS)
    left, top = (art.width - w) // 2, (art.height - h) // 2
    art = art.crop((left, top, left + w, top + h))
    mask = Image.new("L", (w * 4, h * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w * 4 - 1, h * 4 - 1), radius=w * 4 * ART_CORNER, fill=255)
    mask = mask.resize((w, h), Image.LANCZOS)
    for bx0, by0, _, _ in boxes.values():
        sheet.paste(art, (bx0 - 2, by0 - 2), mask)
    return sheet


def main():
    boxes = card_boxes(GRID)
    for i, page in enumerate(front_sheets(boxes)):
        name = "Front_Numbers.png" if i == 0 else f"Front_Numbers{i + 1}.png"
        page.save(SHEETS / name, optimize=True)
    back_sheet(boxes).save(SHEETS / "Back_NUMBERS.png", optimize=True)
    print(f"{len(NUMBERS)} number cards on {i + 1} front sheets, 1 back sheet")


if __name__ == "__main__":
    main()
