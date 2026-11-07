"""Load drafted country tags (and country definitions) as `proposed`, and approve them.

Tag file lines (see data/drafts/*_country_tags.txt):
  entity_id | CODE, CODE/actor | h|l | optional note   (role defaults to location)
  @country | CODE | Name | Region | optional alternate region
"""

import sqlite3
from pathlib import Path

from common import connect, ensure_schema


def parse(path):
    countries, tags = [], []
    for raw in Path(path).read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = [p.strip() for p in line.split("|")]
        if parts[0] == "@country":
            countries.append((parts[1], parts[2], parts[3], parts[4] if len(parts) > 4 else None))
            continue
        codes = [c.strip() for c in parts[1].split(",")]
        confidence = {"h": "high", "l": "low"}[parts[2]]
        tags.append((parts[0], codes, confidence, parts[3] if len(parts) > 3 else None))
    return countries, tags


def load(path):
    countries, tags = parse(path)
    conn = connect()
    ensure_schema(conn)
    try:
        conn.executemany("INSERT INTO countries (code, name, region, alt_region) VALUES (?, ?, ?, ?) "
                         "ON CONFLICT(code) DO UPDATE SET name = excluded.name, region = excluded.region, "
                         "alt_region = excluded.alt_region", countries)  # keeps iso3
        for entity_id, codes, confidence, note in tags:
            if conn.execute("SELECT 1 FROM entity_countries WHERE entity_id = ? AND status = 'reviewed'",
                            (entity_id,)).fetchone():
                continue  # never overwrite reviewed tags
            conn.execute("DELETE FROM entity_countries WHERE entity_id = ?", (entity_id,))
            conn.executemany(
                "INSERT INTO entity_countries (entity_id, position, country, confidence, note, role) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                [(entity_id, i, code.split("/")[0], confidence, note if i == 0 else None,
                  code.split("/")[1] if "/" in code else "location")
                 for i, code in enumerate(codes)])
    except sqlite3.Error as exc:
        conn.rollback()
        raise SystemExit(f"Nothing loaded: {exc} (while loading {path})")
    conn.commit()
    low = sum(1 for t in tags if t[2] == "low")
    print(f"  Loaded {len(countries)} countries and tags for {len(tags)} entities "
          f"({len(tags) - low} high, {low} low confidence), all as proposed.")
    print("  Review in v_country_review, then: manage.py approve-countries --high  (or <id>...)")
    conn.close()
    return 0


def approve(ids, high):
    conn = connect()
    if high:
        cur = conn.execute("UPDATE entity_countries SET status = 'reviewed' WHERE status = 'proposed' "
                           "AND entity_id IN (SELECT entity_id FROM entity_countries "
                           "WHERE position = 0 AND confidence = 'high')")
    else:
        cur = conn.execute(f"UPDATE entity_countries SET status = 'reviewed' WHERE status = 'proposed' "
                           f"AND entity_id IN ({','.join('?' * len(ids))})", ids)
    conn.commit()
    left = conn.execute("SELECT COUNT(DISTINCT entity_id) FROM entity_countries "
                        "WHERE status = 'proposed'").fetchone()[0]
    print(f"  Approved {cur.rowcount} country tags. Entities still proposed: {left}.")
    conn.close()
    return 0
