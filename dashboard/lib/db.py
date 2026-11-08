"""Read-only access to data/dategolf.db. Every write goes through lib/actions.py (and so tools/)."""

import os
import sqlite3
from pathlib import Path

import pandas as pd
import streamlit as st

ROOT = Path(__file__).resolve().parents[2]
DB_PATH = Path(os.environ.get("DATEGOLF_DB") or ROOT / "data" / "dategolf.db")  # tests use a copy

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


# How a link type reads from its source (the target side uses relationship_types.inverse_label).
FORWARD = {"part_of": "is part of", "contributed_to": "contributed to", "evolved_into": "evolved into",
           "contemporary_with": "was contemporary with", "interacted_with": "interacted with"}


def forward_label(rtype: str) -> str:
    return FORWARD.get(rtype, rtype.replace("_", " "))


def span_years() -> dict:
    """{id: (start, end)} for spans that link to as spans (a shared id reads as its event, as in v_link_review)."""
    df = q("SELECT entity_id, start_year, end_year FROM time_spans WHERE entity_id NOT IN (SELECT entity_id FROM events)")
    return {r.entity_id: (r.start_year, r.end_year) for r in df.itertuples()}


def when(entity_id: str, year) -> str:
    """'1347' for an event, '1347 to 1353' for a span, so the two are never confused."""
    span = span_years().get(entity_id)
    return f"{span[0]} to {span[1]}" if span and span[0] != span[1] else str(year)


def starts_span(row) -> bool:
    """An event that is part_of a span and happens in the span's first year ("X begins" → X)."""
    span = span_years().get(row["target_id"])
    return (row["type"] == "part_of" and span is not None and row["source_id"] not in span_years()
            and row["source_year"] == span[0])


def link_sentence(row) -> str:
    """A link as a sentence. Sequences read from the later side ("B followed A"), which is more natural."""
    src = f"{row['source_name']} ({when(row['source_id'], row['source_year'])})"
    tgt = f"{row['target_name']} ({when(row['target_id'], row['target_year'])})"
    if row["type"] == "preceded":
        return f"{tgt} followed {src}"
    return f"{src} {forward_label(row['type'])} {tgt}"


def bin_start(years: pd.Series, size: int) -> pd.Series:
    return (years // size) * size  # floor division also bins BCE years correctly


def bin_label(start: int, size: int) -> str:
    fmt = lambda y: f"{-y} BCE" if y < 0 else str(y)
    end = start + size - 1
    return f"{fmt(start or 1)}–{fmt(end)}"  # no year 0


def has_sources() -> bool:
    """Step 5's tables exist (any tools/ write, e.g. import-csv-sources, creates them)."""
    return bool(scalar("SELECT count(*) FROM sqlite_master WHERE name = 'v_source_review'"))


def source_links(entity_id: str) -> str:
    """The entity's sources as markdown links ('' if none); proposed ones are marked ⏳."""
    if not has_sources():
        return ""
    rows = q("SELECT title, url, status FROM v_source_review WHERE entity_id = ? AND url IS NOT NULL", entity_id)
    return " · ".join(f"📖 [{r.title}]({r.url}){' ⏳' if r.status == 'proposed' else ''}"
                      for r in rows.itertuples())
