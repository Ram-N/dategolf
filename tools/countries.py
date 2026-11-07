"""Load drafted country tags (and country definitions) as `proposed`, and approve them.

Tag file lines (see data/drafts/*_country_tags.txt):
  entity_id | CODE, CODE/actor | h|l | optional note   (role defaults to location)
  @country | CODE | Name | Region | optional alternate region
"""

import sqlite3
from pathlib import Path

from common import connect, ensure_schema, log


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


def approve(ids, high, via="cli"):
    conn = connect()
    if high:
        ids = [r[0] for r in conn.execute("SELECT DISTINCT entity_id FROM entity_countries "
                                          "WHERE position = 0 AND confidence = 'high' AND status = 'proposed'")]
    ids = [i for i in ids if conn.execute("SELECT 1 FROM entity_countries WHERE entity_id = ? "
                                          "AND status = 'proposed'", (i,)).fetchone()]
    if not ids:
        print("  Nothing to approve.")
        conn.close()
        return 0
    cur = conn.execute(f"UPDATE entity_countries SET status = 'reviewed' WHERE status = 'proposed' "
                       f"AND entity_id IN ({','.join('?' * len(ids))})", ids)
    for entity_id in ids:
        log(conn, "approve-countries", entity_id, "all high-confidence" if high else None, via=via)
    conn.commit()
    left = conn.execute("SELECT COUNT(DISTINCT entity_id) FROM entity_countries "
                        "WHERE status = 'proposed'").fetchone()[0]
    print(f"  Approved {cur.rowcount} country tags. Entities still proposed: {left}.")
    conn.close()
    return 0


def set_tags(entity_id, spec, note=None, via="cli"):
    """Replace an entity's country tags from a spec like "IN, PK/actor" (human-set, so reviewed)."""
    conn = connect()
    known = {r[0] for r in conn.execute("SELECT code FROM countries")}
    exists = conn.execute("SELECT 1 FROM entities WHERE id = ?", (entity_id,)).fetchone()
    tags = []
    for part in [p.strip() for p in spec.split(",") if p.strip()]:
        code, _, role = part.partition("/")
        code, role = code.strip().upper(), (role.strip().lower() or "location")
        tags.append((code, role))
    problems = []
    if not exists:
        problems.append(f"unknown entity {entity_id}")
    if not tags:
        problems.append("no countries given")
    problems += [f"unknown country code {c}" for c, _ in tags if c not in known]
    problems += [f"role must be location or actor, not {r}" for _, r in tags if r not in ("location", "actor")]
    if len({c for c, _ in tags}) != len(tags):
        problems.append("a country is listed twice")
    if problems:
        print("  ✗ " + "; ".join(problems))
        conn.close()
        return 1
    old = conn.execute("SELECT group_concat(country || CASE role WHEN 'actor' THEN '/actor' ELSE '' END, ', ') "
                       "FROM (SELECT country, role FROM entity_countries WHERE entity_id = ? ORDER BY position)",
                       (entity_id,)).fetchone()[0]
    keep_note = conn.execute("SELECT note FROM entity_countries WHERE entity_id = ? AND position = 0",
                             (entity_id,)).fetchone()
    note = note if note is not None else (keep_note[0] if keep_note else None)
    conn.execute("DELETE FROM entity_countries WHERE entity_id = ?", (entity_id,))
    conn.executemany("INSERT INTO entity_countries (entity_id, position, country, confidence, status, note, role) "
                     "VALUES (?, ?, ?, 'high', 'reviewed', ?, ?)",
                     [(entity_id, i, c, note if i == 0 else None, r) for i, (c, r) in enumerate(tags)])
    new = ", ".join(c + ("/actor" if r == "actor" else "") for c, r in tags)
    log(conn, "set-countries", entity_id, f"{old or '(none)'} -> {new}", via=via)
    conn.commit()
    conn.close()
    print(f"  ✓ {entity_id}: {new}")
    return 0

