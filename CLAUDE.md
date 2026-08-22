# CLAUDE.md — DateGolf

See `QUICKSTART.md` for full project context, structure, and what's left to do.

## Quick Start

```bash
cd ~/projects/dategolf
npm run dev   # → http://localhost:5173
```

## Key Rules — Don't Break These

- **No backend** — everything is static JSON + localStorage; no server, no database
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
```

## Architecture in One Line

`events.json` → `gameEngine.ts` (pure TS) → `game.ts` (Pinia store) → `DailyChallengeView.vue` (phases: landing / playing / revealing / complete)
