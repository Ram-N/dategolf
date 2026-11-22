# Product Overview and Roadmap

> **The one place for "what exists" and "what's next".** Updated 2026-11-19. The long-term DateFlow vision is **doc 16**.
> Details live in the linked docs; this page doesn't repeat them. When work finishes, update the roadmap here (not in doc 11 or QUICKSTART).

**Rule zero (CLAUDE.md): historical accuracy trumps everything else.** No false precision, "c." shown prominently, a sequence never shown as a cause, debated links marked as debated.

---

## 1. What exists today

### The games

| Game | What players do | Route | Details |
|---|---|---|---|
| **DateGolf** | Five target years; pick events that land as close as possible. Lowest total penalty wins. A **golden ring** marks a hole where no unused event of importance ≥ 4 was closer (the best possible pick). | `/dategolf` | doc 01, 02 |
| **DatePick** | Eight events; pick each one's year from four choices. Score out of 8. | `/datepick` | doc 04 |
| **DateFlow** | An interactive world timeline: pan and zoom from 3500 BCE to today, events and spans in World or regional Lanes view, and filters. | `/dateflow` | doc 08, 09 |
| **DateFlow games** | Six daily or practice games: Which Came First?, Put Them in Order, What's Missing?, What's Happening Elsewhere?, Find the Duration, and **Cause & Effect** | `/dateflow/play` | doc 09, Phases 7 and 9 |

All three are seeded by date (same date = same challenge for everyone). There's no backend: static JSON plus localStorage.

### What DateFlow can do

- **Explore:** the timeline with event markers and duration bars (empires, periods), a minimap, eras, milestones, category and region filters, detail level, "Jump to year", "What happened?" (a period summary), light and dark themes (Phases 2–6), and **Surprise Me**: a random event (from what the filters show, preferring ones with a story to follow, no repeats in the last 20) framed and opened (#2)
- **Historical Currents** (step 3d): nine long movements (Axial Age, Islamic Golden Age, Italian Renaissance, Age of Exploration, Protestant Reformation, Scientific Revolution, Age of Enlightenment, Industrial Revolution, Decolonization of Asia and Africa) drawn as translucent bands behind the timeline. At most **3 overlap at any year**, the most important winning (the mid-1500s has four candidates). Dashed edges mark approximate dates; the label gives name and years and opens the span's card. In Lanes a regional current stays in its own lane, a Global one spans them all. Drawn from every span regardless of filters, like eras. Off in Simple, Constellation, a story or the Time Machine. Flag or unflag with `manage.py current <ids> [--remove]`
- **Entry view and era chips** (step 5): a first visit opens Date Constellation on the Medieval era; the era chips jump to one era's years (All = the whole of history).
- **Search and tours** (step 4): the toolbar box takes a year (jumps, as before) or any words. A search ("Mughal", "Hitler") matches event and span names and aliases, never the year or description. Every word must start a word of one name or alias, accents ignored. A matching span also brings in everything `part_of` it, at any depth (Taj Mahal for "Mughal"). The matches are ringed on the timeline and listed in a tour panel. **Watch** plays through whatever the filters let through instead: events and spans a century-wide view would show at the current detail level. Both tours have ▶ Play / Pause, ■ Stop (back to the overview), ‹ › and ← →, Space, a scrubber, Slow / Normal / Fast speeds, the current stop in full (with "≈ Approximate date"), and "Open the full card". Searches share as `?q=` links (#9 free-text search, #3 playback, #4 shared navigation)
- **Event and span cards:** a description, **"Why it matters"** (when a reviewed significance exists; doc 17), "Before & after" in the region, "Meanwhile around the world", empires of the time, and DateLinks memory aids.
- **Connections** (Phase 8): every reviewed link, read from the card's side ("is part of", "includes", "was ended by", "followed"…), clickable, with "Show these connections on the timeline".
- **Stories** (Phase 9):
  - **How to start one:** "How did we get here?" / "What happened next?" on any linked card, or the **Stories** menu (8 featured).
  - **On the timeline:** threads drawn across it, coloured by link type, dashed when debated, crossing regional lanes. **Hover a thread** for its connection card (the link in words, its "why", the gap in years, "debated" where it is); **click or tap** to pin the card and pick the stop it leads into (doc 17).
  - **The story panel:** a narration, the stops as a subway line, fans of causes, and **▶ playback**.
  - **Sharing:** `?story=<id>&dir=back|forward` links.
- **The Time Machine** (Phase 10): the world in any year, region by region; two years compared (gone / new / still there / came and went); two empires' shared years; two events' distance, with a "Did you know?". Shareable `?year=` and `?tm=` links.
- **Honest dates everywhere:** "c." plus an "≈ Approximate date" box with the historians' range. Disputed events are DateFlow-only (they stay out of DatePick and DateGolf).

### The data behind it

| | Count | Notes |
|---|---:|---|
| Events | **522** | 3500 BCE – 2023; 55 approximate (with ranges), 7 DateFlow-only |
| Spans | **167** | 60 empires, 107 periods (11 of them people's lives; plus 5 eras); approximate spans can carry a `date_display` |
| Links | **471**, all reviewed | 197 part_of · 74 preceded · 62 began · 56 ended · 35 contributed_to · 15 influenced · 15 enabled · 8 triggered · 6 opposed · 2 interacted_with · 1 evolved_into (30 medium confidence = "debated") |
| Sources | **403** reviewed, 268 proposed | Every event and span has one; Ram is reviewing batch 1 (Review → Sources) |
| Country tags | 116 countries | Location and actor roles; the dashboard Map |
| Significance ("Why it matters") | **234 reviewed** | doc 17: `entity_significance`, reviewed before export. Every importance 7+ item has one (4 Gemini batches, pre-sorted by Claude), plus 2 seeds |
| DateLinks memory aids | 26 events | doc 05, 06. New aids: `/add-memory-aid` → `load-memory-aids` (proposed) → Review → Memory aids |
| Gap list | **done** (89 drafted, 1 dismissed) | Four themed batches, 2026-11-13: Gemini drafts, pre-sorted by Claude (data/drafts/gap_tasks.md). Add new gaps with `load-missing` as they're noticed |
| Life-cycle phases | 3 empires, 23 phases | Mughal, Roman, Ottoman (Phase 12 pilot, 2026-11-21); `entity_phases`, `load-phases` |
| Daily challenges | 366 dates | DateGolf target years |

### The tools behind the data

- **SQLite is the source of truth** (`data/dategolf.db`). `npm run data:export` writes the game JSON; `data:validate` and `data:compare` guard it. → doc 10, 11, 12
- **Every write goes through `tools/`** (a CLI command, logged in `review_log`, tested on a db copy): drafts, links (`load-links`, `retype-link`, `add-link-type`), significance (`set-significance`, `load-significance`, `approve-` / `reject-significance`), dates (`set-event-date`, `set-span-years`, both with `--display` for the historians' dates), `rename`, sources, the gap list (`load-missing`), memory aids, `dateflow-only`. → doc 12 §7
- **Streamlit dashboard** (`npm run data:dashboard`):
  - **Review queues:** Event drafts, **Span drafts**, Country tags, Identity, Links, Sources, **Significance** (with a write/replace box), **Missing**, and a decision log. Each fits on one screen and stays on its tab after an action.
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
| 2 | **Review sources batch 1** (460 Wikipedia articles; loaded as proposed 2026-11-19) | Review → Sources (doc 12 §4.6d) | Every event gets a checkable source. 128 are exact name matches (one-click approve) |
| 3 | **Double-check 5 Step 3a decisions** made before the selection fix: `chinese-civil-war`, `great-depression`, `spanish-civil-war`, `manhattan-project`, `arab-spring` | `manage.py identity <id> --one\|--split\|…` | An old loose end from doc 11 |
| 4 | **Two design calls for DatePick range choices** | doc 04 §38 | They unblock Claude's item 4 below |
| 5 | ~~**Pick the next DateFlow phase**~~ ✅ 2026-11-16: see "Date Flow build sequence" below. ~~Colour approach~~ ✅ decided 2026-11-16: see Phase 11 | doc 16, "Assessment" | Doc 16's vision, mapped against what's built |

### Claude's queue (pick work that doesn't pile onto your review queues)

| # | What | Needs | Details |
|---|---|---|---|
| 0 | **Pre-sort each significance batch** before it loads: fix accuracy slips, rewrite texts that repeat the description, soften overstatements (as done for batch 1) | Each incoming batch | doc 17. New drafts already carry one (doc 15) |
| 1 | ~~**Draft the gap list**~~ ✅ 2026-11-13: 89 events and spans in four batches; WWII now one chain per theatre | — | New checks from it: skip-a-step and overlapping-span links (validate + check-drafts) |
| 2 | ~~**Date precision for spans before 500 BCE**~~ ✅ 2026-11-19 (`data/drafts/2026-11-19_span_precision.md`): Old Kingdom, Akkadian, Shang and Zhou rounded; spans gained `date_display`, shown on the span card and in tours (Buddha, Shang, Zhou, Akkadian, Old Kingdom) | — | |
| 3 | ~~**Step 4: fill the thin periods**~~ ✅ 2026-11-20 (first pass): 51 candidates on the gap list → Ram wanted 40 → 39 published (26 events, 13 spans incl. Polynesian Settlement of the Pacific) after a second pass on 2026-11-21: five reloaded once the dashboard showed their "c.", and Pyramid of the Sun, Cahokia and Hawaii redrafted as spans. Majapahit left out | — | `data/drafts/incoming/2026-11-20_claude_*` |
| 4 | **DatePick range choices:** ranges instead of single years for approximate events | Your 2 decisions, plus structured `range_start` / `range_end` | doc 04 §38 |
| 5 | **Dashboard v3: the event editor**, including adding or editing a single link | — | doc 13. Less urgent (new events come through drafts), but it lets you edit without Claude |
| 6 | **DateFlow phases from the doc 16 vision** (recommended order; full table in doc 16, "Assessment"): | | |
| 6a | ~~**Phase 10: Contemporaries**~~ ✅ 2026-11-11 (doc 09). A Time Machine (pick a year → a world snapshot by region; compare two years), an Overlap explorer (two spans), a Distance explorer (two events) | No new data | Medium |
| 6b | **Phase 11: Living Timeline polish.** 8 category families as shapes (in every colour mode, so colour is never the only cue); **two colour modes, a per-viewer setting like the theme: Colorful (8 hues, one per family, as colourblind-friendly as possible) is the default, Subtle (today's 3 colourblind-safe hues) is one click away and remembered** (decided 2026-11-16, issues #1 #7); focus mode (fade, don't hide), colour by region, distinct milestone landmarks, spans revealing their sub-spans when zoomed, a Historical Currents layer | A few new spans (Axial Age, Enlightenment, Decolonization) | Medium |
| 6c | **Phase 12: Empire life cycles.** `entity_phases` (rise / zenith / fragmentation…), drafted through doc 15 and reviewed, drawn as phase segments on the bars | Curated phases, with sources | Large |
| 6d | **Phase 13: People.** Built 2026-11-21: a span flagged person (`people` table; `person: true` in a draft, or `manage.py person`) is a life drawn as a pill in a People row (World; Lanes fall back to the Periods row); the card shows the role, years lived and **Alive at the same time** (Akbar and Elizabeth I: 61 years). A reign stays its own span, never part of a life. Pilot of 10 published 2026-11-22 (Confucius, Alexander, Ashoka, Muhammad, Genghis Khan, Elizabeth I, Akbar, Newton, Curie, Gandhi; the Buddha flagged). Later: ChronoLogic's `people.json` (1,218 people) as a candidate pool, pre-sorted (living people, celebrities, duplicates, exact-looking ancient dates) | People drafted through doc 15 | Large |
| 6e | **Phase 14: Journeys and a game.** Curated journeys played in the Story panel; a "Find events during X" game | Journey scripts | Medium |
| 6f | **Later:** a **Polity Y-axis for Date Constellation** (needs a polity-type field on spans; #7), images (Wikimedia, with licensing), a DateFlow map view, regional significance, AI questions (needs a backend decision), a Stories gallery and story-of-the-day, the Immersive experience (parked) | — | — |

### Date Flow build sequence (decided 2026-11-16)

Ties the GitHub issues (#1–#7, label `dateflow`) to the phases above. Issues carry a `step-N` label.

| Step | What | Issues / phase | Size | Why here |
|---|---|---|---|---|
| 1 | ~~**Surprise Me**~~ ✅ 2026-11-16: a random event opens its card, then the existing "How did we get here?" / "What happened next?" stories carry on | #2 | S | Cheap and visible; reuses Stories |
| 2 | ~~**Date Constellation v1**~~ ✅ 2026-11-16: a third layout, **Constellation**: every event a dot (log size by importance, stable scatter within its track, today's 3-group colours), Y-axis switch **Geography** (7 regions, all shown) / **Human activity** (Politics, Warfare, Science & Technology, Religion & Thought, Arts & Culture, Society & Economy, by primary category), hover card, click opens the event. No labels or bars; every event shows at every zoom, Detail "Fewer" thins to importance 5+ / 6+. Stories and Time Machine still ring and dim; story threads are drawn only in World and Lanes | #7, #6, #5 | M | The biggest "wow" for the effort; Lanes, hover and click already exist |
| 3 | **Viewing modes plus Phase 11 polish**, in slices: ~~(a) 8 families as shapes + Colorful / Subtle~~ ✅ 2026-11-16 (Colorful default, a hue per family on a navy ground in dark, modelled on #8; Subtle = the 3 group hues; shapes in both; toolbar toggle, remembered per viewer) → ~~(b1) Focus~~ ✅ 2026-11-16 (click a family in the legend: it stays vivid and wins label space, the rest fade to 15%, never hidden; the open card and ringed connections stay vivid; Esc or Show all clears; per visit, not remembered) → ~~(b2) Simple / Standard / Detailed~~ ✅ 2026-11-16 (a toolbar preset, remembered per viewer; shifts the Filters detail level by −1 / 0 / +2 on top of the slider; Simple also hides span bars and milestone lines; Detailed rings an open card's connections and keeps them ringed after the card closes, until Esc, Clear, or a click on empty timeline) → ~~(c) sub-spans revealed on zoom~~ ✅ 2026-11-16 (a span `part_of` another rides inside the parent's bar: hidden at wide zooms, a labelled segment once ≥ 48px wide, two levels deep (Mughal → Shah Jahan → Taj Mahal); if the parent gets no row, or is in another lane, its sub-spans stand alone as before) → ~~(d) Historical Currents~~ ✅ 2026-11-18 (three new spans reviewed: Axial Age, Age of Enlightenment, Decolonization of Asia and Africa; nine spans flagged with `manage.py current`; see "Historical Currents" above) | #1, #8, Phase 11 (6b) | M | Builds on step 2's families and colour decision |
| 4 | ~~**Shared event navigation**, then **playback** over any filtered set (speed, scrubbing), fed first by **free-text search**~~ ✅ 2026-11-18: one tour engine (`engine/dateflow/tour.ts`) over a search's matches or the filtered set; see "Search and tours" above. Stories keep their own playback. **Next for search:** word forms, descriptions or regions, if Ram wants it (today "Germany" misses "German Empire Proclaimed" and "Berlin Wall Falls"; "German" finds both) | #4, #3, #9 | M | #2 and #3 share the navigation; build it once. Search (#9, folded in 2026-11-18) is the first way to make a set |
| 5 | ~~**Date Constellation as the entry point**~~ ✅ 2026-11-21: a first visit (nothing remembered) opens Constellation on the Medieval era; returning visitors keep their layout and view; a shared `?story=` link on a first visit opens World (story threads are drawn only there). **Era chips** (Ancient · Classical · Medieval · Early Modern · Modern · All) replace Reset: each shows one era's years exactly, so the axis stays evenly spaced instead of crushing the 320 post-1500 events (Ram's choice over a stretched axis). Below 1440px the less-used actions (Time Machine, Surprise Me, Watch, Stories, What happened?, colours, theme) fold behind **More ▾**; on phones Tracks, Detail, Filters and Lanes fold too (toolbar 570 → 313px on a phone; two rows on a 1280–1366px laptop). #6 closed | #6 | S | Thin periods filled first |
| 6 | Phases 12 → 13 → 14. **Phase 12 pilot shipped 2026-11-21 (Ram approved all 23 phases, 12 milestones, 16 links):** `entity_phases` (contiguous phases covering a span; a neutral kind, Foundation · Expansion · Consolidation · Height · Transformation · Contraction · End, drives the fill strength; a descriptive title says what happened), `load-phases` / `approve-phases` / Review → Life cycles, exported as `phases` in durations.json. Drawn as bar segments with a tooltip each, and a Life cycle section on the span card ("Opens with" its milestone). Drafted: 23 phases for the Mughal, Roman and Ottoman empires and 12 milestone events. Rome's phases end at 476; Rome *evolved into* the Byzantine Empire | 6c–6e | L each | Next: more empires after the pilot |

**Data track, alongside (mostly Ram's review time):**
1. Sources batch 1, the Wikipedia references (Waiting on you, item 2). Show the source link on cards if they don't yet.
2. ~~Fill the thin periods~~ ✅ first pass 2026-11-20 (Claude's queue, item 3), before step 5, so no tracks look empty.
3. ~~Span date precision before 500 BCE (Claude's queue, item 2).~~ ✅ 2026-11-19
4. Significance for importance 5–6, if Ram says go (Waiting on you, item 0).

**Y-axis views (decided 2026-11-16):** Date Constellation ships with **Geography** and **Human activity** only. The **Polity** view (civilizations, empires, kingdoms, republics) is a future item: it needs a polity-type field on spans that doesn't exist yet (see 6f).

### Housekeeping (from the old QUICKSTART list, still true)

- **Timezone:** "today" uses the browser's local time, so players far apart can get different dates. Decide: accept it, or use UTC.
- **Sharing polish:** an OG preview image; a custom domain.
- **Cross-browser checks:** iPhone Safari, Android Chrome, desktop Safari; the share button on a real device; multi-day streaks.
- **Lint:** clean (2026-11-19). `npm run lint` runs oxlint, then eslint; keep both at zero.
- **Small UX items:** transitions between DateGolf holes, an empty state for search, a loading skeleton.

---

## 3. How work flows (the pattern that's worked)

1. **Claude proposes** (a plan in the docs, or a pre-sorted batch file), and **you say go** or override.
2. **Batches load as `proposed`**, and you review them on the dashboard. One queue at a time is easiest.
3. **Approved data reaches the games on `npm run data:export`.** New link types need no code change.
4. **While you review, Claude builds** game features that use what's already reviewed, and adds every gap it notices to the gap list.
5. **Commits** are small, each passing its tests. Pushing happens on your `/git-commit and push`.

**Where things are recorded:** this page (what exists and what's next) · doc 09 (DateFlow phases, as built) · doc 11 (the data migration log and its decisions) · doc 12 (how to review and edit) · doc 13 (the admin tools) · QUICKSTART.md (how to run it).
