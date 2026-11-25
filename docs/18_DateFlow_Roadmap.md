# DateFlow Roadmap

*Started 2026-11-23. This is the live DateFlow roadmap: it replaces the plan in doc 16 (the original vision, now mostly built) and the DateFlow rows of doc 14 §2. Ram edits the order; Claude keeps it current as work finishes. Doc 14 stays the product overview and covers the other games and data work.*

*Terms used here are defined in the [DateFlow Glossary](21_DateFlow_Glossary.md) (doc 21).*

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

- **2a. An "Empires & states" axis** (#7's "Political history"; decided 2026-11-23). One row per **named state** (Roman Empire, Byzantine Empire, Mughal Empire, Ottoman Empire, Mongol Empire, British Empire, Athens, Venice…), not per type of state: a row runs only across its state's lifetime, so states are seen rising, overlapping and ending, and the empire life cycles (3d) read straight off it. Each event sits on the row of the state it belongs to, mostly through existing `part_of` links; **an event of two states (a war, a conquest) shows on both rows**; events with no state go to a final "Other" row rather than a guessed one. Only the states in view get a row (the top 6–8 by importance), so the axis never fills with 40 rows. The name is "Empires & states" because not every state is an empire (Athens, Venice). A by-type version (Empires · Kingdoms · Republics…) was dropped as abstract and full of judgement calls. **Needs data:** a pass to tie unlinked events to their state, drafted through doc 15 and reviewed.
  *Data pass, 2026-11-23 (awaiting Ram's review):* `event_states` table + `tools/states.py` + Review → States tab; exported as `states.json`. 114 events were already placed by reviewed links. Drafted as proposed: 23 ended states (Carthage, Classical Athens, Kingdom of Macedon, Ptolemaic Kingdom, Qin, Rashidun Caliphate, Ghaznavids, Timurids, Kingdoms of England / Great Britain / France, French First Republic and First Empire, Portuguese and Spanish Empires, Russian and German Empires, Austria-Hungary, Empire of Japan, Nazi Germany, and three Mesopotamian states) with 13 began/ended links, and 181 ties for 157 events. After approval 282 of 522 events have a state.
  **Decide:** the other 240 are mostly after 1800 and belong to states that still exist (United States, United Kingdom, France, India, China…). Those need *ongoing* spans ("1776–present"), which the app can't show yet, and they would also add modern countries to the World view's Empires row. Options: add ongoing states, or leave the modern era to the Geography axis (its events go to "Other" here). **Decided 2026-11-23: leave them** (Ram: "B is good for now"); ongoing states can come later.
  *Axis built 2026-11-23:* the "Empires & states" toggle in Constellation; up to 8 state rows in view (most events first, drawn oldest first) with a band for each state's lifetime, then Other. All drafts approved by Ram 2026-11-23 (23 states, 13 links, 181 ties): 282 of 522 events have a state.
- ~~**2b. A Society axis**~~ ✅ 2026-11-23: Social change · Trade & economy · Exploration · Science & technology · Culture & the arts · Belief & thought, each event on the track of its first non-political category; events that are only politics or war sit on a Politics & war track, switched off until clicked.
- ~~**2c. Constellation for everyone, not only first visits.**~~ ✅ 2026-11-23: every visit opens on Constellation (Ram: "at least for now"); the last mode is still saved, so reverting is small. A shared story link still opens World.
- ~~**2d. Spans in Constellation.**~~ ✅ 2026-11-23: on Geography, Human activity and Society, spans of importance 5+ (or ringed) sit as thin bars along the bottom of their track (two rows; empires solid, periods dashed), clickable to open their card; on Society, empires go with Politics & war. Not in Simple, and not on Empires & states (its rows are the spans). Journeys in Constellation (3f) can build on this.
- ~~**2e. Tracks switch on and off by click**~~ ✅ 2026-11-23 (click a track name; an off track shrinks to a strip; per axis, remembered per viewer) (#5, Ram 2026-11-23): a switched-off track shows none of its dots. This applies on every axis: Geography, Human activity, and the new ones. The two-colour dots from #5 stay wanted.
- Size: M (2a needs a data pass first: events tied to their state, drafted through doc 15, then reviewed).

### 3. Make the journeys and empire life cycles stand out
The three journeys and the Roman, Mughal and Ottoman life cycles are the richest things in DateFlow, but they sit under **More → Stories** and inside bars. No new pilots until these shine.

- ~~**3a. A front-door invitation**~~ ✅ 2026-11-24: a "Take a journey" card over the timeline, shown until the viewer dismisses it ("Explore on my own") or starts a journey; remembered per viewer.
- ~~**3b. A Journeys button in the main toolbar**~~ ✅ 2026-11-23: a Journeys menu at the front of the always-visible row; the Stories menu now holds only stories.
- ~~**3c. Progress**~~ ✅ 2026-11-24: the Journeys menu shows "Stop 4 of 8 · Continue ›" (with Start over) or "✓ Finished"; per viewer, browser storage. A shared `?journey=` link still starts at the intro.
- ~~**3d. Life cycles up front**~~ ✅ 2026-11-24: a journey stop showing an empire with phases (Rome, Ottomans, Mughals) has a phase strip shaded by kind; picking a phase frames its years and shows its title, story and ‹ › to step through. (The span card still lists phases; it could use the strip too.)
- **3e. Polish pass on the player** after Ram has tried it: pacing, typography, how the timeline moves between stops, the phone bottom sheet.
- ~~**3f. Journeys in Constellation**~~ ✅ 2026-11-24: journeys no longer switch to World; ringed spans always get a bar (lives and sub-spans too). Empires & states switches to Geography and Simple to Standard for the journey, restored on close.
- Size: M.

### 4. AI questions ("What was happening in India when Rome peaked?")
**On hold (Ram, 2026-11-24):** first a step back to take stock of DateFlow as it is: the glossary (doc 21) and its list of colliding terms. **Done 2026-11-24:** all 16 proposals in doc 21 §6 carried out; next in doc 21 §8 is a student guide (step 5), then item 4 when Ram resumes it.
Ram wants this high. It breaks the **no backend** rule, so the first step is a decision, not code.

- How answers are produced (decided below). Options:
  1. **Curated questions, no backend:** a set of good questions answered offline from our own data, reviewed like journeys, and shipped as JSON. Safe and accurate, but not free-form.
  2. **A small serverless function** (e.g. a Cloudflare Worker) that calls the Claude API with only our reviewed data as its source, and shows which events and spans the answer used. Free-form, but it costs money per question and needs a guard against made-up claims.
  3. Both: start with 1, add 2 later.
- Whatever the choice, the accuracy rule holds: answers come only from reviewed data, every date shown comes from the data, and an answer says when the data doesn't cover the question.
- **Decided 2026-11-23: 3**, starting with ~30 curated, pre-generated questions that the Time Machine and the explorers can already answer, presented as a "Questions" entry in the toolbar.
- Size: S to decide; M for option 1; M–L for option 2.

---

## Next

### 5. Stories gallery and a story of the day
- A gallery page (or a large panel) of the best stories as cards: title, years, regions, a one-line hook, a tiny thread preview. Today there are 8 featured stories in a menu.
- **Story of the day:** chosen from the date alone, like the daily games (same date → same story, no randomness).
- Journeys and stories sit side by side in the gallery.
- Size: M.

### ~~5b. "What's this?" help mode (Ram, 2026-11-24)~~ ✅ 2026-11-24
**Built:** a **?** button at the end of the always-visible toolbar row (or the `?` key). The cursor becomes a yellow question mark; a click anywhere in DateFlow shows the help for the nearest element tagged `data-help` (41 entries in `engine/dateflow/help.ts`, each with *See also* links), and does nothing else: menus don't open, cards don't open, the timeline doesn't drag. Esc, ✕, *Done* or **?** again leaves help mode. A test checks every `data-help` key has an entry. The plan as written:
- A **?** button in the toolbar. Clicking it turns the cursor into a question mark; the next click on anything (a lane, a region name, a bar, a dot, a milestone tag, a toolbar button, the legend) shows a short help card for that thing: what it is and how to use it ("A **period**: something that lasted, like a war or a movement. Click the bar for its story"). Esc, a second click on **?**, or closing the card leaves help mode. The thing clicked is not opened or changed while in help mode.
- **Phones:** no cursor, so the **?** stays highlighted and a banner says "Tap anything to learn what it is".
- **Content:** one entry per term, written for students and taken from the glossary (doc 21 §§1–5 and the §9 student wording), so the glossary stays the one source. Elements carry a help key (e.g. `data-help="lane"`); one handler looks it up. Each card can link onward ("See also: Region").
- **Why it's good:** it answers the question where it arises, with no manual to read, and it covers exactly the confusions the glossary found (lane vs region, period vs span, the dashed lines). It also replaces the student guide planned in doc 21 §8 step 5, or carries it.
- Size: M (about 25–30 entries, a capture-mode click handler, one card component).

### 6. 100 more historical people, and a People row that doesn't crowd
- **Data:** about 100 people from ChronoLogic's `people.json`, **only people who have died**. Of its 1,218, 912 have died, but they lean modern (581 born after 1800; 140 died before 1500), so the 100 must be chosen for balance across eras and regions, not taken from the top. Pre-sort: drop celebrities and duplicates; flag ancient birth and death dates that look exact but aren't (they become approximate, with a `date_display`). Drafted through doc 15, loaded as proposed, reviewed on the dashboard.
- **Display:** the People row has room for only a few lives at a time (2 rows in the Timeline layout), whatever the database size. Rather than a fixed percentage, show **as many as fit without overlap**, chosen by importance with a **stable shuffle** among equals (the same view shows the same people, so pills don't flicker while panning), plus a "+N more people lived in this time" link that lists the rest. A **Shuffle** button shows a different set.
  **Decided 2026-11-23:** a stable shuffle, favouring regional variety (one per region before a second from the same region). Stable across zoom too: a person shown at one zoom must not vanish and be replaced by someone else when zooming in (zooming in only adds people; zooming out drops the lowest-ranked first), because a swap confuses students.
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
| Immersive | Stepping inside historical moments (doc 16) | Parked |
| Detail slider, back | A fine-grained "more / fewer events" slider, dropped 2026-11-24 in favour of the three presets (doc 21 §6.8). Ram may bring it back as part of a rethink of all the controls | A controls redesign |

---

## Small known fixes

- ~~Mongol Empire span drawn as a period~~ ✅ 2026-11-23 (`manage.py set-span-kind`).
- ~~A reload mid-journey closed back into World~~ ✅ 2026-11-23 (fixed by every visit opening on Constellation).

## GitHub issues

| # | What | Proposed |
|---|---|---|
| #1 | Focus, Detailed, Light/Dark and Colorful viewing modes | Open: Ram sees hardly any difference between Standard and Detailed (2026-11-23) |
| #5 | Date Constellation: region tracks | Open: seven tracks are enough; tracks to switch on/off by click; two-colour dots still wanted |
| #7 | Date Constellation: switchable Y-axis tracks | Open: the Empires & states and Society axes are item 2 |
| #8 | Colorful mode modelled on the night-train map | Closed 2026-11-23: what's built is good enough |

## Done (for the record)

Phases 10–14 of the doc 16 plan: Time Machine and the Overlap and Distance explorers; Living Timeline polish (shapes for 8 families, Colorful / Subtle, Focus, Simple / Standard / Detailed, sub-spans on zoom, Historical Currents); Surprise Me, Date Constellation v1, search and tours, era chips; empire life cycles (pilot: Roman, Mughal, Ottoman); people (pilot of 11); three curated journeys and the journey player. Details in doc 14 §1 and doc 09.
