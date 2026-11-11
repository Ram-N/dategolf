# DateFlow — Implementation Plan & Status

> Companion to `07_DateFlow_Brainstorming.md` (ideas) and `08_DateFlow_highlevel_specs.md` (spec).
> Name history: "Time River" → "DateRoll" → **DateFlow** (renamed 2026-11-01, after Phase 6). Commits before the rename say DateRoll.
> Last updated: 2026-11-01 (Phase 7 complete — all phases done)

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
| 7 | Games built on the timeline | ✅ Done |
| 8 | Connections: links between events and spans on the cards and the timeline | ✅ Done 2026-11-10 |
| 9 | Stories: "How did we get here?" threads on the timeline, a story panel with playback, and a Cause & Effect game | ✅ Done 2026-11-10 |
| 10 | Contemporaries: the Time Machine (the world in a year; compare two years), the Overlap and Distance explorers | 📝 Planned 2026-11-11, awaiting "go" |

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

## Phase 7 — Games ✅
Decisions with Ram (2026-11-01): a **Play hub inside DateFlow**, **daily + practice** rounds (no streaks yet), **all five games**.

- **Engine** (`engine/dateflow/games/`, pure):
  - `random.ts`: mulberry32, string seeds, shuffle and sample. This is a third copy of the generator; DateGolf and DatePick each keep their own.
  - `rounds.ts`: five generators sharing one round format, `ROUND_LENGTH` = 5 questions. Difficulty rises with each question.
  - Daily rounds are seeded from `dateflow:{game}:{date}` only (same date, same round for everyone). Practice rounds use a random seed chosen in the UI, so the engine stays deterministic.
- **The five games:**
  | Game | How it's built | Gets harder by |
  |---|---|---|
  | Which Came First? | two events, pick the earlier | gap shrinks from 300–3000 years to 1–25 |
  | Put Them in Order | 3 → 4 events, one per region where possible, tap earliest → latest | time window shrinks from 2500 to 150 years |
  | What's Missing? | two *consecutive-in-region* events plus the one between; distractors lie wholly outside the gap | distractors move from ≥300 years away to the nearest outside the gap |
  | What's Happening Elsewhere? | anchor event; answer in another region within ±15–40 years; distractors ≥100–500 years away | both bands tighten |
  | Find the Duration | "Ruled {region} · {span}", name the empire | distractors move from other eras to the same region |
- **Tests** (`engine/__tests__/dateflow.games.test.ts`) run against the **real** data, so they also prove the data can supply every game. They check:
  - daily determinism
  - well-formed options, and no repeated events within a round
  - **exactly one right answer** per game, over 40 seeded rounds each
- **UI:**
  - `/dateflow/play` (`DateFlowPlayView.vue`): game cards with Play daily / Practice, and today's score per game
  - `/dateflow/play/:game` (`DateFlowGameView.vue`; `?mode=practice` for practice): progress pips, multiple choice (keys 1–4, Enter for next) or tap-to-order
  - after each answer, a **reveal** with `RevealTimeline.vue`, a "ladder" mini-timeline that plots the events or spans to scale with years. The answer is ✓ (green); wrong picks or misplaced events are ✗ (red), and in the order game each ✗ shows the correct position. Colour is never the only signal.
  - **Explore on the timeline** frames the question's events in DateFlow
  - results screen with an emoji row and **Share** (Web Share or clipboard), plus a practice round link
  - **▶ Play** in the DateFlow toolbar; the nav highlights DateFlow on game pages
- **Services** (`dateflowGames.ts`): today's first daily score per game (`dateflow:daily:{game}:{date}`) and the share text. Reuses `copyText` from `services/sharing`.
- **Theme:** tokens moved to `src/assets/dateflow-theme.css`, shared by the timeline and the games.
- **Fixed during play-testing:**
  - the order reveal marked every event ✓ even when the player's order was wrong
  - reveal labels collided or overflowed on phones; they now go on the roomier side and shorten with "…" if needed
  - edge year labels were clipped
- **Possible next steps:** streaks and stats per game (like DatePick), a combined "daily five" score, difficulty presets, and putting the order game directly on the big timeline.

## Phase 10 — Contemporaries 📝 (planned 2026-11-11, awaiting "go")

**Goal:** doc 16's favourite idea, *"What was happening elsewhere in the world at the same time?"*, built from the data we already have. History is taught region by region; this shows it happening simultaneously. Doc 16 calls it "a time machine that lets students inspect the world at any moment".

**Accuracy rules:**
- **The panel says what it shows:** "what's in DateFlow, not everything that happened". A region with nothing says so ("Nothing in DateFlow yet"), rather than looking empty of history. Gaps it reveals go on the gap list.
- **Approximate dates show "c."** A span with an approximate start or end, near the chosen year, is flagged "dates uncertain: may not have begun / ended yet".
- **Every year count goes through `yearGap`** (no year 0). This also fixes the existing "What happened?" summary, which counts 1000 BCE–500 CE as 1,500 years instead of 1,499.

### 10a. Engine: `src/engine/dateflow/contemporaries.ts` (pure, no Vue)
Reuses `activeDuring` and `summarizePeriod` (`explore.ts`), `yearGap` and `gapText` (`stories.ts`), `laneFor` and `LANES`, and `approxMinGap`.
- **`worldAt(year, events, durations, window = 25)`** returns, per region (lane):
  - the **spans active** that year, each with its years since starting and until ending (so the panel can say "since 1206 · in its 44th year" or "ends in 1279")
  - an `uncertain` flag when an approximate edge is within `approxMinGap(year)`
  - the **events within ±window**, ordered by importance then closeness, up to 4
  - lanes with nothing, kept and marked empty
- **`compareYears(a, b, durations)`:** per region, spans **gone** (active at a, not at b), **new** (at b, not at a) and **continuing**, plus counts.
- **`overlap(spanA, spanB)`:** the shared years `{start, end, years}`; or, if they never met, which ended first and how many years separate them.
- **`distance(a, b, events)`:** the years between (with "about" if either is approximate), plus **`surprise(a, b, events)`**.
  - It finds a well-known third event C (importance ≥ 7, or a milestone) such that the later of A/B is closer to C than to the earlier one. For example: *"Julius Caesar's assassination is closer in time to the Moon landing (about 2,012 years) than to the Great Pyramid (about 2,516)."*
  - It's deterministic, uses only events in the data, and says "about" when a date is approximate. When no clean comparison exists, it's omitted.

### 10b. The Time Machine (UI)
- **Entry points:**
  - a **"Time Machine"** button in the toolbar (it opens at the centre of the current view, rounded)
  - **"What else was happening then?"** on every event card (its year) and span card (its start)
  - a shareable **`?year=1250`** link (and `&compare=1500`), with Copy link
- **`TimeMachinePanel.vue`** uses the same side-panel slot as the Story panel (a bottom sheet on phones); one panel is open at a time. It has four tabs:
  1. **A year:** "The world in 1250". Year controls: type a year, ±1 / ±10 / ±100, and a slider over the data's range. Then a **card per region**:
     - **empires and periods** as chips: "Song dynasty · since 960 · ends 1279"; "Abbasid Caliphate · its last 8 years"
     - **events nearby**, with a window chooser (±10 / ±25 / ±50 / ±100)
     - **empty regions** marked "Nothing in DateFlow yet"
     - every chip opens its card, as elsewhere
  2. **Two years:** 1250 → 1500, with **Gone · New · Still there** per region and a one-line summary ("7 empires and periods ended, 9 began, 3 continued").
- **On the timeline:** a vertical **year line**, labelled (two lines when comparing). Active spans and the listed events are ringed (the existing `highlightIds` path), and the rest dims. The view centres on the year and keeps its zoom; a "Frame it" button fits the century around it.

### 10c. The Overlap and Distance explorers (same panel)
3. **Two empires or periods:** two searchable pickers (by name).
   - **On the timeline:** both spans are ringed, with their shared years shaded (the Stories backdrop style).
   - **In the panel:** *"The Roman Empire and the Han dynasty coexisted for about 246 years (27 BCE – 220 CE)"*, or *"never coexisted: X ended 120 years before Y began"*; then events from each one's region during the overlap.
   - A shortcut on span cards: **"Compare with…"**.
4. **Two events:** two pickers. *"2,516 years apart (about)"*, the **surprise line**, and "k DateFlow events in between". On the timeline, both are framed with a bracket and the gap labelled, in the Stories thread style.

### Store and URL
- **State:** `timeMachine` (`{ mode, year, compare?, spanA?, spanB?, eventA?, eventB?, window } | null`), with actions `openTimeMachine(year?)`, `closeTimeMachine`, `setYear`, `setMode`.
- **Exclusive with stories:** opening one closes the other.
- **URL sync:** `year` / `compare` / `a` / `b`, the same pattern as `?story=`.

### Files
- **New:** `src/engine/dateflow/contemporaries.ts` and its tests; `src/components/dateflow/TimeMachinePanel.vue`; a small `EntityPicker.vue` (search by name).
- **Edited:**
  - `src/stores/dateflow.ts`, `src/views/DateFlowView.vue` (the panel slot, keys, URL)
  - `DateFlowToolbar.vue` (the button), `EventInfoCard` / `DurationInfoCard` slots (the card buttons)
  - `DateFlowTimeline.vue` (a `cursorYears` prop: year lines and an overlap band)
  - `PeriodSummaryCard.vue` (the `yearGap` fix)

### Tests
- **Unit tests:**
  - **`worldAt(1250)`:** includes the Delhi Sultanate, Song, Mongol conquests, Mali and Abbasids; excludes the Ming
  - **`compareYears(1250, 1500)`:** Song gone, Ming new, the Delhi Sultanate continuing
  - **`overlap`:** Rome and Han = 246 years; a non-overlap case
  - **`distance`:** Pyramid → Caesar ≈ 2,516; the surprise uses a later famous event; no-year-0 cases; approximate gives "about"
  - **every lane** gets an entry
- **Playwright:** the toolbar button and `?year=1250`; ±10 moves the year line; compare mode; Rome vs. Han shading; Pyramid ↔ Caesar; a phone bottom sheet; light and dark themes; no console errors.

**Build order:** 10a, 10b, 10c, then docs. Each is a commit that passes its tests on its own. No new data and no review work.

## Phase 9 — Stories ✅ (planned and built 2026-11-10)

**Goal:** turn the 225 reviewed links into stories a student can follow. *"How did we get here?"* walks back through causes and predecessors, *"What happened next?"* walks forward, and the timeline draws the threads. The full plan is in `~/.claude/plans/go-ahead-with-the-sequential-dawn.md`.

**Accuracy rules, built in:**
- **A sequence is never shown as a cause:** it's a thin grey "then" thread, and reads "6 years after X".
- **Debated (medium-confidence) links are dashed** and tagged "debated".
- **Approximate dates show "c."**, and their gaps read "about".
- **No year 0** in any gap.

### As built
- **9a, data:** `relationships.json` gains each link's `confidence` and each type's `story` role (cause / sequence / frame / context). The role is derived in `tools/exporter.py`: `preceded` is a sequence, `began` and `ended` are frames, other causal types are causes. That's simpler than the planned new column.
- **9b, engine (`src/engine/dateflow/stories.ts`, pure):**
  - **Edges always point earlier → later.** For an ending, the span comes first: "World War II was ended by Japan's surrender".
  - **`buildStory`** works in either direction, with depth and size caps and one edge per pair (a cause beats a sequence). It flags debated and cross-region links and finds backdrop spans.
  - **Helpers:** `storyStops` (fans of causes), `narrate` (one sentence per kind of cause, e.g. "A, B and C contributed to D (some debated)."; framing edges stay out), `yearGap` / `gapText`, `joinFrom` / `joinTo` (where threads meet spans), `frameYears` (frames on where threads join, so the Soviet Union's 1922–1991 span doesn't squash its 1985–1991 causes), `storyCounts` and `featuredStories` (deep, cross-regional, no near-duplicates).
- **9c/9d, UI:**
  - **Entry points:** "How did we get here? (n steps)" and "What happened next? (n)" on every linked card; a **Stories** menu in the toolbar (8 featured); shareable `?story=<id>&dir=back|forward`.
  - **The timeline:** threads coloured by type (`--df-arc-*` tokens for both themes), each with an arrowhead and a gap label ("+6 yrs", "~300 yrs"). They draw in chronologically, cross lanes for cross-region causes, and loop for same-year links. Spans in a story get square end-markers; backdrop bands show spans that hold several steps.
  - **`StoryPanel.vue`** (right side; a bottom sheet on phones):
    - **Direction toggle**, the year range, and counts of stops and regions.
    - **The narration**, and a **legend** of only the thread types the story uses.
    - **A subway line of stops,** each with connectors that read into it (verb, debated and region tags, the "why"), a "Story from here ↺" button, and "Go further back (+4)" when trimmed.
    - **Playback:** ▶ auto-advances every 4 s; ← → step; Space plays; Esc closes. Each step frames the threads leading into it, pulses the stop, and fades the other threads.
- **9e, the Cause & Effect game** (`/dateflow/play/cause-effect`):
  - **Rounds:** 2 "what caused X?" questions, 2 "what did X lead to?" questions, then a 4-step story to put in order.
  - **Fair by construction:** only high-confidence cause links are used, and wrong options come from other regions with no path to either the question or the answer. The reveal shows the "why" and **Explore this story**.
- **Tests:** 14 stories tests (toy rules, framing, fans, and real data: the WWII and Mughal orders, featured stories, no time travel) and 2 Cause & Effect fairness tests over 40 seeded rounds. 119 tests in all.
- **Play-tested (Playwright):**
  - the WWII story by URL: 9 threads, 9 stops, narration, playback 3 / 9 with pulse and fading
  - the Soviet story in Lanes mode: cross-lane dashed threads, a 4-cause fan, a one-sentence narration
  - light and dark themes; phone bottom sheet; story from a card; Esc; the game round and Explore. No console errors.

### Ideas for later
- **A Stories gallery page:** cards with a mini-thread preview.
- **Combine stories:** "Show where these two stories meet".
- **Story-of-the-day** on the DateFlow landing page.
- **Narration that uses each event's own description.**
- **Richer stories as the gap list is drafted:** Franz Ferdinand would trigger WWI; Perry would lead to Meiji.

## Phase 8 — Connections ✅ (planned 2026-11-08, built 2026-11-10)

**As built (differences from the plan below):**
- **8a:** `relationships.json` has 146 reviewed links (95 `part_of`, 36 `began`, 15 `ended`). `began` and `ended` were added during the review.
- **8b:** `src/engine/dateflow/connections.ts` (`connectionsFor`, `connectedIds`). The card order is: Is part of → Began → Ended → Began with → Was ended by → sequences → other types → **Includes** last.
- **8c:** `EventConnections.vue` sits above "Before & after" on the event card and after the description on the span card (which follows the theme). Each row shows the other end's year or span, its name and the "why".
- **8d, changed:** a highlight *while a card is open* would sit behind the card's dark overlay, so there's a **"Show these connections on the timeline"** button instead. It closes the card, frames the entity and its links, rings them and dims the rest. Highlighted items claim label space first; any still without room show as ringed dots. A banner ("Connections of X are ringed · Clear") stays until Clear or Escape.
- **Tests:** connections tests on toy data, plus every exported link resolving from both ends. The play-test (Playwright) covered the Mughal Empire, clicking through to Babur, Apartheid in the light theme, Trafalgar's highlight, and a link-less event showing no section, with no console errors.

### Original plan

**Goal:** DateFlow's first use of the links curated in the data work (doc 11, Step 3b). When you open an event or a span, you see what it's connected to and can click through: *"First Battle of Panipat is part of the Mughal Empire"*, and from the empire's side, *"Mughal Empire includes Babur Founds the Mughal Empire, First Battle of Panipat, Humayun Succeeds Babur…"* That turns the timeline from "what happened when" into "how things fit together".

**What's there to show.** Only **reviewed** links are exported. Today these are all `part_of` (46 reviewed, about 140 after the current review, touching about 190 events and spans). Link batch 2 adds `preceded` and `ended`, and batch 3 adds the causal types. **Each batch appears in DateFlow on the next export, with no code change**, because the UI reads every type through its labels.

### 8a. Export `relationships.json` (this is doc 11's Step 3c)
- **New generated file `src/data/relationships.json`:**

  ```json
  {"types": {"part_of": {"label": "is part of", "inverse": "includes", "causal": false}, ...},
   "links": [{"source": "battle-of-plassey", "type": "part_of", "target": "british-raj", "why": "..."}, ...]}
  ```

  - **Links:** reviewed only, in a stable order (by id), so `compare-export` stays byte-identical.
  - **Types:** only the ones in use. Proposed links never leave the db.
- **Built like the other files:** `tools/exporter.py` writes it, `APP_FILES` includes it (so `compare-export` and validate cover it), and a `scripts/validate-relationships.cjs` check runs alongside the existing validators: every end must exist in `events.json` or `durations.json`, and every type must be known.
- **Only DateFlow imports it,** lazily like `durations.json`. DateGolf and DatePick are untouched.

### 8b. Engine: `src/engine/dateflow/connections.ts` (pure TS, no Vue)
- **`connectionsFor(id, data)`:** that entity's links, read from its own side. On the source it uses the forward label ("is part of"), on the target the inverse ("includes"). Results are grouped by label, and each item carries the other end's id, name, year or span, kind (event or span) and "why".
- **Grouping order on a card:**
  1. **Part of**
  2. **Ended / Was ended by**
  3. **Followed / Preceded**
  4. the causal ones (**Led to / Was caused by…**)
  5. **Includes** (last, because it can be long: the Mughal Empire has about 15)
- **Shared ids** (one subject, both an event and a span) resolve to the same connections on both cards. When a shared id is the *other* end of a link, it's shown as its **span** ("Napoleonic Wars, 1803 to 1815"), never as its event ("Napoleonic Wars Begin"). Otherwise "Battle of Trafalgar is part of Napoleonic Wars Begin" reads as if the battle were part of the war's opening. The dashboard's `v_link_review` follows the same rule (2026-11-08).
- **Unit tests,** including tests against the real data:
  - both readings of one link
  - unknown ids are skipped
  - every link end resolves to an event or a span

### 8c. UI: a "Connections" section on both cards
- **`EventConnections.vue`** goes under the event card's existing "Meanwhile" slot and into `DurationInfoCard.vue`. Each row reads like the dashboard's: the relation label, then the other item's year (or "1347 to 1353") and name. The "why" appears as a small line underneath, or on hover.
- **Click a row** to open that event's or span's card (the existing `store.select` / `store.selectDuration`). **Show on timeline** keeps working.
- **Long groups** show 5 items plus "+ 10 more". An item hidden by the current lanes, filters or detail level is still listed; opening it frames it on the timeline.
- **Nothing to show:** if an entity has no links, the section doesn't appear (no empty headings).

### 8d. Timeline highlight (small)
- **While a card is open,** connected markers and bars on screen get a ring, and unconnected ones dim slightly. This is a `relatedIds` prop on `DateFlowTimeline.vue`, next to the existing `selectedId`. It's off when no card is open.
- **No connector lines** in Phase 8: they get cluttered fast across lanes. Revisit them with the chain explorer.

### Testing
- `npm run test:unit` (new connections tests) and `npm run build`.
- `npm run data:compare` and `data:validate`, including the new validator.
- **A Playwright play-test (`DISPLAY=:0`):**
  - open the Mughal Empire and see "Includes" with Babur
  - click through to Babur's event and see "Part of: Mughal Empire"
  - check the highlight ring, with no console errors
  - check light and dark themes, and phone width

### Not in Phase 8 (later phases)
- **A "what led to this?" chain explorer:** a walk back through causal and `preceded` links. It's only worth building once batch 3 (causal links) is reviewed, since today it would only walk `part_of`.
- A network or graph view, connector lines, and connections inside the Phase 7 games (e.g. "which war was this battle part of?").
- Rise and fall of empires, map mode, smarter daily challenges (doc 11 §5).

### Order and size
8a, then 8b, then 8c, then 8d, each a commit that passes its tests on its own. It's best started when the link review is done, so the first export carries about 140 reviewed links rather than 46. About a session of work.

## How to run
```bash
npm run dev          # → http://localhost:5173/dateflow
npm run test:unit    # includes dateflow.test.ts and dateflow.games.test.ts
# games: http://localhost:5173/dateflow/play
```
