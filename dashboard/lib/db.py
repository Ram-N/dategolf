"""Read-only access to data/dategolf.db. Every write goes through lib/actions.py (and so tools/)."""

import sqlite3
from pathlib import Path

import pandas as pd
import streamlit as st

ROOT = Path(__file__).resolve().parents[2]
DB_PATH = ROOT / "data" / "dategolf.db"

# DateFlow lanes, in display order (mirrors src/engine/dateflow/lanes.ts).
LANES = [("south-asia", "South Asia"), ("east-asia", "East Asia"), ("europe", "Europe"),
         ("middle-east", "Middle East"), ("africa", "Africa"), ("americas", "Americas"), ("global", "Global")]
LANE_LABEL = dict(LANES)

PUBLISHED = "entity_id NOT IN (SELECT id FROM entities WHERE editorial_status = 'proposed')"


@st.cache_data(show_spinner=False)
def _query(sql: str, params: tuple, version: float) -> pd.DataFrame:
    # `version` is the db file's mtime: any edit (tools, DB Browser) invalidates the cache.
    with sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True) as conn:
        return pd.read_sql_query(sql, conn, params=params)


def q(sql: str, *params) -> pd.DataFrame:
    return _query(sql, params, DB_PATH.stat().st_mtime)


def scalar(sql: str, *params):
    return q(sql, *params).iat[0, 0]


def events() -> pd.DataFrame:
    """Published events with their lane and primary category."""
    return q(f"""
        SELECT e.entity_id, e.name, e.year, e.region, r.lane, e.importance, e.difficulty,
               (SELECT category FROM entity_categories c
                 WHERE c.entity_id = e.entity_id AND c.facet = 'event' AND c.position = 0) AS primary_category
        FROM events e JOIN regions r ON r.label = e.region
        WHERE e.{PUBLISHED}""")


def event_categories() -> pd.DataFrame:
    """One row per (published event, category)."""
    return q(f"""
        SELECT e.entity_id, e.year, c.category, c.position
        FROM events e JOIN entity_categories c ON c.entity_id = e.entity_id AND c.facet = 'event'
        WHERE e.{PUBLISHED}""")


def spans() -> pd.DataFrame:
    return q(f"""
        SELECT s.entity_id, s.name, s.kind, s.start_year, s.end_year, s.region, r.lane, s.importance
        FROM time_spans s LEFT JOIN regions r ON r.label = s.region
        WHERE s.{PUBLISHED}""")


def country_tags() -> pd.DataFrame:
    """One row per (entity, country) with the entity's years and categories, for the map."""
    return q("""
        SELECT x.entity_id, x.country, k.name AS country_name, k.iso3, x.role, x.status,
               CASE WHEN e.entity_id IS NOT NULL THEN 'event' ELSE 'span' END AS kind,
               coalesce(e.name, s.name) AS name,
               coalesce(e.year, s.start_year) AS start_year,
               coalesce(e.year, s.end_year) AS end_year,
               (SELECT group_concat(category, ', ') FROM entity_categories c
                 WHERE c.entity_id = x.entity_id) AS categories
        FROM entity_countries x
        JOIN countries k ON k.code = x.country
        LEFT JOIN events e ON e.entity_id = x.entity_id
        LEFT JOIN time_spans s ON s.entity_id = x.entity_id AND e.entity_id IS NULL""")


def bin_start(years: pd.Series, size: int) -> pd.Series:
    return (years // size) * size  # floor division also bins BCE years correctly


def bin_label(start: int, size: int) -> str:
    fmt = lambda y: f"{-y} BCE" if y < 0 else str(y)
    end = start + size - 1
    return f"{fmt(start or 1)}–{fmt(end)}"  # no year 0
