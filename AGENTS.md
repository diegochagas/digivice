# Digivice — rules for agents

Local-AI Digimon partner (Next.js 14, TypeScript, Tailwind, zod, Ollama) with a
Habitica-style quest layer: habits, dailies and to-dos feed the partner's bond,
happiness and crest streaks. Single user, state in a JSON file, no database.

## Clean code (dev-playbook CLEAN-CODE.md)

Language: TypeScript (Next.js App Router). Formatter: none enforced yet; match the
surrounding style (2 spaces, no semicolons, single quotes).

- Functions 4–20 lines; React components ≤40 lines, split into hooks/subcomponents.
  Files ≤300 lines, hard max 500. `scripts/clean-code-audit` reports violations
  (report only until `page.tsx` and the Python sprite scripts are split). ESLint `max-depth`,
  `complexity` and `max-lines-per-function` are warnings until `pixel-anim.ts`, `pixel-digimon.tsx`
  and `page.tsx` are split; new code must not add warnings.
- One responsibility per module. Layout: `src/app/` (pages, API routes, components),
  `src/lib/` (pet state machine, prompt, Ollama/SearXNG wrappers), `src/lib/quests/`
  (pure quest engine: types, dates, scoring, rollover, rewards, streak gate, migrate,
  actions reducer), `tests/` (Vitest), `e2e/` (Playwright), `scripts/` (gate + asset tools).
- Names specific and searchable (<5 grep hits). Banned: `data`, `handler`, `utils`, `Manager`, `Service`.
- Types explicit: no `any` (ESLint error), typed exports, zod on every request body and every model reply.
- Early returns, max 2 nested levels. Extract duplicated logic the second time it appears.
- Errors include the offending value and the expected shape.
- Comments: keep the ones you find. Write WHY. Docstring + one example on public functions.
- Third-party libs stay behind thin wrappers: `src/lib/ollama.ts`, `src/lib/search.ts`, `src/lib/store.ts`.
  Tests use the pure functions with fixtures (`tests/fixtures.ts`), never a live model.
- Quest engine rules: `src/lib/quests/*` never imports `src/lib/state.ts` (state.ts imports the
  gate and rollover, so the other direction would be a cycle). Every function takes `now` as a
  parameter with `Date.now()` as default, so tests pin the clock.
- Defensive code this repo needs (flag anything else instead of adding it silently):
  per-request timeout and one retry on connection error for Ollama/SearXNG; schema-validate
  every model output (`replySchema` in companion.ts, keep the plain-text fallback); clear
  fallback when Ollama is down (the pet still ticks, quests still work).
- State file changes bump `version` and get a migration in `src/lib/quests/migrate.ts` plus a test.

## Testing and shipping (dev-playbook)

- One gate: `scripts/check` (tsc, eslint, vitest, next build, audit report). The pre-push hook
  runs it: `git config core.hooksPath .githooks`. Never push with `--no-verify`.
- Bugs: write a failing regression test first, then fix. Never weaken or delete a test to pass.
- UI changes: `npm run e2e` (Playwright, own data dir `e2e/.data` and port 3031, never the real
  pet in `./data`) and attach the desktop + mobile screenshots from `e2e/screenshots/`.
- Risk class: none beyond the single state file (atomic temp+rename writes in store.ts).
- No real paths, IPs, passwords or tokens in code, tests, fixtures or docs; config via `.env` validated by zod.
- Before finishing: `/code-review` on the diff, then the evidence package
  (summary, tests, screenshots, rollback = revert the commit; the v1→v2 state migration is
  forward-only, keep a copy of `data/state.json` before deploying).
