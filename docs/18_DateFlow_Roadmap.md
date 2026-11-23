# DateFlow Roadmap

*Started 2026-11-23. This is the live DateFlow roadmap: it replaces the plan in doc 16 (the original vision, now mostly built) and the DateFlow rows of doc 14 §2. Ram edits the order; Claude keeps it current as work finishes. Doc 14 stays the product overview and covers the other games and data work.*

## How to read it

- **Now** is worked top to bottom. **Next** follows once Now is done or blocked. **Later** is unordered.
- Each item says what it is, what it needs (data, decisions) and its size: S (a session), M (two or three), L (more).
- A decision Ram needs to make is marked **Decide:**.

---

## Now

### 1. Ram's usage notes (ongoing, always first)
Ram uses DateFlow for a few days and lists small aesthetic, usability and experience fixes. They jump the queue: each batch is triaged (fix now / fold into an item below / park), done in small commits, and noted here.

| Batch | Date | Status |
|---|---|---|
| — | — | Waiting for the first list |

### 2. Date Constellation as the front door, with switchable Y-axis tracks (#7)
Constellation already opens a first visit (Medieval era, Geography tracks) and has two Y-axes: **Geography** (7 regions) and **Human activity** (6 activity groups, by primary category). This item makes it *the* way into DateFlow.

- **2a. A Polity axis** (#7's "Political history": e.g. Empires · Kingdoms · Republics · City-states · Peoples and confederations). Each event sits on the track of the state it belongs to. **Needs data:** a polity type on each empire/period span (a reviewed field, set through `tools/`), and each event tied to a polity, mostly through existing `part_of` links; events with no polity go to an "Other / between states" track rather than a guessed one. **Decide:** the track list (draft below), and whether an event of two states (a war) shows on both tracks or on the attacker's.
  *Draft tracks:* Empires · Kingdoms and dynasties · Republics and city-states · Religious and colonial authorities · No single state.
- **2b. A Society axis** (#7: Culture · Technology · Trade · Exploration · Social change), from categories like Human activity. Cheap once 2a's switch generalises.
- **2c. Constellation for everyone, not only first visits.** **Decide:** make Constellation the default layout for every visit, or keep "returning visitors get what they last used".
- **2d. Spans in Constellation.** Today it shows only event dots. Faint span bands behind each track (Rome behind Europe, or behind Empires on the Polity axis) would let journeys and life cycles work there too (see 3).
- Size: M (2a needs a data pass first: polity types drafted through doc 15, then reviewed).

### 3. Make the journeys and empire life cycles stand out
The three journeys and the Roman, Mughal and Ottoman life cycles are the richest things in DateFlow, but they sit under **More → Stories** and inside bars. No new pilots until these shine.

- **3a. A front-door invitation:** on a first visit (and on an empty view), a small card offers "Take a journey" with the three journeys, so a student never faces a blank timeline. Dismissable, remembered per viewer.
- **3b. A Journeys button in the main toolbar**, not under More → Stories.
- **3c. Progress:** a journey remembers where the viewer stopped (per viewer, browser storage) and the menu shows "Stop 4 of 8 · Continue".
- **3d. Life cycles up front:** when a journey stop (or a card) is an empire with phases, the panel shows its phase strip (Foundation → … → End) with each phase's title and years, clickable to frame that phase on the timeline. Rome, the Mughals and the Ottomans become the showcase.
- **3e. Polish pass on the player** after Ram has tried it: pacing, typography, how the timeline moves between stops, the phone bottom sheet.
- **3f. Journeys in Constellation** once 2d lands.
- Size: M.

### 4. AI questions ("What was happening in India when Rome peaked?")
Ram wants this high. It breaks the **no backend** rule, so the first step is a decision, not code.

- **Decide (first):** how answers are produced. Options:
  1. **Curated questions, no backend:** a set of good questions answered offline from our own data, reviewed like journeys, and shipped as JSON. Safe and accurate, but not free-form.
  2. **A small serverless function** (e.g. a Cloudflare Worker) that calls the Claude API with only our reviewed data as its source, and shows which events and spans the answer used. Free-form, but it costs money per question and needs a guard against made-up claims.
  3. Both: start with 1, add 2 later.
- Whatever the choice, the accuracy rule holds: answers come only from reviewed data, every date shown comes from the data, and an answer says when the data doesn't cover the question.
- Recommendation: 3, starting with ~30 curated questions that the Time Machine and the explorers can already answer, presented as a "Questions" entry in the toolbar.
- Size: S to decide; M for option 1; M–L for option 2.

---

## Next

### 5. Stories gallery and a story of the day
- A gallery page (or a large panel) of the best stories as cards: title, years, regions, a one-line hook, a tiny thread preview. Today there are 8 featured stories in a menu.
- **Story of the day:** chosen from the date alone, like the daily games (same date → same story, no randomness).
- Journeys and stories sit side by side in the gallery.
- Size: M.

### 6. 100 more historical people, and a People row that doesn't crowd
- **Data:** about 100 people from ChronoLogic's `people.json`, **only people who have died**. Of its 1,218, 912 have died, but they lean modern (581 born after 1800; 140 died before 1500), so the 100 must be chosen for balance across eras and regions, not taken from the top. Pre-sort: drop celebrities and duplicates; flag ancient birth and death dates that look exact but aren't (they become approximate, with a `date_display`). Drafted through doc 15, loaded as proposed, reviewed on the dashboard.
- **Display:** the People row has room for only a few lives at a time (2 rows in World), whatever the database size. Rather than a fixed percentage, show **as many as fit without overlap**, chosen by importance with a **stable shuffle** among equals (the same view shows the same people, so pills don't flicker while panning), plus a "+N more people lived in this time" link that lists the rest. A **Shuffle** button shows a different set.
  **Decide:** stable shuffle (recommended) or a fresh random pick each time the view settles; and whether the shuffle favours regional variety (one per region before a second from the same region).
- Rough capacity: at a 300-year view, a 70-year life is about a quarter of the screen, so the two rows hold 6–10 lives. With ~110 people, the busiest centuries (1700–1900) would show roughly 1 in 4; ancient views would show nearly everyone.
- Size: M (data) + S–M (display).

---

## Later (unordered)

| Item | What | Needs |
|---|---|---|
| Map view | A map beside the timeline, synced to the view; country tags (116 countries) already exist | Map tiles or a simple world SVG; design |
| Images | A picture per event or span from Wikimedia, with licences recorded like sources | A media table, licence review |
| Regional significance | Regional vs. global importance, so regionally important events don't vanish at world zoom | A second importance field, reviewed |
| Civilization explorer | A dedicated view of one empire: rulers, phases, successors, connections | Rulers as spans (reigns) |
| Places | Cities and trade routes as their own kind of item | New entity type |
| More pilots | More life cycles (parked), more journeys, more people beyond 100 | After 3 and 6 |
| "Find events during X" game | Students find events inside a span | Deprioritised by Ram 2026-11-23 |
| Colorful mode refinement (#8) | Further work toward the night-train-map look, if wanted after Ram's usage notes | Ram's call |
| Immersive | Stepping inside historical moments (doc 16) | Parked |

---

## Small known fixes

- **Mongol Empire span is still kind "period"** (drawn dashed in the Periods row); it should be an empire. Needs a `set-span-kind` command (S).
- A reload in the middle of a journey keeps World mode instead of switching back to Constellation (minor).

## GitHub issues

| # | What | Proposed |
|---|---|---|
| #1 | Focus, Detailed, Light/Dark and Colorful viewing modes | Close: all four built (doc 14, step 3) |
| #5 | Date Constellation: region tracks | Close: built as Constellation v1 (Geography axis) |
| #7 | Date Constellation: switchable Y-axis tracks | Keep open: Polity and Society axes are item 2 |
| #8 | Colorful mode modelled on the night-train map | Close, or keep as the Later refinement |

## Done (for the record)

Phases 10–14 of the doc 16 plan: Time Machine and the Overlap and Distance explorers; Living Timeline polish (shapes for 8 families, Colorful / Subtle, Focus, Simple / Standard / Detailed, sub-spans on zoom, Historical Currents); Surprise Me, Date Constellation v1, search and tours, era chips; empire life cycles (pilot: Roman, Mughal, Ottoman); people (pilot of 11); three curated journeys and the journey player. Details in doc 14 §1 and doc 09.
