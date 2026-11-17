"""Remove the big position number printed over the high-res back art.

The high-res back sheets are print templates with a number (1-18) drawn over
each card. The earlier low-res upload has the same art without numbers, so the
pixels covered by the number are replaced with the upscaled clean low-res art.
Card (row 1, col 6) is used because it carries the thinnest number ("1").
"""
import numpy as np
from PIL import Image, ImageFilter

POS = (1, 6)


def clean_back(hires_sheet, lowres_sheet):
    from crop_cards import card_boxes  # imported here to avoid a circular import

    hb = card_boxes(hires_sheet)[POS]
    lb = card_boxes(lowres_sheet, inset_scale=Image.open(lowres_sheet).width / Image.open(hires_sheet).width)[POS]
    hi = Image.open(hires_sheet).convert("RGB").crop(hb)
    lo = Image.open(lowres_sheet).convert("RGB").crop(lb).resize(hi.size, Image.LANCZOS)
    h = np.asarray(hi).astype(int)
    l = np.asarray(lo).astype(int)
    dark = h.sum(2) < 200
    differs = np.abs(h - l).sum(2) > 120
    mask = Image.fromarray(((dark & differs) * 255).astype(np.uint8))
    mask = mask.filter(ImageFilter.MaxFilter(15)).filter(ImageFilter.GaussianBlur(4))
    return Image.composite(lo, hi, mask), mask
