# CLAUDE.md — DateGolf

See `QUICKSTART.md` for full project context, structure, and what's left to do.

## Quick Start

```bash
cd ~/projects/dategolf
npm run dev   # → http://localhost:5173
```

## Key Rules — Don't Break These

- **No backend** — the app reads static JSON + localStorage; no server
- **SQLite is the data source of truth** — edit `data/dategolf.db`, then `npm run data:export`; never hand-edit the generated JSON in `src/data/` or `public/data/`
- **No year 0** — years are signed (`-1` = 1 BCE); the schema rejects 0
- **Never run `import-legacy --force`** without asking — it wipes db edits
- **Engine stays pure** — `src/engine/` must have zero Vue/Pinia dependencies
- **Year never indexed** — `eventSearch.ts` only searches `name` + `aliases`, never `year`
- **Same date = same challenge** — daily PRNG seed comes from date string only; don't add randomness
- **Used-event rule** — each event can only be picked once per game; enforced in engine

## Package Management

```bash
npm run dev          # dev server
npm run build        # type-check + build
npm run test:unit    # Vitest unit tests
npm run lint         # oxlint + eslint
npm run data:export  # SQLite → JSON (tools/manage.py, Python stdlib via uv)
npm run data:validate
npm run data:compare # export must be byte-identical to committed JSON
```

## Architecture in One Line

`data/dategolf.db` → (export) → `events.json` → `gameEngine.ts` (pure TS) → `game.ts` (Pinia store) → `DailyChallengeView.vue` (phases: landing / playing / revealing / complete)
