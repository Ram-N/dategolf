# DateFlow — Implementation Plan & Status

> Companion to `07_DateFlow_Brainstorming.md` (ideas) and `08_DateFlow_highlevel_specs.md` (spec).
> Name history: "Time River" → "DateRoll" → **DateFlow** (renamed 2026-11-01, after Phase 6). Commits before the rename say DateRoll.
> Last updated: 2026-11-01 (Phase 6 complete)

## Status at a glance

| Phase | Scope | Status |
|---|---|---|
| 1 | Inspect codebase + data, propose architecture | ✅ Done |
| 2 | Basic timeline: axis, pan, zoom, event markers, info card | ✅ Coded (uncommitted) |
| 2.5 | Polish before Phase 3: look & theme, crowding, minimap, touch & motion | ✅ Done |
| 3 | Duration bars (`durations.json`) | ✅ Done |
| 4 | Regional lanes | ✅ Done (civilisation lanes deferred) |
| 5 | Category filters + importance control | ✅ Done |
| 6 | Exploration: "what was happening elsewhere?", period select, density | ✅ Done |
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
| `region` is one inconsistent string | `World`/`Global`, `North America`/`South America`/`Americas`, `Oceania`, `Southeast Asia` | Map to lanes **at load time** in the DateFlow engine (Phase 4). `events.json` stays untouched, so DateGolf/DatePick are unaffected. |
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
durations.json ┼→ src/engine/dateflow/       (pure TS, zero Vue, unit-tested)
  (Phase 3)    │     timeScale.ts   view math: yearToX / xToYear / zoomAround / pan / ticks
               │     visibility.ts  importance threshold + greedy label layout
               │     lanes.ts       (Phase 4) region → lane mapping
               └→ src/stores/dateflow.ts      (Pinia: view, selection; later filters/lanes)
                    → src/views/DateFlowView.vue
                         components/dateflow/DateFlowToolbar.vue
                         components/dateflow/DateFlowTimeline.vue   (SVG)
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
| `src/engine/dateflow/timeScale.ts` | `View`, bounds (`-3600`…`2030`, min span 2 yrs), `makeView`, `yearToX`, `xToYear`, `zoomAround`, `pan`, `centerOn`, `tickStep`/`ticks` (steps 1…1000, ≥80px apart), `formatTick` |
| `src/engine/dateflow/visibility.ts` | `minImportanceForSpan` (>1500 yrs → ≥7, >300 → ≥5, >50 → ≥4, else all) and `layoutLabels` (greedy: most important first, lowest free row, drop what doesn't fit) |
| `src/stores/dateflow.ts` | Loads events. Holds `view` (persisted to localStorage in try/catch) and `selectedEventId`. Actions: `zoomAt`, `zoomIn/Out`, `panBy`, `jumpTo` (centers a ≤100-year window), `reset`, `select` |
| `src/components/dateflow/DateFlowToolbar.vue` | Title, visible range + span, jump-to-year input (red border on bad input), − / + / Reset |
| `src/components/dateflow/DateFlowTimeline.vue` | SVG with grid, axis, ticks, markers, leader lines and labels. Faint dots mark hidden events, with a "N more in view — zoom in to reveal" hint |
| `src/views/DateFlowView.vue` | Page layout + keyboard (← → pan 10%, + / − zoom) |
| `src/engine/__tests__/dateflow.test.ts` | 18 tests: round-trip, zoom anchor, clamping, ticks, BCE boundary, parseYear, threshold monotonicity, label layout |

### Edits to existing files
- `src/router/index.ts`: `/dateflow` route; the `dateflow.` subdomain redirects there.
- `src/App.vue`: third nav link; `dateflow.` added to the subdomain list.
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

## Phase 2.5 — Polish before Phase 3 ✅
Ram's request: finish all four improvements, one at a time, before starting duration bars.

### 1. Look & feel ✅
- **Light/dark theme:** ☀/☾ toggle. Defaults to the OS setting and persists (`dateflow:theme`). Colours are CSS variables (`--df-*`) defined in `DateFlowView.vue`.
- **Axis at mid-height:** labels fill levels outward above *and* below it (13px levels; an n-line label takes n+1 levels).
- **Label wrapping:** up to 3 lines of ~20 chars (`wrapLabel`). Layout guarantees: no label overlaps another, a label's own leader never crosses a nearer label, and no leader runs through another event's label (`layoutLabels`).
- **Category colour:** three hue groups + grey (`categoryGroups.ts`): Politics & War / Science & Discovery / Culture & Society / Other.
  - Three is the cap: past three hues, scattered dots fail the all-pairs colourblind check.
  - Validated in both themes with the dataviz palette validator.
  - Label text stays neutral; the legend is in the footer.
- **Importance:** shown by dot size; importance ≥7 (and milestones) get bold labels.
- **Era bands:** faint alternating shading with era names, from `src/data/eras.json`.
- **Milestone section lines:** dashed full-height lines at 16 hand-picked turning points (`src/data/milestones.json`, ranked by significance).
  - At wide zoom, lower-ranked lines within 48px of a higher-ranked one are hidden (`spaceMilestones`).
  - Milestone labels always show and get first claim on space.
- **Tooltip:** year first (`1453 — Fall of Constantinople`).
- Known gap: `EventInfoCard` stays dark in light mode, because DateGolf shares it.

### 2. Crowding / use of vertical space ✅
- **Callout layout:** labels may shift sideways (up to ±130px) from their dot, joined by an angled leader. `layoutLabels` tries slots cheapest first (nearer the axis, then nearer the dot, alternating above/below).
- **Guarantees** (unit-tested, including a 300-run fuzz test):
  - no label overlaps another
  - no leader passes through another label
  - no two leaders cross
  - leaders are no flatter than ~27°
  - labels stay fully on screen
- **Results:** a 100-year view of the 1900s went from about 10 labels to 35. Layout runs in under 10ms for 150 candidates.
- **The shift is capped deliberately:** a label far from its year teaches the wrong date.
- **Known limit:** at full zoom (5,600 years) the 1500–2030 strip is only about 136px wide, so only a few of its major events get labels. The minimap (step 3) is the intended overview.

### 3. Overview minimap ✅
- `DateFlowMinimap.vue`: a 46px strip under the toolbar covering all 5,600 years.
- **Density histogram:** about one bar per 5px. Heights use a square-root scale so sparse ancient periods stay visible. Hovering a bar shows e.g. "1500 – 1525: 12 events". The bin counting lives in `engine/dateflow/density.ts`.
- **Viewport box:** outlines the current view; the area outside it is dimmed. The box is at least 8px wide so it stays grabbable when zoomed far in.
- **Navigation:** click to centre the view there (zoom kept). Drag to scrub; grabbing inside the box keeps the offset, so the box doesn't jump. Uses the store's new `centerAt(year)`.
- This also covers the Phase 6 "historical density" idea.

### 4. Touch + smooth motion ✅
- **Animated moves:** the zoom buttons, jump-to-year, Reset and minimap clicks ease over 350ms (`animateTo` in the store).
  - `interpolateView` moves the centre linearly and the span geometrically, so deep zooms feel even. Easing is ease-out cubic.
  - Repeated clicks build on the animation's target: two quick zoom-ins = 4×.
- **Direct input stays instant:** wheel, drag, pinch, arrow keys and minimap drags apply immediately and cancel any animation in flight.
- `prefers-reduced-motion: reduce` makes every move instant.
- **Pinch-zoom:** two pointers zoom around their midpoint and pan as it moves. Lifting one finger continues as a drag.
- **Robustness:** a new gesture's primary pointer clears stale pointer state, so a lost `pointerup` can't turn the next tap into a pinch. Play-testing caught that bug.
- **Verified with real touch events via CDP:** pinch zooms 100 → 29 years with the centre held, a swipe pans, and a tap opens the card.

## Phase 3 — Duration bars ✅
### Data
- **`src/data/durations.json`:** 98 entries, validated by `scripts/validate-durations.cjs`.
- **65 periods** come from ChronoLogic's `public/data/events.json`; its 10 point events were dropped, since they already exist as events. Translated into our conventions:
  - categories: war→War; revolution and political→Politics; cultural and construction→Culture; scientific→Science
  - importance (ChronoLogic 1 = most important): 1→8, 2→5, 3→3
  - its single "Asia" region split by hand into South Asia, East Asia and Southeast Asia
- **33 empires/dynasties added**, from the Old Kingdom of Egypt to the Soviet Union, covering every region. Mughal and the Mongol conquests were already in ChronoLogic's set; Mughal is reclassified as an empire.
- **Type** (`src/types/dateflow.ts`): `Duration` = `id, name, startYear, endYear, description, categories, region, importance (1–9), kind ('empire' | 'period'), approximate?`. `approximate` marks traditional or disputed dates (displayed as "c.").

### Display
- **Placement:** a dedicated band at the bottom of the timeline. Sharing the axis area would collide with labels and leaders. The axis stays centred in the space above it, and the band has a fixed height so the axis doesn't move while zooming.
- **Two sub-bands, three rows each:** *Empires & dynasties* (solid bars) and *Periods* (dashed). They were split after play-testing showed long empires crowding out the Renaissance and Reformation in a single shared band.
- **Which bars show:** a bar appears if its importance passes the zoom threshold **or** it's at least 80px wide. Bars are packed into rows by importance (`packBars`).
- **Labels and colour:** bars are coloured by category group, like event dots. Names stick to the visible left edge and truncate to fit. The tooltip is year-first ("c. 320 – c. 550 — Gupta Empire").
- **`DurationInfoCard.vue`** (follows the light/dark theme) shows:
  - kind, span, length and region
  - the description, plus a note when dates are approximate
  - **"Meanwhile in {region}"**: up to 8 same-region events during the span (`eventsDuring`), each opening its event card
  - **Show on timeline**: frames the span with a 15% margin (`showSpan`)
- An event card and a duration card never show at once. The footer legend now includes Empire / Period swatches.

### Known limits / follow-ups
- "Meanwhile in…" matches the region string exactly, so thinly covered regions show few events (the Ottoman Empire lists 2). Phase 4's region → lane mapping, and possibly a world-wide "meanwhile" list (Phase 6), will improve this.
- `scripts/validate-events.cjs` reports 67 errors that predate this work:
  - 66 events have importance 6–9, but the validator only allows 1–5 (the `Event` type was widened in Phase 2)
  - 1 event name contains a year

  The validator's range should be updated to 1–9.
- Play-test note: Chromium swallows a tap made within a moment of a fast swipe (the tap only stops the fling). The touch test waits 600ms after swiping.

## Phase 4 — Lanes ✅
Decisions with Ram (2026-11-01): a **World ↔ Lanes toggle** rather than replacing the single timeline, with **4 default lanes**.

- **`engine/dateflow/lanes.ts`:** seven lanes map the inconsistent region strings at load time, so `events.json` is untouched:
  - South Asia; East Asia (+ Southeast Asia); Europe; Middle East; Africa
  - Americas (+ North / South America)
  - Global (+ World, Oceania, anything unrecognised)

  It also holds `toggleLane`, which won't hide the last visible lane, plus `moveLane` and `sanitizeLanes`. The last repairs saved state when lanes change.
- **Store:** `mode` ('world' | 'lanes') and `laneState` ({order, visible}) persist as `dateflow:mode` and `dateflow:lanes`. Defaults: South Asia, East Asia, Europe, Global.
- **Timeline refactor:** the component now renders a list of *tracks*. World mode is one track with the two-sub-band duration strip. Lanes mode is one track per visible lane, each containing:
  - the lane name, its own axis, and labels above and below (same callout layout and guarantees)
  - that region's bars: one empire row + one period row, or empires only if the lane is under 120px tall
- **Shared across lanes:** era bands, milestone lines (so they line up across regions) and one row of year labels at the bottom.
- **Toolbar:** a `World | Lanes` segmented control, plus `DateFlowLanePicker.vue` in Lanes mode.
  - Per lane: checkbox, ↑/↓, and "Restore default lanes".
  - Closes on outside click or Esc.
  - The panel position is clamped on screen (the button can sit mid-screen on phones).
- **Verified in the browser** at full zoom, 1550, 300 BC and 1950:
  - no label overlaps
  - no leader through a label
  - every label and bar stays inside its own lane
  - the 1950 view shows 52 labels across 4 lanes, vs 34 in World mode
- **Deferred:** "expand a region into civilisations" (e.g. Europe → Greece / Rome / Byzantine). It needs either a `civilizations[]` field on events or matching events to durations by span + region; decide when we return to it.
- **Data gaps the lanes expose:** e.g. East Asia has no events in 1450–1650, and Global is sparse before 1500. Worth adding events there.

## Phase 5 — Filters + progressive detail ✅
- **`engine/dateflow/filters.ts`:**
  - `matchesFilters`: any selected category, AND any selected region (regions via `laneFor`)
  - `importanceThreshold`: the zoom threshold shifted by the detail setting
  - `categoriesByFrequency`: the category list comes from the data, most common first, so there are no hard-coded category names
- **Store:** `filters` = {categories, regions, detail}, persisted as `dateflow:filters` and sanitised on load. `filteredEvents` and `filteredDurations` feed the timeline and minimap.
  - **Region filtering is World-mode only.** In Lanes mode the lane picker is the region control, and the filter panel says so.
- **`DateFlowFilters.vue`** (toolbar popover, "Filters (n)" badge):
  - category and region chips
  - a 5-step Fewer ↔ More detail slider
  - "Clear all filters"
- **`composables/usePopover.ts`:** shared open/close, outside-click/Esc and on-screen positioning. The lane picker was refactored onto it.
- **Filters apply everywhere:** event labels, empire/period bars, the minimap histogram (selecting Science shows the density of the history of science) and the "N more in view" count. **Milestone section lines ignore filters**, so the sections stay put.
- **Footer:** "Showing: Science · Technology · Europe · more detail (+2) — Clear", plus a "nothing matches" note when a combination is empty.
- **Verified in the browser** by checking every visible label and bar against `events.json` / `durations.json` for each filter combination (zero mismatches). The detail slider gives 9 / 14 / 17 labels at Fewer / Auto / More in a 400-year view.
- **Test fix:** the 300-run layout fuzz test now collects violations and asserts once; ~500k in-loop `expect()` calls had pushed it past Vitest's 5s timeout under load.
- **Data notes found while testing:** some events carry surprising categories (e.g. Adam Smith and the Great Plague of London appear under Science/Technology). Worth a pass when the data is revisited.

## Phase 6 — Exploration features ✅
- **`engine/dateflow/explore.ts`** (pure, unit-tested):
  - `meanwhile`: the top 2 events in each *other* lane within ±50 years
  - `beforeAndAfter`: the nearest neighbours in the same lane
  - `activeDuring`: durations of a kind overlapping a year or range
  - `summarizePeriod`: empires, periods and the top 4 events per lane for a range
- **Event card → "Meanwhile"** (`EventMeanwhile.vue`):
  - *Before & after in {region}* with the event itself highlighted, *Meanwhile around the world (±50 years)*, and *Empires in {year}* chips
  - **Show the surrounding century** frames ±50 years
  - Event links call `goToEvent`, which opens the card *and* glides the timeline there, so you can hop through history. Empire chips open the duration card.
  - It plugs into the shared `EventInfoCard` through a new optional `<slot />`. DateGolf passes nothing, so its card is unchanged (verified).
- **Period summary** (`PeriodSummaryCard.vue`, follows the theme):
  - **What happened?** in the toolbar summarises the current view
  - **Shift-drag** (mouse) across the timeline selects a custom range; a dashed band with a live year label follows the drag, and the view doesn't pan
  - shows empire and period chips (each opens its card), events grouped by region (each opens its card and navigates), and **Zoom to this period**
  - respects the active filters ("2 events matching your filters")
- **Related events:** covered by *Before & after* and *Meanwhile*. **Density:** already covered by the minimap histogram (Phase 2.5).
- **Store:** `summaryRange`, `openSummary`/`closeSummary`, `goToEvent`, `showSurrounding`. Event, duration and summary cards are mutually exclusive.
- **Small fixes:** wrapped names stay aligned with their year column in both lists; the mouse/keyboard hint line is hidden on small screens (gives the phone timeline +37px).
- **Data notes:** *Before & after* exposes sparse regions. For example, the Middle East's nearest events before 1453 are 786 and 1096. Fall of Constantinople is tagged Middle East rather than Europe.

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
npm run dev          # → http://localhost:5173/dateflow
npm run test:unit    # includes src/engine/__tests__/dateflow.test.ts
```
