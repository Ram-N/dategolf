# DateFlow Glossary

*Written 2026-11-24, checked against the code and data on that date. It replaces an early draft (doc 20, now deleted), which mixed real terms with ideas DateFlow doesn't have; its useful parts (the audiences, the historical-vs-product distinction, the worked example, the audit steps) are folded in here. Sections 1–5 describe what exists. Proposals are kept apart in sections 6 and 7.*

**Who it's for.** Ram, as a map of what DateFlow contains. Developers and AI agents, so a new feature doesn't duplicate or redefine an existing one. And later, students: §9 is the seed of a short student guide. Throughout, historical things (an event, an empire) are kept apart from DateFlow's own product terms (a layout, a journey).

**How to read the entries.** **Bold** is the term used here. "UI:" is the wording a student sees, and "Code:" is the name in `src/`, where it differs. Counts are from the exported data on 2026-11-24.

---

## 1. History data: what DateFlow knows

| Term | What it is | UI / Code | Now |
|---|---|---|---|
| **Event** | Something that happened in one year (`year`; negative = BCE, no year 0). The same events also feed DateGolf and DatePick. | UI: an event, a dot or label. Code: `Event`, `events.json` | 522 |
| **Span** | Something with a start and an end year. It has a **kind**: `state` or `period` (a third kind, `era`, is exported separately, see *Era*). | UI: never says "span"; shows a bar under *Empires & states*, *Periods* or *People*. Code: `Span`, `durations.json`; db: `time_spans` | 193 (83 state, 110 period) |
| **State** (span kind) | A polity: empires, kingdoms, dynasties, sultanates, shogunates, republics, city-states (Classical Athens, Teotihuacan). Shared civilizations that were never one state (Indus Valley, Classic Maya) are periods (§6.2). | UI: "Empires & states" for a group (Timeline row, *What happened?*, Meanwhile, the axis), "Empire or state" for one (legend, card) | 83 |
| **Period** (span kind) | Any span that isn't a state: wars, movements, cultural periods (Italian Renaissance, Industrial Revolution), and people's lives. | UI: the "Periods" row, drawn dashed | 110 |
| **Person** | A period span flagged `person`: a life, birth to death, with a `role`. | UI: the "People" row (Timeline and Lanes), rounded pills; a person's card lists who was *Alive at the same time* | 12 (pilot) |
| **Sub-span** | A span that is `part_of` another span (Shah Jahan's reign inside the Mughal Empire). | UI: a labelled segment inside the parent's bar once zoomed in (≥ 48 px), two levels deep | — |
| **Life cycle / phase** | An empire's years split into contiguous phases, each with a neutral **kind** (foundation, expansion, consolidation, height, transformation, contraction, end), a title, a description and, sometimes, the event that *opens* it (*Opens with* in the card; not called a milestone). Never a verdict ("golden age", "decline"). | UI: the bar shaded by phase; the card's *Life cycle* list; the strip in a journey stop. Code: `phases` on a `Span` | 3 (Roman, Ottoman, Mughal) |
| **Historical Current** | A span flagged `current`: a long movement (Axial Age, Enlightenment, Decolonization…) drawn as a translucent band behind the timeline, at most 3 at any year. Hidden in Simple, Constellation, chains of events, the Time Machine and journeys. | UI: background bands. Code: `current`, `pickCurrents` | 9 |
| **Link** | A reviewed relationship between two items, stored once and read from either side ("is part of" / "includes"), with a one-line *why* and a confidence (medium/low show as *debated*). Eleven **types** (table below). | UI: "Connections" on a card. Code: `relationships.json`; also called *relationship* and *connection* | 493 |
| **State (of an event)** | Which state(s) an event belongs to: from reviewed ties, or from a `part_of` / `began` / `ended` link to an empire-kind span (directly or through a sub-span). An event of two states, such as a war, has both. | UI: the *Empires & states* axis. Code: `states.json`, db `event_states` | 282 events |
| **Milestone** | One of 16 hand-picked turning-point events (writing in Sumer, Gutenberg, Columbus, the Moon landing…). Not a separate kind of item. | UI: dashed vertical **milestone lines** across the timeline (hidden in Simple), each with a **tag** in the era strip giving its short name ("Printing press"; a bare ◆ when crowded); hover shows the full event, click opens its card. Short names: `manage.py set-milestone-label`, exported as `milestone_labels.json`; also the famous third event in the Time Machine's *Two events* comparison. Code: `milestones.json` | 16 |
| **Era** | One of five fixed slices of history: Ancient (to 800 BCE), Classical (800 BCE–500), Medieval (500–1500), Early Modern (1500–1800), Modern (1800–). | UI: the era chips (each jumps to its era) and the named, alternately shaded era bands. Code: `eras.json`, span kind `era` in the db | 5 |
| **Category** | Subject tags on an event or span, the first one being the **primary** category. | UI: the Filters menu. Code: `categories` | 14 |
| **Family** | The 8 groups the categories fold into, for colour and **shape** (Politics & Governance ●, Wars & Conflicts ▲, Science & Technology ◆, Exploration & Environment ✚, Arts & Culture ★, Religion & Philosophy ⬢, Economy & Trade ■, Society & People ▼). Set by the primary category. | UI: the legend. Code: `Family`, `categoryGroups.ts` | 8 |
| **Region** | Where an item belongs: one of 13 labels in the data, each mapped to one of 7 **lanes** (South Asia, East Asia, Europe, Middle East, Africa, Americas, Global). Unknown → Global. In the Americas, items use *North America* (with Mexico, Central America and the Caribbean) or *South America*; *Americas* only for something spanning both (3 events, 1 span). | Code: `region`, `regions.json`, `laneFor`; `manage.py set-region` | 13 labels → 7 lanes |
| **Importance** | 1–9. It decides what shows at each zoom, label priority, dot size, and which states get rows. It's a display priority, not a verdict on history. (A rubric is being drafted in doc 19.) | Code: `importance` | events mostly 3–6 |
| **Approximate / historians' dates** | A date known only roughly is flagged `approximate` and shown with **c.**; `dateDisplay` holds the true range or the dispute ("traditionally 563–483 BCE; many scholars c. 480–400 BCE"). | UI: "c.", the *≈ Approximate* badge, "Historians' dates:" on a card | 55 events |
| **Why it matters** | A reviewed paragraph on an item's significance. | UI: *Why it matters* on a card. Code: `significance` | — |
| **DateFlow-only event** | An event whose date is too disputed to guess, so it's shown in DateFlow but kept out of DateGolf and DatePick. | Code: `dateflowOnly` | 7 |
| **Shared id** | One subject stored as both an event and a span with the same id (e.g. a war's start and the war). It reads as its span in Connections and journeys. | Code only | — |

**Link types** (as exported; *role* is how chains of events and journeys treat them):

| Type | Reads | Inverse | Role | Count |
|---|---|---|---|---|
| part_of | is part of | includes | context | 204 |
| preceded | preceded | followed | sequence ("then…", never a cause) | 74 |
| began | began | began with | frame | 72 |
| ended | ended | was ended by | frame | 61 |
| contributed_to | contributed to | had as a contributing factor | cause | 35 |
| enabled | enabled | was made possible by | cause | 15 |
| influenced | influenced | was influenced by | cause | 15 |
| triggered | triggered | was triggered by | cause | 8 |
| opposed | opposed | opposed | context | 6 |
| interacted_with | interacted with | interacted with | context | 2 |
| evolved_into | evolved into | evolved from | context | 1 |

**Kinds of connection.** Every link type has a *role* (above). A **cause** (contributed to, enabled, influenced, triggered) says one thing helped bring about another. A **sequence** (preceded) says only that one came after the other. A **frame** (began, ended) marks a span's start or end. **Context** (part of, opposed, interacted with, evolved into) is anything else. Things that merely happened at the same time aren't linked at all; DateFlow shows them as *contemporaries* (Meanwhile, the Time Machine). Chains of events and journey bridges never present a sequence or a coincidence in time as a cause.

---

## 2. On screen: layouts and what they draw

| Term | What it is | UI / Code |
|---|---|---|
| **Timeline** | The whole time canvas, 3600 BCE to 2030, strictly linear (one year is the same width everywhere at a given zoom). Zooming reveals more events rather than enlarging them. | — |
| **View** | The window of years on screen right now. | UI: the range under the DateFlow title ("1500 – 1800 · 300 years"). Code: `View` |
| **Layout** | How the timeline is drawn: **Timeline**, **Lanes** or **Constellation**. Every visit opens on Constellation. Docs and UI hints say "layout"; "view" means only the years on screen. | UI: the first toolbar group (aria "Timeline layout"; each button's hint starts "Layout:"). Code: `mode` / `ViewMode` |
| **Timeline** (layout) | One shared line, one road through history: labelled events above and below the axis, then bar rows: *Empires & states*, *Periods*, *People*. Called *World* until 2026-11-24. | Code: mode `'world'` |
| **Lanes** | One horizontal lane per region, each with its own events and bars; the **Lanes menu** picks which regions get a lane (4 by default, so each has room for labels) and their order. A region switched off in Filters is off here too (shown as *off*). An open journey or chain of events adds the lanes its stops need, and draws its own items even in a region switched off, while it's open. | Code: `LaneState`, `lanesShown` |
| **Constellation** | Every event as an unlabelled dot (size = importance, on a log scale; shape and colour = family) on horizontal **tracks**, chosen by an **axis**. Spans of importance 5+ sit as thin bars along the bottom of their track. Hover a dot for its name; click to open its card. | — |
| **Axis (Constellation)** | What the tracks mean, chosen in the toolbar: **Geography** (the 7 lanes), **Human activity** (the 8 families, so a dot's shape always matches its track), **Society** (7 tracks by the first non-political category; a *Politics & war* track starts switched off), **Empires & states** (a row per state in view, up to 8, with a band for its lifetime, then *Other*). | Code: `TrackAxis` |
| **Track** | One horizontal row of the Constellation. Clicking its name switches it off (it shrinks to a strip); remembered per axis. A switched-off track opens by itself while it holds a ringed item in view (a journey stop, a chain of events, a search result), so a ring never lights only hidden things. | Code: `layoutTracks`, `hiddenTracks` |
| **Bar** | A span drawn across its years: solid for empires, dashed for periods, a rounded pill for people, shaded by phase where it has a life cycle. | — |
| **Century bands** | Zoomed in to 2,000 years or less, each century is a faint background wash: two sepia shades alternating for BCE, two cool ones for CE, named at the top, centred over the century ("the 1700s", "the 100s BCE" = 199–100 BCE; "99–1 BCE" and "1–99" either side of the epoch, since there is no year 0). Wider views show the era shading instead. | Code: `centuryBands`, `--df-bce-*`, `--df-ce-*` |
| **Era band / era chip** | See *Era* (§1). | — |
| **Milestone line** | See *Milestone* (§1). | — |
| **Current band** | See *Historical Current* (§1). | — |
| **Threads** | Curved arrows drawn between a chain's stops (Timeline and Lanes only); each opens its link's card. | Help *A thread*. Code: `StoryArcs` |
| **Rings / dimming** | Items outlined while everything else fades: an open chain of events, journey, search, the Time Machine, or *Show connections*. | Code: `highlightIds`, `lit` |
| **Spotlight** | The stop being shown in a chain of events, journey or *Play through*: a pulsing ring (or a thick outline on a bar) in the spotlight colour (yellow on dark, orange on light) and its name and years on the timeline (in a **callout**: an outlined box with a pointer, at a bar's left end; or in an event's own label, filled with that colour). The rest of the chain or journey stays ringed. | Code: `spotlightIds`, `--df-spot` |
| **History overview** | The bar chart under the toolbar showing how many events (those the filters let through) fall in each slice of all history, captioned *ALL HISTORY* with three faint year labels. The **box** is the current view, with its start and end years written just above it (one centred label when it's narrow), and a shaded **wedge** opens from it to the full width of the timeline below, so the overview's years don't read as the chart's axis. Click to jump; drag the box to scrub. The visualization pattern is *overview + detail*; "minimap" is only the code name. | UI: help *The history overview*; aria *History overview*. Code: `DateFlowMinimap`, `densityBins`, help key `minimap` |
| **Legend** | The family shapes and colours along the bottom; click a family to **Focus** on it (§3). | — |
| **Card** | The panel for one item. *Event card*: date, Why it matters, approximate note, Connections, chain buttons (*How did we get here?*, *What happened next?*), *Before & after in* its lane, *Meanwhile around the world* (±50 years), *Empires & states in* its year. *Span card*: years, historians' dates, Why it matters, *Alive at the same time* (people), *Life cycle*, Connections, *Meanwhile in* its region, *Compare with* (Time Machine). | Code: `EventInfoCard` (shared with DateGolf), `DurationInfoCard` |

---

## 3. Controls and settings

| Term | What it does | Remembered? |
|---|---|---|
| **Control bands** | Where the controls live (doc 20): the **header** (search, Journeys, Chains and the other guided paths, Games, Display ▾, ?), the **time band** (era chips, − / +, the years on screen, the History overview), the **view band** (layout, that layout's own controls, Simple / Standard / Detailed, Filters and the *Showing:* line). On smaller screens some sit behind **More ▾**, **View ▾** or ☰. No control moves when the layout changes. | — |
| **Zoom / pan** | Scroll or pinch to zoom; drag or ← → to pan; + / − buttons. | the view, yes |
| **Era chips** | Jump to one era's exact years; *All* shows everything. | — |
| **Search** | Finds events and spans by name or alias (never by year or description); a matching span also brings in everything `part_of` it. Typing a year ("500 BC") jumps there instead. Results open in the **search panel** (§4). | — |
| **Filters** | Category chips (none picked = all) and **region switches** (all on by default; AND across the two). A region switched off is hidden in every layout; it is the same switch as the Constellation's Geography tracks. | yes |
| **Density preset** | The one detail control. *Simple* (fewer events; no span bars, milestone lines or currents), *Standard*, *Detailed* (more events at every zoom; every event that passes but has no room for a label still shows as a small, clickable, unlabelled marker; an open card rings its connections and keeps them ringed). | yes |
| **Focus** | Clicking a family in the legend keeps it vivid and fades the rest to 15% (never hidden). Esc clears it. | no (per visit) |
| **Show connections** | From a card: rings the item and everything linked to it. Not "focus". | no; code `ringedId` |
| **Colour mode** | *Colorful* (a hue per family, the default) or *Subtle* (three colourblind-safe hues). Shapes stay in both. In the **Display ▾** menu. | yes |
| **Theme** | Light or dark, in the **Display ▾** menu. | yes |
| **Hide a track / lane** | Constellation: click a track name (on Geography this is the region switch shared with Filters). Lanes: the Lanes menu (that layout's rows only). | yes |
| **What's this? (help mode)** | The **?** button (or `?` key): the next clicks show what anything is, from `engine/dateflow/help.ts`, written from this glossary. Update both together. | no |
| **Copy link** | Shares what's open: `?journey=`, `?chain=` (old `?story=` links still open), `?q=` (search), `?year=` / `?tm=` (Time Machine). | — |

---

## 4. Ways to explore

| Term | What it is | Where |
|---|---|---|
| **Chain of events** (*chain*) | Built automatically from reviewed links, never written by hand: from one event, follow the causes and sequences back (*How did we get here?*) or forward (*What happened next?*). A sequence is never shown as a cause, and debated links say so. Played stop by stop with threads on the timeline. Called *story* until 2026-11-24 (§6.18); anything curated is a journey. | Card buttons; *Chains* menu (8 featured starting points); `?chain=`. Code: still `story` (`StoryPanel`, `stories.ts`) |
| **Journey** | A curated, reviewed guided path through a big theme: an intro, 8–10 **stops** (each showing existing events or spans, with narration), a closing, and a **Think about it** question on a few stops. Between stops a **bridge** says how they connect: a reviewed link if there is one, else "at the same time" or "538 years later", never an implied cause. A stop with an empire shows its life-cycle strip. Plays in any layout. The intro and the end show all of history with every stop ringed; at a stop, its neighbours stay ringed and the frame reaches for them when they are near, and the stop itself is spotlit. Everything *part of* a stop's spans (the card's *Includes*) is ringed too. The stop's years are shaded as a **stop band** with a tag ("Stop 2 · c. 1519–1858"), and the last stop's years stay as a dashed outline, its tag saying which edge is on screen ("◂ Stop 6 (1400–1600) ends here"). | *Journeys* menu ("Journeys: guided tours of a big theme"; each row the theme title over "Journey · 8 stops · years"; *Continue* / *Start over* / *✓ Finished*); the first-visit invitation card ("Take a journey through a theme"); `?journey=` |
| **Search results** | Steps through search results in time order: *Overview*, then each match, with ‹ ›, a scrubber, and *Play* at Slow / Normal / Fast. | Search box |
| **Play through** | The same panel (titled *Play through history*), stepping through every event the filters let through. | *Play through* button |
| **Time Machine** | Four comparisons: **A year** (each region's empires, periods and events around one year), **Two years** (what was *Gone*, *New*, *Still there*, *Came and went*), **Two empires or periods** (how long two spans overlapped or how far apart they were), **Two events** (the years between them, plus a striking comparison with a famous third event). | *Time Machine* button; span card *Compare with* |
| **What happened?** | A summary of the view, or a shift-dragged stretch of years: its empires and states, periods, and top events around the world. | *What happened?* button; shift-drag |
| **Meanwhile** | The "elsewhere at the same time" sections of a card (§2). | Cards |
| **Surprise Me** | Opens a random event, preferring ones with a chain of events, without repeating the last 20. | *Surprise Me* button |
| **Games** | Six quiz games over DateFlow's data: *Which Came First?*, *Put Them in Order*, *What's Missing?*, *What's Happening Elsewhere?*, *Find the Duration*, *Cause & Effect*. Rounds get harder as they go. | *▶ Games* button → `/dateflow/play` |

---

## 5. Behind the scenes (data workflow)

| Term | Meaning |
|---|---|
| **Entity** | Any event or span in the db; events and spans hang off `entities`. |
| **Draft / proposed / reviewed** | New data (often AI-drafted, its `origin` recorded) loads as *proposed* and is invisible to the app until Ram approves it on the dashboard. |
| **Dashboard** | The Streamlit review app (port 8501): Review tabs for event and span drafts, links, sources, significance, life cycles, journeys, states, memory aids, the gap list. |
| **Export** | `npm run data:export`: the db becomes the JSON the app reads. The JSON is never edited by hand. |
| **Source** | A Wikipedia (or other) article attached to an item; proposed ones are checked on the dashboard. |
| **Gap list** | Missing events and spans noticed along the way, marked wanted or dismissed. |

---

## 5a. One subject, every feature: Rome

| Feature | What it shows of Rome |
|---|---|
| **Timeline / Lanes** | The Roman Republic and Roman Empire bars in *Empires & states*, the Pax Romana and Fall of the Western Roman Empire in *Periods*, and its events labelled on the axis. |
| **Life cycle** | The Roman Empire bar shaded by its 7 phases; the card lists them. |
| **Constellation** | Roman events as dots on the Europe track (Geography) or its own row (Empires & states), with the Republic → Empire bands one after the other. |
| **Card** | Why it matters, Connections ("evolved into Byzantine Empire"), Meanwhile in Europe, *Compare with* another span. |
| **Chain of events** | From *Last Western Roman Emperor Deposed*, *How did we get here?* follows the reviewed links back. |
| **Journey** | Stop 3 of *The Rise and Fall of Empires*, with its narration, its life-cycle strip, and the bridge to Byzantium ("Roman Empire evolved into Byzantine Empire"). |
| **Time Machine** | *Two empires or periods*: how long Rome and Han China coexisted. *A year*: the world in, say, 117. |
| **Games** | *Find the Duration*: name the empire from where and when it ruled. |

**In one line each:** a *layout* shows history; a *card* explains one item; a *chain of events* follows its links; a *journey* guides you through a theme; the *Time Machine* compares; the *games* test.

---

## 6. Where the words collide

These are the places where one word means several things, or several words mean one thing. Each has a proposal. All 18 were decided and carried out on 2026-11-24.

1. ~~**Span / Duration / time span / "bar".**~~ **Done 2026-11-24:** "span" in docs and conversation; the code type `Duration` is now `Span` (variable and file names such as `durations.json` and `DurationInfoCard` are unchanged for now).
2. **"Empire" covers every state, and some things that aren't states.** The kind includes kingdoms, dynasties, republics and Athens, *and* civilizations such as the Indus Valley, Classic Maya and Teotihuacan, which weren't single states. The same kind is labelled four ways: *Empires & dynasties* (World row), *Empire* (legend), *Empire / dynasty* (card), *Empires & states* (axis). *Proposal:* call the kind **state** throughout ("Empires & states" everywhere), and move the civilizations to a period kind (or a new *civilization* kind) after review. **Done 2026-11-24** for the kind and the labels (db, tools, drafting rules, app); Indus Valley and Classic Maya moved to period on Ram's review; Teotihuacan and Great Zimbabwe stay states (a city-state and a kingdom's capital).
3. **Four groupings of the same 14 categories.** Families (8, for colour and shape), Human activity tracks (6), Society tracks (7) and Subtle's colour groups (3) each fold the categories differently. An *Exploration* event is a ✚ in *Exploration & Environment*, sits on *Science & Technology* in Human activity and on *Exploration* in Society. *Disasters* is in the *Exploration & Environment* family but on *Society* tracks. *Proposal:* make Human activity's tracks the 8 families (so shape and track always agree), and keep Society as the one deliberately different lens. **Done 2026-11-24.**
4. **Era means three things:** the 5 era chips and bands, the db span kind `era`, and loosely any "age" (the Axial Age, an Age-of-… period span). *Proposal:* keep "era" for the five fixed eras only. **Done 2026-11-24:** the docs use "era" only for the five (the db kind `era` holds exactly them). Span names such as *Meiji Era* or *Axial Age* are historians' proper names for periods and stay as they are.
5. **Period means three things:** the span kind, the *Periods* row, and the *What happened?* summary ("period summary" in code). *Proposal:* call the summary **"What happened?"** everywhere. **Done 2026-11-24:** the card, its aria label, the toolbar hint and the footer say *What happened?*; the component is now `WhatHappenedCard` (store names such as `summaryRange` unchanged).
6. **Story, journey, tour, Watch.** *Story* is automatic (from links), *journey* is curated, *tour* is only the code name of the search/Watch panel, and doc 16 used "tour" for what became journeys. *Proposal:* use "tour" nowhere user-facing; name the panel *search results*; consider renaming *Watch* to *Play through*. **Done 2026-11-24:** *Watch* is *Play through* (panel *Play through history*); the search panel is announced as *Search results for …*; the journey invitation says "a guided path". `tour` stays as a code name only. **Amended 2026-11-27 (Ram):** journeys are described as *guided tours of a big theme* (Journeys menu heading: "Journeys: guided tours of a big theme"; invitation: "Take a journey through a theme"); the search and Play through panels never say "tour", so the word means only this.
7. **Two "Play"s.** *▶ Play* opens the games; *Play* in the search panel auto-advances. *Proposal:* label the games button *▶ Games*. **Done 2026-11-24.**
8. **Detail: a slider and a preset that do the same job.** The Filters slider and Simple / Standard / Detailed both shift the detail level, and Standard vs Detailed barely differ (#1, the four viewing modes). *Proposal:* one control. Make the presets clearly different and drop the slider, or keep only the slider. **Done 2026-11-24:** the slider is gone (parked in doc 18 *Later* for a controls rethink); Detailed now also marks every passing event that has no room for a label.
9. **Focus.** The legend's *Focus* (one family), *Show connections* (an item's links; called `focusId` in code), and the "Focus mode" of #1 (which was meant per event) are three things. *Proposal:* "Focus" means the legend only; rename the code's `focusId` to `ringedId`. **Done 2026-11-24** (`ringedId`, `ringedIds`, `ringedName`, `clearRinged`).
10. **Three ways to hide a region.** The Filters region checkboxes, the Lanes menu, and the Constellation's Geography track toggles all do it, with separate memories. *Proposal:* one region on/off state shared by all three. **Done 2026-11-24, as two switches (Ram's choice):** one region switch shared by Filters and the Geography tracks, off in every layout; the Lanes menu stays the Lanes layout's own choice of rows (still 4 by default, since 6–7 lanes leave no room for labels), minus any region switched off. Old saved region choices carry over.
11. **Layout / mode / view.** UI says nothing ("World · Lanes · Constellation"); code says `mode`; "view" in code is the visible window. *Proposal:* "layout" in docs and UI hints; "view" only for the visible window. **Done 2026-11-24:** the layout buttons' hints say *Layout: …*; the one hint that said "Lanes view" is gone. The code keeps `mode`.
12. **Lane / track / row.** Lanes (Lanes layout, regions), tracks (Constellation, any axis) and rows (World's bar rows, the Empires & states axis). Defensible, but worth keeping exactly so. **Agreed 2026-11-24:** lanes are Lanes-layout regions, tracks are Constellation's, rows are bar rows and the Empires & states axis's rows.
13. **Connections / links / relationships.** One thing. *Proposal:* "Connections" in the UI, "links" everywhere else; "relationships" only for the file name. **Done 2026-11-24:** the one UI "links" (the story panel's footer) now says *reviewed connections*; the code keeps `relationships` for the file's contents.
14. **Regions in the data are inconsistent.** Events use *Americas* (54) and also *North America* (12) and *South America* (3), which land in the same lane. *Proposal:* a data pass to settle one scheme (likely the sub-regions, since they're more informative), as with Southeast Asia and Oceania. **Done 2026-11-24:** 51 events and 14 spans moved to *North America* or *South America*; *Americas* is kept for Columbus, the Latin American wars of independence and the Spanish–American War. The drafting rules (doc 15, `ai-reference`) say so; new tool `manage.py set-region`.
15. **"Two empires" isn't limited to empires.** The Time Machine's overlap mode takes any two spans (the span card's *Compare with* sends periods too). *Proposal:* label it *Two spans*, or *Two empires or periods*. **Done 2026-11-24:** *Two empires or periods* (students never see "span").
16. **Milestone, two uses.** The 16 milestone events, and a phase's "opens with" event in a life cycle. Minor; keep "milestone" for the 16. **Done 2026-11-24:** the card already said *Opens with*; the glossary and a code comment no longer call it a milestone.
17. **Minimap / overview strip / History overview.** One thing, three names (glossary, help, aria label), and "strip" also means a life-cycle strip and a switched-off track. It isn't a miniature of the timeline, so "minimap" was inaccurate. **Done 2026-11-24:** **History overview** wherever users or docs see it; `DateFlowMinimap` stays as the code name.
18. **Story.** The automatic, link-built paths were called *stories*, which promises a narrative someone wrote. *Proposal (Ram):* be honest, call them **chains of events** (*chain* for short) and keep anything curated for journeys. Not *sequence*: that is already the role of a *preceded* link, the opposite of a cause (§1). **Done 2026-11-24:** the *Chains* menu, the chain panel (*Play the chain*, *Chain from here*), help, games and `?chain=` (old `?story=` links still open); the code keeps `story`.

---

## 7. Terms DateFlow does not have

To keep them from creeping into specs as if they existed:

- **Experience, Collection, Discovery:** not features. The nearest real things are the *games* (interactive), *journeys* (curated) and *chains of events* (automatic), and *Surprise Me*.
- **Story:** renamed *chain of events* (§6.18). A hand-written narrative would be a journey.
- **Map view:** a *Later* roadmap item (doc 18); countries are tagged but there's no map.
- **Civilization, Institution, Movement as item types:** not types. Civilizations are currently state spans, pending review (§6.2); movements are period spans; there are no institutions.
- **Constellation as "a web of related items":** wrong. It's the dot layout described in §2. Relationships are shown by Connections, chains of events and rings.
- **Date / Duration as concepts:** an event has a year; a span has a start and an end. "Duration" in the code is a span, not a length of time (§6.1).

---

## 8. Next steps (the terminology audit)

1. ~~**Glossary**~~: this document.
2. ~~**Inventory**~~: §§1–5 list every item type, layout, control and feature that exists today.
3. ~~**Classify and decide**~~: Ram accepted all 16 proposals in §6 (2026-11-24; for 8 the slider was dropped, for 10 two switches rather than one).
4. ~~**Simplify**~~: done 2026-11-24, glossary updated in the same commits.
5. **Student guide**: from §9, a two-minute "how to use DateFlow" a student can read in the app.

## 9. For students (draft wording)

- **The timeline** runs from 3600 BCE to today. Scroll to zoom: more events appear as you zoom in.
- **Dots and labels** are events; **bars** are things that lasted (empires, wars, movements, lives). "c." means the date is approximate.
- **Three layouts:** *Timeline* (one road through history), *Lanes* (a lane for each region, side by side), *Constellation* (every event a star, sorted by region, activity, society or state). The first three phrases are the layout buttons' hover hints.
- **Click anything** to read about it: why it matters, what it's connected to, what was happening elsewhere.
- **Take a journey** through a big theme, or follow a **chain of events** from any event: *How did we get here?*
- **Time Machine** to compare years, empires or events; **What happened?** to sum up any stretch of time; **▶ Games** for games.

## 10. Keeping this current

Update this glossary in the same commit as any change that adds, renames or removes a user-facing term. Doc 18 (roadmap) links here. It replaces doc 20 (an early draft, deleted 2026-11-24). The help-mode texts in `src/engine/dateflow/help.ts` are written from this glossary: change them in the same commit.
