# DateRoll — Implementation Plan & Status

> Companion to `07_DateRoll_Brainstorming.md` (ideas) and `08_DateRoll_highlevel_specs.md` (spec).
> "Time River" was the earlier working name. **DateRoll** is current.
> Last updated: 2026-11-01

## Status at a glance

| Phase | Scope | Status |
|---|---|---|
| 1 | Inspect codebase + data, propose architecture | ✅ Done |
| 2 | Basic timeline: axis, pan, zoom, event markers, info card | ✅ Coded (uncommitted) |
| 3 | Duration bars (`durations.json`) | ⏳ TBD (next) |
| 4 | Regional lanes | ⏳ TBD |
| 5 | Category filters + importance control | ⏳ TBD |
| 6 | Exploration: "what was happening elsewhere?", period select, density | ⏳ TBD |
| 7 | Games built on the timeline | ⏳ TBD |

**Decisions made with Ram (2026-11-01)**
- Durations come from ChronoLogic's periods (`../ChronoLogic/public/data/events.json`), plus about 25–30 empires and dynasties we add ourselves.
- Desktop first, mobile usable. Pinch-zoom polish comes later.

---

## Phase 1 — Findings ✅

**Stack:** Vue 3, Pinia, vue-router, Tailwind 4, Vitest. The only runtime dependency is `fuse.js`. Static JSON, no backend.

**Event DB:** `src/data/events.json` holds 343 events. Its source is `events_master.csv` (310 rows, single years only). Schema (`src/types/index.ts`):
`id, name, year (negative = BCE), categories[], region (single string), aliases[], description, difficulty, importance`

| Gap | Reality | Decision |
|---|---|---|
| `importance` typed `1–5` | Actual values run **2–9** (122×5, 120×4, 25×7, 23×6, 14×8, 4×9) | Type widened to `number`. Zoom thresholds tuned to real data. No data edits. |
| `region` is one inconsistent string | `World`/`Global`, `North America`/`South America`/`Americas`, `Oceania`, `Southeast Asia` | Map to lanes **at load time** in the DateRoll engine (Phase 4). `events.json` stays untouched, so DateGolf/DatePick are unaffected. |
| No `civilizations` field | n/a | Not needed until Phase 4. Add it only if lane expansion requires it. |
| Skewed density | 218 of 343 events fall after 1500. About 20 fall before 1000 BCE. | Progressive disclosure + label-collision culling. The axis stays **linear** (spec §2.1). |

**Durations DB:** none exists in DateGolf. ChronoLogic has 65 `period` and 10 `point` entries (`id, name, startYear, endYear, description, categories, region, importance, type`). Most are wars and movements. Only one is an empire (Mughal).

**Dates:** plain integers, negative = BCE, no year 0. A JS `Date` is never used. Positions use the raw integer, which puts the BCE/CE boundary 1 year off. That error is invisible at any zoom. Axis labels show `BCE | CE` at 0 rather than a year 0.

**Reused:** `EventInfoCard.vue` serves as the detail card. The `src/engine/` pattern (pure TS + Vitest) and the store/view/route pattern follow DatePick.
**Not reused:** `TimelineView.vue` is DateGolf's fixed reveal strip and doesn't fit a pan/zoom viewport.

### Simplicity notes
- **No D3, canvas, or virtualization.** About 350 events and about 100 bars are tiny. A single Vue-rendered `<svg>` plus a hand-written linear scale is enough. The spec's performance concerns don't apply at this size.
- **No new dependencies** planned for Phases 2–5.

---

## Architecture

```
events.json ───┐
durations.json ┼→ src/engine/dateroll/       (pure TS, zero Vue, unit-tested)
  (Phase 3)    │     timeScale.ts   view math: yearToX / xToYear / zoomAround / pan / ticks
               │     visibility.ts  importance threshold + greedy label layout
               │     lanes.ts       (Phase 4) region → lane mapping
               └→ src/stores/dateroll.ts      (Pinia: view, selection; later filters/lanes)
                    → src/views/DateRollView.vue
                         components/dateroll/DateRollToolbar.vue
                         components/dateroll/DateRollTimeline.vue   (SVG)
                         components/EventInfoCard.vue               (reused)
```

- **View state is just `{ start, end }` in years.** Every pixel value is derived from it. Zoom keeps the year under the cursor fixed.
- **The visualization holds no history of its own.** Everything comes from the JSON (spec §8, §9).
- The engine stays pure, per the project rule in `CLAUDE.md`.

---

## Phase 2 — Basic timeline ✅ (coded)

### Files
| File | What it does |
|---|---|
| `src/utils/formatYear.ts` | Shared `formatYear()` + `parseYear()` (accepts `1453`, `500 BC`, `500 B.C.`, `-44`, `1066 AD`, `AD 800`) |
| `src/engine/dateroll/timeScale.ts` | `View`, bounds (`-3600`…`2030`, min span 2 yrs), `makeView`, `yearToX`, `xToYear`, `zoomAround`, `pan`, `centerOn`, `tickStep`/`ticks` (steps 1…1000, ≥80px apart), `formatTick` |
| `src/engine/dateroll/visibility.ts` | `minImportanceForSpan` (>1500 yrs → ≥7, >300 → ≥5, >50 → ≥4, else all) and `layoutLabels` (greedy: most important first, lowest free row, drop what doesn't fit) |
| `src/stores/dateroll.ts` | Loads events. Holds `view` (persisted to localStorage in try/catch) and `selectedEventId`. Actions: `zoomAt`, `zoomIn/Out`, `panBy`, `jumpTo` (centers a ≤100-year window), `reset`, `select` |
| `src/components/dateroll/DateRollToolbar.vue` | Title, visible range + span, jump-to-year input (red border on bad input), − / + / Reset |
| `src/components/dateroll/DateRollTimeline.vue` | SVG with grid, axis, ticks, markers, leader lines and labels. Faint dots mark hidden events, with a "N more in view — zoom in to reveal" hint |
| `src/views/DateRollView.vue` | Page layout + keyboard (← → pan 10%, + / − zoom) |
| `src/engine/__tests__/dateroll.test.ts` | 18 tests: round-trip, zoom anchor, clamping, ticks, BCE boundary, parseYear, threshold monotonicity, label layout |

### Edits to existing files
- `src/router/index.ts`: `/dateroll` route; the `dateroll.` subdomain redirects there.
- `src/App.vue`: third nav link; `dateroll.` added to the subdomain list.
- `src/types/index.ts`: `importance: number`.
- `formatYear` was duplicated in 4 files (`EventInfoCard`, `QuestionCard`, `DatePickResults`, `CreatorView`). All now import the shared util.

### Interactions
- Mouse wheel / trackpad pinch zooms around the cursor. Horizontal scroll or shift+wheel pans.
- Pointer drag pans (mouse and touch). Pointer capture starts only after a 4px drag, so clicks still reach markers.
- Clicking a dot or label opens `EventInfoCard`. Esc closes it.
- Initial view: the full span (about 32 anchor events at 1400px width).

### Bugs found in play-testing (fixed)
- A tall leader line could cover a label in a lower row and block clicks on it. Leaders now sit in their own layer beneath all labels, with `pointer-events="none"`.
- Labels at the screen edges were clipped. Label boxes are now clamped inside the viewport, while the dot and leader stay at the true year.

### Verification done
- `npm run test:unit`: 44/44 pass.
- `npm run type-check`: clean. The new files lint clean. `npm run lint` still reports 4 errors that predate this work (`gameEngine.test.ts`, `challengeGenerator.ts`, `EventFinder.vue`).
- Playwright run (headless, `DISPLAY=:0`):
  - load → 32 markers
  - wheel-zoom keeps the anchor year fixed
  - drag pans
  - `500 BC` and `1453` jump correctly
  - marker → card → Esc
  - Reset works
  - 390px mobile view renders
  - `/dategolf` and `/datepick` still load
  - no console errors

### Known limitations
- At full zoom-out, 1500 onward is crowded (that's the data density). Zooming in clears it, and lanes (Phase 4) will spread it out further.
- No pinch-zoom gesture on touch screens yet (buttons work).
- Marker colour has only two tiers: amber for importance ≥7, grey otherwise.

---

## Phase 3 — Duration bars ⏳ TBD (next)
- **Data:** create `src/data/durations.json`.
  - Copy ChronoLogic's 65 `period` entries. Drop the 10 `point` ones, which already exist as events.
  - Add about 25–30 empires/dynasties in the same schema plus `approximate?: boolean`. Candidates: Indus Valley, Maurya, Gupta, Chola, Delhi Sultanate, Roman Republic, Roman Empire, Byzantine, Han, Tang, Song, Ming, Qing, Abbasid, Ottoman, Safavid, Aztec, Inca, Classic Maya, Mali, Old/New Kingdom Egypt.
- **Type + validation:** add a `Duration` type and `scripts/validate-durations.cjs`, modelled on `validate-events.cjs`. Check unique IDs and `startYear ≤ endYear`.
- **Rendering:** draw bars behind the markers, stacked in rows so overlapping bars don't collide (a pure engine function). Show a bar if its importance passes the zoom threshold **or** it's at least N px wide.
- **Detail card:** add `DurationInfoCard.vue` with the name, span, description, and the events that fall inside it.
- **Open question:** should bars share the marker area or get a band of their own above the axis? Decide while building.

## Phase 4 — Lanes ⏳ TBD
- `lanes.ts` maps regions to default lanes:
  - South Asia
  - East Asia (+ Southeast Asia)
  - Europe
  - Middle East
  - Africa
  - Americas (+ North/South America)
  - Global (+ World, Oceania for now)
- Lane picker: show/hide, reorder (up/down buttons, no drag library), reset to default. Lane layout persists in localStorage.
- Each lane gets its own label rows. `layoutLabels` already works per lane.
- **Open question:** "Expand into civilizations" (e.g. Europe → Greece / Rome / Byzantine) is the one feature that may need a new data field. Either add `civilizations[]` to events, or match events to a civilization by its duration span + region. Matching may avoid a schema change.

## Phase 5 — Filters + progressive detail ⏳ TBD
- Category chips use the **existing** categories (`Politics, War, Science, Culture, Religion, Social, Technology, Arts, Medicine, Exploration…`), not the spec's proposed 12.
- Category and lane filters combine with AND.
- An importance slider can override the automatic zoom threshold.
- Optional: retune `minImportanceForSpan` once lanes change how much space each event gets.

## Phase 6 — Exploration features ⏳ TBD
- **What was happening elsewhere?** From the event card: top events in other lanes within ±25–50 years, plus durations active that year. Built as a pure engine function.
- **Select a period:** drag-select a range to get a summary grouped by lane, plus empires active then.
- **Related events** and links to "show surrounding period".
- **Density strip:** a small histogram under the axis, with event counts per bucket.

## Phase 7 — Games ⏳ TBD
Each game is a separate pure engine module plus its own view, using a seeded daily PRNG like DatePick (same date = same challenge). Suggested order:
1. Which Came First?
2. Put Them in Order (DatePick-like, on the timeline)
3. What's Missing? (middle of three events hidden)
4. What's Happening Elsewhere?
5. Find the Duration (needs `durations.json`)

---

## How to run
```bash
npm run dev          # → http://localhost:5173/dateroll
npm run test:unit    # includes src/engine/__tests__/dateroll.test.ts
```
