-- DateFlow source-of-truth schema (Lean v1).
-- Every statement is IF NOT EXISTS so additive changes can be applied to a live db
-- (common.ensure_schema). Year convention: signed integers, -1 = 1 BCE, 1 = 1 CE. There is no year 0.
-- Export ordering: events by (year, position), spans by (start_year, position).
-- A NULL position sorts last, so rows added in a GUI don't need one.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ── Identity ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS entities (
  id               TEXT PRIMARY KEY,               -- stable semantic slug
  primary_type     TEXT NOT NULL,                  -- event | period | empire | era | ...
  editorial_status TEXT NOT NULL DEFAULT 'draft',  -- imported | needs_review_identity | draft | reviewed
                                                   -- | proposed (NOT exported until changed)
  created_at       TEXT DEFAULT (datetime('now')), -- NULL = came from the legacy import
  updated_at       TEXT
);

-- ── Facets ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS events (
  entity_id      TEXT PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE,
  name           TEXT NOT NULL UNIQUE,
  year           INTEGER NOT NULL CHECK (year <> 0),
  region         TEXT NOT NULL,                    -- legacy free-text region
  description    TEXT NOT NULL,
  difficulty     TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  importance     INTEGER NOT NULL,
  date_precision TEXT,                             -- not exported yet
  is_approximate INTEGER,                          -- not exported yet
  date_display   TEXT,                             -- not exported yet
  position       INTEGER
);

CREATE TABLE IF NOT EXISTS event_aliases (
  entity_id TEXT NOT NULL REFERENCES events(entity_id) ON DELETE CASCADE,
  position  INTEGER NOT NULL,
  alias     TEXT NOT NULL,
  PRIMARY KEY (entity_id, position)
);

CREATE TABLE IF NOT EXISTS time_spans (
  entity_id   TEXT PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('period', 'empire', 'era')),  -- era -> eras.json
  name        TEXT NOT NULL,
  start_year  INTEGER NOT NULL CHECK (start_year <> 0),
  end_year    INTEGER NOT NULL CHECK (end_year <> 0),
  description TEXT,                                -- NULL for eras
  region      TEXT,
  importance  INTEGER,
  approximate INTEGER CHECK (approximate IS NULL OR approximate = 1),
  position    INTEGER,
  CHECK (start_year <= end_year)
);

-- ── Categories ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS categories (
  label TEXT PRIMARY KEY                           -- the 12 legacy labels for now
);

-- Region hierarchy: every region label belongs to one DateFlow lane (src/engine/dateflow/lanes.ts).
-- A label equal to its lane's name is the lane itself; others (Southeast Asia, Oceania…) are subregions.
-- Exported as src/data/regions.json, which lanes.ts reads. Countries can hang under these later.
CREATE TABLE IF NOT EXISTS regions (
  label TEXT PRIMARY KEY,
  lane  TEXT NOT NULL CHECK (lane IN
          ('south-asia', 'east-asia', 'europe', 'middle-east', 'africa', 'americas', 'global')),
  note  TEXT
);

-- Present-day countries (ISO 3166 alpha-2), each inside a region. ZZ = worldwide, no single country.
-- alt_region covers countries that straddle two regions (Egypt: Africa and Middle East).
CREATE TABLE IF NOT EXISTS countries (
  code       TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  region     TEXT NOT NULL REFERENCES regions(label),
  alt_region TEXT REFERENCES regions(label)
);

-- Countries linked to an event or span, in present-day terms (position 0 = primary).
-- role: 'location' = where it physically happened (a map plots these);
--       'actor'    = whose action or story it is, when that country isn't the location
--                    (Pearl Harbor: US location, JP actor).
-- Not exported yet; groundwork for a map. Approve with `manage.py approve-countries`.
CREATE TABLE IF NOT EXISTS entity_countries (
  entity_id  TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  position   INTEGER NOT NULL,
  country    TEXT NOT NULL REFERENCES countries(code) ON UPDATE CASCADE,
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'low')),
  status     TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'reviewed')),
  note       TEXT,
  role       TEXT NOT NULL DEFAULT 'location' CHECK (role IN ('location', 'actor')),
  PRIMARY KEY (entity_id, position),
  UNIQUE (entity_id, country)
);

-- Entities whose region deliberately differs from where they happened (validation skips them).
CREATE TABLE IF NOT EXISTS accepted_region_exceptions (
  entity_id TEXT PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE,
  reason    TEXT NOT NULL
);

-- Same entity can carry different categories as an event and as a span.
CREATE TABLE IF NOT EXISTS entity_categories (
  entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  facet     TEXT NOT NULL CHECK (facet IN ('event', 'span')),
  position  INTEGER NOT NULL,                      -- 0 = primary
  category  TEXT NOT NULL REFERENCES categories(label) ON UPDATE CASCADE,
  PRIMARY KEY (entity_id, facet, position),
  UNIQUE (entity_id, facet, category)
);

-- Filled in by the taxonomy step (8 planned top-level categories).
CREATE TABLE IF NOT EXISTS category_mappings (
  legacy_label    TEXT NOT NULL REFERENCES categories(label) ON UPDATE CASCADE,
  target_category TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'needs_review',
  note            TEXT,
  PRIMARY KEY (legacy_label, target_category)
);

-- ── Learning content (DateLinks) ────────────────────────────────────────────

-- Entity order in datelinks.json follows the lowest group id.
CREATE TABLE IF NOT EXISTS learning_content_groups (
  id            INTEGER PRIMARY KEY,
  entity_id     TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,                     -- original label, verbatim
  display_order INTEGER NOT NULL,
  UNIQUE (entity_id, display_order)
);

CREATE TABLE IF NOT EXISTS learning_content_items (
  id               INTEGER PRIMARY KEY,
  group_id         INTEGER NOT NULL REFERENCES learning_content_groups(id) ON DELETE CASCADE,
  display_order    INTEGER NOT NULL,
  body             TEXT NOT NULL,
  editorial_status TEXT NOT NULL DEFAULT 'draft',
  UNIQUE (group_id, display_order)
);

-- ── Designations ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS milestone_designations (
  entity_id     TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  milestone_set TEXT NOT NULL DEFAULT 'legacy_default',
  display_order INTEGER NOT NULL,
  active        INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (milestone_set, entity_id)
);

-- DateGolf daily target years, keyed 'MM-DD'. Years, not event references.
CREATE TABLE IF NOT EXISTS daily_challenges (
  date_key TEXT NOT NULL,
  position INTEGER NOT NULL,
  year     INTEGER NOT NULL CHECK (year <> 0),
  PRIMARY KEY (date_key, position)
);

-- ── Relationships (empty until curated) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS relationship_types (
  type      TEXT PRIMARY KEY,
  is_causal INTEGER NOT NULL                       -- contemporary_with is NOT causal
);

CREATE TABLE IF NOT EXISTS relationships (
  id                INTEGER PRIMARY KEY,
  source_entity_id  TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL REFERENCES relationship_types(type),
  target_entity_id  TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  description       TEXT,
  confidence        TEXT,
  editorial_status  TEXT NOT NULL DEFAULT 'draft',
  CHECK (source_entity_id <> target_entity_id),
  UNIQUE (source_entity_id, relationship_type, target_entity_id)
);

-- ── Legacy / provenance ─────────────────────────────────────────────────────

-- events_master.csv, verbatim strings. Awaits reconciliation with events.
CREATE TABLE IF NOT EXISTS legacy_csv_rows (
  event_id        INTEGER PRIMARY KEY,             -- original numeric eventID
  row_number      INTEGER NOT NULL,                -- 1-based data row
  stem            TEXT NOT NULL,
  event           TEXT NOT NULL,
  details         TEXT NOT NULL,
  wikipedia       TEXT NOT NULL,
  mnemonic        TEXT NOT NULL,
  item_difficulty TEXT NOT NULL,
  categories_raw  TEXT NOT NULL,
  flags_json      TEXT NOT NULL,                   -- {column: raw value} in original column order
  year_num        INTEGER NOT NULL
);

-- Raw payload of every imported source record. Never edited.
CREATE TABLE IF NOT EXISTS import_records (
  source_file TEXT NOT NULL,
  source_key  TEXT NOT NULL,                       -- id, MM-DD, or CSV eventID
  position    INTEGER NOT NULL,
  raw_json    TEXT NOT NULL,
  PRIMARY KEY (source_file, source_key)
);

-- Events shown in DateFlow only, excluded from DatePick and DateGolf (exported as dateflowOnly: true).
-- For events whose date is too disputed to be a fair guess. To exclude one, add its id here.
CREATE TABLE IF NOT EXISTS dateflow_only_events (
  entity_id TEXT PRIMARY KEY REFERENCES events(entity_id) ON DELETE CASCADE,
  reason    TEXT
);

-- Candidate CSV-row ↔ event pairs from `manage.py reconcile-events`.
-- Many-to-many: one CSV row can bundle several events, one event can appear in several rows.
-- Set `decision` in a GUI; re-running reconcile never touches decided rows.
CREATE TABLE IF NOT EXISTS legacy_csv_crosswalk (
  csv_event_id INTEGER NOT NULL REFERENCES legacy_csv_rows(event_id),
  entity_id    TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  rank         INTEGER NOT NULL,                   -- 1 = best candidate for this CSV row
  score        REAL NOT NULL,                      -- 0..1, see reasons
  tier         TEXT NOT NULL CHECK (tier IN
                 ('exact_match', 'likely_match_needs_review', 'possible_match')),
  reasons      TEXT NOT NULL,
  decision     TEXT CHECK (decision IS NULL OR decision IN ('accepted', 'rejected')),
  note         TEXT,
  PRIMARY KEY (csv_event_id, entity_id)
);

-- Side-by-side review: open this view in DB Browser, then edit decisions in the table.
CREATE VIEW IF NOT EXISTS v_csv_crosswalk_review AS
SELECT x.csv_event_id, c.year_num AS csv_year, c.event AS csv_text,
       x.rank, x.tier, x.score, e.year AS event_year, x.entity_id, e.name AS event_name,
       x.reasons, x.decision
FROM legacy_csv_crosswalk x
JOIN legacy_csv_rows c ON c.event_id = x.csv_event_id
JOIN events e ON e.entity_id = x.entity_id
ORDER BY c.row_number, x.rank;

-- Where a non-imported entity came from. AI-drafted content is never verified by default.
CREATE TABLE IF NOT EXISTS entity_provenance (
  entity_id    TEXT PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE,
  origin       TEXT NOT NULL,                      -- e.g. ai_drafted_from_csv
  csv_event_id INTEGER REFERENCES legacy_csv_rows(event_id),
  note         TEXT                                -- what a reviewer should check
);

-- Outcome for CSV rows that match no existing event.
CREATE TABLE IF NOT EXISTS legacy_csv_triage (
  csv_event_id      INTEGER PRIMARY KEY REFERENCES legacy_csv_rows(event_id),
  outcome           TEXT NOT NULL CHECK (outcome IN
                      ('drafted', 'duplicate_of_existing', 'not_recommended')),
  related_entity_id TEXT REFERENCES entities(id) ON DELETE SET NULL,
  note              TEXT
);

-- Draft review: proposed events with their source CSV row and review note, flagged ones first.
-- Approve by setting entities.editorial_status = 'reviewed' (or `manage.py approve <id>`).
CREATE VIEW IF NOT EXISTS v_proposed_events AS
SELECT e.entity_id, e.year, e.name, e.region, e.difficulty, e.importance,
       (SELECT group_concat(category, ', ') FROM (SELECT category FROM entity_categories c
        WHERE c.entity_id = e.entity_id AND c.facet = 'event' ORDER BY position)) AS categories,
       (SELECT group_concat(alias, ' | ') FROM (SELECT alias FROM event_aliases a
        WHERE a.entity_id = e.entity_id ORDER BY position)) AS aliases,
       e.description, p.note AS review_note, p.csv_event_id, r.event AS csv_text
FROM events e
JOIN entities n ON n.id = e.entity_id
LEFT JOIN entity_provenance p ON p.entity_id = e.entity_id
LEFT JOIN legacy_csv_rows r ON r.event_id = p.csv_event_id
WHERE n.editorial_status = 'proposed'
ORDER BY p.note IS NULL, e.year;

-- Country review: one row per entity, low-confidence and unreviewed first.
-- Fix a tag in entity_countries; approve with `manage.py approve-countries`.
CREATE VIEW IF NOT EXISTS v_country_review AS
SELECT x.entity_id,
       coalesce(e.year, s.start_year) AS year,
       coalesce(e.name, s.name) AS name,
       coalesce(e.region, s.region) AS region,
       (SELECT group_concat(country || ' ' || name || CASE role WHEN 'actor' THEN ' (actor)' ELSE '' END, ', ')
        FROM (SELECT c.country, k.name, c.role
          FROM entity_countries c JOIN countries k ON k.code = c.country
          WHERE c.entity_id = x.entity_id ORDER BY c.position)) AS countries,
       x.confidence, x.status, x.note
FROM entity_countries x
LEFT JOIN events e ON e.entity_id = x.entity_id
LEFT JOIN time_spans s ON s.entity_id = x.entity_id
WHERE x.position = 0
ORDER BY x.status = 'reviewed', x.confidence = 'high', coalesce(e.year, s.start_year);

-- ── Change tracking ─────────────────────────────────────────────────────────

CREATE TRIGGER IF NOT EXISTS events_touch AFTER UPDATE ON events BEGIN
  UPDATE entities SET updated_at = datetime('now') WHERE id = NEW.entity_id;
END;

CREATE TRIGGER IF NOT EXISTS time_spans_touch AFTER UPDATE ON time_spans BEGIN
  UPDATE entities SET updated_at = datetime('now') WHERE id = NEW.entity_id;
END;
