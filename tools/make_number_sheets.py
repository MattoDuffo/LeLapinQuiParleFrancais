"""Build the printable sheets and card data for the Numbers category.

Writes sheets on the same 3 x 6 grid as the other printed sheets:
  source-sheets/Front_Numbers.png, Front_Numbers2.png, ...  18 cards per sheet,
      in the order of NUMBERS (cells after the last card are left blank)
  source-sheets/Back_NUMBERS.png    the illustration from Art_Numbers.png in every cell
and replaces the Numbers sheets and cards in data/cards.json (sheets I, J, K...).
Card ids follow the sheet position, so keep adding new numbers at the end of
NUMBERS: reordering would move saved progress onto different numbers.

The fronts are drawn on Front_TEMPLATE.png: French in the top half, English
upside down in the bottom half. The template's placeholder "Lorem" is removed
by keeping the lightest pixel of one cell of the template and of two printed
sheets, whose words sit in different places, so only the shared background
survives; that clean card is then reused for every cell.

Run tools/crop_cards.py afterwards to cut the card images.

Usage: python3 tools/make_number_sheets.py
"""
import json
from itertools import combinations
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFont

from crop_cards import card_boxes

ROOT = Path(__file__).resolve().parent.parent
SHEETS = ROOT / "source-sheets"
DATA = ROOT / "data" / "cards.json"
FIRST_SHEET = "I"  # sheets A-H are the original printed sets
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
    ("Trente", "Thirty"), ("Quarante", "Forty"), ("Cinquante", "Fifty"),
    ("Soixante", "Sixty"), ("Soixante-dix", "Seventy"), ("Quatre-vingts", "Eighty"),
    ("Quatre-vingt-dix", "Ninety"), ("Cent", "One hundred"), ("Trois cents", "Three hundred"),
    ("Sept cents", "Seven hundred"), ("Mille", "One thousand"),
    ("Mille cinq cents", "Fifteen hundred"), ("Vingt-trois", "Twenty-three"),
    ("Trente-neuf", "Thirty-nine"), ("Quarante-huit", "Forty-eight"),
    ("Cinquante et un", "Fifty-one"), ("Soixante-quatre", "Sixty-four"),
    ("Soixante-treize", "Seventy-three"), ("Quatre-vingt-deux", "Eighty-two"),
    ("Quatre-vingt-quinze", "Ninety-five"),
    ("Mille neuf cent quatre-vingt-cinq", "Nineteen eighty-five"),
]
FRENCH_Y, ENGLISH_Y = 0.335, 0.745  # text centres as a fraction of card height
FONT_SIZE, MAX_WIDTH = 92, 0.86
MIN_SIZE = 80  # use more lines (up to MAX_LINES) rather than a font smaller than this
MAX_LINES = 3
LINE_GAP = 1.1  # line height as a multiple of the font size
ART_CORNER = 0.03  # corner radius of the art on the back sheet, fraction of width


def blank_card(box):
    """One clean card face, used for every cell (all cells share one design)."""
    card = Image.open(SHEETS / "Front_TEMPLATE.png").convert("RGB").crop(box)
    for name in CLEAN_FROM:
        card = ImageChops.lighter(card, Image.open(SHEETS / name).convert("RGB").crop(box))
    return card


def _fit(lines, width):
    """Largest font (in steps of 2) at which every line fits the card."""
    for size in range(FONT_SIZE, 20, -2):
        font = ImageFont.truetype(str(FONT), size)
        if all(font.getlength(line) <= width * MAX_WIDTH for line in lines):
            return font
    return font


def _splits(text, count):
    """Every way to break the words into `count` lines, after a space or hyphen."""
    breaks = [i + 1 for i, ch in enumerate(text) if ch in " -"]
    for cut in combinations(breaks, count - 1):
        edges = (0, *cut, len(text))
        yield [text[a:b].strip() for a, b in zip(edges, edges[1:])]


def layout(text, width):
    """Font and lines for the words: as few lines as keep the font at least
    MIN_SIZE, preferring breaks at spaces over breaks inside hyphenated words."""
    best = None
    for count in range(1, MAX_LINES + 1):
        for lines in _splits(text, count):
            # A line ending in a hyphen counts as slightly smaller, so spaces win ties.
            font = _fit(lines, width)
            score = font.size - 4 * sum(line.endswith("-") for line in lines)
            if best is None or score > best[0]:
                best = (score, font, lines)
        if best[1].size >= MIN_SIZE:
            break
    return best[1], best[2]


def write_words(card, french, english):
    w, h = card.size
    for text, cy, flip in ((french, FRENCH_Y, False), (english, ENGLISH_Y, True)):
        layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        y = h * (1 - cy) if flip else h * cy  # rotating 180° mirrors the position
        font, lines = layout(text, w)
        step = font.size * LINE_GAP
        draw = ImageDraw.Draw(layer)
        for n, line in enumerate(lines):
            draw.text((w / 2, y + (n - (len(lines) - 1) / 2) * step), line, font=font,
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


def front_name(page):
    return "Front_Numbers.png" if page == 1 else f"Front_Numbers{page}.png"


def update_data(boxes, pages):
    data = json.loads(DATA.read_text())
    data["sheets"] = [s for s in data["sheets"] if s["category"] != "Numbers"]
    data["cards"] = [c for c in data["cards"] if c["category"] != "Numbers"]
    data["categories"] = [c for c in data["categories"] if c["id"] != "Numbers"]
    cells = sorted(boxes)
    back = "assets/backs/Numbers.webp"
    for page in range(1, pages + 1):
        letter = chr(ord(FIRST_SHEET) + page - 1)
        data["sheets"].append({
            "sheet": letter, "category": "Numbers", "page": page,
            "front": f"source-sheets/{front_name(page)}", "back": "source-sheets/Back_NUMBERS.png",
            "backImage": back, "description": f"Les nombres, page {page}"})
    for i, (french, english) in enumerate(NUMBERS):
        page, (row, col) = i // len(cells) + 1, cells[i % len(cells)]
        letter = chr(ord(FIRST_SHEET) + page - 1)
        card_id = f"{letter}-r{row}c{col}"
        data["cards"].append({
            "id": card_id, "sheet": letter, "category": "Numbers", "page": page,
            "row": row, "col": col, "french": french, "english": english, "type": "vocab",
            "directions": ["fr-en", "en-fr"], "frontImage": f"assets/cards/{card_id}.webp",
            "backImage": back})
    data["categories"].append({"id": "Numbers", "pages": pages})
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def main():
    boxes = card_boxes(GRID)
    pages = front_sheets(boxes)
    for page, sheet in enumerate(pages, 1):
        sheet.save(SHEETS / front_name(page), optimize=True)
    back_sheet(boxes).save(SHEETS / "Back_NUMBERS.png", optimize=True)
    update_data(boxes, len(pages))
    print(f"{len(NUMBERS)} number cards on {len(pages)} front sheets, 1 back sheet")


if __name__ == "__main__":
    main()
