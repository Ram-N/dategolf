# DateGolf + DatePick — Quick Start

> Run this file when returning after a gap: `cat QUICKSTART.md`

---

## What is this?

Two daily browser-based history games in one app:

**DateGolf** — Given 5 target years, pick historical events to land as close as possible to each — lowest total penalty wins (like golf).

**DatePick** — Given 8 historical events, pick the correct year from 4 choices. Score out of 8.

Both games share the same event dataset and are seeded by date (same date = same challenge for everyone).

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
  types/
    index.ts                  ← DateGolf interfaces (Event, GameState, etc.)
    datepick.ts               ← DatePick interfaces (DatePickQuestion, etc.)
  data/events.json            ← 269 historical events (shared by both games)
  engine/
    gameEngine.ts             ← DateGolf pure game logic, zero Vue deps
    challengeGenerator.ts     ← DateGolf seeded daily target-year generation
    datepick/
      challengeGenerator.ts   ← DatePick seeded 8-question generation (6 era bands)
      distractorEngine.ts     ← Ranked distractor selection (prefers close years)
    __tests__/                ← Unit tests for engine + generator
  services/
    eventSearch.ts            ← Fuse.js fuzzy search (name+alias only)
    persistence.ts            ← DateGolf localStorage: session resume, streak, stats
    sharing.ts                ← DateGolf Web Share API + clipboard fallback
    datepickPersistence.ts    ← DatePick localStorage: session resume, streak, stats
    datepickSharing.ts        ← DatePick share text builder (✅/❌ emoji grid)
  stores/
    game.ts                   ← DateGolf Pinia store
    datepick.ts               ← DatePick Pinia store
  views/
    DailyChallengeView.vue    ← DateGolf orchestrator (landing/playing/revealing/complete)
    DatePickView.vue          ← DatePick orchestrator (same phase pattern)
  components/
    GameHeader.vue            ← DateGolf: hole progress (●●●○○) + score
    TargetYear.vue            ← DateGolf: big year display
    EventFinder.vue           ← DateGolf: search input + category chips + results
    ConfirmSelection.vue      ← DateGolf: bottom-sheet confirm before locking in
    AnswerReveal.vue          ← DateGolf: year reveal, penalty, better alternatives
    FinalScoreView.vue        ← DateGolf: 5-hole summary, stats, share button
    datepick/
      DatePickHeader.vue      ← DatePick: progress dots + live score
      QuestionCard.vue        ← DatePick: event name + 4 choice buttons
      QuestionReveal.vue      ← DatePick: correct/wrong + explanation
      DatePickResults.vue     ← DatePick: final score, answer review, share
  router/index.ts             ← / → /datepick, /dategolf, /datepick routes
  App.vue                     ← Minimal nav bar (DateGolf | DatePick)
docs/
  01_dategolf_GAME_SPEC.md      ← DateGolf design spec
  02_dategolf_TECHNICAL_PLAN.md ← Technical architecture
  03_dategolf_DATA_AND_CHALLENGES.md ← Event data design + challenge rules
  04_datepick_SPECS.md          ← DatePick design spec
scripts/
  validate-events.cjs         ← Run after editing events.json
```

---

## How the games work (engineering view)

### DateGolf
1. **App loads** → reads today's date → `generateDailyChallenge(date)` seeds a PRNG from the date string → picks 5 target years across 7 weighted historical eras (same date = same targets everywhere)
2. **localStorage** is checked — if a game for today exists, it resumes from that state
3. **Player searches** for an event by name/keyword → Fuse.js searches `name` + `aliases` only (year is never indexed or shown)
4. **Player confirms** → `selectEvent()` calculates `penalty = |targetYear - eventYear|`, finds up to 2 better alternatives, advances the hole
5. **Reveal screen** shows the event year, penalty, running total, and alternatives
6. After **5 holes**, final score screen with spoiler-free share text

### DatePick
1. **App loads** → `generateDatePickChallenge(date)` seeds a different PRNG (salted with `datepick:`) → picks 8 events across 6 fixed era bands (1 ancient, 1 medieval, 2 early-modern, 1 1800s, 2 1900–1949, 1 1950+)
2. **localStorage** is checked — incomplete game resumes mid-question
3. **Each question** shows the event name + description, with 4 year choices (correct year + 3 distractors ranked by proximity)
4. **Player picks** → reveal shows ✓/✗ + the correct year + full description
5. After **8 questions**, results screen shows score out of 8 with per-question breakdown and share text

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
| DateGolf game engine + tests | ✅ Complete |
| 269 historical events | ✅ Complete |
| DateGolf daily challenge generator | ✅ Deterministic seeded PRNG |
| Fuzzy event search | ✅ Fuse.js, year never leaked |
| DateGolf full 5-hole game UI | ✅ Mobile-first |
| Answer reveal + alternatives | ✅ Educational reveal |
| DateGolf localStorage persistence | ✅ Resume mid-game on reload |
| Streak + personal best (DateGolf) | ✅ Tracked in localStorage |
| Spoiler-free sharing (DateGolf) | ✅ Web Share API + clipboard |
| **DatePick game mode** | ✅ Complete |
| DatePick challenge generator | ✅ 8 questions, 6 era bands, seeded |
| DatePick distractor engine | ✅ Proximity-ranked distractors |
| DatePick UI (4 phases) | ✅ Mobile-first |
| DatePick localStorage persistence | ✅ Resume + streak + best score |
| DatePick sharing | ✅ ✅/❌ emoji grid |
| Game nav bar (DateGolf ↔ DatePick) | ✅ Top nav with active state |
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
- **Same date = same challenge** — the PRNG seed is derived from the date string only; DatePick uses a different salt (`datepick:`) so its seed is independent from DateGolf's
- **No backend** — everything is static JSON + localStorage; keep it that way for v1
- **Used-event rule (DateGolf)** — each event can only be picked once per 5-hole round; enforced by engine
- **Events are shared** — both games read from `src/data/events.json`; don't add game-specific fields to the shared Event type

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
