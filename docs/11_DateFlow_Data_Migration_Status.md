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

### Step 1: Make the live game fair *(small; one session)*

Players can hit these today:
- **66 aliases contain a year** (e.g. `Panipat 1556`). DateGolf search can reveal the answer. Strip the years.
- **18 descriptions mention a year within 50 of the answer.** DatePick shows them before the guess. Reword them ("two years later"). They're listed in `data/reports/validate.md`.
- **"Revolutions of 1848 Sweep Europe"** has its year in its name. Rename it.
- **DatePick on approximate dates.** `src/engine/datepick/distractorEngine.ts` only excludes the exact year, so for an event marked `c.` another event a few years away can be offered as a "wrong" answer that is defensible.
  - Rule: when `is_approximate`, skip distractors within about 10 years.
  - This needs `is_approximate` and `date_display` exported and added to the `Event` type, plus a unit test.
  - Current workarounds: Chandragupta II at 375 (same year as the Huns) and the watch at 1508 (same year as Michelangelo).
- **Settle the importance scale.** The data uses 2–9 (66 events are above 5), but the legacy `validate-events.cjs` assumes 1–5. DatePick picks questions in proportion to importance, so high-importance events come up much more often. Decide the scale, rescale if needed, and update the legacy validator.

### Step 2: Controlled vocabularies *(medium; doc 10 phase 4)*

- **Categories:** fill `category_mappings` from the 12 legacy labels to the 8 planned top-level categories, keeping the legacy labels. Exploration and Medicine may map to more than one.
- **Regions:** add a hierarchy (`regions` and `entity_geographies`) and resolve the overlaps: `Americas` / `North America` / `South America`, `Global` / `World`, Southeast Asia filed under East Asia, and Antarctica filed as Global.
- **Why before Step 3:** relationships, filters and a future map all need clean labels.

### Step 3: Start the knowledge graph *(the core DateFlow potential)*

- **First decide the 25 shared event/span IDs:** one subject or two? They're flagged `needs_review_identity`.
- **Then seed about 50 reviewed relationships from material already in the db:**
  - the "Related: …" notes on drafts (in `entity_provenance`)
  - `part_of` links from events to spans (e.g. the Delhi Sultanate accessions → `delhi-sultanate`)
  - the "related, not the same" CSV pairs that were rejected (e.g. Lee's surrender → American Civil War)
  - the Kilby → Noyce pair
- **Export `relationships.json` alongside the existing files**, without changing the current frontend contract.
- **Remember:** chronological closeness is not causation. `contemporary_with` is not causal, and the schema already separates the two.

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
