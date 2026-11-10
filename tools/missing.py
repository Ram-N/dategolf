"""Missing events and spans: gaps noticed during other work, kept as a list to review and draft later.

Batch file (JSON):
  {"found_while": "link batch 2",
   "items": [{kind, name, year?, end_year?, approximate?, region?, why, related_ids?: [..]}, ...]}
"""

import json
import sqlite3
from pathlib import Path

from common import connect, ensure_schema, log

STATUSES = ("open", "wanted", "drafted", "dismissed")


def load(path):
    """Add a batch of missing items as 'open'. One bad item rejects the whole batch."""
    batch = json.loads(Path(path).read_text(encoding="utf-8"))
    conn = connect()
    ensure_schema(conn)
    known = {r[0] for r in conn.execute("SELECT id FROM entities")}
    names = {r[0].casefold() for r in conn.execute("SELECT name FROM events UNION SELECT name FROM time_spans")}
    listed = {(r[0], r[1].casefold()) for r in conn.execute("SELECT kind, name FROM missing_entities")}
    problems, rows, seen = [], [], set()
    for n, it in enumerate(batch["items"], start=1):
        kind, name, why = it.get("kind"), (it.get("name") or "").strip(), (it.get("why") or "").strip()
        where = f"item {n} ({name or '?'})"
        if kind not in ("event", "span"):
            problems.append(f"{where}: kind must be event or span")
        if not name or not why:
            problems.append(f"{where}: needs a name and a why")
        if name.casefold() in names:
            problems.append(f"{where}: an event or span with this name already exists")
        if (kind, name.casefold()) in listed or (kind, name.casefold()) in seen:
            problems.append(f"{where}: already on the list")
        if 0 in (it.get("year"), it.get("end_year")):
            problems.append(f"{where}: there is no year 0")
        if kind == "span" and it.get("year") and it.get("end_year") and it["year"] > it["end_year"]:
            problems.append(f"{where}: starts after it ends")
        related = it.get("related_ids") or []
        for rid in related:
            if rid not in known:
                problems.append(f"{where}: unknown related id {rid}")
        seen.add((kind, name.casefold()))
        rows.append((kind, name, it.get("year"), it.get("end_year"), 1 if it.get("approximate") else None,
                     it.get("region"), why, it.get("found_while") or batch.get("found_while"), " ".join(related) or None))
    if problems:
        print("  ✗ Nothing added:\n    " + "\n    ".join(problems))
        conn.close()
        return 1
    try:
        conn.executemany("INSERT INTO missing_entities (kind, name, year, end_year, approximate, region, why, "
                         "found_while, related_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", rows)
    except sqlite3.Error as exc:
        conn.rollback()
        raise SystemExit(f"Nothing added: {exc} (while loading {path})")
    conn.commit()
    conn.close()
    print(f"  Added {len(rows)} missing items. Review them on the dashboard (Review → Missing).")
    return 0


def set_status(ids, status, note=None, via="cli"):
    """Mark missing items wanted, dismissed (a reason is required) or open again."""
    if status not in ("open", "wanted", "dismissed"):
        print(f"  ✗ status must be open, wanted or dismissed (drafted is set by load-drafts)")
        return 1
    if status == "dismissed" and not (note or "").strip():
        print("  ✗ a reason is required to dismiss")
        return 1
    conn = connect()
    ensure_schema(conn)
    ok = True
    for item_id in ids:
        row = conn.execute("SELECT name, status FROM missing_entities WHERE id = ?", (item_id,)).fetchone()
        if row is None or row["status"] == "drafted":
            ok = False
            print(f"  ✗ #{item_id}: {'already drafted' if row else 'no such item'}")
            continue
        conn.execute("UPDATE missing_entities SET status = ?, note = coalesce(?, note) WHERE id = ?",
                     (status, (note or "").strip() or None, item_id))
        log(conn, f"missing-{status}", f"missing:{item_id}", row["name"] + (f" — {note.strip()}" if note else ""),
            via=via)
        print(f"  ✓ #{item_id} {row['name']}: {status}")
    conn.commit()
    conn.close()
    return 0 if ok else 1


def mark_drafted(conn, item_id, entity_id):
    """Called by load-drafts for a draft that fills a missing item (the caller commits)."""
    cur = conn.execute("UPDATE missing_entities SET status = 'drafted', entity_id = ? "
                       "WHERE id = ? AND status <> 'drafted'", (entity_id, item_id))
    if not cur.rowcount:
        raise sqlite3.IntegrityError(f"missing item #{item_id} doesn't exist or is already drafted")
