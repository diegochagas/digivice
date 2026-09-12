#!/usr/bin/env python3
"""
Build src/data/pixel-sprites.json: one 1-bit grid per Digimon form for the
LCD-style animated Digivice screen.

Sources, in priority order per form:
  1. reactions-raw/pixel/<form>.png  — a v-pet style sprite generated with
     Higgsfield (black pixels on white), snapped to the grid.
  2. public/images/<crest>/<form>.png — the base illustration, converted
     automatically (outline + darkest interior details). Rougher, but gives
     every form a sprite so nothing is ever blank.

  .venv-tools/bin/python scripts/build-pixel-sprites.py [--grid 32] [--forms agumon ...]
      [--preview out.png]

Output format: { "grid": 32, "sprites": { "<form>": { "w": 32, "h": 32, "rows": ["..##..", ...] } } }
"""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public' / 'images'
PIXEL_GEN = ROOT / 'reactions-raw' / 'pixel'
OUT = ROOT / 'src' / 'data' / 'pixel-sprites.json'


def all_forms():
    data = json.loads((ROOT / 'src' / 'data' / 'crests.json').read_text())
    forms = {}
    for c in data['crests']:
        for f in c['digimons']:
            forms[f] = 'ultimate' if f == 'omegamon' else c['name']
        if c.get('alternativeEvolution'):
            forms[c['alternativeEvolution']] = c['name']
    return forms


HEADROOM = 10   # free rows above the creature, for glyphs
SIDEROOM = 5    # free columns each side, for walking
FLOOR = 2       # rows below the creature


def stage_box(grid):
    """Box the creature is drawn into: (height, width)."""
    return grid - HEADROOM - FLOOR, grid - 2 * SIDEROOM


# Sprites whose facing the detector gets wrong; 'left' means the art faces left
# and must be flipped. Fill this in from the contact sheet when one looks off.
FACING_OVERRIDE = {}


def _components(mask, connectivity=8):
    """Connected components of a boolean mask, as lists of (y, x)."""
    h, w = mask.shape
    seen = np.zeros_like(mask)
    offs = ((1, 0), (-1, 0), (0, 1), (0, -1))
    if connectivity == 8:
        offs += ((1, 1), (1, -1), (-1, 1), (-1, -1))
    out = []
    for sy in range(h):
        for sx in range(w):
            if not mask[sy, sx] or seen[sy, sx]:
                continue
            stack = [(sy, sx)]
            seen[sy, sx] = True
            comp = []
            while stack:
                y, x = stack.pop()
                comp.append((y, x))
                for dy, dx in offs:
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
            out.append(comp)
    return out


def detect_facing(bits):
    """+1 if the creature looks right, -1 if it looks left.

    The eye is the reliable cue: it sits toward the front of the head. Ears,
    horns and tails sweep BACKWARD, so judging by head mass points the wrong
    way for forms like Koromon.
    """
    b = np.asarray(bits)
    ys, xs = np.where(b)
    if xs.size == 0:
        return 1
    body_cx = xs.mean()

    # An eye is a small feature detached from the main outline: either a dark
    # dot on a light body, or a light dot punched in a dark one.
    candidates = []
    comps = _components(b)
    if len(comps) > 1:
        main = max(comps, key=len)
        for c in comps:
            if c is not main and len(c) <= 8:
                candidates.append(c)
    enclosed = binary_fill(b) & ~b
    for c in _components(enclosed, connectivity=4):
        if len(c) <= 8:
            candidates.append(c)

    if candidates:
        eye = max(candidates, key=len)          # the most eye-sized blob
        eye_cx = sum(x for _, x in eye) / len(eye)
        if abs(eye_cx - body_cx) >= 1:
            return 1 if eye_cx > body_cx else -1

    # No eye found: fall back to head mass, which is right more often than not.
    top, bottom = ys.min(), ys.max()
    head = b[top:top + max(1, int((bottom - top + 1) * 0.35))]
    hys, hxs = np.where(head)
    if hxs.size and abs(hxs.mean() - body_cx) >= 1:
        return 1 if hxs.mean() > body_cx else -1
    return 1


def face_right(bits, form=None):
    """Flip the creature so it faces right, the direction props are placed."""
    b = np.asarray(bits)
    override = FACING_OVERRIDE.get(form)
    facing = -1 if override == 'left' else 1 if override == 'right' else detect_facing(b)
    return b[:, ::-1] if facing < 0 else b


def place(bits, grid, form=None):
    """Put a tight creature grid on the stage: bottom-aligned, centred."""
    b = np.asarray(bits)
    ys, xs = np.where(b)
    if ys.size == 0:
        return np.zeros((grid, grid), bool)
    b = b[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    box_h, box_w = stage_box(grid)
    h, w = b.shape
    if h > box_h or w > box_w:
        scale = min(box_h / h, box_w / w)
        img = Image.fromarray((~b * 255).astype(np.uint8))
        b = np.array(img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.NEAREST)) < 128
        h, w = b.shape
    out = np.zeros((grid, grid), bool)
    top = grid - FLOOR - h
    left = (grid - w) // 2
    out[top:top + h, left:left + w] = b
    # Decide the facing on the final grid: scaling changes the pixels, so
    # deciding beforehand could disagree with what is actually drawn.
    return face_right(out, form)


def fit_bottom(im, inner):
    """Crop to content and fit into an inner square, bottom-aligned (feet on the ground)."""
    im = im.crop(im.getbbox())
    s = max(im.size)
    sq = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    sq.paste(im, ((s - im.width) // 2, s - im.height))
    return sq.resize((inner, inner), Image.BOX)


def from_base(path, grid, margin=1, dark_ratio=0.32, form=None):
    im = Image.open(path).convert('RGBA')
    inner = grid - 2 * margin
    small = fit_bottom(im, inner)
    a = np.array(small.getchannel('A')) > 128
    lum = np.array(small.convert('L')).astype(float)
    pad = np.pad(a, 1)
    nb = pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:]
    outline = a & ~nb
    interior = a & nb
    vals = lum[interior]
    thr = np.quantile(vals, dark_ratio) if vals.size else 0
    dark = outline | (interior & (lum <= thr))
    return place(dark, grid, form)


def from_pixel_gen(path, grid, margin=1, form=None):
    """Snap a generated black-on-white pixel sprite to the grid.

    Finds the sprite's bounding box (dark pixels), estimates the source pixel
    size, then samples the centre of each source cell so wobbly AI pixels
    become clean ones. Falls back to a plain BOX downscale when the cell
    size can't be estimated.
    """
    im = Image.open(path).convert('L')
    arr = np.array(im) < 128
    # Ignore anything touching the image edge (the model sometimes draws a frame).
    arr[:4, :] = arr[-4:, :] = False
    arr[:, :4] = arr[:, -4:] = False
    ys, xs = np.where(arr)
    if ys.size == 0:
        return None
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    crop = arr[y0:y1, x0:x1]
    # Strip a drawn frame: peel off border rows/cols that are mostly dark lines.
    for _ in range(40):
        h, w = crop.shape
        if h < 10 or w < 10:
            break
        edges = [crop[0].mean(), crop[-1].mean(), crop[:, 0].mean(), crop[:, -1].mean()]
        if max(edges) < 0.6:
            break
        crop = crop[1:-1, 1:-1] if min(edges) > 0.6 else crop
        if min(edges) <= 0.6:
            # frame on some sides only: drop the dark ones
            if edges[0] > 0.6: crop = crop[1:]
            if edges[1] > 0.6: crop = crop[:-1]
            if edges[2] > 0.6: crop = crop[:, 1:]
            if edges[3] > 0.6: crop = crop[:, :-1]
        ys, xs = np.where(crop)
        if ys.size == 0:
            return None
        crop = crop[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = crop.shape
    inner = grid - 2 * margin

    # Find the source pixel grid by trying every plausible cell count and keeping
    # the one whose blocks are most uniformly all-dark or all-light. AI "pixel art"
    # has wobbly cells, so a best-fit search beats estimating from run lengths.
    best = None
    for cols in range(8, inner + 1):
        cell = w / cols
        rows = max(1, round(h / cell))
        if rows > inner:
            continue
        ys = (np.arange(rows + 1) * h / rows).astype(int)
        xs = (np.arange(cols + 1) * w / cols).astype(int)
        means = np.array([[crop[ys[r]:ys[r + 1], xs[c]:xs[c + 1]].mean() if ys[r] < ys[r + 1] and xs[c] < xs[c + 1] else 0.0
                           for c in range(cols)] for r in range(rows)])
        # 0 = every block is pure; 0.5 = every block is half covered (wrong grid)
        impurity = np.minimum(means, 1 - means).mean()
        if best is None or impurity < best[0] - 1e-4:
            best = (impurity, means)
    if best is None:
        return None
    sampled = best[1] > 0.45
    rows, cols = sampled.shape
    ys, xs = np.where(sampled)
    if ys.size == 0:
        return None
    sampled = sampled[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    rows, cols = sampled.shape

    # Bottom-align in a square, then scale by whole pixels so the grid stays crisp.
    s = max(rows, cols)
    sq = np.zeros((s, s), bool)
    sq[s - rows:, (s - cols) // 2:(s - cols) // 2 + cols] = sampled
    if s <= inner:
        k = max(1, inner // s)
        big = np.kron(sq, np.ones((k, k), bool))
    else:
        big = np.array(Image.fromarray((~sq * 255).astype(np.uint8)).resize((inner, inner), Image.NEAREST)) < 128
    bs = big.shape[0]
    bits = np.zeros((inner, inner), bool)
    off = (inner - bs) // 2
    bits[inner - bs:, off:off + bs] = big
    return place(bits, grid, form)


def quality(bits, margin=1):
    """Measure how much a snapped grid looks like a real v-pet sprite.

    Returns (ok, reason, metrics). The checks catch the three ways generation
    fails: scattered specks (too detailed a drawing), a solid black blob (the
    model filled the silhouette), and a hollow or near-empty outline.
    """
    b = np.asarray(bits)
    inner = b[margin:-margin or None, margin:-margin or None]
    total = inner.size
    dark = int(inner.sum())
    if dark == 0:
        return False, 'empty', {}
    fill = dark / total

    pad = np.pad(b, 1)
    neighbours = sum(pad[1 + dy:1 + dy + b.shape[0], 1 + dx:1 + dx + b.shape[1]]
                     for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)))
    # Count isolated pixels outright. As a ratio this punished small sparse
    # sprites (a baby form with an eye dot) as hard as a dithered mess.
    specks = int((b & (neighbours == 0)).sum())
    speck = round(specks / b.sum(), 3)

    # Largest connected component (4-way flood fill) as a share of all dark pixels.
    seen = np.zeros_like(b)
    best = 0
    h, w = b.shape
    for sy in range(h):
        for sx in range(w):
            if not b[sy, sx] or seen[sy, sx]:
                continue
            stack = [(sy, sx)]
            seen[sy, sx] = True
            n = 0
            while stack:
                y, x = stack.pop()
                n += 1
                # 8-way: outline strokes often meet only at a diagonal.
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and b[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
            best = max(best, n)
    connected = best / dark

    # White pixels fully enclosed by dark ones: a real sprite has an interior.
    filled = binary_fill(b)
    interior_white = float((filled & ~b).sum() / dark)

    # Count enclosed white regions. A drawing has a handful (body, eye, gaps);
    # a dithered texture has dozens, which is how a "detailed" generation fails
    # even when it survives the speck and connectivity checks.
    holes = 0
    hseen = np.zeros_like(b)
    enclosed = filled & ~b
    for sy in range(h):
        for sx in range(w):
            if not enclosed[sy, sx] or hseen[sy, sx]:
                continue
            holes += 1
            stack = [(sy, sx)]
            hseen[sy, sx] = True
            while stack:
                y, x = stack.pop()
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and enclosed[ny, nx] and not hseen[ny, nx]:
                        hseen[ny, nx] = True
                        stack.append((ny, nx))

    m = {'fill': round(fill, 3), 'speck': speck, 'specks': specks, 'connected': round(connected, 3),
         'interior': round(interior_white, 3), 'holes': holes}
    if specks > 8:
        return False, 'speckled', m
    if connected < 0.80:
        return False, 'fragmented', m
    if fill < 0.10:
        return False, 'too sparse', m
    if fill > 0.52:
        return False, 'solid blob', m
    if interior_white < 0.05:
        return False, 'no interior', m
    return True, 'ok', m


def binary_fill(b):
    """Flood the outside from the border; whatever stays unreached is interior."""
    h, w = b.shape
    outside = np.zeros_like(b)
    stack = [(y, x) for y in range(h) for x in (0, w - 1) if not b[y, x]]
    stack += [(y, x) for x in range(w) for y in (0, h - 1) if not b[y, x]]
    for y, x in stack:
        outside[y, x] = True
    while stack:
        y, x = stack.pop()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not b[ny, nx] and not outside[ny, nx]:
                outside[ny, nx] = True
                stack.append((ny, nx))
    return ~outside


def noise_score(bits):
    """Fraction of dark pixels with no dark neighbour (isolated specks).

    A clean v-pet sprite scores near 0; a mis-snapped detailed drawing scores high.
    """
    b = np.asarray(bits)
    if not b.any():
        return 1.0
    pad = np.pad(b, 1)
    neighbours = sum(pad[1 + dy:1 + dy + b.shape[0], 1 + dx:1 + dx + b.shape[1]]
                     for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)))
    return float((b & (neighbours == 0)).sum() / b.sum())


def render(bits, scale=5):
    g = bits.shape[0]
    img = Image.new('RGB', (g * scale, g * scale), (170, 190, 150))
    px = img.load()
    for y in range(g):
        for x in range(g):
            if bits[y, x]:
                for dy in range(scale):
                    for dx in range(scale):
                        px[x * scale + dx, y * scale + dy] = (20, 30, 25)
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--grid', type=int, default=32)
    ap.add_argument('--forms', nargs='*')
    ap.add_argument('--preview')
    args = ap.parse_args()

    forms = all_forms()
    wanted = args.forms or sorted(forms)
    existing = json.loads(OUT.read_text())['sprites'] if OUT.exists() else {}
    sprites = dict(existing)
    sources = {}
    for f in wanted:
        gen = PIXEL_GEN / f'{f}.png'
        bits = None
        if gen.exists():
            bits = from_pixel_gen(gen, args.grid, form=f)
            sources[f] = 'pixel-gen'
        if bits is None:
            base = PUBLIC / forms[f] / f'{f}.png'
            if not base.exists():
                print(f'  {f}: no source image')
                continue
            bits = from_base(base, args.grid, form=f)
            sources[f] = 'base'
        sprites[f] = {'w': args.grid, 'h': args.grid, 'rows': [''.join('#' if v else '.' for v in row) for row in bits]}
    OUT.write_text(json.dumps({'grid': args.grid, 'sprites': sprites}, indent=0))
    flagged = [f for f in sources if sources[f] == 'pixel-gen'
               and noise_score([[ch == '#' for ch in r] for r in sprites[f]['rows']]) > 0.08]
    if flagged:
        print(f'  noisy snaps, regenerate these: {" ".join(flagged)}')
    counts = {}
    for s in sources.values():
        counts[s] = counts.get(s, 0) + 1
    print(f'wrote {OUT} ({len(sprites)} sprites; this run: {counts})')

    if args.preview:
        names = [f for f in wanted if f in sprites]
        scale = 5
        cols = 8
        rows = (len(names) + cols - 1) // cols
        cell = args.grid * scale + 8
        sheet = Image.new('RGB', (cols * cell + 8, rows * cell + 8), (60, 60, 60))
        for i, f in enumerate(names):
            bits = np.array([[ch == '#' for ch in r] for r in sprites[f]['rows']])
            sheet.paste(render(bits, scale), (8 + (i % cols) * cell, 8 + (i // cols) * cell))
        sheet.save(args.preview)
        print(args.preview)


if __name__ == '__main__':
    main()
