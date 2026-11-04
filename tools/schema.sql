-- DateFlow source-of-truth schema (Lean v1).
-- Year convention: signed integers, -1 = 1 BCE, 1 = 1 CE. There is no year 0.
-- Export ordering: events by (year, position), spans by (start_year, position).
-- A NULL position sorts last, so rows added in a GUI don't need one.

PRAGMA foreign_keys = ON;

CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ── Identity ────────────────────────────────────────────────────────────────

CREATE TABLE entities (
  id               TEXT PRIMARY KEY,               -- stable semantic slug
  primary_type     TEXT NOT NULL,                  -- event | period | empire | era | ...
  editorial_status TEXT NOT NULL DEFAULT 'draft',  -- imported | needs_review_identity | draft | reviewed
  created_at       TEXT DEFAULT (datetime('now')), -- NULL = came from the legacy import
  updated_at       TEXT
);

-- ── Facets ──────────────────────────────────────────────────────────────────

CREATE TABLE events (
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

CREATE TABLE event_aliases (
  entity_id TEXT NOT NULL REFERENCES events(entity_id) ON DELETE CASCADE,
  position  INTEGER NOT NULL,
  alias     TEXT NOT NULL,
  PRIMARY KEY (entity_id, position)
);

CREATE TABLE time_spans (
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

CREATE TABLE categories (
  label TEXT PRIMARY KEY                           -- the 12 legacy labels for now
);

-- Same entity can carry different categories as an event and as a span.
CREATE TABLE entity_categories (
  entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  facet     TEXT NOT NULL CHECK (facet IN ('event', 'span')),
  position  INTEGER NOT NULL,                      -- 0 = primary
  category  TEXT NOT NULL REFERENCES categories(label) ON UPDATE CASCADE,
  PRIMARY KEY (entity_id, facet, position),
  UNIQUE (entity_id, facet, category)
);

-- Filled in by the taxonomy step (8 planned top-level categories).
CREATE TABLE category_mappings (
  legacy_label    TEXT NOT NULL REFERENCES categories(label) ON UPDATE CASCADE,
  target_category TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'needs_review',
  note            TEXT,
  PRIMARY KEY (legacy_label, target_category)
);

-- ── Learning content (DateLinks) ────────────────────────────────────────────

-- Entity order in datelinks.json follows the lowest group id.
CREATE TABLE learning_content_groups (
  id            INTEGER PRIMARY KEY,
  entity_id     TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,                     -- original label, verbatim
  display_order INTEGER NOT NULL,
  UNIQUE (entity_id, display_order)
);

CREATE TABLE learning_content_items (
  id               INTEGER PRIMARY KEY,
  group_id         INTEGER NOT NULL REFERENCES learning_content_groups(id) ON DELETE CASCADE,
  display_order    INTEGER NOT NULL,
  body             TEXT NOT NULL,
  editorial_status TEXT NOT NULL DEFAULT 'draft',
  UNIQUE (group_id, display_order)
);

-- ── Designations ────────────────────────────────────────────────────────────

CREATE TABLE milestone_designations (
  entity_id     TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  milestone_set TEXT NOT NULL DEFAULT 'legacy_default',
  display_order INTEGER NOT NULL,
  active        INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (milestone_set, entity_id)
);

-- DateGolf daily target years, keyed 'MM-DD'. Years, not event references.
CREATE TABLE daily_challenges (
  date_key TEXT NOT NULL,
  position INTEGER NOT NULL,
  year     INTEGER NOT NULL CHECK (year <> 0),
  PRIMARY KEY (date_key, position)
);

-- ── Relationships (empty until curated) ─────────────────────────────────────

CREATE TABLE relationship_types (
  type      TEXT PRIMARY KEY,
  is_causal INTEGER NOT NULL                       -- contemporary_with is NOT causal
);

CREATE TABLE relationships (
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
CREATE TABLE legacy_csv_rows (
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
CREATE TABLE import_records (
  source_file TEXT NOT NULL,
  source_key  TEXT NOT NULL,                       -- id, MM-DD, or CSV eventID
  position    INTEGER NOT NULL,
  raw_json    TEXT NOT NULL,
  PRIMARY KEY (source_file, source_key)
);

-- ── Change tracking ─────────────────────────────────────────────────────────

CREATE TRIGGER events_touch AFTER UPDATE ON events BEGIN
  UPDATE entities SET updated_at = datetime('now') WHERE id = NEW.entity_id;
END;

CREATE TRIGGER time_spans_touch AFTER UPDATE ON time_spans BEGIN
  UPDATE entities SET updated_at = datetime('now') WHERE id = NEW.entity_id;
END;
