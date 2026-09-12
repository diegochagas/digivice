#!/usr/bin/env python3
"""
Generate a v-pet style 1-bit sprite for every form (or the given ones) with
Higgsfield, into reactions-raw/pixel/<form>.png. Then run
build-pixel-sprites.py to snap them into src/data/pixel-sprites.json.

  python3 scripts/gen-pixel-sprites.py [--forms agumon greymon] [--redo] [--model nano_banana_pro]
"""
import argparse
import importlib.util
import json
import subprocess
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Reuse the snapping + quality checks so generation can grade its own output.
_spec = importlib.util.spec_from_file_location('build_pixel', Path(__file__).resolve().parent / 'build-pixel-sprites.py')
_build = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_build)
OUT = ROOT / 'reactions-raw' / 'pixel'
REJECTS = ROOT / 'reactions-raw' / 'pixel-tries'

DISPLAY = {
    'metalgreymon': 'MetalGreymon', 'wargreymon': 'WarGreymon', 'skullgreymon': 'SkullGreymon',
    'weregarurumon': 'WereGarurumon', 'metalgarurumon': 'MetalGarurumon',
    'atlurkabuterimon': 'AtlurKabuterimon', 'herculeskabuterimon': 'HerculesKabuterimon',
    'holyangemon': 'HolyAngemon', 'banchostingmon': 'BanchoStingmon', 'saintgalgomon': 'SaintGalgomon',
}


def display(name):
    return DISPLAY.get(name, name.capitalize())


# Nudges applied on retries, when the first prompt produced something the
# quality checks rejected.
# The model knows the famous forms but guesses at the small ones, so describe
# their silhouette explicitly.
SHAPE_NOTES = {
    'koromon': 'Koromon is a round pink blob with a big mouth and two long floppy ears sticking up and back; it has NO arms and NO legs.',
    'tsunomon': 'Tsunomon is a round furry blob with one single horn on top and NO arms or legs.',
    'yokomon': 'Yokomon is a small round blob with a blue flower sprout on its head and NO arms or legs.',
    'motimon': 'Motimon is a pink squishy round blob with two tiny stubby arms and no legs.',
    'tanemon': 'Tanemon is a round green sprout blob with leaves on its head and four tiny feet, no arms.',
    'bukamon': 'Bukamon is a round seal-like baby with a tuft of hair, two small flippers and no legs.',
    'tokomon': 'Tokomon is a small round white creature with a very big mouth and two tiny feet, no arms.',
    'nyaromon': 'Nyaromon is a round cat-like blob with long ears and a striped tail, no arms or legs.',
    'minomon': 'Minomon is a green pinecone-shaped baby with a leaf on top and no arms or legs.',
    'gummymon': 'Gummymon is a round blob with one horn and two long floppy ears, no arms or legs.',
    'hopmon': 'Hopmon is a small round creature with a horn on its head and a tiny tail.',
    'agumon': 'Agumon is a small orange bipedal dinosaur standing on two legs with short arms and a long snout.',
    'gabumon': 'Gabumon is a small creature wearing a horned wolf pelt over its head and back, standing on two legs.',
    'patamon': 'Patamon is a small round creature with two huge wing-like ears on the sides of its head and four tiny legs.',
}


RETRY_NUDGES = [
    '',
    ' Draw it BIGGER and BOLDER: fewer, thicker, fully connected strokes; no tiny marks; '
    'the whole creature is one connected outline.',
    ' Make it as simple as a 1990s Tamagotchi monster: a chunky bold shape with a thick '
    'closed outline, a white body and just one black eye dot.',
]


def prompt_for(form, attempt=0):
    return (
        f"A single retro virtual pet sprite of {display(form)} from Digimon, in the exact style of the original "
        f"1997 Bandai Digital Monster LCD toy. STRICT REQUIREMENTS: the artwork is a grid of exactly 16 by 16 "
        f"giant square pixels; every pixel is a huge uniform black or white square block; pure black on pure white, "
        f"only two colors. The design is extremely simplified down to a bold readable silhouette with a thick "
        f"outline and only one or two iconic features (an eye, a horn, a stripe). NO interior line work, NO small "
        f"details, NO texture, NO dithering, NO gray, NO shading, NO anti-aliasing, NO thin lines, NO outline "
        f"frame or border around the image, NO text. Side-facing full body, centered, with generous white margin."
        + (f" The shape: {SHAPE_NOTES[form]}" if form in SHAPE_NOTES else "")
        + RETRY_NUDGES[min(attempt, len(RETRY_NUDGES) - 1)]
    )


def all_forms():
    data = json.loads((ROOT / 'src' / 'data' / 'crests.json').read_text())
    forms = []
    for c in data['crests']:
        forms += c['digimons']
        if c.get('alternativeEvolution'):
            forms.append(c['alternativeEvolution'])
    return list(dict.fromkeys(forms))


def find_url(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in ('url', 'image_url', 'result_url', 'media_url') and isinstance(v, str) and v.startswith('http'):
                return v
            r = find_url(v)
            if r:
                return r
    elif isinstance(obj, list):
        for v in obj:
            r = find_url(v)
            if r:
                return r
    return None


def generate(model, prompt, out):
    cmd = ['higgsfield', 'generate', 'create', model, '--prompt', prompt, '--aspect_ratio', '1:1',
           '--resolution', '1k', '--json', '--wait', '--wait-timeout', '10m']
    for attempt in range(3):
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
        text = (res.stdout or '').strip()
        if res.returncode == 0 and text:
            try:
                url = find_url(json.loads(text))
            except json.JSONDecodeError:
                url = None
            if url:
                urllib.request.urlretrieve(url, out)
                return True
        msg = ((res.stderr or '') + text).lower()
        if any(t in msg for t in ('503', 'unavailable', 'timeout', 'temporarily')):
            time.sleep(20 * (attempt + 1))
            continue
        print(f'    failed: {(res.stderr or text)[:200]}')
        return False
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--forms', nargs='*')
    ap.add_argument('--redo', action='store_true')
    ap.add_argument('--tries', type=int, default=3, help='attempts per form before giving up')
    ap.add_argument('--grid', type=int, default=32)
    ap.add_argument('--model', default='nano_banana_pro')
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    REJECTS.mkdir(parents=True, exist_ok=True)

    forms = args.forms or all_forms()
    done = failed = skipped = 0
    for f in forms:
        out = OUT / f'{f}.png'
        if out.exists() and not args.redo:
            skipped += 1
            continue
        accepted = False
        scored = []
        for attempt in range(args.tries):
            tmp = REJECTS / f'{f}.try{attempt}.png'
            if not generate(args.model, prompt_for(f, attempt), tmp):
                continue
            bits = _build.from_pixel_gen(tmp, args.grid)
            if bits is None:
                print(f'  {f}: attempt {attempt + 1} produced nothing')
                continue
            ok, reason, metrics = _build.quality(bits)
            # A scribble survives the shape gate but riddles the sprite with enclosed
            # gaps; a real outline sprite stays under ~10. Only used when picking
            # between attempts, never to reject an already-accepted sprite.
            if ok and metrics.get('holes', 0) > 10:
                ok, reason = False, 'scribbled'
            print(f'  {f}: attempt {attempt + 1} {reason} {metrics}', flush=True)
            scored.append((metrics.get('holes', 99) if reason != 'ok' else -1, tmp))
            if ok:
                tmp.replace(out)
                accepted = True
                break
        if accepted:
            done += 1
        elif scored and not out.exists():
            # Nothing passed and there is no sprite yet: keep the least-scribbled
            # attempt, which still beats the automatic conversion of the illustration.
            scored.sort(key=lambda t: t[0])
            scored[0][1].replace(out)
            failed += 1
            print(f'  {f}: no clean sprite in {args.tries} tries, kept the best attempt')
        elif scored:
            failed += 1
            print(f'  {f}: no clean sprite in {args.tries} tries, KEEPING the existing one')
        else:
            failed += 1
            print(f'  {f}: NO USABLE SPRITE after {args.tries} tries (keeping base-art fallback)')
    print(f'done={done} failed={failed} skipped={skipped}')


if __name__ == '__main__':
    main()
