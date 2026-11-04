# Date Flow — Historical Data Audit and SQLite Migration Handoff

**Purpose:** Give the coding agent a grounded assessment of the five current data files and a safe, incremental plan for establishing SQLite as the source of truth.

**Audit scope:** `events.json`, `durations.json`, `events_master.csv`, `datelinks.json`, and `milestones.json`.

**Important boundary:** This is a structural/data-integrity audit, not a historical fact-check. It checks the data as supplied. It does not certify that event dates, descriptions, interpretations, or educational claims are historically accurate.

---

## 1. Executive summary

The current data is a useful foundation. The main JSON files are consistent, IDs are unique within each file, and all current DateLinks and milestone references resolve to events.

The migration should nevertheless be treated as a **reconciliation and modeling project**, not a mechanical file conversion.

Key findings:

- `events.json`: 343 events.
- `durations.json`: 98 duration records: 64 periods and 34 empires.
- `events_master.csv`: 310 legacy records, with a substantially different schema and numeric row IDs.
- `datelinks.json`: 26 event keys, 83 content groups, 198 text items.
- `milestones.json`: 16 event IDs.
- Every DateLinks key and every milestone ID currently matches an event ID in `events.json`.
- 25 IDs occur in both `events.json` and `durations.json`. This is not necessarily duplication: the same historical subject can have an event representation and a duration representation. The database should support one canonical entity with multiple relevant facets, rather than blindly creating duplicate identities.
- The CSV and JSON event IDs have no direct overlap. The CSV uses numeric `eventID` values (`0` through its row set); the JSON uses semantic slug IDs.
- The CSV has 310 rows versus 343 JSON events. The difference is a **net count difference of 33**, not proof that JSON simply contains 33 additions. Records may have been added, removed, renamed, merged, split, or redated.
- The current JSON taxonomy has 12 category labels and 12 region labels for events; the duration taxonomy is narrower. These vocabularies need deliberate normalization.
- `datelinks.json` is educational narrative content, not a clean knowledge graph. Preserve it as content; do not automatically convert its prose into causal relationships.
- The milestone list is a simple designation list. It should become structured metadata attached to canonical entities.

**Recommendation:** Preserve all five files as immutable migration inputs. Import them into staging/source tables, build explicit crosswalks, validate the result, and only then publish normalized entities and frontend exports.

---

## 2. Inventory and structural profile

| File | Records / keys | Main role | Notes |
|---|---:|---|---|
| `events.json` | 343 | Individual dated events | Main current timeline event dataset |
| `durations.json` | 98 | Periods and empires | Includes start/end years and `kind` |
| `events_master.csv` | 310 | Legacy event source | Older, wider set of flags and different field meanings |
| `datelinks.json` | 26 keys | Event-linked educational content | 83 groups and 198 text items |
| `milestones.json` | 16 IDs | Special timeline designations | All IDs currently resolve |

### 2.1 `events.json`

All 343 records have the same nine fields:

- `id`
- `name`
- `year`
- `categories`
- `region`
- `aliases`
- `description`
- `difficulty`
- `importance`

Checks:

- No duplicate IDs.
- No duplicate normalized names detected.
- No missing/empty values in the nine current fields.
- All years are integers.
- Years range from -3500 to 2023.
- Records are sorted by year ascending.
- 1,547 aliases in total, approximately 4.5 per event.
- `importance` values range from 2 to 9 in the current data.
- `difficulty` values are `easy`, `medium`, and `hard`.

Category frequency across event-category assignments:

| Existing category | Assignments |
|---|---:|
| Politics | 207 |
| War | 106 |
| Social | 90 |
| Science | 66 |
| Culture | 60 |
| Technology | 47 |
| Religion | 34 |
| Exploration | 24 |
| Disasters | 18 |
| Arts | 10 |
| Medicine | 8 |
| Sports | 6 |

An event can have multiple categories, so these are assignments, not mutually exclusive event counts.

Region frequency:

| Existing region | Events |
|---|---:|
| Europe | 114 |
| South Asia | 76 |
| East Asia | 42 |
| Americas | 34 |
| Middle East | 28 |
| Africa | 21 |
| Global | 13 |
| North America | 7 |
| World | 3 |
| Oceania | 3 |
| Southeast Asia | 1 |
| South America | 1 |

The region list contains overlapping levels and concepts. For example, `Americas` overlaps with `North America` and `South America`; `Global` and `World` are near-synonyms. Do not normalize these by string replacement without a reviewed mapping.

### 2.2 `durations.json`

All 98 records have:

- `id`
- `name`
- `startYear`
- `endYear`
- `categories`
- `region`
- `description`
- `importance`
- `kind`

Ten records also have `approximate`; the other 88 omit it.

Checks:

- No duplicate IDs.
- No duplicate normalized names detected.
- No missing/empty values in the common fields.
- No records where `startYear` is later than `endYear`.
- Years range from -2686 to 2023.
- Records are sorted by `startYear` ascending.
- `kind` values: 64 `period`, 34 `empire`.
- Duration categories currently use only Politics, War, Culture, and Science.

There are two records with the same temporal range, 750–1258:

- `islamic-golden-age` — period
- `abbasid-caliphate` — empire

This is a valid example of why matching date ranges must not be treated as duplicate records. They describe different historical concepts.

**Modeling implication:** These records are not merely generic “bars.” They are historical entities with temporal extents and different types. The database should allow a period and an empire to coexist over the same dates. Internal phases can be modeled separately.

### 2.3 `events_master.csv`

310 rows. Columns:

- `eventID`
- `stem`
- `event`
- `details`
- `wikipedia`
- `mnemonic`
- `itemDifficulty`
- `categories`
- Geographic/topic flags: `America`, `Europe`, `Asia`, `Africa`, `China`, `Discovery`, `Britain`, `France`, `Greek`, `India`, `Inventions`, `MiddleEast`, `prehistory`, `Religion`, `Roman`, `Royalty`, `Russia`, `Science`, `SouthAmerica`, `Wars`, `World`
- `YearNum`

Important differences from `events.json`:

1. `eventID` is a numeric row identifier, not a semantic ID. It cannot be used as the canonical entity ID without a mapping.
2. `event` is often a longer event description/title; it does not directly correspond to the JSON `name`.
3. `stem` stores a human-readable date label such as `c.3500 BC`.
4. `YearNum` stores the signed numeric year.
5. `itemDifficulty` is numeric (values 1–10), while JSON `difficulty` is categorical (`easy`, `medium`, `hard`). These are not directly interchangeable.
6. `categories` is inconsistently populated and uses a legacy bracketed string representation. It often contains geographic, historical-period, or topic labels rather than a clean category taxonomy.
7. The many boolean-like columns mix geographic labels and thematic labels. They are mostly sparse.
8. `details`, `wikipedia`, and `mnemonic` are frequently blank.

Blank counts in the CSV:

| Field | Blank rows |
|---|---:|
| details | 241 |
| wikipedia | 240 |
| mnemonic | 287 |
| categories | 213 |

The CSV's date range is -3500 to 1999. It is sorted by year ascending.

**Critical reconciliation warning:** The 310 CSV records and 343 JSON records must be compared record by record. The numeric CSV IDs do not match the JSON slugs. Exact-year overlap alone is not sufficient to establish identity. The year distributions differ substantially, and the JSON extends to 2023. Build a reviewed crosswalk using date, title/event text, description, aliases, and source context. Allow one-to-many and many-to-one candidate matches where appropriate. Keep unresolved rows visible for human review.

Do not delete the CSV after migration. Retain it as a legacy source and preserve its row ID.

### 2.4 `datelinks.json`

Structure:

- Root object keyed by event ID.
- 26 event keys.
- Each event contains `groups`.
- 83 groups total.
- 198 text items total.

Common group labels include:

- `Look Back`
- `Year of [year]`
- `Look Ahead`
- `Event Timeline`

Checks:

- All 26 root keys match IDs in `events.json`.
- No dangling DateLinks event keys detected.

Interpretation:

- This is primarily educational content: chronological anchors, memory aids, contextual comparisons, and within-event sequences.
- Some sentences describe real historical relationships, but the prose is not a typed relationship dataset.
- Do not parse every sentence into `caused`, `influenced`, `preceded`, etc. Automatically.
- Preserve exact wording, group labels, and item order during migration.
- A future editorial/research workflow can extract candidate graph relationships from this material, but those candidates need separate verification and approval.

Recommended normalized content representation:

- `learning_content` or `learning_content_groups`
- `learning_content_items`

Suggested fields:

- group: `id`, `entity_id`, `group_type` or original `label`, `display_order`, `source_file`
- item: `id`, `group_id`, `body`, `display_order`, `editorial_status`, optional source/provenance fields

Retain the original label even if a normalized group type is added.

### 2.5 `milestones.json`

A flat array of 16 event IDs.

Checks:

- All 16 IDs match existing event IDs.
- No dangling references detected.

Recommended future representation: `milestone_designations`, with fields such as:

- `entity_id`
- `milestone_type` (for example global, regional, thematic)
- `reason` or significance note
- `display_order`
- `active`
- provenance/review fields

For the initial migration, preserve the current list order and mark the existing 16 as the legacy/default milestone set. Do not invent significance explanations that are not present in the source.

---

## 3. Cross-file integrity findings

### 3.1 References

| Check | Result |
|---|---|
| DateLinks keys resolving to events | 26 / 26 |
| Milestone IDs resolving to events | 16 / 16 |
| Duplicate event IDs | 0 |
| Duplicate duration IDs | 0 |
| Invalid duration ranges | 0 |
| Event IDs also present in durations | 25 |

The 25 shared event/duration IDs include examples such as `french-revolution`, `glorious-revolution`, `spanish-civil-war`, `pax-romana`, and `islamic-golden-age`.

These overlaps require a modeling decision, not automatic deletion. A single canonical entity may need both an event facet and a temporal-span facet. In other cases, an event and a period may be related but genuinely distinct. The import process should preserve both source records and create an explicit reviewed identity decision.

### 3.2 Date conventions

The existing files use negative years for BCE and positive years for CE. This convention is convenient for plotting, but historical chronology has no year zero.

Recommendations:

- Preserve the current signed-year values exactly during migration.
- Add explicit date metadata rather than silently changing values.
- Document that `-1` represents 1 BCE and `1` represents 1 CE.
- Do not allow year `0` to be interpreted as a real historical year.
- For BCE/CE date arithmetic, implement and test a conversion layer that handles the missing year zero.
- Support approximate dates and date precision. A single integer year can be too precise for many ancient events.
- Do not convert `c.`, `circa`, or approximate dates into falsely exact dates.

A useful first temporal model:

- `start_year`
- `end_year` (nullable; same as start for a point event if appropriate)
- `date_precision` (year, decade, century, approximate range, etc.)
- `is_approximate`
- optional `date_display` preserving the source wording
- optional `date_confidence` or editorial confidence

Do not force every source record to have the same level of precision.

### 3.3 Category and region normalization

The current category vocabulary is inconsistent with the planned Date Flow taxonomy.

The planned top-level taxonomy is:

1. Politics & Governance
2. Wars & Conflicts
3. Science & Technology
4. Arts & Culture
5. Religion & Philosophy
6. Economy & Trade
7. Society & People
8. Geography & Environment

The existing values include `Politics`, `War`, `Social`, `Science`, `Technology`, `Culture`, `Religion`, `Exploration`, `Disasters`, `Arts`, `Medicine`, and `Sports`.

Do not simply rename and discard the old values. Use a mapping table or controlled vocabulary with aliases. Some categories may map to more than one new category depending on context. For example, `Exploration` could relate to geography, trade, politics, or science; `Medicine` could be science/technology but may deserve a subcategory of its own.

Recommended structure:

- `categories` — canonical controlled vocabulary
- `entity_categories` — many-to-many association
- `category_aliases` or `category_mappings` — legacy label, source, mapped category, mapping status, reviewer

Keep the original category values in source/provenance records so mappings can be revised.

For geography, use a controlled hierarchy or separate concepts for:
- geographic region,
- subregion,
- present-day country/territory,
- historical polity,
- global/transregional scope.

A single `region` text field is not enough for the future map and changing-borders experience. The initial migration can preserve the legacy region and add a canonical mapping only where reviewed.

---

## 4. Recommended SQLite architecture

Use SQLite as the editable source of truth. The frontend should continue to consume generated JSON and should not need to query SQLite directly.

Keep the initial schema intentionally modest. Avoid building every future feature before the current data is migrated and validated.

### 4.1 Core identity

A universal `entities` table provides stable identity:

- `id` — stable semantic slug, primary key
- `entity_type` — event, period, empire, person, dynasty, civilization, movement, invention, place, trade_network, concept, etc.
- `name`
- `short_description` or summary, if appropriate
- `created_at`
- `updated_at`
- `editorial_status`

Avoid putting every type-specific field in this table.

### 4.2 Type-specific tables

Start with:

- `events`
- `time_spans` (for periods, empires, dynasties, civilizations, movements where duration is meaningful)

Then add specialized tables only as real data is introduced:

- `people`
- `places`
- `entity_phases`
- `reigns`

A `time_spans` record should reference an entity and store its temporal extent and subtype. The subtype can distinguish `period`, `empire`, etc. The entity itself remains canonical.

`entity_phases` should support phases such as establishment, consolidation, expansion, zenith, fragmentation, decline, and transformation. Do not impose a universal lifecycle or require every entity to have every phase.

For rulers, keep lifespan and reign separate. A person's lifespan is not the same thing as their reign.

### 4.3 Temporal data

Use a consistent temporal representation across events and spans.

Recommended fields:

- `start_year`
- `end_year`
- `date_precision`
- `is_approximate`
- `date_display`
- `date_notes`

For a point event, `start_year` and `end_year` can be equal in the normalized model, or the event-specific table can use `year` while shared entity temporal fields are nullable. Choose one convention and document it. Avoid storing contradictory dates in both places.

### 4.4 Categories and geography

- `categories`
- `category_aliases` or `category_mappings`
- `entity_categories` with primary/secondary designation
- `regions` with hierarchy
- `entity_geographies` for one entity to have multiple geographic associations

Keep legacy category and region values in source records or migration metadata.

### 4.5 Relationships / knowledge graph

Create a first-class `relationships` table, but only populate relationships that are explicitly reviewed.

Suggested fields:

- `id`
- `source_entity_id`
- `relationship_type`
- `target_entity_id`
- `valid_start_year` / `valid_end_year` where useful
- `description` or explanation
- `confidence`
- `editorial_status`
- provenance/source references

Relationship types should be controlled vocabulary entries. Initial candidates:

- caused
- contributed_to
- enabled
- influenced
- triggered
- preceded
- followed
- part_of
- contemporary_with
- opposed
- interacted_with
- evolved_into

Chronological proximity is not causation. `contemporary_with` is not a causal relationship. The schema and UI must preserve this distinction.

### 4.6 Learning content and milestones

- `learning_content_groups`
- `learning_content_items`
- `milestone_designations`

These should reference canonical entity IDs and preserve order and legacy content.

### 4.7 Sources and provenance

This is important enough to include in the initial schema.

At minimum:

- `sources` — bibliographic/web/source record
- `entity_sources` — which source supports which entity or assertion
- `source_records` or `import_records` — original file, original row/key, original ID, raw payload
- `change_log` or review history — what changed, when, and by whom/what process
- `editorial_status` — for example draft, needs_review, reviewed, approved

For the CSV, retain the original `eventID`, row number, and raw row. For JSON, retain source filename, original ID, and raw record. Do not lose original fields even if the normalized schema does not yet use them.

Do not represent an AI-generated claim as verified simply because it has been imported. Record AI-assisted provenance and require review for consequential historical assertions.

---

## 5. Migration strategy

### Phase 0 — Freeze and snapshot

1. Keep the five source files unchanged.
2. Record file hashes, file sizes, and import timestamp.
3. Store a raw copy of each source record in a staging/import table or equivalent immutable archive.
4. Create a migration manifest documenting source file and source record counts.

### Phase 1 — Create the SQLite schema

Create the smallest schema that can faithfully represent the current data:

- `entities`
- `events`
- `time_spans`
- `categories`
- `entity_categories`
- `regions` / `entity_geographies`
- `learning_content_groups`
- `learning_content_items`
- `milestone_designations`
- `sources`
- `entity_sources`
- `import_records`
- `relationships` (empty initially, or only explicitly curated relationships)

Use foreign keys, uniqueness constraints, indexes, and SQLite foreign-key enforcement.

### Phase 2 — Import without semantic changes

Import all source records losslessly.

- Events: 343.
- Time spans: 98.
- CSV legacy rows: 310.
- DateLinks: 26 keys / 83 groups / 198 items.
- Milestones: 16.

Do not normalize or rewrite historical content in the same step as raw import. Preserve source values and provenance first.

### Phase 3 — Reconcile CSV and JSON events

Build a reconciliation report and a crosswalk table. Candidate matching can use:

- year/date proximity,
- normalized event text and names,
- description/details,
- aliases,
- source URL,
- geography/topic flags.

The system should produce candidate matches with a score and reasons, but must not silently merge records.

Crosswalk statuses could include:

- exact_match
- likely_match_needs_review
- possible_match
- distinct_records
- superseded
- unresolved

Support one-to-many and many-to-one mappings. Require a human decision for uncertain matches.

Keep CSV-only information such as `wikipedia`, `mnemonic`, numeric difficulty, and legacy flags even if not immediately used by the frontend.

### Phase 4 — Normalize controlled vocabularies

Create reviewed mappings for categories and regions. Preserve original labels and mapping provenance.

Do not silently force all records into the eight planned categories if the source data does not support a confident mapping. Allow `needs_review` and unmapped values.

### Phase 5 — Validate

Build a repeatable validation command that checks:

- unique IDs
- valid foreign keys
- valid date ranges
- no year zero in historical date fields
- supported date precision values
- categories resolve to controlled vocabulary
- regions resolve or are explicitly marked legacy/unmapped
- all DateLinks and milestone references resolve
- all relationships have valid source and target entities
- relationship types are valid
- no self-links unless explicitly allowed
- no accidental duplicate entities
- source/provenance exists for imported records
- no content silently dropped during import/export

Produce machine-readable and human-readable reports.

### Phase 6 — Export frontend JSON

The frontend should continue to receive the shapes it needs. Build deterministic export scripts that produce the existing JSON formats initially, so the current app keeps working.

Do not force the frontend to change at the same time as the database migration.

The database becomes the source of truth; JSON files become generated build artifacts. Add an export comparison step to detect unintended changes.

---

## 6. Python tooling and commands

Keep scripts focused and independently testable. A single `manage.py` CLI can route to them.

Suggested first commands:

```bash
python manage.py import-legacy --dry-run
python manage.py import-legacy
python manage.py validate
python manage.py reconcile-events
python manage.py coverage
python manage.py export-json
python manage.py compare-export
```

Add later, once the baseline works:

```bash
python manage.py temporal-coverage
python manage.py geographic-coverage
python manage.py category-balance
python manage.py entity-completeness
python manage.py relationship-analysis
python manage.py enrichment-priorities
```

Potential analysis outputs:

- temporal coverage by configurable time bins
- time × region coverage matrix
- category balance over time and geography
- entity completeness profiles
- period/empire phase coverage
- people and ruler coverage
- relationship density and cross-region connections
- missing/weak sources
- unresolved legacy reconciliation
- duplicate or conflicting date candidates

Important distinction: these reports measure **what the database contains**, not the actual amount of historical activity or the amount of surviving historical evidence.

A future enrichment-priority score can combine gap size, historical significance, connectivity, educational value, and effort. Keep the weights configurable and expose the component scores; do not let a single opaque score dictate editorial decisions.

---

## 7. Acceptance criteria for the first implementation

The first coding-agent task should be considered complete only when:

1. All five files are imported and their source records are preserved.
2. The database can be recreated from the source inputs using a documented command.
3. The import is repeatable and does not create duplicates when run twice.
4. The database contains 343 event records and 98 duration/time-span records from the current JSON inputs.
5. The 310 CSV records are preserved separately as legacy source records until reconciliation is complete.
6. All 26 DateLinks keys and 16 milestone IDs resolve.
7. All 83 DateLinks groups and 198 items are preserved with their original labels and order.
8. All 25 event/duration ID overlaps are explicitly represented and not accidentally duplicated or discarded.
9. Category and region normalization is traceable and reversible.
10. The current frontend JSON can be regenerated with no unintended content loss.
11. Validation reports are generated and identify unresolved issues rather than silently fixing them.
12. A migration report explains all transformations, mappings, unresolved matches, and skipped/invalid records.

---

## 8. Explicit instructions to the coding agent

- Do not rewrite historical descriptions or dates as part of this migration.
- Do not use web research or AI to silently “correct” the source data.
- Do not assume the CSV is more authoritative than the JSON, or vice versa.
- Do not assume the 33-record count difference means exactly 33 additions.
- Do not merge records solely because they share a year, name fragment, or date range.
- Do not convert DateLinks prose into knowledge-graph edges automatically.
- Do not treat `importance`, `difficulty`, historical significance, and educational priority as the same concept.
- Do not impose the same lifecycle phases on every empire, period, or civilization.
- Do not discard legacy category/region values after mapping.
- Do not change the frontend data contract until the database migration and export comparison are stable.
- Keep the schema extensible, but implement only what is needed for the current data and agreed near-term features.

## 9. Suggested implementation order

1. Inspect repository and current validation scripts.
2. Add schema/migrations and raw import archive.
3. Implement lossless import for events and durations.
4. Import DateLinks and milestones with referential validation.
5. Preserve CSV rows and generate a reconciliation report.
6. Add reviewed category/region mapping infrastructure.
7. Generate JSON exports and compare them against current frontend data.
8. Add baseline data-quality and coverage reports.
9. Only then begin enriching entities and curating typed relationships.

**Guiding principle:** First make the existing data safe, traceable, and queryable. Then improve its coverage and historical depth. Do not combine migration, historical fact-checking, taxonomy redesign, and frontend redesign into one risky change.
