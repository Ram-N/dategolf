# DateGolf, DatePick and DateFlow — Quick Start

> Run this file when returning after a gap: `cat QUICKSTART.md`

---

## What is this?

Three daily browser-based history games in one app, sharing one dataset:

**DateGolf**: given 5 target years, pick historical events that land as close as possible to each. Lowest total penalty wins (like golf).

**DatePick**: given 8 historical events, pick the correct year from 4 choices. Score out of 8.

**DateFlow**: an interactive world timeline (3500 BCE to today), with six timeline games, **Connections** between events, and **Stories** ("How did we get here?") drawn across the timeline.

All are seeded by date (same date = same challenge for everyone). The data lives in SQLite and is exported to static JSON, edited through review tools and a Streamlit dashboard.

> **What exists and what's next: [`docs/14_Product_Overview_and_Roadmap.md`](docs/14_Product_Overview_and_Roadmap.md).** Start there after a gap.

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

That's it. No backend, no environment variables needed. (Game data is edited in SQLite and exported to static JSON; see *Data* below.)

---

## All available commands

```bash
npm run dev          # Dev server with hot reload
npm run build        # Production build (type-check + vite build)
npm run preview      # Preview the production build locally
npm run test:unit    # Run unit tests (Vitest): 119 tests, many against the real data
npm run type-check   # TypeScript check only (vue-tsc)
npm run lint         # Lint + auto-fix (oxlint + eslint)
npm run format       # Format src/ with Prettier

npm run data:export    # SQLite → app JSON (after editing data/dategolf.db)
npm run data:validate  # Data integrity checks
npm run data:compare   # Verify export matches committed JSON
npm run data:backup    # Monthly local db snapshot → data/backup/ (gitignored)
npm run data:browse    # Datasette: browse the db at http://localhost:8001 (read-only; docs/13)
npm run data:dashboard # Streamlit dashboard at http://localhost:8501 (health, review, coverage, map; docs/13)
npm run data:test      # Tests for the data tools (49, run on a temporary copy of the db)
npm run data:dashboard:test  # Headless smoke test of every dashboard page
node scripts/validate-events.cjs   # Legacy events.json rule checks
```

---

## Project structure

```
src/
  types/
    index.ts                  ← DateGolf interfaces (Event, GameState, etc.)
    datepick.ts               ← DatePick interfaces (DatePickQuestion, etc.)
  data/                       ← GENERATED from SQLite (never hand-edit): events (434), durations, relationships (links), datelinks…
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
  engine/dateflow/            ← DateFlow: timeScale, lanes, filters, connections.ts, stories.ts, games/rounds.ts
  stores/dateflow.ts          ← DateFlow Pinia store (view, filters, cards, focus, stories)
  views/DateFlow*.vue         ← DateFlow timeline, games list, one game
  components/dateflow/        ← Timeline, cards, Connections, StoryArcs, StoryPanel, StoriesMenu…
  router/index.ts             ← /dategolf, /datepick, /dateflow, /dateflow/play/:game
  App.vue                     ← Nav bar (DateGolf | DatePick | DateFlow)
data/dategolf.db              ← SQLite: the source of truth for all game data
tools/                        ← Python data tools (manage.py CLI: export, validate, drafts, links, sources, gap list…)
dashboard/                    ← Streamlit admin dashboard + Datasette metadata
docs/
  01–03                         ← DateGolf spec, technical plan, data and challenges
  04–06                         ← DatePick spec, memory aids (DateLinks)
  07–09                         ← DateFlow brainstorm, specs, implementation phases (as built)
  10–13                         ← Data: SQLite audit, migration log, review guide, admin tools
  14_Product_Overview_and_Roadmap.md ← What exists + what's next (start here)
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

### DateFlow
1. **Loads** `events.json`, `durations.json` and `relationships.json` (reviewed links only).
2. **The timeline** places events and spans by year (World view, or one lane per region); filters and detail level choose what shows.
3. **Cards** show an event's or span's context and its **Connections**. **Stories** (`engine/dateflow/stories.ts`) walk the links back or forward (earlier → later; a sequence is never shown as a cause) and draw them as threads.
4. **Games** (`/dateflow/play`) are generated per date from the same data: `engine/dateflow/games/rounds.ts`.

---

## Deployment

Vercel is connected to the GitHub repo. **Every push to `main` auto-deploys.**

```bash
# Manual deploy if needed
vercel --prod
```

Inspect deployments: https://vercel.com/ram-ns-projects/dategolf

---

## What's done, and what's left

Both live in **[`docs/14_Product_Overview_and_Roadmap.md`](docs/14_Product_Overview_and_Roadmap.md)**: §1 for what exists today (games, data, tools) and §2 for what's next (waiting on you, Claude's queue, housekeeping). This file sticks to running the project.

---

## Data: SQLite is the source of truth

`data/dategolf.db` holds all game data. The app's JSON files are **generated from it — don't hand-edit them**:
`src/data/{events,durations,datelinks,milestones,eras}.json`, `public/data/daily_challenges.json`.

**Edit workflow**
1. Open `data/dategolf.db` in DB Browser for SQLite (keep "Foreign keys" on) and edit. Click *Write Changes*.
2. `npm run data:export`. This regenerates the JSON plus `data/dategolf.sql`, a text dump for readable git diffs.
3. `npm run data:validate`. It must report 0 errors.
4. Commit the db, the `.sql` file and the JSON together. Vercel deploys the JSON; it doesn't need Python.

**Adding an event** needs rows in `entities` (id, `primary_type='event'`), `events`, `entity_categories`
(`facet='event'`, position 0 = primary) and `event_aliases`. Leave `position` NULL. Export sorts by year.

**Rules**
- `id` must be unique kebab-case. `name` must not contain years.
- Years are signed: `-1` = 1 BCE, `1` = 1 CE. **There is no year 0** (the schema rejects it).
- `difficulty`: `easy` | `medium` | `hard`. `importance` is currently 2–9 in the data.
  (`validate-events.cjs` still expects 1–5. That conflict predates the db and is flagged, not fixed.)

**Commands** (`uv run python tools/manage.py <cmd>`)

| Command | Does |
|---|---|
| `validate` | Integrity checks → `data/reports/validate.md` |
| `export-json` | db → app JSON + `dategolf.sql` |
| `compare-export` | Proves a fresh export is byte-identical to committed files |
| `reconcile-events` | Proposes CSV row ↔ event matches → `legacy_csv_crosswalk` + `data/reports/reconciliation.md`. Review in the `v_csv_crosswalk_review` view and set `decision` to `accepted`/`rejected`. Re-runs keep decided pairs. |
| `load-drafts <file>` | Loads a batch of drafted events (`data/drafts/*.json`) as `proposed`. **Proposed events are never exported.** |
| `approve <id> [<id>...]` | Marks proposed events `reviewed`, so the next `export-json` publishes them. To reject one, delete its `entities` row (this cascades). |
| `coverage [--bin N]` | Events per N-year bin × region → `data/reports/coverage.md` |
| *(recovery)* | Undo uncommitted db edits: `git checkout -- data/dategolf.db`. The `data/dategolf.sql` dump is a full second backup (see doc 12 §6). |

`data/legacy/` holds frozen copies of the original 7 files (including `events_master.csv`) with `MANIFEST.json` hashes.
See `docs/10_DateFlow_Data_Audit_and_SQLite_Handoff.md` and `data/reports/migration.md`.

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
