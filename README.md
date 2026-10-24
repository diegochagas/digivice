# Digivice

A Digimon partner that lives in a Digivice on your phone or laptop screen,
powered entirely by local AI. It has the personality of the Digimon you
choose, feelings that drift with hunger, energy and happiness (Tamagotchi
style), evolves as your bond grows, remembers things about you, keeps a
Habitica-style quest list (habits, dailies, to-dos and rewards) whose
completion feeds its growth, answers questions, looks things up on the web
and knows Digimon lore from a local Wikimon index. On screen it animates as a 1-bit
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
| `src/lib/companion.ts` | One chat turn: lore retrieval, Ollama call, `web_search` / `quest_add` / `quest_done` / `remember` handling |
| `src/lib/quests/` | Pure quest engine: scoring, day rollover, rewards, crest streak gate, state migration, zod action reducer |
| `src/lib/quest-prompt.ts` | The quest section of the system prompt (due dailies, habits, open to-dos, crest status) |
| `src/lib/lore.ts` | Cosine search over the Wikimon index built by `scripts/build-lore-index.mjs` |
| `src/app/api/state` | GET state (ticks time forward, runs the day rollover), POST care, quest and reward actions |
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

## Chosen child: quests, crests and Bits

The task layer works like Habitica, but the partner is the avatar:

| Habitica | Digivice |
|---|---|
| Habits (+/−) | Habits: scoring up raises bond and happiness and pays Bits; scoring down costs happiness |
| Dailies | Dailies due on chosen weekdays (none = every day). Done today → bond, happiness, Bits, streak +1. Missed → happiness −5/−9/−14 (easy/medium/hard) at the day rollover, streak reset |
| To-dos | One-off quests: bond 6/12/20 |
| HP bar | The partner's happiness. Enough neglect while the bond grows triggers the dark evolution |
| Gold | **Bits**: earned 1:1 with bond from quests, spent on your own custom rewards |
| Avatar / class | Your partner's crest. Every quest is tagged with a crest (courage, knowledge, reliability, ...) |

**Crest streaks.** Each crest keeps a streak of consecutive kept days. A day is
*kept* when at least one quest of that crest was completed and no due daily of
that crest was missed; a day with nothing due and nothing done is neutral (rest
days do not break it); a missed daily breaks it. Crests glow in the Crests panel
from 3 days.

**Evolution gate.** Bond and happiness still drive evolution, but past Child the
partner also needs its own crest streak: 3 days for Adult, 7 for Perfect, 14 for
Ultimate, 21 for the Jogress form (`CREST_STREAK_FOR_STAGE`). The dark evolution
ignores the gate, so chatting and feeding without discipline still ends in
SkullGreymon.

**Day rollover.** The first request of a new local day closes every day since
the last one: missed dailies are charged, crest streaks move, and a one-time
banner shows what happened. After more than 7 days away only the last 7 are
charged and every streak resets.

**Partner chat.** The model sees today's dailies, habits and open to-dos and the
crest status, and can call `quest_add` (kind + crest guessed from the activity)
and `quest_done`. Saying "Agumon, remind me to work out every weekday" creates a
Courage daily.

**State file.** `data/state.json` is now `version: 2`; a v1 file (flat `todos`)
is migrated on first read, old to-dos becoming untagged medium to-dos.

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

Starting it rebuilds automatically if there is no production build, so it
still works after a `npm run dev` session (dev mode replaces `.next` with a
build that `next start` cannot serve).

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
