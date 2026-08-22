# DateGolf — Quick Start

> Run this file when returning after a gap: `cat QUICKSTART.md`

---

## What is this?

A daily browser-based **history golf game**. Each day players get 5 target years. They pick historical events to land as close as possible to each target — lowest total score wins (like golf). Built for Indian students but covers world history.

- **Live site**: https://dategolf.vercel.app
- **GitHub**: https://github.com/Ram-N/dategolf
- **Spec docs**: `docs/` folder

---

## Run locally

```bash
cd ~/projects/dategolf
npm run dev
# → http://localhost:5173
```

That's it. No backend, no database, no environment variables needed.

---

## All available commands

```bash
npm run dev          # Dev server with hot reload
npm run build        # Production build (type-check + vite build)
npm run preview      # Preview the production build locally
npm run test:unit    # Run unit tests (Vitest) — 26 tests
npm run type-check   # TypeScript check only (vue-tsc)
npm run lint         # Lint + auto-fix (oxlint + eslint)
npm run format       # Format src/ with Prettier

node scripts/validate-events.cjs   # Validate events.json data quality
```

---

## Project structure

```
src/
  types/index.ts              ← All TypeScript interfaces (start here)
  data/events.json            ← 269 historical events (the dataset)
  engine/
    gameEngine.ts             ← Pure game logic, zero Vue deps
    challengeGenerator.ts     ← Seeded daily target-year generation
    __tests__/                ← Unit tests for engine + generator
  services/
    eventSearch.ts            ← Fuse.js fuzzy search (name+alias only)
    persistence.ts            ← localStorage: session resume, streak, stats
    sharing.ts                ← Web Share API + clipboard fallback
  stores/game.ts              ← Pinia store connecting engine to Vue
  views/
    DailyChallengeView.vue    ← Top-level orchestrator (phases: landing/playing/revealing/complete)
  components/
    GameHeader.vue            ← Hole progress (●●●○○) + score
    TargetYear.vue            ← Big year display
    EventFinder.vue           ← Search input + category chips + results list
    ConfirmSelection.vue      ← Bottom-sheet confirm before locking in
    AnswerReveal.vue          ← Year reveal, penalty, better alternatives
    FinalScoreView.vue        ← 5-hole summary, stats, share button
docs/
  01_dategolf_GAME_SPEC.md      ← Game design spec
  02_dategolf_TECHNICAL_PLAN.md ← Technical architecture + 11-phase plan
  03_dategolf_DATA_AND_CHALLENGES.md ← Event data design + challenge rules
scripts/
  validate-events.cjs         ← Run after editing events.json
```

---

## How the game works (engineering view)

1. **App loads** → reads today's date → `generateDailyChallenge(date)` seeds a PRNG from the date string → picks 5 target years across 7 weighted historical eras (same date = same targets everywhere)
2. **localStorage** is checked — if a game for today exists, it resumes from that state
3. **Player searches** for an event by name/keyword → Fuse.js searches `name` + `aliases` only (year is never indexed or shown)
4. **Player confirms** → `selectEvent()` in the pure game engine calculates `penalty = |targetYear - eventYear|`, finds up to 2 better alternatives (one from each side of the target), advances the hole
5. **Reveal screen** shows the event year, penalty, running total, and alternatives
6. After **5 holes**, final score screen with spoiler-free share text

---

## Deployment

Vercel is connected to the GitHub repo. **Every push to `main` auto-deploys.**

```bash
# Manual deploy if needed
vercel --prod
```

Inspect deployments: https://vercel.com/ram-ns-projects/dategolf

---

## What's done

| Area | Status |
|---|---|
| Game engine + tests | ✅ Complete |
| 269 historical events | ✅ Complete |
| Daily challenge generator | ✅ Deterministic seeded PRNG |
| Fuzzy event search | ✅ Fuse.js, year never leaked |
| Full 5-hole game UI | ✅ Mobile-first |
| Answer reveal + alternatives | ✅ Educational reveal |
| localStorage persistence | ✅ Resume mid-game on reload |
| Streak + personal best | ✅ Tracked in localStorage |
| Spoiler-free sharing | ✅ Web Share API + clipboard |
| Vercel deployment | ✅ Live at dategolf.vercel.app |

---

## What's left to do

### High value, not yet done

- **More events** — currently 269, spec calls for up to 500. Priority: more India/South Asia depth, more Africa, more pre-1500 world
- **Timezone edge case** — the "today" date uses the browser's local time. A player in UTC+5:30 at 11pm gets a different date than someone in UTC-8. Decide: accept this, or force UTC?
- **OG image** — meta tags exist but there's no actual preview image for link sharing
- **Custom domain** — `dategolf.vercel.app` works but a real domain would be better

### Polish / UX

- **Transition animations** between holes (currently instant phase switches)
- **Keyboard shortcut** to advance from reveal to next hole (currently tap/click only)
- **Empty state** for search with no results (currently just plain text)
- **Loading skeleton** instead of pulse text while events load

### Testing gaps

- Cross-browser: iPhone Safari, Android Chrome, desktop Safari
- Slow 3G simulation
- Multi-day streak logic (needs to be played on consecutive days to verify)
- Share button on mobile (Web Share API requires real device)

### Stretch / future

- Category/region filters shown as count badges
- "Today's stats" screen showing how other target years compare to the event database
- Historical difficulty rating based on how far the nearest events are
- Expand to 500 events with a proper data pipeline

---

## How to add events

1. Edit `src/data/events.json` — follow the existing schema exactly
2. Run `node scripts/validate-events.cjs` — must pass all checks
3. Key rules:
   - `id` must be unique kebab-case
   - `name` must **not** contain years (`1947`, `20th century`, etc.)
   - BCE years are negative integers (e.g. `-44` = 44 BCE)
   - `difficulty`: `"easy"` | `"medium"` | `"hard"`
   - `importance`: integer 1–5
4. Commit and push — Vercel auto-deploys

---

## Key design constraints (don't break these)

- **Year never shown during search** — `eventSearch.ts` only indexes `name` + `aliases`
- **Engine has zero Vue deps** — `src/engine/` must stay pure TypeScript
- **Same date = same challenge** — the PRNG seed is derived from the date string only
- **No backend** — everything is static JSON + localStorage; keep it that way for v1
- **Used-event rule** — each event can only be picked once per 5-hole round; enforced by engine

---

## Stack at a glance

| Layer | Technology |
|---|---|
| UI framework | Vue 3 (Composition API) |
| Build tool | Vite 8 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| State management | Pinia |
| Search | Fuse.js |
| Testing | Vitest |
| Deployment | Vercel (static) |
| Persistence | Browser localStorage |
