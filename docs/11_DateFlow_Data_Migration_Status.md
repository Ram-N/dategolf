# DateFlow Data: Status and Next Steps

**Last updated:** 2026-11-06 · **Follows:** `10_DateFlow_Data_Audit_and_SQLite_Handoff.md` · **How-to:** `12_Data_Review_and_Editing_Guide.md`

**One-line status:** The data foundation from doc 10 is complete.
- SQLite (`data/dategolf.db`) is the single source of truth, and the game's JSON is generated from it.
- The legacy CSV is fully reconciled.
- The game has grown from **343 to 435 reviewed events**.
- Nothing is waiting for review.

---

## ▶ Your next actions (updated 2026-11-08)

1. **Review the first link batch: 142 `part_of` links (107 left).** On the dashboard, go to **Review → Links**. The step-by-step guide is **doc 12 §4.6c**. The 9 medium-confidence links are the ones that need real judgement. *2026-11-08:* the 30 "event starts the span" links are approved. Four of their events were renamed to say "Begins", with the old names kept as aliases, and the span `meiji-restoration` is now named **Meiji Era** (`manage.py rename`).
2. **Double-check 5 Step 3a decisions** made before the selection fix: `chinese-civil-war`, `great-depression`, `spanish-civil-war`, `manhattan-project` and `arab-spring` (all "one subject"). Change any with `manage.py identity <id> --one|--split|--drop-span|--drop-event`.
3. **Then tell Claude to continue.** The next link batch is **sequences** (`preceded`, e.g. the Mughal succession), then **causal** links, then **3c** (export `relationships.json`).

Before reviewing, restart the dashboard (`npm run data:dashboard`) so it has the latest code.

**Claude's side while you review (agreed order, 2026-11-08). Pick work that doesn't add to your review queue:**
1. ~~**Step 5: Sources.**~~ ✅ Built 2026-11-08. The 57 CSV sources are in the db. **Batch 1 (460 articles) is a file only:** `data/drafts/sources_batch1.json`. Load it after the link review with `manage.py load-sources data/drafts/sources_batch1.json`, then review it in **Review → Sources** (doc 12 §4.6d).
2. **Dashboard v3: the event editor.** One form to edit name, year, description, aliases, categories and countries, validated before saving (doc 13).
3. **Draft link batch 2 (sequences / `preceded`, e.g. the Mughal succession) as a file only. Don't load it** until batch 1 is reviewed.
4. **Right after the link review: a date-precision batch (pre-sorted, as a file).** None of the 20 events before 500 BCE was marked approximate, though most are conventional dates (the wheel, writing, Troy, Kurukshetra, King David, ironworking...). Propose `--approximate` plus a `date_display` range for each, and consider making Kurukshetra DateFlow-only (its date is disputed by over 2,000 years). Apply with `manage.py set-event-date` after approval. Agreed 2026-11-08; the Great Pyramid was done as the first case.
5. **Later:** 3c (export `relationships.json`, best after the review) and Step 4 (new events for thin periods, best when no review queue is waiting).

---

## 1. What was done (2026-11-04 → 2026-11-06)

| Area | Outcome | Commits |
|---|---|---|
| **Migration** (doc 10 phases 0–2, 5, 6) | All 7 data files are imported losslessly into SQLite. The export is proven byte-identical to the old hand-edited JSON. Originals are frozen in `data/legacy/` with sha256 hashes. | `3c8d8cf`, `8d7991c` |
| **Validation** | `validate` runs about 30 checks. It reports 0 errors, plus warnings for answer leaks (years in aliases or descriptions). | `19cc8a3` and others |
| **CSV reconciliation** (doc 10 phase 3) | All 310 `events_master.csv` rows have an outcome. **240 are linked to events** and 70 are closed by triage (duplicate, not recommended, or drafted into a new event). There are no undecided proposals. | `4ad0b16`, `14413d9` |
| **New events** | Two reviewed batches: 64 events from unmatched CSV rows and 27 from the review's "add" candidates. Each draft was AI-drafted, reviewed and then approved. Reviewer edits are recorded in `entity_provenance`. | `6600375`, `8c0172f`, `7fb36b9`, `a64370d` |
| **DateFlow-only events** | Events whose date is too disputed to guess can be listed in `dateflow_only_events`. They export with `dateflowOnly: true`, and DatePick and DateGolf skip them (`src/engine/eventPool.ts`). Used for the birth of the Buddha. His death became the span `life-of-the-buddha`. | `e1f3252` |
| **Review tooling** | `load-drafts` (batch drafts as `proposed`, with optional approximate dates) and `approve`. Views `v_proposed_events` and `v_csv_crosswalk_review`. `reconcile-events` no longer reopens resolved rows. | `5601b02`, `7758592`, `c44a238` |
| **Clean-up** | `import-legacy` was removed (rebuilding from the originals would wipe later work), along with the root CSV. The frozen copies stay in `data/legacy/`. | `d82e393` |
| **Backup** | `npm run data:backup` writes a local, integrity-checked snapshot to `data/backup/` (gitignored). | `eb9e868` |
| **Docs** | Doc 12 is the day-to-day review and editing guide. | `f524dce` |

**Decisions made along the way:**
- Approximate dates use a year inside the documented range that doesn't sit next to another event's year (Chandragupta II at 375, the Henlein watch at 1508). The true range is kept in `date_display`.
- Minor events are kept at low importance rather than dropped.

---

## 2. Current state at a glance

| Item | Count |
|---|---:|
| Published events | **435** (1 DateFlow-only) |
| Proposed (draft) events | 0 |
| Time spans: periods and empires / eras | 99 / 5 |
| DateLinks: keys / groups / items | 26 / 83 / 198 |
| Milestones | 16 |
| Daily challenge dates | 366 |
| Legacy CSV rows | 310: 240 linked, 70 closed by triage |
| Relationships | 0 (table and 12 types ready) |

**Coverage is still uneven:**
- Only **123 of 435 events (28%) are before 1500**, and 63 are before 500 CE.
- **Africa and the Americas have 11 events between them before 1500.**
- Europe (130) and South Asia (111) dominate.

---

## 3. Next steps, in priority order

### Step 1: Make the live game fair ✅ *done 2026-11-06*

**Done:** 67 year-leaking aliases fixed, 18 descriptions reworded (and the Mandela prison error corrected), "Revolutions of 1848 Sweep Europe" renamed to "Revolutions Sweep Across Europe", the DatePick approximate-date rule shipped (`APPROX_MIN_GAP = 10`, events export `approximate: true`), and the importance scale settled at **1–9** (the legacy validator updated; it now passes). Validation checks for leaks in aliases and descriptions, so new ones get flagged. What follows is the original plan, kept for reference.

<details><summary>Original Step 1 plan</summary>


Players can hit these today:
- **66 aliases contain a year** (e.g. `Panipat 1556`). DateGolf search can reveal the answer. Strip the years.
- **18 descriptions mention a year within 50 of the answer.** DatePick shows them before the guess. Reword them ("two years later"). They're listed in `data/reports/validate.md`.
- **"Revolutions of 1848 Sweep Europe"** has its year in its name. Rename it.
- **DatePick on approximate dates.** `src/engine/datepick/distractorEngine.ts` only excludes the exact year, so for an event marked `c.` another event a few years away can be offered as a "wrong" answer that is defensible.
  - Rule: when `is_approximate`, skip distractors within about 10 years.
  - This needs `is_approximate` and `date_display` exported and added to the `Event` type, plus a unit test.
  - Current workarounds: Chandragupta II at 375 (same year as the Huns) and the watch at 1508 (same year as Michelangelo).
- **Settle the importance scale.** The data uses 2–9 (66 events are above 5), but the legacy `validate-events.cjs` assumes 1–5. DatePick picks questions in proportion to importance, so high-importance events come up much more often. Decide the scale, rescale if needed, and update the legacy validator.

</details>

### Step 2: Controlled vocabularies ✅ *done 2026-11-06*

**Decided:** evolve the existing categories rather than adopt doc 10's 8-category taxonomy, and use a two-level region hierarchy built on the DateFlow lanes.

**Done:**
- **Categories:** added **Economy** (19 events, e.g. Silk Road, East India Company, Great Depression, WTO, the 2008 crisis, India's liberalisation) and **Philosophy** (6: Confucius, Socrates, Plato's Academy, Hobbes, *Wealth of Nations*, Thales). Clearly wrong tags were fixed along the way, such as "Technology" on the 2008 crisis and "Culture, Science" on *Wealth of Nations*. In DateFlow's colours, Economy joins "Culture & Society" and Philosophy joins "Science & Discovery".
- **Regions:** a new `regions` table maps every region label to one of the 7 lanes. Lane-level labels sit alongside subregions: Southeast Asia, North America, South America, Oceania and Antarctica.
  - The 10 Southeast Asian events are re-tagged from "East Asia".
  - "World" is merged into "Global".
  - Amundsen is now "Antarctica".
  - The table is exported as `src/data/regions.json`, so `lanes.ts` reads the mapping from data instead of hard-coding it.
  - Validation rejects any region label that isn't in the table, and a unit test checks that every label used has a lane.
- **Content gap noticed:** Philosophy has only 6 events. There's no Laozi, Buddha's teachings as such, Descartes, Locke, Kant or Marx's *Manifesto*, which makes it a good topic for a future draft batch.
- **Not done (by decision):** `category_mappings` to doc 10's 8 categories stays empty.

<details><summary>Original Step 2 plan</summary>


- **Categories:** fill `category_mappings` from the 12 legacy labels to the 8 planned top-level categories, keeping the legacy labels. Exploration and Medicine may map to more than one.
- **Regions:** add a hierarchy (`regions` and `entity_geographies`) and resolve the overlaps: `Americas` / `North America` / `South America`, `Global` / `World`, Southeast Asia filed under East Asia, and Antarctica filed as Global.
- **Why before Step 3:** relationships, filters and a future map all need clean labels.

</details>

### Step 2b: Country tagging ✅ *done 2026-11-07*

**Done so far:**
- New tables: `countries` (97 present-day countries, each in a region) and `entity_countries`.
- Claude drafted tags for **all 509 entities** in `data/drafts/2026-11-06_country_tags.txt`: 387 high and 122 low confidence. All are loaded as `proposed`.
- New commands `load-countries` and `approve-countries`, and the review view `v_country_review` (doc 12 §4.5c).
- "Central Asia" was added as a region (Middle East lane) for Uzbekistan and Kazakhstan.
- Validation flags entities whose countries don't fit their region lane. 8 remain, all genuine (e.g. Pearl Harbor, Sputnik).
- Countries are **not exported** to the game yet.

**Reviewed:**
- The 387 high-confidence entities are approved.
- The 7 disputed-territory tags are approved under the **"list all parties"** policy (doc 12 §4.5c).

- **The remaining 115 were reviewed under the "defining moments" rule** (doc 12 §4.5c). 19 were re-tagged, mostly empires that had only their capital's country (e.g. Napoleonic Wars: FR → FR, CZ, ES, RU, DE, BE). Alexander's conquests now has 9 countries. Brazil, Angola and Ecuador were added as countries. All are approved.
- **Vasco da Gama** moved from region Africa to South Asia, since his defining moment is Calicut.
- **Result:** all 509 entities have reviewed tags (670 in total, across 100 countries).
- **Roles added (2026-11-07):** each tag is a `location` (640) or an `actor` (30). For example, Pearl Harbor is US location, JP actor, and Columbus is BS location, ES actor. This resolved 4 of the 7 region warnings. The other 3 (Babur's Ferghana, the Berlin Conference, NATO) are recorded in `accepted_region_exceptions` with reasons. **0 region warnings remain.**

<details><summary>Original Step 2b plan</summary>


Tag each event and span with the **present-day country or countries** where it happened (ISO codes such as `IN`, `CN`, `FR`), stored under the region hierarchy. Keep historical polities (Mughal Empire, Roman Empire) separate. Those are spans or a later `polities` table, not countries.

**The fast way, about an hour in total:**
1. **Claude drafts every tag in one batch** (all ~535 events and spans) as a JSON file. Each record gets its country codes and a confidence: *high* for clear cases (Battle of Plassey → IN), *low* for multi-country or vague ones (Silk Road, the Huns, the Cold War).
2. **The batch loads into a new `entity_countries` table** as `proposed`, like event drafts, so nothing is final until reviewed.
3. **You review by exception:** only the low-confidence and multi-country rows, probably 15–20%, in one DB Browser view. Then approve the rest in bulk.
4. **A validation check** confirms that every country sits inside its event's region (e.g. `IN` under South Asia).

Matching against Wikidata's "country" property is possible but slower. It also works poorly for ancient events, whose countries didn't exist yet.


</details>

### Step 2c: Admin tools, Datasette and Streamlit 🟡 *started 2026-11-07*

Replaces DB Browser for everyday work. **Datasette** is for browsing and ad-hoc SQL, read-only. A **Streamlit dashboard** is for reviews, edits, charts and the Export/Validate/Backup buttons, and it changes data only by calling the existing `tools/`. The full plan, principles and phases are in **doc 13**.
- **Step 1, Datasette ✅ done 2026-11-07:** `npm run data:browse` → http://localhost:8001. Every table is described, internal tables are hidden, and there are default facets and 8 canned queries (event card, search, events in a country, coverage, category balance, thin centuries, the shared ids for 3a, and the review queue) in `dashboard/metadata.yml`. The charts plugin `datasette-vega` is installed. Verified: the tools can still write and export while it runs.
- **Streamlit v1 ✅ done 2026-11-07:** `npm run data:dashboard` → http://localhost:8501. It has three pages:
  - **Overview:** counts, review queues, data health, "export needed?", backup age, uncommitted data, and Validate/Export/Back up buttons that call `tools/`
  - **Coverage:** a period × lane heatmap, categories over time and the distributions
  - **Map:** a world choropleth with a year slider, filters and a per-country drill-down

  An `iso3` column was added to `countries`.
- **Streamlit v2 ✅ done 2026-11-07:** a **Review** page (event drafts, country tags, identity 3a, fix any country tags, decision log). Every action is a tested `tools/` function with a matching CLI command, and every decision is recorded in the new `review_log` table.
- **Next:** use v2 for Step 3a, then v3 (the event editor) and v4 (links, built with Step 3b/3c).
- **Why before Step 3:** reviewing 50–100 links needs a purpose-built screen, not raw tables.

### Step 3: Start the knowledge graph *(the core DateFlow potential)*

#### What the data knows today, and what it doesn't

Every event knows **when** (year), **where** (region and countries) and **what kind** (categories). Nothing records how events **connect**.

DateFlow's "Meanwhile" section (`src/engine/dateflow/explore.ts`) is purely about time: it shows the most important events in *other* lanes within ±50 years. For the Partition of Bengal (1905) it might show Einstein's relativity paper, which is interesting but unrelated. It can't say what actually matters:

> **Partition of Bengal (1905) → *triggered* → Swadeshi Movement (1905)**

Both events are in the game; nothing records the link. **The objective of Step 3 is to record those connections as reviewed, typed links**, so the games can show *why* history unfolded, not just *when*.

#### What the links make possible (later, in the frontend)

- **"Led to…" and "Because of…"** on an event card. For example, the Treaty of Versailles *contributed to* the rise of Nazism.
- **Cause-and-effect chains:** Versailles → rise of Nazism → Hitler becomes chancellor → WWII.
- **Stories within a lane:** the Mughal succession, Babur → Humayun → Akbar → Jahangir → Shah Jahan → Aurangzeb, all already in the data.
- **Grouping:** the Battle of Zama is *part of* the Punic Wars; Razia Sultana's accession is *part of* the Delhi Sultanate.
- **New game questions:** "What did X lead to?" or "Put this chain in order".

#### The link types (already in the schema, `relationship_types`)

- **Causal**, a claim that one thing *made* another happen: `caused`, `triggered`, `contributed_to`, `enabled`, `influenced`.
- **Non-causal**, connected but with no claim of cause: `part_of`, `preceded`, `followed`, `contemporary_with`, `evolved_into`, `opposed`, `interacted_with`.

**Close in time doesn't mean one caused the other.** For example, Noyce's silicon chip came after Kilby's but was developed *independently*, so the right link is `preceded`, not `influenced`. Every link is curated and reviewed. None is extracted automatically from description text (doc 10 §4.5, §8).

#### 3a. Decide the 25 shared event/span IDs ✅ *done 2026-11-07*

**Outcome:**

| Decision | Count | IDs |
|---|---:|---|
| One subject | 20 | e.g. `french-revolution`, `napoleonic-wars`, `korean-war` |
| Keep event only (span deleted) | 1 | `gutenberg-printing-press`, the 1440 event |
| Keep span only (event deleted) | 1 | `vietnam-war`, the 1955–1975 span ("1965" was falsely precise) |
| Split | 3 | `pax-romana` → span `pax-romana-period`; `indian-independence` → `indian-independence-movement`; `human-genome-project` → `human-genome-project-period`. Each event keeps the original id and is linked to its period with a reviewed `part_of` link, the first 3 relationships. |

Every decision is in `review_log`. The tools that made them are `identity --one / --split / --drop-span / --drop-event` and `split <id> <new_span_id>`, or the dashboard Review → Identity tab (doc 12 §4.6). The original plan follows.

##### Original plan: 3a. Decide the 25 shared event/span IDs *(quick; do first)*

These IDs exist both as an event and as a span. They're flagged `needs_review_identity`.
- **Almost all are one subject in two forms:** the *event* marks the key moment, and the *span* covers the whole period. Examples: *Napoleonic Wars Begin* (1803) with the span 1803–1815, and *French Revolution* (1789) with the span 1789–1799.
- **Two differ slightly, because the event marks the end rather than the start:** *Indian Independence* (1947) with the span *Independence Movement* (1920–1947), and *Human Genome Project Completed* (2003) with the span 1990–2003. They still work as one subject, since the event is the culmination of its span.
- **Recommendation:** confirm all 25 as one subject. **How to run and check it, step by step:** doc 12 §4.6 (dashboard Review → Identity tab, or `manage.py identity`).
- **Why it matters for linking:** a subject and its own period need no link between them. Splitting an ID would mean creating a separate entity, and then a `part_of` link.

#### 3b-tooling. The link tooling (planned 2026-11-07; ✅ built 2026-11-07)

**Built as planned.** It adds:
- `tools/links.py`, with the commands `load-links`, `approve-links`, `reject-links` and `suggest-part-of`
- type labels, inverses and definitions, stored in `relationship_types`
- the `v_link_review` view
- 9 new link checks in `validate`
- the dashboard's **Review → Links** tab and new **Connections** page

Tested by `npm run data:test` (10 link tests, plus 17 review tests) and the dashboard smoke test (5 pages), all on db copies.

**Built-in protections:**
- `ensure_schema` now adds missing columns itself (`ADDED_COLUMNS` in `tools/common.py`), so live and fresh dbs stay identical.
- `suggest-part-of` counts a candidate if it's in the same lane **or** shares a location country. Wars cross regions: Zama (Africa) is part of the Punic Wars (Europe).

The plan as written follows.

**Goal:** make links work like everything else in the db. Claude proposes them in batches, you review them on the dashboard (or the CLI), every decision is logged, and validation catches mistakes. This part builds the machinery; the first real batches follow in 3b below.

##### How a link reads

Every link reads as a sentence: **source → type → target**.

| Example | Type | Reads as |
|---|---|---|
| `partition-of-bengal` → `swadeshi-movement` | `triggered` | "The Partition of Bengal *triggered* the Swadeshi Movement." |
| `battle-of-zama` → `punic-wars` | `part_of` | "The Battle of Zama is *part of* the Punic Wars." |
| `kilby-first-integrated-circuit` → `noyce-silicon-chip` | `preceded` | "Kilby's chip *preceded* Noyce's." (independent work, so not `influenced`) |

Either end can be an event or a span. Each link carries a **one-line "why"** (the description), shown at review time.

##### Conventions (to keep links consistent)

- **Direction:** for causal links, cause → effect. For `part_of`, the smaller thing → the bigger thing. For sequences, earlier → later.
- **One stored link, two readings (decided 2026-11-07).** A link is stored **once** and read from whichever end you're looking at. Each type has a forward and an **inverse** label (`relationship_types.inverse_label`):

  | Type | On the source | On the target |
  |---|---|---|
  | `preceded` | preceded | **followed** |
  | `triggered` | triggered | was triggered by |
  | `contributed_to` | contributed to | had as a contributing factor |
  | `enabled` | enabled | was made possible by |
  | `influenced` | influenced | was influenced by |
  | `caused` | caused | was caused by |
  | `part_of` | is part of | **includes** |
  | `evolved_into` | evolved into | evolved from |
  | `contemporary_with`, `opposed`, `interacted_with` | *(symmetric: reads the same both ways)* | |

  So Kilby's card says "preceded Noyce's chip", and Noyce's card says "followed Kilby's chip": **two-way links, one row.**
- **No duplicates, however a link is written:**
  - A batch may say "B **followed** A". On loading, that's stored as "A **preceded** B" (sequences are stored earlier → later, like causes → effects, so one date check covers both).
  - Symmetric links are stored in a fixed (alphabetical) order.
  - The database's rule that the same link can't be added twice then catches any repeat.
  - Contradictions such as "A preceded B" *and* "B preceded A" are errors.
- **In the Review tab, sequences read from the later side ("B followed A")**, which is the more natural phrasing; it's only a matter of display.
- **The causal types, defined** (these definitions are also stored in the db):

| Type | Use when… | Example |
|---|---|---|
| `caused` | the source is the main, direct cause | — (rare; most history has several causes) |
| `triggered` | the source was the immediate spark of something already building | Partition of Bengal → Swadeshi Movement |
| `contributed_to` | the source was one of several factors | Treaty of Versailles → rise of Nazism |
| `enabled` | the source made the target *possible*, without being its motive | Second Battle of Tarain → founding of the Delhi Sultanate |
| `influenced` | ideas or culture shaped the target | Enlightenment thinkers → American Declaration |

- **Non-causal types** (no claim of cause): `part_of`, `preceded`, `contemporary_with`, `evolved_into`, `opposed`, `interacted_with`. **Close in time is not causation** (doc 10 §4.5).

##### Schema changes (additive; the 3 existing links are kept)

- **`relationships`:**
  - the status uses `proposed` / `reviewed` like everything else; the 3 split links are already `reviewed`
  - `followed` is never stored: it's only a way of *writing* a link
  - new `origin` column: `ai_drafted`, `split`, `user`, or `suggested` (the part_of finder)
  - new `created_at` column
- **`relationship_types`:** new `definition`, `direction` (e.g. "cause → effect"), `inverse_label` and `symmetric` columns.
- **New view `v_link_review`:** each link with both ends' names and years and its type, why and status, so links can be read as sentences.

##### Tool functions (in `tools/links.py`, each with a CLI command, logged in `review_log`, tested on a db copy)

| Function | Does | CLI |
|---|---|---|
| `load(path)` | Loads a JSON batch of links (`source`, `type`, `target`, `why`, `confidence`) as `proposed`. **All-or-nothing:** one bad link (unknown id or type, a self-link, a duplicate, or the reverse of an existing `preceded`) rejects the whole batch, with the reason given. | `load-links <file>` |
| `approve(ids)` / `reject(ids, reason)` | Review decisions; a rejected link is deleted, and its reason stays in the log | `approve-links`, `reject-links` |
| `suggest_part_of()` | **Finds `part_of` candidates:** events whose year falls inside a span's years, sharing its lane and a country tag or a distinctive word. It writes a draft batch file for Claude to curate. It **never loads anything itself**. | `suggest-part-of` |

##### Validation checks (new)

- **Errors:** an unknown status; a stored `followed` (it should have been turned around on loading); contradictory pairs (A→B and B→A of the same one-way type); a symmetric link out of order.
- **Warnings (sanity):**
  - a cause whose source comes *after* its target (e.g. "1950 triggered 1905")
  - a `part_of` event that falls outside its span's years
  - a link that touches a `proposed` (unpublished) entity
- **Review:** links still `proposed`.

##### Dashboard (doc 13, v4)

- **Review → Links tab:** each proposed link as a sentence ("**Partition of Bengal** (1905) *triggered* **Swadeshi Movement** (1905), *because…*"), with Approve / Reject.
- **A new Connections page:** pick any event or span to see every link **from its point of view** ("followed…", "includes…", "was triggered by…"). This shows the graph taking shape. A network picture can come later.

##### Not in this step

- The batches themselves (3b below).
- Exporting `relationships.json` (3c).
- Showing links in the game.

**Done when:** the schema, `tools/links.py`, the CLI, the checks and the dashboard tab and page all work; the tests pass on a copy; and docs 12 and 13 are updated.

#### 3b. Link batches

| Batch | Status | File |
|---|---|---|
| **1. `part_of`** | 🟡 **142 loaded as proposed, 2026-11-07: awaiting your review** (doc 12 §4.6c) | `data/drafts/2026-11-07_part_of_batch.json` |
| 2. Sequences (`preceded`) | Next | — |
| 3. Causal links | After batch 2 | — |

**Batch 1 rule** (also written in the batch file): an event is `part_of` a span when it's an **episode of that span's own story**. That covers a battle in its war; a reign, act or achievement of its state or era; or its founding or its end. Merely happening in the same place and time doesn't count, so there are no natural disasters and no outside invaders. Causes (e.g. Qin unification → the Great Wall) are saved for batch 3.
- 124 links were curated from `suggest-part-of`'s 197 candidates, and 18 were added by hand (e.g. D-Day → WWII, Galileo → Scientific Revolution).
- 133 are high confidence and 9 medium.

The original 3b plan follows.

##### Original plan: 3b. Seed about 50–100 reviewed links, easiest first

1. **`part_of` links (events → spans).** These are mostly uncontroversial: Zama → Punic Wars, the Delhi accessions → Delhi Sultanate. Candidates can be proposed automatically: an event inside a span's years, in the same region, with related wording. Each still gets reviewed.
2. **Sequences within a story** (`preceded` / `followed`): the Mughal succession, or the steps of the Indian independence movement.
3. **Causal links:** about 30 well-established ones, hand-picked. They're the most valuable, and they get the most care. Examples: Partition of Bengal → *triggered* → Swadeshi; Jallianwala Bagh → *contributed_to* → Non-Cooperation; Second Battle of Tarain → *enabled* → founding of the Delhi Sultanate; Battle of Plassey → *enabled* → the Company's control of Bengal.

**Ready-made candidates already in the db:**
- the 22 "Related: …" notes in `entity_provenance`
- the "related but not the same" CSV pairs rejected in `legacy_csv_crosswalk` (e.g. Lee's surrender → American Civil War)
- the Kilby → Noyce pair

#### 3c. Export `relationships.json`

The links go into a new file alongside the existing ones, so **nothing in the game changes yet** and the current frontend data contract stays as it is. Showing the links in DateFlow (e.g. a "Connections" section on the event card) is a **separate, later step**, done once the links have proven useful.

#### Workflow

It's the same review pattern as the event drafts and country tags:
1. Claude proposes links in batches, each with its type and a one-line justification.
2. They load as `proposed`.
3. You confirm, edit or reject them.

Validation then catches links to missing entities, self-links, unknown types and duplicate links.

### Step 4: Fill the thin periods *(content; can run alongside Steps 1–3)*

- **Draft a targeted batch of about 40 events** for pre-500 CE, Africa and the Americas before 1500, Southeast Asia and Oceania. Use the proven pipeline: `load-drafts`, then review, then `approve` (doc 12 §4.4).
- **Optionally add the 27 minor CSV rows at importance 1–2.** They're listed with the SQL in `data/drafts/next_batch_candidates.md`.

### Step 5: Attach sources *(small; pairs well with Step 4)*

- **55 linked CSV rows have Wikipedia URLs** that are unused. Add `sources` and `entity_sources` tables (doc 10 §4.7) and copy those URLs onto their events.
- **From then on, give every new draft a source,** so AI-drafted content is checkable.

#### Step 5 plan (2026-11-08; ✅ built the same day)

**What's there:** 70 CSV rows have a Wikipedia URL. 55 are linked to 53 events, and 12 belong to events drafted from the CSV (so about 60 entities get one for free). Of the 524 event and span names, about 190 match a Wikipedia title exactly or through a redirect, and 6 hit a disambiguation page. About 330 are headline-style ("Ashoka Converts to Buddhism") and need an article chosen.

**Schema** (additive, in `schema.sql`):
- `sources`: `id`, `kind` (`wikipedia` | `web` | `book`), `title`, `url` (unique), `created_at`. One row per page, which several entities can share.
- `entity_sources`: `entity_id`, `source_id`, `status` (`proposed` | `reviewed`), `origin` (`csv` | `title_match` | `ai_drafted`), `note`. Primary key `(entity_id, source_id)`.
- View `v_source_review`: entity name and year beside the article title and URL, proposed rows first.

**Tools** (`tools/sources.py` plus CLI commands, every write logged in `review_log`):
1. `import-csv-sources`: copies the CSV URLs (through accepted crosswalk rows and drafted-from-CSV provenance) as **`reviewed`**, since they're your own data. Re-running it does nothing new.
2. `suggest-sources`: Claude writes a draft file `data/drafts/sources_batch1.json` (entity → article title). It checks every title against the Wikipedia API (whether it exists, where it redirects, whether it's a disambiguation page) and stores the resolved canonical title and URL. Exact name matches are marked high confidence. For the ~330 others, Claude picks the article. Nothing is loaded at this point.
3. `load-sources <file>`: all-or-nothing, like `load-links`. It loads as **`proposed`** and rejects unknown ids, duplicates, and missing or disambiguation pages.
4. `approve-sources` / `reject-sources <ids>`.
5. `load-drafts` accepts an optional `source` (a Wikipedia title) per draft, so new drafts arrive with a source.

**Dashboard:** a **Review → Sources** tab (tick, approve, reject), with name-match rows sorted separately so they can be bulk-approved. A 📖 Wikipedia link on the draft card in Review and on the selected entity in Connections. **Datasette:** descriptions for the new tables, a canned query for "entities without a source", and URLs shown as links.

**Not in Step 5:** exporting sources to the game JSON (so `compare-export` stays byte-identical), and non-Wikipedia sources (the schema allows them).

**Tests** run on a db copy with a fake Wikipedia checker, so they're offline. Only `suggest-sources` touches the network, at about 11 batched requests with a polite User-Agent and no personal data.

**Review cost for you:** about 190 title matches to skim and bulk-approve, plus about 330 picked articles. Batch 1 can stay in the file until the link review is done, so it doesn't add to your queue.

**As built:**
- **CSV import:** `import-csv-sources` attached **57 CSV sources** (59 CSV row links; two rows repeat a URL). They're `reviewed`, and some carry a `#section`.
- **Batch 1:** `data/drafts/sources_batch1.json` covers all 460 remaining entities, with 0 unresolved:
  - **128 exact name matches** (high): bulk-approve them with one button.
  - **36 name redirects** (medium), e.g. "The Long March" → *Long March*.
  - **296 picked articles**, 23 of them medium. Claude's picks are in `data/drafts/sources_batch1_picks.json`; re-run `suggest-sources --picks` on that file to rebuild the batch.
  - Three bad redirects were overridden: *Classic Maya language*, *Mesoamerican chronology* and *Planets beyond Neptune*.
- **Broad articles:** about 30 events point to a person or a broad article rather than the event itself (e.g. *Death of Akbar* → *Akbar*), because Wikipedia has no article for the event. They're marked high when the article covers the event well.
- **Tested:** the batch loads cleanly on a db copy, and the Sources tab was checked in the browser.
- **A test fix along the way:** `test_links.py`'s part_of suggestion test had been failing since batch 1 was loaded (Zama is already linked). It's now independent of the loaded links.

---

## 4. Open decisions (need you, not code)

- **Review the 142 proposed `part_of` links** (see "Your next actions" above).
- **The 5 Step 3a decisions to double-check** (see above).
- ~~**The Great Pyramid date conflict.**~~ ✅ Resolved 2026-11-08. The CSV's c. 3000 BC is wrong. The event is now **Great Pyramid of Giza Completed, c. 2560 BCE** (approximate, `date_display` "c. 2600–2560 BCE"), and the span `construction-great-pyramid` is **c. 2600 to 2560 BCE**.
- **The 39 triaged CSV rows** (duplicates or not recommended) are listed in `validate.md`, in case you want to revisit any at low importance.
- *Done:* the 25 shared ids (Step 3a, 2026-11-07); the importance scale (1–9, 2026-11-06).

## 5. Later phases (after Steps 1–5)

- **People, places and reigns** (doc 10 §4.2). Keep lifespan separate from reign. The Delhi Sultanate and Mughal accessions are natural seeds for reigns. Use `entity_phases` (rise, zenith, decline) only where meaningful.
- **Temporal precision.** Fill `date_precision` and `date_display` for older events from the CSV `stem` column (e.g. "c.3500 BC"). Add a tested helper for the missing year 0, and show "c." in the UI.
- **Analysis commands:** temporal and geographic coverage, category balance, entity completeness, relationship density and enrichment priorities. Keep the weights configurable and show each component (doc 10 §6). They measure what the *database* contains, not how much history happened.
- **DateFlow features:** "Meanwhile" views, cause-and-effect chains, the rise and fall of empires, map mode, and smarter daily challenges driven by coverage and relationships.

---

## 6. How to work with the data

The full guide is doc 12. In short:

```bash
# Edit data/dategolf.db in DB Browser (Write Changes!), then:
npm run data:export      # db → game JSON + data/dategolf.sql
npm run data:validate    # must report 0 errors
npm run data:backup      # monthly local snapshot → data/backup/
# Commit the .db, .sql and JSON together
```

**Rules:**
- Never hand-edit the generated JSON.
- Years are signed (`-1` = 1 BCE) and there is no year 0.
- `proposed` entities never export.
- To undo uncommitted db edits, run `git checkout -- data/dategolf.db`.

## 7. File map

```
data/dategolf.db            source of truth
data/dategolf.sql           text dump (readable diffs; also a full backup)
data/backup/                local monthly snapshots (gitignored)
data/legacy/                frozen originals + MANIFEST.json (archive)
data/drafts/                draft batches + next_batch_candidates.md
data/reports/               migration, validate, coverage, reconciliation reports
tools/manage.py             CLI: validate, export-json, compare-export, reconcile-events,
                            load-drafts, approve, backup, coverage
tools/schema.sql            schema (idempotent; additive changes apply to the live db)
tools/exporter.py           db → app JSON (skips `proposed`; adds `dateflowOnly`)
tools/validate.py           integrity checks + review queue
tools/reconcile.py          CSV ↔ event match proposals (skips resolved rows)
tools/drafts.py             draft batch loader
src/engine/eventPool.ts     quizEvents(): drops DateFlow-only events for DateGolf/DatePick
```
