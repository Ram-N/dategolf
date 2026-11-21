"""Life-cycle phases of an empire or period (Date Flow Phase 12), drawn as segments of its bar.

Rules (Ram, 2026-11-21): the phases are contiguous and cover the whole span; each has a neutral kind
(which drives its colour) and a title that says what happened, never a verdict like "golden age" or
"decline"; a phase starts at a milestone event where one exists. Phases are interpretive, so they load
as proposed and are exported only once approved.

Batch file (JSON):
  {"origin": "ai_drafted:<model>",
   "phases": {"<span id>": [{kind, title, start_year, end_year, description, approximate?, date_display?,
                             start_event?, source?, note?}, ...]}}
A span that already has phases is refused: remove them first (remove-phases) to replace them.
"""

import json
import sqlite3
from pathlib import Path

from common import connect, ensure_schema, log

KINDS = ("foundation", "expansion", "consolidation", "height", "transformation", "contraction", "end")
WIKI = "https://en.wikipedia.org/wiki/"


def span_problems(span_id, phases, span, entity_ids):
    """What's wrong with one span's phases (an empty list if nothing). span = (start_year, end_year)."""
    if not isinstance(phases, list) or len(phases) < 2:
        return [f"{span_id}: needs at least 2 phases"]
    problems = []
    for n, p in enumerate(phases, start=1):
        where = f"{span_id} phase {n}"
        if not isinstance(p, dict):
            problems.append(f"{where}: not an object")
            continue
        a, b = p.get("start_year"), p.get("end_year")
        if not all(isinstance(v, int) and v != 0 for v in (a, b)) or a >= b:
            problems.append(f"{where}: start_year and end_year must be whole numbers, never 0, start before end")
        if p.get("kind") not in KINDS:
            problems.append(f"{where}: kind must be one of {', '.join(KINDS)}")
        for field in ("title", "description"):
            if not (isinstance(p.get(field), str) and p[field].strip()):
                problems.append(f"{where}: needs a {field}")
        if p.get("date_display") and not p.get("approximate"):
            problems.append(f"{where}: date_display needs approximate: true (else it isn't shown)")
        if p.get("start_event") and p["start_event"] not in entity_ids:
            problems.append(f"{where}: unknown start_event {p['start_event']!r}")
        if p.get("source") and not str(p["source"]).startswith(WIKI):
            problems.append(f"{where}: source must be a Wikipedia article ({WIKI}...)")
    if problems:
        return problems
    # Contiguous and covering the span: each phase starts where the last one ended
    if phases[0]["start_year"] != span[0] or phases[-1]["end_year"] != span[1]:
        problems.append(f"{span_id}: phases must run from the span's start ({span[0]}) to its end ({span[1]})")
    for prev, nxt in zip(phases, phases[1:]):
        if nxt["start_year"] != prev["end_year"]:
            problems.append(f"{span_id}: {prev['title']!r} ends {prev['end_year']} but {nxt['title']!r} starts "
                            f"{nxt['start_year']} (phases must be contiguous, without gaps or overlaps)")
    return problems


def load(path, via="cli"):
    """Add a batch of life-cycle phases as proposed. One bad span rejects the whole batch."""
    batch = json.loads(Path(path).read_text(encoding="utf-8"))
    spans = batch.get("phases")
    if not isinstance(spans, dict) or not spans or not batch.get("origin"):
        print('  ✗ the file needs an "origin" and a "phases" object: {"<span id>": [...]}')
        return 1
    conn = connect()
    ensure_schema(conn)
    years = {r[0]: (r[1], r[2]) for r in conn.execute(
        "SELECT entity_id, start_year, end_year FROM time_spans WHERE kind <> 'era'")}
    entity_ids = {r[0] for r in conn.execute("SELECT id FROM entities")}
    has = {r[0] for r in conn.execute("SELECT DISTINCT entity_id FROM entity_phases")}
    problems = []
    for span_id, phases in spans.items():
        if span_id not in years:
            problems.append(f"{span_id}: not a span id (eras have no phases)")
        elif span_id in has:
            problems.append(f"{span_id}: already has phases (remove-phases first to replace them)")
        else:
            problems += span_problems(span_id, phases, years[span_id], entity_ids)
    if problems:
        print("  ✗ Nothing loaded:\n    " + "\n    ".join(problems))
        conn.close()
        return 1
    try:
        for span_id, phases in spans.items():
            conn.executemany(
                "INSERT INTO entity_phases (entity_id, position, kind, title, start_year, end_year, approximate, "
                "date_display, description, start_event_id, source, note, origin) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [(span_id, n, p["kind"], p["title"].strip(), p["start_year"], p["end_year"],
                  1 if p.get("approximate") else None, p.get("date_display"), p["description"].strip(),
                  p.get("start_event"), p.get("source"), p.get("note"), batch["origin"])
                 for n, p in enumerate(phases)])
            log(conn, "load-phases", span_id, f"{len(phases)} phases from {batch['origin']}", via=via)
    except sqlite3.Error as exc:
        conn.rollback()
        raise SystemExit(f"Nothing loaded: {exc} (while loading {path})")
    conn.commit()
    conn.close()
    print(f"  Loaded life-cycle phases for {len(spans)} span(s) as proposed. Review them on the dashboard "
          "(Review → Life cycles) or with approve-phases / reject-phases.")
    return 0


def _phases_text(conn, span_id, status=None):
    rows = conn.execute("SELECT kind, title, start_year, end_year FROM entity_phases WHERE entity_id = ? "
                        + ("AND status = ? " if status else "") + "ORDER BY position",
                        (span_id, status) if status else (span_id,)).fetchall()
    return " | ".join(f"{a}–{b} {kind}: {title}" for kind, title, a, b in rows)


def approve(ids, via="cli"):
    """Mark a span's proposed phases reviewed, so they export."""
    conn = connect()
    ensure_schema(conn)
    ok = True
    for span_id in ids:
        cur = conn.execute("UPDATE entity_phases SET status = 'reviewed' WHERE entity_id = ? AND status = 'proposed'",
                           (span_id,))
        if cur.rowcount:
            log(conn, "approve-phases", span_id, f"{cur.rowcount} phase(s)", via=via)
        ok = ok and bool(cur.rowcount)
        print(f"  {'✓ approved' if cur.rowcount else '✗ no proposed phases for'} {span_id}")
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
    for span_id in ids:
        text = _phases_text(conn, span_id, status)
        if not text:
            ok = False
            print(f"  ✗ no {'proposed ' if status else ''}phases for {span_id}")
            continue
        conn.execute("DELETE FROM entity_phases WHERE entity_id = ?", (span_id,))
        log(conn, action, span_id, f"{text} — {reason.strip()}", via=via)
        print(f"  ✓ removed the phases of {span_id}")
    conn.commit()
    conn.close()
    return 0 if ok else 1


def reject(ids, reason, via="cli"):
    """Delete a span's proposed phases, logging them and the reason."""
    return _delete(ids, reason, "proposed", "reject-phases", via)


def remove(ids, reason, via="cli"):
    """Delete all of a span's phases, published ones too (to replace them), logging them and the reason."""
    return _delete(ids, reason, None, "remove-phases", via)


def exported(conn, span_id):
    """A span's reviewed phases for durations.json (an empty list if none, or if any are still proposed)."""
    rows = conn.execute("SELECT * FROM entity_phases WHERE entity_id = ? ORDER BY position", (span_id,)).fetchall()
    if not rows or any(r["status"] != "reviewed" for r in rows):
        return []
    out = []
    for r in rows:
        rec = {"kind": r["kind"], "title": r["title"], "start": r["start_year"], "end": r["end_year"],
               "description": r["description"]}
        if r["approximate"]:
            rec["approximate"] = True
            if r["date_display"]:
                rec["dateDisplay"] = r["date_display"]
        published = r["start_event_id"] and conn.execute(
            "SELECT 1 FROM entities WHERE id = ? AND editorial_status <> 'proposed'", (r["start_event_id"],)).fetchone()
        if published:  # never point the app at an event it doesn't have
            rec["startEvent"] = r["start_event_id"]
        out.append(rec)
    return out
