# Migration report — legacy files → dategolf.db

Imported at 2026-11-04T16:29:11+00:00 (schema v1).

## Records imported

| Source | Count |
|---|---:|
| events.json | 343 events |
| durations.json | 98 time spans |
| eras.json | 5 eras (time_spans, kind = era) |
| datelinks.json | 26 keys / 83 groups / 198 items |
| milestones.json | 16 designations (set legacy_default) |
| daily_challenges.json | 366 dates |
| events_master.csv | 310 legacy rows (not reconciled) |

## Transformations

- None to content. Text, dates, labels and order are stored verbatim.
- Lists (categories, aliases, groups, items, daily years) are split into rows with an explicit position, so order is preserved.
- `approximate` is stored as 1 or NULL. It is exported only where it is 1.
- Legacy categories are kept as-is (12 labels). `category_mappings` is empty.
- Every source record's raw JSON is kept in `import_records`.

## Needs review: 25 IDs that are both an event and a time span

Each one is a single entity with an `events` row and a `time_spans` row, with `editorial_status = needs_review_identity`. Decide whether each is one subject (keep it) or two (split the IDs).

- `punic-wars`
- `pax-romana`
- `islamic-golden-age`
- `gutenberg-printing-press`
- `protestant-reformation`
- `english-civil-war`
- `glorious-revolution`
- `american-revolution`
- `french-revolution`
- `haitian-revolution`
- `napoleonic-wars`
- `latin-american-independence`
- `american-civil-war`
- `russo-japanese-war`
- `russian-revolution`
- `indian-independence`
- `chinese-civil-war`
- `great-depression`
- `spanish-civil-war`
- `manhattan-project`
- `korean-war`
- `vietnam-war`
- `human-genome-project`
- `arab-spring`
- `covid-19-pandemic`

## Unresolved

- The 310 CSV rows are not linked to events. Reconciling them is a separate step.
- Regions are legacy free text with no hierarchy.

## Source files

| File | Bytes | sha256 |
|---|---:|---|
| daily_challenges.json | 24305 | `72ca7c1d3aed9f99…` |
| datelinks.json | 43548 | `88558f1989ff3034…` |
| durations.json | 32831 | `e3bdc05621c7ce23…` |
| eras.json | 366 | `5e6107235485a47a…` |
| events.json | 258392 | `14f85f1a88d3e031…` |
| events_master.csv | 56126 | `5666fb60cbb9aa49…` |
| milestones.json | 402 | `3d0a46c4637bd2e2…` |
