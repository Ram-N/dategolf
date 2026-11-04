# DateFlow Data: SQLite Migration Status and Next Steps

**Written:** 2026-11-04 · **Follows:** `10_DateFlow_Data_Audit_and_SQLite_Handoff.md`

**One-line status:** SQLite is now the source of truth for all game data. The app's JSON is generated from it, byte-identical to the old hand-edited files. 68 drafted events are waiting for review, and nothing new has reached the game yet.

---

## 1. What was done

### 1.1 Migration (doc 10, phases 0–2, 5, 6) — committed `3c8d8cf`, `8d7991c`

- **All 7 data files now live in one database, `data/dategolf.db`.** The seven are `events`, `durations`, `datelinks`, `milestones`, `eras`, `daily_challenges` and `events_master.csv`.
- **The import is lossless.** Every source record's raw JSON is also kept in `import_records`.
- **The originals are frozen** in `data/legacy/` with a sha256 `MANIFEST.json`. Git stores them byte-for-byte (`-text`), because the CSV uses CRLF line endings.
- **Exports are proven exact.** `compare-export` checks that a fresh export is byte-identical to the committed app JSON, and that the CSV rebuilds exactly from its table.
- **The 25 IDs that are both an event and a duration** are stored as one entity with two facets (an event row and a time-span row) and flagged `needs_review_identity`. Nothing was merged or dropped.
- **Validation:** `validate` runs 28 checks and writes `data/reports/validate.{md,json}`. It currently reports 0 errors.
- **Coverage:** the first report, `data/reports/coverage.md`, gives events per 500-year bin × region.
- **Git storage:** the `.db` is committed together with a text dump, `data/dategolf.sql`, so changes show up as readable diffs.

### 1.2 CSV ↔ event reconciliation (doc 10, phase 3) — committed `4ad0b16`

- **`reconcile-events` proposes up to 3 candidate events per CSV row**, stored in `legacy_csv_crosswalk`.
  - The score combines year proximity with name, alias and description overlap, weighting rare words more heavily (IDF).
  - A shared year alone never creates a candidate.
- **Results for the 310 CSV rows:**
  - 114 strong matches (`exact_match`)
  - 67 likely matches and 53 possible matches
  - 76 rows with no candidate
- **Nothing is auto-accepted.** You set `decision` to accepted or rejected in the review view `v_csv_crosswalk_review`, and re-runs keep every decided pair.

### 1.3 The 76 unmatched CSV rows — ⚠️ **NOT YET COMMITTED**

- **Every row has an outcome**, recorded in `legacy_csv_triage`:
  - 66 rows → **68 drafted events**: two bundled rows were split, and the two Lewis & Clark rows were merged.
  - 5 duplicates of existing events.
  - 4 not recommended.
- **The drafts are stored with status `proposed`, and the exporter skips that status.** Each draft's origin and review note are recorded in `entity_provenance`.
- The batch source file is `data/drafts/2026-11-04_csv_unmatched.json`. It was loaded with the new `load-drafts` command; `approve` publishes individual drafts.
- **Caveat:** the names, descriptions and aliases were AI-drafted from the CSV text and general knowledge. They are *not* verified against sources.

---

## 2. Current state at a glance

| Item | Count |
|---|---:|
| Published events | 343 |
| Proposed (draft) events | 68 |
| Time spans (periods + empires) | 98 |
| Eras | 5 |
| DateLinks: keys / groups / items | 26 / 83 / 198 |
| Milestones | 16 |
| Daily challenge dates | 366 |
| Legacy CSV rows | 310 (234 with match candidates, 76 triaged) |
| Relationships | 0 (table exists; 12 relationship types seeded) |

**Coverage imbalance:** 244 of 343 published events (71%) fall after 1500, and there are none at all for 2500–2001 BCE. The drafts make this only slightly better (20 of the 68 are pre-1500, and 25 are South Asian), because the CSV itself leans modern and India-focused.

---

## 3. How to work with the data now

```bash
# Day to day
#   1. Edit data/dategolf.db in DB Browser for SQLite (keep foreign keys on)
npm run data:export      # db → src/data/*.json, public/data/daily_challenges.json, data/dategolf.sql
npm run data:validate    # must report 0 errors
npm run data:compare     # optional: proves the export matches what's committed
#   2. Commit the .db, .sql and JSON together

# Review tools
uv run python tools/manage.py reconcile-events      # refresh CSV match proposals
uv run python tools/manage.py approve <id> [<id>…]  # publish proposed drafts
uv run python tools/manage.py load-drafts <file>    # load a new draft batch as proposed
uv run python tools/manage.py coverage --bin 250    # coverage at another bin width

# Danger: rebuilds from data/legacy/ and WIPES all db edits
uv run python tools/manage.py import-legacy --force
```

**Rules:**
- Never hand-edit the generated JSON.
- Years are signed (`-1` = 1 BCE) and there is no year 0.
- `proposed` entities never export.

---

## 4. Review queue (needs you, not code)

Listed in rough priority order. Everything is listed in `data/reports/validate.md`.

1. **Commit the draft batch** (§1.3). Doing this first means a review session starts from a saved state.
2. **Check the year on `birth-of-shivaji`.** The CSV says 1627, but most sources say 1630. The CSV value was kept and flagged.
3. **Resolve three date conflicts with existing events:**
   - Great Pyramid: the CSV says c. 3000 BC, the app says 2560 BCE.
   - Buddha's birth: the CSV has two rows (576 BC and 486 BC), the app says 563 BCE.
4. **Review the 68 drafts.** Approve them, edit them, or delete their `entities` row. The flagged ones are listed first.
5. **Review the CSV match proposals**, starting with the 114 `exact_match` pairs, which go quickly.
6. **Decide each of the 25 shared IDs:** keep it as one subject, or split it into two IDs.
7. **Settle the importance scale.** The data uses 2–9, but `validate-events.cjs` allows only 1–5, so it already fails on 67 events. Decide which is right.

---

## 5. Known issues found during the migration (pre-existing, not fixed)

| Issue | Impact | Suggested fix |
|---|---|---|
| 66 aliases contain a 4-digit year (e.g. `Panipat 1556`) | Search indexes aliases, so typing a year can reveal the answer. This breaks the "year never indexed" rule. | Strip the years from the aliases (a small script or a GUI pass) |
| Importance scale conflict (data 2–9, validator 1–5) | `validate-events.cjs` fails | Pick one scale; possibly rescale |
| "Revolutions of 1848" has a year in its name | Gives the answer away | Rename it |
| Region labels overlap (`Americas` / `North America`, `Global` / `World`); Southeast Asia is filed under East Asia | Filters and maps will be inaccurate | Phase B below |
| `events_master.csv` is also still in the repo root | Clutter (the frozen copy is in `data/legacy/`) | Delete the root copy |
| Adding an event by hand touches 4 tables | Friction in the GUI | Add an `add-event` command, or use draft batches (`load-drafts`) |

---

## 6. Future phases

The phases are ordered so that each one makes the next one safer. Doc 10's guiding principle still applies: make the data safe and traceable first, then deepen it.

### Phase A — Finish reconciliation (small)
- Work through the review queue in §4.
- Add a simple `review-stats` view that tracks accepted, rejected and pending counts.
- Pull useful CSV-only fields onto matched events: `wikipedia` URLs (for sources) and `mnemonic` (for DateLinks).
- Reduce the "CSV rows with no accepted match" review count to 0.

### Phase B — Controlled vocabularies (medium; doc 10 §3.3, phase 4)
- **Categories:** fill `category_mappings` from the 12 legacy labels to the 8 planned top-level categories, keeping the legacy labels. Some labels map to more than one category (Exploration, Medicine).
- **Geography:** add a `regions` hierarchy and `entity_geographies` (region → subregion → present-day country, plus historical polity). Resolve the overlapping labels.
- This phase is what makes filtering by region and a future map view possible.

### Phase C — Sources and provenance (medium; doc 10 §4.7)
- Add `sources`, `entity_sources` and `change_log`, and seed `sources` from the CSV's `wikipedia` column.
- Add a `needs_source` validation check for published events, and record the AI-assisted origin of drafts as part of this.

### Phase D — Temporal precision (small)
- Fill `date_precision`, `is_approximate` and `date_display` on events, starting from the CSV's `stem` column (e.g. "c.3500 BC").
- Add a tested BCE/CE conversion helper for the missing year 0 (needed for durations and "years between" maths).
- Show "c." in the UI where it applies.

### Phase E — Relationships, the knowledge graph (large; the core of the DateFlow potential)
- **Populate `relationships` with curated, typed edges** such as `caused`, `part_of`, `preceded` and `contemporary_with`. Every edge is reviewed, and the schema already separates causal types from non-causal ones.
- **Good first sources of candidates:**
  - `part_of` edges from events to their spans (the 25 shared IDs, Delhi Sultanate accessions → `delhi-sultanate`)
  - related pairs that the reconciler found (e.g. Lee's surrender → American Civil War)
  - the "Related:" notes in the draft batch
  - DateLinks prose, extracted as candidate edges only, never automatically
- Export a new `relationships.json` *alongside* the current JSON. The existing frontend data contract stays as it is.

### Phase F — New entity types (large)
- Add `people` (keeping lifespan separate from reign), `places`, `entity_phases` (rise/zenith/decline, only where meaningful) and `reigns`.
- The Delhi Sultanate and Mughal accessions in the draft batch are natural seeds for reigns.

### Phase G — Coverage-driven enrichment (ongoing)
- Add analysis commands: `temporal-coverage`, `geographic-coverage`, `category-balance`, `entity-completeness`, `relationship-analysis` and `enrichment-priorities`. Keep the weights configurable and show each component score (doc 10 §6).
- Use these reports to plan **targeted draft batches** for the thin areas: pre-1500 (especially 2500–1000 BCE), Africa, the Americas before 1500, Southeast Asia and Oceania. Load each batch with `load-drafts` and review it like the CSV batch.
- Reminder: these reports measure what the *database* contains, not how much history happened.

### Phase H — DateFlow features on top of the data
These become possible once phases B, E and F exist:
- **"Meanwhile" views:** what was happening elsewhere at the same time, using `contemporary_with` edges plus the region hierarchy.
- **Cause-and-effect chains:** follow the `caused` and `enabled` paths through an era.
- **Rise and fall of empires:** span phases drawn on the timeline.
- **Map mode:** events and spans placed on changing borders.
- **Smarter daily challenges:** choose target years and distractors using coverage and relationships, rather than the year alone.
- **Content authoring loop:** DateLinks and memory aids attached to entities, with an editorial status.

---

## 7. Suggested next session

1. Commit the draft batch.
2. Spend about 30 minutes in DB Browser on the review queue (§4, items 2–5).
3. Approve the drafts that pass, then `data:export`, `data:validate`, commit.
4. Pick the next build step. The recommended one is **Phase B (vocabularies)**. It is small, it blocks filtering and maps, and it should come before relationships so that edges attach to clean categories and regions.

## 8. File map

```
data/dategolf.db            source of truth
data/dategolf.sql           text dump (readable diffs)
data/legacy/                frozen originals + MANIFEST.json
data/drafts/                draft batches (JSON) for load-drafts
data/reports/               migration, validate, coverage, reconciliation reports
tools/manage.py             CLI router
tools/schema.sql            schema (idempotent; additive changes apply to the live db)
tools/importer.py           legacy files → db
tools/exporter.py           db → app JSON (skips `proposed`)
tools/validate.py           integrity checks + review queue
tools/reconcile.py          CSV ↔ event match proposals
tools/drafts.py             draft batch loader
```
