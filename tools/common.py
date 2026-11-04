"""Paths and connection helper shared by the data tools."""

import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
LEGACY = DATA / "legacy"
REPORTS = DATA / "reports"
DB_PATH = DATA / "dategolf.db"
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
}
LEGACY_CSV = "events_master.csv"


def connect(path=DB_PATH):
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn
