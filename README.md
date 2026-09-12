# Digivice

A Digimon partner that lives in a Digivice on your phone or laptop screen,
powered entirely by local AI. It has the personality of the Digimon you
choose, feelings that drift with hunger, energy and happiness (Tamagotchi
style), evolves as your bond grows, remembers things about you, keeps a
small task list, answers questions, looks things up on the web and knows
Digimon lore from a local Wikimon index. On screen it animates as a 1-bit
LCD sprite, in the spirit of the original virtual pets.

This started as a static Digivice toy (the frame, the twelve crest evolution
lines, the sprites and the evolution videos are still here) and now runs on
the [mini-ai](https://github.com/diegochagas/mini-ai) local stack
(Ollama + SearXNG).

> **Note:** this is no longer a static site. It has API routes and keeps
> state on disk, so it needs a Node server (`npm start`) rather than a
> static export.

## How it works

| Piece | What it does |
|---|---|
| `src/lib/state.ts` | Tamagotchi state machine: hunger/energy/happiness drift per hour, feed/play/sleep, bond XP and evolution thresholds |
| `src/lib/personas.ts` | One personality profile per evolution line (crest) plus how the voice shifts per stage |
| `src/lib/prompt.ts` | Builds the system prompt: persona + live condition + memories + open tasks + retrieved lore + strict JSON output format |
| `src/lib/companion.ts` | One chat turn: lore retrieval, Ollama call, `web_search` / `todo_add` / `todo_done` / `remember` handling |
| `src/lib/lore.ts` | Cosine search over the Wikimon index built by `scripts/build-lore-index.mjs` |
| `src/app/api/state` | GET state (ticks time forward), POST care actions |
| `src/app/api/chat` | POST `{ message }` (`null` = spontaneous feeling) |
| `public/images/reactions/<form>/<emotion>.png` | Reaction sprites generated with Higgsfield (`scripts/gen-reactions.py`) |

Evolution follows bond XP (40 → Child, 160 → Adult, 420 → Perfect, 900 →
Ultimate, 1600 → Jogress) and needs happiness ≥ 60. Reaching the Perfect
threshold while happiness is ≤ 35 triggers the line's **dark evolution**
(Greymon → SkullGreymon, as in the anime): a moody dead end that regresses
to Baby once happiness climbs back above 75.

Every reply from the model is a JSON object `{ reply, emotion, remember, tool }`.
The `emotion` picks the sprite shown in the Digivice; when a form has no
generated reactions the base sprite is used.

## Requirements

- Node 20+
- [Ollama](https://ollama.com/) reachable over HTTP with a chat model and an
  embedding model pulled (the defaults in `.env.example` are `qwen3:8b` and
  `nomic-embed-text`; an RTX 3050 6 GB runs `qwen3:8b` comfortably)
- Optional: a [SearXNG](https://github.com/searxng/searxng) instance with the
  JSON format enabled, for web search (the mini-ai setup provides one)
- Optional, for generating reaction art: the `higgsfield` CLI logged in, and
  `python3 -m venv .venv-tools && .venv-tools/bin/pip install "rembg[cpu]" pillow`

## Setup

```bash
cp .env.example .env      # then edit the values
npm install
npm run lore:build        # fetches ~150 Wikimon pages and embeds them (a few minutes)
npm run build
npm start                 # http://0.0.0.0:3030
```

The app refuses to start with missing `.env` values. State lives in
`$DATA_DIR/state.json`; delete it to start from a fresh egg.

### Reaction sprites

```bash
.venv-tools/bin/python scripts/gen-reactions.py --crest courage
```

Generates 10 emotions (neutral, happy, excited, sad, angry, hungry, sleepy,
thinking, surprised, love) for every form of the line with Nano Banana Pro,
cuts the background out with `rembg` (isnet-anime) and writes 320×320
transparent PNGs. Raw generations are kept in `reactions-raw/` for QC; use
`--forms`/`--emotions` to scope, `--redo` to regenerate, `--cutout-only` to
redo the cutout without spending credits.

### Run it on demand (Linux, systemd user unit)

Install the unit once:

```bash
cp digivice.service ~/.config/systemd/user/
systemctl --user daemon-reload
```

Then start and stop it whenever you want it:

```bash
systemctl --user start digivice     # start
systemctl --user stop digivice      # stop
systemctl --user status digivice    # is it up?
journalctl --user -u digivice -f    # logs
```

It stays off until you start it. To have it come up automatically at boot
instead, `systemctl --user enable digivice` plus
`loginctl enable-linger "$USER"`; `disable` undoes that.

### Phone

Open `http://<laptop-ip-or-tailscale-name>:3030` on the phone and "Add to
Home Screen" — the page ships a web manifest so it installs as a standalone
app. The Digimon sleeps while the laptop is off and catches up on time when
it comes back.

## Notes

- Replies are kept short by prompt; ask for detail to get longer answers.
- Lore questions retrieve the five closest Wikimon chunks and tell the model
  to prefer them over its own memory. Anything else it cannot know goes
  through SearXNG when configured.
- Idle remarks: while the page is open and untouched for 12 minutes the
  Digimon says how it feels on its own.
