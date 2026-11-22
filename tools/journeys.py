"""Curated journeys (Date Flow Phase 14): a guided tour of chosen stops on the timeline, each with narration.

Rules (Ram, 2026-11-21): a stop points at existing events and spans and has no dates of its own, so a
journey can't disagree with the timeline; any year its text mentions must be one of its items' years.
Questions go on a few stops only. Journeys are interpretive, so they load as proposed and are exported
only once approved, and only when every item they show is published.

Batch file (JSON):
  {"origin": "ai_drafted:<model>",
   "journeys": [{id, title, intro, closing?, question?, note?,
                 stops: [{items: [<event or span id>, ...], title?, narration, question?}, ...]}]}
A stop of several items needs a title; a stop of one item is named by it. A journey that already exists
is refused: remove it first (remove-journey) to replace it.
"""

import json
import re
import sqlite3
from pathlib import Path

from common import connect, ensure_schema, log

MIN_STOPS = 3
SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
# A year in prose: any number with an era ("44 BCE"), or a bare 3–4 digit number that isn't a count
# ("1,000 years", "300 ships") or a decade ("the 1920s").
YEAR = re.compile(r"(?<![\d,.])(?:(\d{1,4})\s*(BCE|BC|CE|AD)\b|(\d{3,4})(?!\d|,\d|s\b|\s*(?:years?|km|miles|million|"
                  r"thousand|people|men|ships|soldiers)\b))")


def years_in(text):
    """The signed years a text mentions: "323 BCE" → -323, "1453" → 1453."""
    out = []
    for m in YEAR.finditer(text or ""):
        if m.group(1):
            n = int(m.group(1))
            out.append(-n if m.group(2) in ("BCE", "BC") else n)
        else:
            out.append(int(m.group(3)))
    return out


def item_years(conn):
    """id → (start, end, the years its text may mention). An event is (year, year); a span's phases count too."""
    out = {}
    for eid, y in conn.execute("SELECT entity_id, year FROM events"):
        out[eid] = (y, y, {y})
    for sid, a, b in conn.execute("SELECT entity_id, start_year, end_year FROM time_spans WHERE kind <> 'era'"):
        out[sid] = (a, b, {a, b})  # a shared id reads as its span
    for sid, a, b in conn.execute("SELECT entity_id, start_year, end_year FROM entity_phases"):
        if sid in out:
            out[sid][2].update((a, b))
    return out


def _named_years(where, texts, allowed):
    bad = sorted({y for t in texts for y in years_in(t)} - allowed)
    if not bad:
        return []
    shown = ", ".join(f"{-y} BCE" if y < 0 else str(y) for y in bad)
    return [f"{where}: mentions {shown}, which isn't a year of its items (leave dates to the timeline)"]


def journey_problems(j, known, existing):
    """What's wrong with one journey (an empty list if nothing). known = item_years(conn)."""
    jid = j.get("id") if isinstance(j, dict) else None
    if not (isinstance(jid, str) and SLUG.match(jid)):
        return [f"journey {jid!r}: needs a lowercase kebab-case id"]
    if jid in existing:
        return [f"{jid}: already exists (remove-journey first to replace it)"]
    problems = []
    for field in ("title", "intro"):
        if not (isinstance(j.get(field), str) and j[field].strip()):
            problems.append(f"{jid}: needs a {field}")
    stops = j.get("stops")
    if not isinstance(stops, list) or len(stops) < MIN_STOPS:
        return problems + [f"{jid}: needs at least {MIN_STOPS} stops"]
    every, ranges = set(), []
    for n, s in enumerate(stops, start=1):
        where = f"{jid} stop {n}"
        items = s.get("items") if isinstance(s, dict) else None
        if not (isinstance(items, list) and items and all(isinstance(i, str) for i in items)):
            problems.append(f"{where}: needs a list of item ids")
            continue
        unknown = [i for i in items if i not in known]
        if unknown:
            problems.append(f"{where}: unknown event or span {', '.join(unknown)}")
            continue
        if len(set(items)) < len(items):
            problems.append(f"{where}: lists an item twice")
        if len(items) > 1 and not (isinstance(s.get("title"), str) and s["title"].strip()):
            problems.append(f"{where}: a stop of several items needs a title")
        if len(items) == 1 and s.get("title"):
            problems.append(f"{where}: a stop of one item is named by it (drop the title)")
        if not (isinstance(s.get("narration"), str) and s["narration"].strip()):
            problems.append(f"{where}: needs a narration")
        allowed = set().union(*(known[i][2] for i in items))
        every |= allowed
        problems += _named_years(where, [s.get("title"), s.get("narration"), s.get("question")], allowed)
        ranges.append((n, min(known[i][0] for i in items), max(known[i][1] for i in items)))
    for (n, a, _), (m, _, d) in zip(ranges, ranges[1:]):
        if d < a:  # contemporaries may overlap; a stop wholly before the last one runs backwards
            problems.append(f"{jid}: stop {m} ends before stop {n} begins (stops run forward in time)")
    problems += _named_years(jid, [j.get("intro"), j.get("closing"), j.get("question")], every)
    return problems


def load(path, via="cli"):
    """Add a batch of journeys as proposed. One bad journey rejects the whole batch."""
    batch = json.loads(Path(path).read_text(encoding="utf-8"))
    journeys = batch.get("journeys")
    if not isinstance(journeys, list) or not journeys or not batch.get("origin"):
        print('  ✗ the file needs an "origin" and a "journeys" list')
        return 1
    conn = connect()
    ensure_schema(conn)
    known = item_years(conn)
    existing = {r[0] for r in conn.execute("SELECT id FROM journeys")}
    problems, ids = [], [j.get("id") for j in journeys if isinstance(j, dict)]
    if len(set(ids)) < len(ids):
        problems.append("a journey id appears twice")
    for j in journeys:
        problems += journey_problems(j, known, existing)
    if problems:
        print("  ✗ Nothing loaded:\n    " + "\n    ".join(problems))
        conn.close()
        return 1
    try:
        position = conn.execute("SELECT coalesce(max(position), -1) + 1 FROM journeys").fetchone()[0]
        for k, j in enumerate(journeys):
            conn.execute("INSERT INTO journeys (id, title, intro, closing, question, position, origin, note) "
                         "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                         (j["id"], j["title"].strip(), j["intro"].strip(), j.get("closing"), j.get("question"),
                          position + k, batch["origin"], j.get("note")))
            for n, s in enumerate(j["stops"]):
                conn.execute("INSERT INTO journey_stops VALUES (?, ?, ?, ?, ?)",
                             (j["id"], n, s.get("title"), s["narration"].strip(), s.get("question")))
                conn.executemany("INSERT INTO journey_stop_items VALUES (?, ?, ?, ?)",
                                 [(j["id"], n, i, eid) for i, eid in enumerate(s["items"])])
            log(conn, "load-journey", j["id"], f"{j['title']!r}: {len(j['stops'])} stops from {batch['origin']}",
                via=via)
    except sqlite3.Error as exc:
        conn.rollback()
        raise SystemExit(f"Nothing loaded: {exc} (while loading {path})")
    conn.commit()
    conn.close()
    print(f"  Loaded {len(journeys)} journey(s) as proposed. Review them on the dashboard (Review → Journeys) "
          "or with approve-journey / reject-journey.")
    return 0


def approve(ids, via="cli"):
    """Mark proposed journeys reviewed, so they export (once every item they show is published)."""
    conn = connect()
    ensure_schema(conn)
    ok = True
    for jid in ids:
        cur = conn.execute("UPDATE journeys SET status = 'reviewed' WHERE id = ? AND status = 'proposed'", (jid,))
        if cur.rowcount:
            log(conn, "approve-journey", jid, "", via=via)
        ok = ok and bool(cur.rowcount)
        print(f"  {'✓ approved' if cur.rowcount else '✗ not a proposed journey:'} {jid}")
    conn.commit()
    conn.close()
    return 0 if ok else 1


def _delete(ids, reason, status, action, via):
    if not reason or not reason.strip():
        print("  ✗ a reason is required")
        return 1
    conn = connect()
    ensure_schema(conn)
    ok = True
    for jid in ids:
        row = conn.execute("SELECT title FROM journeys WHERE id = ?" + (" AND status = ?" if status else ""),
                           (jid, status) if status else (jid,)).fetchone()
        if row is None:
            ok = False
            print(f"  ✗ not a {'proposed ' if status else ''}journey: {jid}")
            continue
        stops = conn.execute("SELECT count(*) FROM journey_stops WHERE journey_id = ?", (jid,)).fetchone()[0]
        conn.execute("DELETE FROM journeys WHERE id = ?", (jid,))
        log(conn, action, jid, f"{row[0]!r} ({stops} stops) — {reason.strip()}", via=via)
        print(f"  ✓ removed journey {jid}")
    conn.commit()
    conn.close()
    return 0 if ok else 1


def reject(ids, reason, via="cli"):
    """Delete proposed journeys, logging them and the reason."""
    return _delete(ids, reason, "proposed", "reject-journey", via)


def remove(ids, reason, via="cli"):
    """Delete journeys, published ones too (to replace them), logging them and the reason."""
    return _delete(ids, reason, None, "remove-journey", via)


def exported(conn):
    """Reviewed journeys whose items are all published, for journeys.json."""
    if not conn.execute("SELECT 1 FROM sqlite_master WHERE name = 'journeys'").fetchone():
        return []
    unpublished = {r[0] for r in conn.execute("SELECT id FROM entities WHERE editorial_status = 'proposed'")}
    out = []
    for j in conn.execute("SELECT * FROM journeys WHERE status = 'reviewed' ORDER BY position, id").fetchall():
        stops = []
        for s in conn.execute("SELECT * FROM journey_stops WHERE journey_id = ? ORDER BY position", (j["id"],)):
            items = [r[0] for r in conn.execute("SELECT entity_id FROM journey_stop_items WHERE journey_id = ? "
                                                "AND position = ? ORDER BY item_position", (j["id"], s["position"]))]
            stop = {"items": items}
            if s["title"]:
                stop["title"] = s["title"]
            stop["narration"] = s["narration"]
            if s["question"]:
                stop["question"] = s["question"]
            stops.append(stop)
        if not stops or any(not s["items"] or unpublished & set(s["items"]) for s in stops):
            continue  # never point the app at an item it doesn't have (validate reports it)
        rec = {"id": j["id"], "title": j["title"], "intro": j["intro"]}
        for field in ("closing", "question"):
            if j[field]:
                rec[field] = j[field]
        rec["stops"] = stops
        out.append(rec)
    return out
