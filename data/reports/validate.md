# Validation report

| Severity | Check | Result |
|---|---|---:|
| error | SQLite integrity_check | pass |
| error | Foreign key violations | pass |
| error | Year 0 in an event | pass |
| error | Year 0 in a time span | pass |
| error | Time span starts after it ends | pass |
| error | Entity with no event or time-span facet | pass |
| error | Event with no categories | pass |
| error | Period/empire with no categories | pass |
| error | Category row for a facet the entity doesn't have | pass |
| error | Milestone that is not an event | pass |
| error | DateLinks content for an entity that is not an event | pass |
| error | DateLinks group with no items | pass |
| error | Daily challenge date without exactly 5 years | pass |
| error | Empty event name or description | pass |
| warning | Time spans with the same normalised name | pass |
| warning | Event names that differ only in case or spacing | pass |
| warning | Event with no aliases (search falls back to name only) | pass |
| warning | Imported entity with no import record (provenance lost) | pass |
| review | Event + time span share one ID (identity decision needed) | 25 |
| review | Legacy CSV rows not yet reconciled with events | 1 |
| review | Legacy region labels (no reviewed hierarchy yet) | 12 |
| review | Legacy categories with no mapping to the planned taxonomy | 12 |
| info | Counts changed since the legacy import | pass |

## Counts

- events: 343
- time_spans: 98
- eras: 5
- datelinks_keys: 26
- datelinks_groups: 83
- datelinks_items: 198
- milestones: 16
- daily_challenge_dates: 366
- csv_rows: 310

## [review] Event + time span share one ID (identity decision needed)

- `punic-wars` — event
- `pax-romana` — event
- `islamic-golden-age` — event
- `gutenberg-printing-press` — event
- `protestant-reformation` — event
- `english-civil-war` — event
- `glorious-revolution` — event
- `american-revolution` — event
- `french-revolution` — event
- `haitian-revolution` — event
- `napoleonic-wars` — event
- `latin-american-independence` — event
- `american-civil-war` — event
- `russo-japanese-war` — event
- `russian-revolution` — event
- `chinese-civil-war` — event
- `great-depression` — event
- `spanish-civil-war` — event
- `manhattan-project` — event
- `indian-independence` — event
- `korean-war` — event
- `vietnam-war` — event
- `human-genome-project` — event
- `arab-spring` — event
- `covid-19-pandemic` — event

## [review] Legacy CSV rows not yet reconciled with events

- `events_master.csv` — 310 rows

## [review] Legacy region labels (no reviewed hierarchy yet)

- `South Asia` — 88 records
- `North America` — 7 records
- `East Asia` — 59 records
- `Americas` — 46 records
- `Oceania` — 4 records
- `Middle East` — 39 records
- `World` — 3 records
- `Africa` — 27 records
- `Global` — 23 records
- `Southeast Asia` — 2 records
- `Europe` — 142 records
- `South America` — 1 records

## [review] Legacy categories with no mapping to the planned taxonomy

- `Arts` — 
- `Culture` — 
- `Disasters` — 
- `Exploration` — 
- `Medicine` — 
- `Politics` — 
- `Religion` — 
- `Science` — 
- `Social` — 
- `Sports` — 
- `Technology` — 
- `War` — 
