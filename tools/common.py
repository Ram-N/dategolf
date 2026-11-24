"""Paths and connection helper shared by the data tools."""

import os
import re
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
LEGACY = DATA / "legacy"
REPORTS = DATA / "reports"
DB_PATH = DATA / "dategolf.db"

# Tests point DATEGOLF_DB at a temporary copy; reports then go next to it, not into data/.
if os.environ.get("DATEGOLF_DB"):
    DB_PATH = Path(os.environ["DATEGOLF_DB"])
    REPORTS = DB_PATH.parent / "reports"
DUMP_PATH = DATA / "dategolf.sql"
SCHEMA = Path(__file__).resolve().parent / "schema.sql"

# Generated app files, relative to ROOT. Their frozen originals live in data/legacy/.
APP_FILES = {
    "events.json": "src/data/events.json",
    "durations.json": "src/data/durations.json",
    "datelinks.json": "src/data/datelinks.json",
    "milestones.json": "src/data/milestones.json",
    "eras.json": "src/data/eras.json",
    "daily_challenges.json": "public/data/daily_challenges.json",
    "regions.json": "src/data/regions.json",
    "relationships.json": "src/data/relationships.json",  # links (Step 3c); no legacy original
    "journeys.json": "src/data/journeys.json",  # curated journeys (Phase 14)
    "states.json": "src/data/states.json",
    "milestone_labels.json": "src/data/milestone_labels.json",  # short names for DateFlow's milestone tags  # event → states, for the Empires & states axis (doc 18, 2a)
}
LEGACY_CSV = "events_master.csv"


def connect(path=DB_PATH):
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def log(conn, action, entity_id, detail=None, via="cli"):
    """Record a review decision in review_log (the caller commits)."""
    conn.execute("INSERT INTO review_log (action, entity_id, detail, via) VALUES (?, ?, ?, ?)",
                 (action, entity_id, detail, via))


# Columns added after their table was first created. schema.sql has them for fresh builds;
# ensure_schema adds any that a live db is missing (SQLite can't do ADD COLUMN IF NOT EXISTS).
ADDED_COLUMNS = [
    ("entity_countries", "role", "TEXT NOT NULL DEFAULT 'location' CHECK (role IN ('location', 'actor'))"),
    ("countries", "iso3", "TEXT CHECK (iso3 IS NULL OR length(iso3) = 3)"),
    ("relationships", "origin", "TEXT"),
    ("relationships", "created_at", "TEXT"),
    ("relationship_types", "definition", "TEXT"),
    ("relationship_types", "direction", "TEXT"),
    ("relationship_types", "inverse_label", "TEXT"),
    ("relationship_types", "symmetric", "INTEGER NOT NULL DEFAULT 0"),
    ("time_spans", "date_display", "TEXT"),
    ("missing_entities", "url", "TEXT"),
    ("milestone_designations", "short_label", "TEXT"),
]


def _rename_empire_kind(conn):
    """2026-11-24 (doc 21 §6.2): the span kind 'empire' became 'state'. SQLite can't change a CHECK in place,
    so time_spans is rebuilt from schema.sql once, with foreign keys off and checked before committing."""
    row = conn.execute("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'time_spans'").fetchone()
    if not row or "'empire'" not in row[0]:
        return
    ddl = re.search(r"CREATE TABLE IF NOT EXISTS time_spans \((.*?)\n\);", SCHEMA.read_text(encoding="utf-8"), re.S)
    cols = [r[1] for r in conn.execute("PRAGMA table_info(time_spans)")]
    picked = ", ".join("CASE kind WHEN 'empire' THEN 'state' ELSE kind END" if c == "kind" else c for c in cols)
    conn.commit()
    conn.execute("PRAGMA foreign_keys = OFF")  # only takes effect outside a transaction
    conn.execute("PRAGMA legacy_alter_table = ON")  # don't re-check views while the table is briefly missing
    try:
        conn.execute("BEGIN")
        conn.execute(f"CREATE TABLE time_spans_new ({ddl.group(1)})")
        conn.execute(f"INSERT INTO time_spans_new ({', '.join(cols)}) SELECT {picked} FROM time_spans")
        conn.execute("DROP TABLE time_spans")
        conn.execute("ALTER TABLE time_spans_new RENAME TO time_spans")
        conn.execute("UPDATE entities SET primary_type = 'state' WHERE primary_type = 'empire'")
        if conn.execute("PRAGMA foreign_key_check").fetchall():
            raise sqlite3.IntegrityError("foreign keys broken by the time_spans rebuild")
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        raise
    finally:
        conn.execute("PRAGMA legacy_alter_table = OFF")
        conn.execute("PRAGMA foreign_keys = ON")


def ensure_schema(conn):
    """Apply additive schema changes (new columns, tables and views) to an existing db."""
    _rename_empire_kind(conn)  # before the views and triggers below are (re)created
    for table, column, ddl in ADDED_COLUMNS:  # before the views, which may use these columns
        cols = [r[1] for r in conn.execute(f"PRAGMA table_info({table})")]
        if cols and column not in cols:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}")
    # Views hold no data, so recreate schema.sql's own views: an edited view then reaches a live db.
    # Views made by hand (e.g. in DB Browser) aren't touched.
    schema = SCHEMA.read_text(encoding="utf-8")
    for view in re.findall(r"CREATE VIEW IF NOT EXISTS (\w+)", schema):
        conn.execute(f"DROP VIEW IF EXISTS {view}")
    conn.executescript(schema)
