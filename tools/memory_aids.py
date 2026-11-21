"""DateLinks memory aids (docs/06): short anchors shown on DatePick's reveal screen, exported to
src/data/datelinks.json.

A wrong anchor teaches a wrong date, so new aids load as proposed and are exported only once
approved (like significance texts). The aids that came with the legacy import are 'imported'.

Batch file (JSON), the same shape as datelinks.json:
  {"origin": "ai_drafted:<model>",
   "aids": {"<event id>": {"groups": [{"label": "Look Back", "items": ["...", ...]}, ...]}}}
Labels, in this order: "Look Back", "Year of <the event's year>" (e.g. "Year of 587 BCE"),
"Look Ahead", "Event Timeline". 1 to 4 groups, 1 to 4 items each. An event that already has aids
is refused: remove them first (remove-memory-aids) to replace them.
"""

import json
import sqlite3
from pathlib import Path

from common import connect, ensure_schema, log

ORDER = ("Look Back", "Year of", "Look Ahead", "Event Timeline")


def year_label(year):
    """The 'Year of' label for an event's year, written as the existing aids write it."""
    return f"Year of {-year} BCE" if year < 0 else f"Year of {year}"


def entry_problems(entity_id, entry, year):
    """What's wrong with one event's aids (an empty list if nothing)."""
    groups = entry.get("groups") if isinstance(entry, dict) else None
    if not isinstance(groups, list) or not 1 <= len(groups) <= 4:
        return [f"{entity_id}: needs 1 to 4 groups"]
    problems, kinds = [], []
    for g in groups:
        label = (g.get("label") or "").strip() if isinstance(g, dict) else ""
        items = g.get("items") if isinstance(g, dict) else None
        kind = "Year of" if label.startswith("Year of ") else label
        if kind not in ORDER:
            problems.append(f"{entity_id}: unknown label {label!r} (allowed: Look Back, {year_label(year)}, "
                            "Look Ahead, Event Timeline)")
        elif kind == "Year of" and label != year_label(year):
            problems.append(f"{entity_id}: label {label!r} should be {year_label(year)!r}, the event's year")
        kinds.append(kind)
        if not isinstance(items, list) or not 1 <= len(items) <= 4 \
                or not all(isinstance(i, str) and i.strip() for i in items):
            problems.append(f"{entity_id}: group {label!r} needs 1 to 4 non-empty items")
    known = [k for k in kinds if k in ORDER]
    if len(set(known)) != len(known):
        problems.append(f"{entity_id}: a label is used twice")
    elif known != sorted(known, key=ORDER.index):
        problems.append(f"{entity_id}: groups must run Look Back → Year of → Look Ahead → Event Timeline")
    return problems


def load(path, via="cli"):
    """Add a batch of memory aids as proposed. One bad entry rejects the whole batch."""
    batch = json.loads(Path(path).read_text(encoding="utf-8"))
    aids = batch.get("aids")
    if not isinstance(aids, dict) or not aids:
        print('  ✗ the file needs an "aids" object: {"<event id>": {"groups": [...]}}')
        return 1
    conn = connect()
    ensure_schema(conn)
    years = dict(conn.execute("SELECT entity_id, year FROM events").fetchall())
    has = {r[0] for r in conn.execute("SELECT DISTINCT entity_id FROM learning_content_groups")}
    problems = []
    for entity_id, entry in aids.items():
        if entity_id not in years:
            problems.append(f"{entity_id}: not an event id (memory aids are for DatePick events)")
        elif entity_id in has:
            problems.append(f"{entity_id}: already has memory aids (remove-memory-aids first to replace them)")
        else:
            problems += entry_problems(entity_id, entry, years[entity_id])
    if problems:
        print("  ✗ Nothing loaded:\n    " + "\n    ".join(problems))
        conn.close()
        return 1
    try:
        for entity_id, entry in aids.items():
            for position, g in enumerate(entry["groups"]):
                group_id = conn.execute("INSERT INTO learning_content_groups (entity_id, label, display_order) "
                                        "VALUES (?, ?, ?)", (entity_id, g["label"].strip(), position)).lastrowid
                conn.executemany("INSERT INTO learning_content_items (group_id, display_order, body, editorial_status) "
                                 "VALUES (?, ?, ?, 'proposed')",
                                 [(group_id, n, body.strip()) for n, body in enumerate(g["items"])])
            log(conn, "load-memory-aids", entity_id,
                f"{len(entry['groups'])} group(s) from {batch.get('origin') or 'an unnamed batch'}", via=via)
    except sqlite3.Error as exc:
        conn.rollback()
        raise SystemExit(f"Nothing loaded: {exc} (while loading {path})")
    conn.commit()
    conn.close()
    print(f"  Loaded memory aids for {len(aids)} event(s) as proposed. Review them on the dashboard "
          "(Review → Memory aids) or with approve-memory-aids / reject-memory-aids.")
    return 0


def _aids_text(conn, entity_id, status=None):
    """An event's aids as one line per group, for the log (optionally only items with this status)."""
    rows = conn.execute("SELECT g.label, i.body FROM learning_content_groups g "
                        "JOIN learning_content_items i ON i.group_id = g.id WHERE g.entity_id = ? "
                        + ("AND i.editorial_status = ? " if status else "")
                        + "ORDER BY g.display_order, i.display_order",
                        (entity_id, status) if status else (entity_id,)).fetchall()
    return " | ".join(f"{label}: {body}" for label, body in rows)


def approve(ids, via="cli"):
    """Mark an event's proposed aids reviewed, so they export."""
    conn = connect()
    ensure_schema(conn)
    ok = True
    for entity_id in ids:
        cur = conn.execute("UPDATE learning_content_items SET editorial_status = 'reviewed' "
                           "WHERE editorial_status = 'proposed' AND group_id IN "
                           "(SELECT id FROM learning_content_groups WHERE entity_id = ?)", (entity_id,))
        if cur.rowcount:
            log(conn, "approve-memory-aids", entity_id, f"{cur.rowcount} item(s)", via=via)
        ok = ok and bool(cur.rowcount)
        print(f"  {'✓ approved' if cur.rowcount else '✗ no proposed memory aids for'} {entity_id}")
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
    for entity_id in ids:
        text = _aids_text(conn, entity_id, status)
        if not text:
            ok = False
            print(f"  ✗ no {'proposed ' if status else ''}memory aids for {entity_id}")
            continue
        conn.execute("DELETE FROM learning_content_groups WHERE entity_id = ?", (entity_id,))
        log(conn, action, entity_id, f"{text} — {reason.strip()}", via=via)
        print(f"  ✓ removed the memory aids of {entity_id}")
    conn.commit()
    conn.close()
    return 0 if ok else 1


def reject(ids, reason, via="cli"):
    """Delete an event's proposed aids, logging their text and the reason."""
    return _delete(ids, reason, "proposed", "reject-memory-aids", via)


def remove(ids, reason, via="cli"):
    """Delete all of an event's aids, published ones too (to replace them), logging their text and the reason."""
    return _delete(ids, reason, None, "remove-memory-aids", via)
