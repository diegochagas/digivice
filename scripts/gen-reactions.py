#!/usr/bin/env python3
"""
Generate reaction sprites for an evolution line with Higgsfield (Nano Banana
Pro), using the base sprite in public/images/<crest>/<form>.png as the
identity reference, then cut the background out and fit the result into a
320x320 transparent PNG under public/images/reactions/<form>/<emotion>.png.

  python3 scripts/gen-reactions.py --crest courage [--forms agumon greymon]
      [--emotions happy sad] [--redo] [--model nano_banana_pro] [--dry-run]

Auth comes from the higgsfield CLI (`higgsfield auth login`). Background
removal uses rembg (isnet-anime) from .venv-tools — run this script with
.venv-tools/bin/python. Raw generations are kept in reactions-raw/ (gitignored)
so QC can compare, and a failed cutout can be redone without a new generation.
"""
import argparse
import json
import shutil
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public' / 'images'
RAW = ROOT / 'reactions-raw'
SIZE = 320
MARGIN = 12

EMOTIONS = {
    'neutral': 'a calm, relaxed, neutral expression, standing naturally and looking at the viewer',
    'happy': 'a big joyful smile, eyes bright, bouncing cheerfully',
    'excited': 'wildly excited, mouth open in a cheer, arms raised, tiny sparkles of joy around it',
    'sad': 'sad and gloomy, downcast eyes with a single tear, slumped shoulders',
    'angry': 'angry and fierce, furrowed brow, teeth bared, fists clenched, small steam puffs',
    'hungry': 'starving and drooling, holding its belly, looking longingly upward with a rumbling stomach',
    'sleepy': 'very sleepy, heavy half-closed eyes, yawning, a small "z z z" floating above its head',
    'thinking': 'deep in thought, one hand on its chin, eyes looking up, a small question mark floating above',
    'surprised': 'shocked and surprised, wide eyes, mouth open, jumping back slightly',
    'love': 'affectionate and loving, blushing cheeks, warm eyes, small hearts floating around it',
}

# Emotion wording for forms with no arms/legs (used when FORM_NOTES says "NO arms").
EMOTIONS_LIMBLESS = {
    'neutral': 'a calm, relaxed, neutral expression, resting on the ground and looking at the viewer',
    'excited': 'wildly excited, mouth open in a cheer, ears sticking straight up, tiny sparkles of joy around it',
    'angry': 'angry and fierce, furrowed brow, teeth bared, ears pulled back, small steam puffs',
    'hungry': 'starving and drooling, mouth wide open, eyes fixed longingly upward on imaginary food, ears drooping, a rumbling stomach',
    'thinking': 'deep in thought, eyes looking up, one ear bent forward like a question, a small question mark floating above',
    'surprised': 'shocked and surprised, wide eyes, mouth open, ears shooting straight up, bouncing back slightly',
    'love': 'affectionate and loving, blushing cheeks, warm eyes, small hearts floating around it',
}

# Anatomy reminders for forms the model tends to draw wrong (limbless babies etc.).
FORM_NOTES = {
    'koromon': 'Koromon is a round pink blob with two long floppy ears, big red eyes and a wide mouth, and has NO arms and NO legs. Express the emotion only with its ears, eyes and mouth.',
    'tsunomon': 'Tsunomon is a round orange-yellow blob with a single horn on top, a tuft of fur and NO arms or legs.',
    'yokomon': 'Yokomon is a small pink radish-shaped blob with a blue flower sprout on top and NO arms or legs.',
    'motimon': 'Motimon is a pink squishy blob with two stubby arms and no legs.',
    'tanemon': 'Tanemon is a green sprout-like blob with leaf sprouts on its head and four tiny feet, NO arms.',
    'bukamon': 'Bukamon is a grey seal-like baby with an orange tuft of hair, two flippers and NO legs.',
    'tokomon': 'Tokomon is a small white round creature with a big mouth full of teeth, two tiny feet and NO arms.',
    'nyaromon': 'Nyaromon is a round yellow cat-like blob with a striped tail and NO arms or legs.',
    'minomon': 'Minomon is a green pinecone-shaped baby with a leaf on top and NO arms or legs.',
    'hopmon': 'Hopmon is a small purple round creature with a horn and small paws.',
    'gummymon': 'Gummymon is a green round blob with a single horn and NO arms or legs.',
    'agumon': 'Agumon is a small orange bipedal dinosaur with green eyes, short arms with claws and no armor or helmet.',
    'greymon': 'Greymon is a large orange bipedal dinosaur with blue stripes, a brown bony skull helmet with three horns, short arms, a long tail, and NO metal parts and NO armor — fully organic.',
    'metalgreymon': 'MetalGreymon is Greymon with a metal helmet, a large metal left claw arm, red mechanical missile hatch on its chest, purple wings, and long red hair.',
    'wargreymon': 'WarGreymon is a humanoid orange dragon warrior in yellow Chrome Digizoid armor: helmet with horns, Dramon Killer claw gauntlets, Brave Shield on its back, muscular but slim.',
    'skullgreymon': 'SkullGreymon is a huge skeletal dinosaur made of bare bones, a red organic missile on its back, no skin, evil red eye sockets.',
    'omegamon': 'Omegamon is a tall white-armored knight with a red cape, WarGreymon head on the right arm and MetalGarurumon head on the left arm, and a blue-and-white armored body.',
}

DISPLAY = {
    'metalgreymon': 'MetalGreymon', 'wargreymon': 'WarGreymon', 'skullgreymon': 'SkullGreymon',
    'weregarurumon': 'WereGarurumon', 'metalgarurumon': 'MetalGarurumon',
    'atlurkabuterimon': 'AtlurKabuterimon', 'herculeskabuterimon': 'HerculesKabuterimon',
    'holyangemon': 'HolyAngemon', 'banchostingmon': 'BanchoStingmon', 'saintgalgomon': 'SaintGalgomon',
}


def display(name):
    return DISPLAY.get(name, name.capitalize())


def prompt_for(form, emotion, mode='edit'):
    name = display(form)
    if mode == 'noref':
        note = FORM_NOTES.get(form, '')
        wording = EMOTIONS_LIMBLESS.get(emotion, EMOTIONS[emotion]) if 'NO arms' in note else EMOTIONS[emotion]
        return (
            f"{name}, the Digimon from Digimon Adventure, official-style character art: clean cel-shaded 2D anime "
            f"illustration with bold dark outlines, faithful to the official design and anatomy. {note} "
            f"Full body, facing the viewer, centered, fully inside the frame. Expression and pose: {wording}. "
            f"Plain solid pure white background, no ground shadow, no text, no logo, no extra characters, no props."
        )
    if mode == 'design':
        return (
            f"Character design sheet illustration of {name} from Digimon Adventure, in a completely NEW pose "
            f"and facial expression: {EMOTIONS[emotion]}. The reference image shows only the character design "
            f"(colors, markings, proportions, cel-shaded 2D anime style with bold outlines) — keep the design identical "
            f"but DO NOT copy the reference pose; the body, arms, head angle and face must clearly change to act out "
            f"the emotion. Full body, facing the viewer, centered, fully inside the frame with empty space around it. "
            f"Plain solid pure white background, no ground shadow, no text, no logo, no extra characters, no props, no border."
        )
    # edit: short instruction anchored on the reference image
    return (
        f"Edit this image of {name}: redraw the character in a different pose showing this emotion — "
        f"{EMOTIONS[emotion]}. Change the face, mouth, eyes, arms and posture to act it out clearly. "
        f"Keep exactly the same character design, colors and drawing style. Full body visible, centered, "
        f"plain solid white background, no text."
    )


def crest_folder(crest, form):
    return 'ultimate' if form == 'omegamon' else crest


def load_line(crest):
    data = json.loads((ROOT / 'src' / 'data' / 'crests.json').read_text())
    for c in data['crests']:
        if c['name'] == crest:
            forms = list(c['digimons'])
            if c.get('alternativeEvolution'):
                forms.append(c['alternativeEvolution'])
            return forms
    sys.exit(f'unknown crest {crest}')


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


def generate(model, prompt, refs, out_raw):
    cmd = ['higgsfield', 'generate', 'create', model, '--prompt', prompt,
           '--aspect_ratio', '1:1', '--resolution', '1k']
    for r in refs:
        cmd += ['--image-references', str(r)]
    cmd += ['--json', '--wait', '--wait-timeout', '10m']
    for attempt in range(3):
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
        out = (res.stdout or '').strip()
        err = (res.stderr or '').strip()
        if res.returncode == 0 and out:
            try:
                url = find_url(json.loads(out))
            except json.JSONDecodeError:
                url = None
            if url:
                urllib.request.urlretrieve(url, out_raw)
                return True
        msg = (err + ' ' + out).lower()
        if any(t in msg for t in ('503', 'unavailable', 'timeout', 'temporarily', 'nsfw')):
            time.sleep(20 * (attempt + 1))
            continue
        print(f'    generation failed: {(err or out)[:300]}')
        return False
    return False


def cutout(raw_path, out_path, session):
    from PIL import Image
    from rembg import remove
    im = Image.open(raw_path).convert('RGB')
    rgba = remove(im, session=session).convert('RGBA')
    bbox = rgba.getbbox()
    if not bbox:
        return False
    crop = rgba.crop(bbox)
    inner = SIZE - 2 * MARGIN
    scale = min(inner / crop.width, inner / crop.height)
    crop = crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), Image.LANCZOS)
    canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    canvas.paste(crop, ((SIZE - crop.width) // 2, (SIZE - crop.height) // 2), crop)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out_path)
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--crest', required=True)
    ap.add_argument('--forms', nargs='*')
    ap.add_argument('--emotions', nargs='*', default=list(EMOTIONS))
    ap.add_argument('--model', default='nano_banana_pro')
    ap.add_argument('--redo', action='store_true', help='regenerate even if output exists')
    ap.add_argument('--cutout-only', action='store_true', help='skip generation, redo cutouts from reactions-raw')
    ap.add_argument('--mode', default='noref', choices=['edit', 'noref', 'design'])
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    if not args.dry_run and not args.cutout_only and not shutil.which('higgsfield'):
        sys.exit('higgsfield CLI not found in PATH')

    forms = args.forms or load_line(args.crest)
    jobs = [(f, e) for f in forms for e in args.emotions]
    print(f'{len(jobs)} reaction(s) for {args.crest}: {", ".join(forms)}')

    session = None
    if not args.dry_run:
        from rembg import new_session
        session = new_session('isnet-anime')

    done = failed = skipped = 0
    for form, emotion in jobs:
        ref = PUBLIC / crest_folder(args.crest, form) / f'{form}.png'
        raw = RAW / form / f'{emotion}.png'
        out = PUBLIC / 'reactions' / form / f'{emotion}.png'
        if out.exists() and not args.redo and not args.cutout_only:
            skipped += 1
            continue
        if not ref.exists():
            print(f'  {form}/{emotion}: missing reference {ref}')
            failed += 1
            continue
        print(f'  {form}/{emotion} ...', flush=True)
        if args.dry_run:
            print('    ' + prompt_for(form, emotion, args.mode)[:120] + '...')
            continue
        if not args.cutout_only or not raw.exists():
            raw.parent.mkdir(parents=True, exist_ok=True)
            refs = [] if args.mode == 'noref' else [ref]
            if not generate(args.model, prompt_for(form, emotion, args.mode), refs, raw):
                failed += 1
                continue
        if cutout(raw, out, session):
            done += 1
        else:
            print('    cutout produced an empty image')
            failed += 1
    print(f'done={done} failed={failed} skipped={skipped}')


if __name__ == '__main__':
    main()
