# DateFlow Data: Status and Next Steps

**Last updated:** 2026-11-06 · **Follows:** `10_DateFlow_Data_Audit_and_SQLite_Handoff.md` · **How-to:** `12_Data_Review_and_Editing_Guide.md`

**One-line status:** The data foundation from doc 10 is complete.
- SQLite (`data/dategolf.db`) is the single source of truth, and the game's JSON is generated from it.
- The legacy CSV is fully reconciled.
- The game has grown from **343 to 435 reviewed events**.
- Nothing is waiting for review.

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

#### 3a. Decide the 25 shared event/span IDs *(quick; do first)*

These IDs exist both as an event and as a span. They're flagged `needs_review_identity`.
- **Almost all are one subject in two forms:** the *event* marks the key moment, and the *span* covers the whole period. Examples: *Napoleonic Wars Begin* (1803) with the span 1803–1815, and *French Revolution* (1789) with the span 1789–1799.
- **Two differ slightly, because the event marks the end rather than the start:** *Indian Independence* (1947) with the span *Independence Movement* (1920–1947), and *Human Genome Project Completed* (2003) with the span 1990–2003. They still work as one subject, since the event is the culmination of its span.
- **Recommendation:** confirm all 25 as one subject.
- **Why it matters for linking:** a subject and its own period need no link between them. Splitting an ID would mean creating a separate entity, and then a `part_of` link.

#### 3b. Seed about 50–100 reviewed links, easiest first

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

---

## 4. Open decisions (need you, not code)

- **The 25 shared event/span IDs** (Step 3).
- **The importance scale** (Step 1).
- **The Great Pyramid date conflict.** The CSV says c. 3000 BC and the app says 2560 BCE. It's recorded in triage and left unchanged.
- **The 39 triaged CSV rows** (duplicates or not recommended) are listed in `validate.md`, in case you want to revisit any at low importance.

---

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
