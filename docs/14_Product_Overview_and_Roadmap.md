# Product Overview and Roadmap

> **The one place for "what exists" and "what's next".** Updated 2026-11-11. The long-term DateFlow vision is **doc 16**.
> Details live in the linked docs; this page doesn't repeat them. When work finishes, update the roadmap here (not in doc 11 or QUICKSTART).

**Rule zero (CLAUDE.md): historical accuracy trumps everything else.** No false precision, "c." shown prominently, a sequence never shown as a cause, debated links marked as debated.

---

## 1. What exists today

### The games

| Game | What players do | Route | Details |
|---|---|---|---|
| **DateGolf** | Five target years; pick events that land as close as possible. Lowest total penalty wins. | `/dategolf` | doc 01, 02 |
| **DatePick** | Eight events; pick each one's year from four choices. Score out of 8. | `/datepick` | doc 04 |
| **DateFlow** | An interactive world timeline: pan and zoom from 3500 BCE to today, events and spans in World or regional Lanes view, and filters. | `/dateflow` | doc 08, 09 |
| **DateFlow games** | Six daily or practice games: Which Came First?, Put Them in Order, What's Missing?, What's Happening Elsewhere?, Find the Duration, and **Cause & Effect** | `/dateflow/play` | doc 09, Phases 7 and 9 |

All three are seeded by date (same date = same challenge for everyone). There's no backend: static JSON plus localStorage.

### What DateFlow can do

- **Explore:** the timeline with event markers and duration bars (empires, periods), a minimap, eras, milestones, category and region filters, detail level, "Jump to year", "What happened?" (a period summary), and light and dark themes. (Phases 2–6)
- **Event and span cards:** a description, **"Why it matters"** (when a reviewed significance exists; doc 17), "Before & after" in the region, "Meanwhile around the world", empires of the time, and DateLinks memory aids.
- **Connections** (Phase 8): every reviewed link, read from the card's side ("is part of", "includes", "was ended by", "followed"…), clickable, with "Show these connections on the timeline".
- **Stories** (Phase 9):
  - **How to start one:** "How did we get here?" / "What happened next?" on any linked card, or the **Stories** menu (8 featured).
  - **On the timeline:** threads drawn across it, coloured by link type, dashed when debated, crossing regional lanes. **Hover a thread** to read its "why"; **click it** to pick the stop it leads into (doc 17).
  - **The story panel:** a narration, the stops as a subway line, fans of causes, and **▶ playback**.
  - **Sharing:** `?story=<id>&dir=back|forward` links.
- **The Time Machine** (Phase 10): the world in any year, region by region; two years compared (gone / new / still there / came and went); two empires' shared years; two events' distance, with a "Did you know?". Shareable `?year=` and `?tm=` links.
- **Honest dates everywhere:** "c." plus an "≈ Approximate date" box with the historians' range. Disputed events are DateFlow-only (they stay out of DatePick and DateGolf).

### The data behind it

| | Count | Notes |
|---|---:|---|
| Events | **443** | 3500 BCE – 2023; 29 approximate (with ranges), 3 DateFlow-only |
| Spans | **110** | 41 empires, 69 periods (plus 5 eras) |
| Links | **272**, all reviewed | 105 part_of · 43 preceded · 42 began · 33 ended · 26 contributed_to · 13 enabled · 6 triggered · 4 influenced (21 medium confidence = "debated") |
| Sources | **58** reviewed | 57 from the CSV, plus Apartheid. **460 more are drafted, not loaded** (`data/drafts/sources_batch1.json`) |
| Country tags | 100 countries | Location and actor roles; the dashboard Map |
| Significance ("Why it matters") | **98 reviewed** | doc 17: `entity_significance`, reviewed before export. Every importance 7+ item has one (4 Gemini batches, pre-sorted by Claude), plus 2 seeds |
| DateLinks memory aids | 26 events | doc 05, 06 |
| Gap list | **59 wanted** | Batch 1 (South Asia) drafted and published 2026-11-13; batches 2–4 in data/drafts/gap_tasks.md |
| Daily challenges | 366 dates | DateGolf target years |

### The tools behind the data

- **SQLite is the source of truth** (`data/dategolf.db`). `npm run data:export` writes the game JSON; `data:validate` and `data:compare` guard it. → doc 10, 11, 12
- **Every write goes through `tools/`** (a CLI command, logged in `review_log`, tested on a db copy): drafts, links (`load-links`, `retype-link`, `add-link-type`), significance (`set-significance`, `load-significance`, `approve-` / `reject-significance`), dates (`set-event-date`, `set-span-years`), `rename`, sources, the gap list (`load-missing`), memory aids, `dateflow-only`. → doc 12 §7
- **Streamlit dashboard** (`npm run data:dashboard`):
  - **Review queues:** Event drafts, Country tags, Identity, Links, Sources, **Significance** (with a write/replace box), **Missing**, and a decision log. Each fits on one screen and stays on its tab after an action.
  - **Other pages:** Overview, Connections, Coverage heatmap, Map.
  - → doc 13
- **Datasette** (`npm run data:browse`): read-only browsing, with canned queries. → doc 13
- **Drafting with outside AIs** (doc 15): a system prompt for any AI; `manage.py ai-reference` (the file to attach: allowed values, the gap list, every id); `manage.py check-drafts <file>` (every rule, plus a trial load on a db copy). Their files go in `data/drafts/incoming/` and load as proposed.
- **Tests:** 129 game and engine tests (Vitest, many run against the real data) and 65 data-tool tests (`npm run data:test`), plus a dashboard smoke test.

---

## 2. What's next

### Waiting on you (Ram)

| # | What | Where | Why it matters |
|---|---|---|---|
| 0 | **Significance for importance 5–6?** The 7+ backfill is done (78 texts). Say whether to continue down the importance scale | — | Same process: data/drafts/significance_tasks.md |
| 1 | **The gap list: Want or Dismiss the 80 items**, or have outside AIs draft them (doc 15) | Dashboard → Review → **Missing** (doc 12 §4.6e) | Claude drafts the wanted ones. They also deepen the Stories (e.g. Franz Ferdinand would trigger WWI, Commodore Perry would lead to Meiji, the Thirty Years' War span) |
| 2 | **Load and review sources batch 1** (460 Wikipedia articles) | Ask Claude to load it, then Review → Sources (doc 12 §4.6d) | Every event gets a checkable source. 128 are exact name matches (one-click approve) |
| 3 | **Double-check 5 Step 3a decisions** made before the selection fix: `chinese-civil-war`, `great-depression`, `spanish-civil-war`, `manhattan-project`, `arab-spring` | `manage.py identity <id> --one\|--split\|…` | An old loose end from doc 11 |
| 4 | **Two design calls for DatePick range choices** | doc 04 §38 | They unblock Claude's item 4 below |
| 5 | **Pick the next DateFlow phase** (10–14 below), and approve the **colour approach**: keep 3 colourblind-safe hues, add 8 category families as shapes, plus a "focus" mode that fades rather than hides | doc 16, "Assessment" | Doc 16's vision, mapped against what's built |

### Claude's queue (pick work that doesn't pile onto your review queues)

| # | What | Needs | Details |
|---|---|---|---|
| 0 | **Pre-sort each significance batch** before it loads: fix accuracy slips, rewrite texts that repeat the description, soften overstatements (as done for batch 1) | Each incoming batch | doc 17. New drafts already carry one (doc 15) |
| 1 | **Draft the wanted gap-list items** as events and spans, then link them (link batch 4) | Your Wants | Uses `fills_missing`. New links make the stories richer straight away |
| 2 | **Date precision for spans before 500 BCE** (a pre-sorted file) | — | The same false-precision issue the events had (Old Kingdom, the Indus mature phase, Shang…) |
| 3 | **Step 4: fill the thin periods** (about 40 events for pre-500 CE, Africa and the Americas before 1500, Southeast Asia and Oceania) | Overlaps item 1 | doc 11 Step 4; the Coverage heatmap shows the gaps |
| 4 | **DatePick range choices:** ranges instead of single years for approximate events | Your 2 decisions, plus structured `range_start` / `range_end` | doc 04 §38 |
| 5 | **Dashboard v3: the event editor**, including adding or editing a single link | — | doc 13. Less urgent (new events come through drafts), but it lets you edit without Claude |
| 6 | **DateFlow phases from the doc 16 vision** (recommended order; full table in doc 16, "Assessment"): | | |
| 6a | ~~**Phase 10: Contemporaries**~~ ✅ 2026-11-11 (doc 09). A Time Machine (pick a year → a world snapshot by region; compare two years), an Overlap explorer (two spans), a Distance explorer (two events) | No new data | Medium |
| 6b | **Phase 11: Living Timeline polish.** 8 category families as shapes, focus mode, colour by region, distinct milestone landmarks, spans revealing their sub-spans when zoomed, a Historical Currents layer | A few new spans (Axial Age, Enlightenment, Decolonization) | Medium |
| 6c | **Phase 12: Empire life cycles.** `entity_phases` (rise / zenith / fragmentation…), drafted through doc 15 and reviewed, drawn as phase segments on the bars | Curated phases, with sources | Large |
| 6d | **Phase 13: People.** Person entities with lifespans and reigns; contemporaries; lifespan overlap (Akbar and Elizabeth I) | People drafted through doc 15 | Large |
| 6e | **Phase 14: Journeys and a game.** Curated journeys played in the Story panel; a "Find events during X" game | Journey scripts | Medium |
| 6f | **Later:** images (Wikimedia, with licensing), a DateFlow map view, regional significance, AI questions (needs a backend decision), a Stories gallery and story-of-the-day, the Immersive experience (parked) | — | — |

### Housekeeping (from the old QUICKSTART list, still true)

- **Timezone:** "today" uses the browser's local time, so players far apart can get different dates. Decide: accept it, or use UTC.
- **Sharing polish:** an OG preview image; a custom domain.
- **Cross-browser checks:** iPhone Safari, Android Chrome, desktop Safari; the share button on a real device; multi-day streaks.
- **Lint:** 7 old errors (in `gameEngine.test.ts`, `dateflow.games.test.ts`, and an unused `sameCentury` in `challengeGenerator.ts`). New code adds none.
- **Small UX items:** transitions between DateGolf holes, an empty state for search, a loading skeleton.

---

## 3. How work flows (the pattern that's worked)

1. **Claude proposes** (a plan in the docs, or a pre-sorted batch file), and **you say go** or override.
2. **Batches load as `proposed`**, and you review them on the dashboard. One queue at a time is easiest.
3. **Approved data reaches the games on `npm run data:export`.** New link types need no code change.
4. **While you review, Claude builds** game features that use what's already reviewed, and adds every gap it notices to the gap list.
5. **Commits** are small, each passing its tests. Pushing happens on your `/git-commit and push`.

**Where things are recorded:** this page (what exists and what's next) · doc 09 (DateFlow phases, as built) · doc 11 (the data migration log and its decisions) · doc 12 (how to review and edit) · doc 13 (the admin tools) · QUICKSTART.md (how to run it).
