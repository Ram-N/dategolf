"""Paths and connection helper shared by the data tools."""

import os
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


def ensure_schema(conn):
    """Apply additive schema changes (new tables/views) to an existing db."""
    conn.executescript(SCHEMA.read_text(encoding="utf-8"))
