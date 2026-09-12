#!/usr/bin/env python3
"""Build a QC contact sheet of every reaction sprite for a form (or all forms).

  python3 scripts/contact-sheet.py [form ...] [--out sheet.png]
"""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
REACTIONS = ROOT / 'public' / 'images' / 'reactions'
CELL = 170


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('forms', nargs='*')
    ap.add_argument('--out', default=str(ROOT / 'reactions-raw' / 'contact-sheet.png'))
    args = ap.parse_args()
    forms = args.forms or sorted(p.name for p in REACTIONS.iterdir() if p.is_dir())
    rows = []
    for form in forms:
        files = sorted((REACTIONS / form).glob('*.png'))
        if files:
            rows.append((form, files))
    width = max(len(f) for _, f in rows) * CELL + 10
    sheet = Image.new('RGBA', (width, len(rows) * (CELL + 30) + 10), (15, 36, 37, 255))
    draw = ImageDraw.Draw(sheet)
    for r, (form, files) in enumerate(rows):
        y = 10 + r * (CELL + 30)
        draw.text((10, y), form, fill=(245, 165, 36, 255))
        for c, f in enumerate(files):
            im = Image.open(f).convert('RGBA').resize((CELL - 10, CELL - 10), Image.LANCZOS)
            sheet.paste(im, (10 + c * CELL, y + 14), im)
            draw.text((12 + c * CELL, y + CELL + 4), f.stem, fill=(230, 240, 242, 255))
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.out)
    print(args.out)


if __name__ == '__main__':
    main()
