"""Significance: the "Why it matters" text for an event or span (doc 17).

It is interpretive prose that students read, so every text loads as proposed and is exported only
once reviewed. One row per entity (eras have none); set_text replaces a text and makes it proposed again.

Batch shape (JSON), alone or inside a load-drafts batch:
  {"origin": "ai_drafted:<model>",
   "significance": [{"id": <existing or same-batch id>, "text": ..., "note"?: ...}, ...]}
A new event or span in a draft batch may instead carry its own "significance" field (tools/drafts.py).
"""

import json
import re
import sqlite3
from pathlib import Path

from common import connect, ensure_schema, log
from reconcile import tokens

MARKUP = re.compile(r"<[a-z]|\*\*|\[.+\]\(")
# Wording that makes one item the whole cause: doc 17 asks for contributing factors, not sole causes.
SOLE_CAUSE = re.compile(r"\b(single-handedly|solely responsible|the sole cause|the only cause|"
                        r"alone (?:caused|brought|led))\b", re.I)


def text_problems(text, description=None):
    """(errors, warnings) for one significance text, optionally compared with its description."""
    errors, warnings = [], []
    t = (text or "").strip()
    if not t:
        return ["significance is empty"], warnings
    if MARKUP.search(t):
        errors.append("significance must be plain text (no HTML or Markdown)")
    words = len(t.split())
    if not 15 <= words <= 70:
        warnings.append(f"significance is {words} words (aim for 20 to 60)")
    m = SOLE_CAUSE.search(t)
    if m:
        warnings.append(f"significance may present one cause as the whole story ({m.group(0)!r})")
    if description:
        mine = tokens(t)
        if mine and len(mine & tokens(description)) / len(mine) > 0.7:
            warnings.append("significance mostly repeats the description: say why it matters, not what happened")
    return errors, warnings


def eligible_ids(conn):
    """Ids that can carry a significance: events, periods and empires (not eras)."""
    return {r[0] for r in conn.execute(
        "SELECT entity_id FROM events UNION SELECT entity_id FROM time_spans WHERE kind <> 'era'")}


def add(conn, entity_id, text, origin, note=None):
    """Insert one proposed text (the caller commits). Fails if the entity already has one."""
    errors, _ = text_problems(text)
    if errors:
        raise sqlite3.IntegrityError(f"{entity_id}: {'; '.join(errors)}")
    conn.execute("INSERT INTO entity_significance (entity_id, text, status, origin, note) "
                 "VALUES (?, ?, 'proposed', ?, ?)", (entity_id, text.strip(), origin, note))


def load_rows(conn, rows, origin):
    """Add a batch's "significance" rows; raise on the first bad one (the caller rolls back)."""
    known = eligible_ids(conn)
    for n, s in enumerate(rows, start=1):
        entity_id = s.get("id", "")
        if entity_id not in known:
            raise sqlite3.IntegrityError(f"significance {n}: {entity_id!r} is not an event or span")
        if conn.execute("SELECT 1 FROM entity_significance WHERE entity_id = ?", (entity_id,)).fetchone():
            raise sqlite3.IntegrityError(f"significance {n}: {entity_id} already has one "
                                         "(replace it with set-significance)")
        add(conn, entity_id, s.get("text") or "", origin, s.get("note"))


def load(path):
    """Load a batch's "significance" rows as proposed. One bad row rejects the whole batch."""
    batch = json.loads(Path(path).read_text(encoding="utf-8"))
    conn = connect()
    ensure_schema(conn)
    try:
        load_rows(conn, batch.get("significance", []), batch["origin"])
    except sqlite3.Error as exc:
        conn.rollback()
        raise SystemExit(f"Nothing loaded: {exc} (while loading {path})")
    conn.commit()
    conn.close()
    print(f"  Loaded {len(batch.get('significance', []))} significance texts as proposed. Review them on the "
          "dashboard (Review → Significance) or with approve-significance / reject-significance.")
    return 0


def set_text(entity_id, text, origin="ram", note=None, via="cli"):
    """Write or replace an entity's significance. It becomes proposed until reviewed again."""
    errors, warnings = text_problems(text)
    for w in warnings:
        print(f"  ! {w}")
    if errors:
        print("  ✗ " + "; ".join(errors))
        return 1
    conn = connect()
    ensure_schema(conn)
    if entity_id not in eligible_ids(conn):
        print(f"  ✗ not an event or span: {entity_id}")
        conn.close()
        return 1
    old = conn.execute("SELECT text FROM entity_significance WHERE entity_id = ?", (entity_id,)).fetchone()
    conn.execute("INSERT INTO entity_significance (entity_id, text, status, origin, note) "
                 "VALUES (?, ?, 'proposed', ?, ?) ON CONFLICT (entity_id) DO UPDATE SET "
                 "text = excluded.text, status = 'proposed', origin = excluded.origin, "
                 "note = excluded.note, updated_at = datetime('now')",
                 (entity_id, text.strip(), origin, note))
    log(conn, "set-significance", entity_id, f"was: {old[0]}" if old else "new", via=via)
    conn.commit()
    conn.close()
    print(f"  ✓ {'replaced' if old else 'added'} the significance of {entity_id} (proposed: approve it to export)")
    return 0


def approve(ids, via="cli"):
    """Mark proposed significance texts reviewed, so they export."""
    conn = connect()
    ensure_schema(conn)
    ok = True
    for entity_id in ids:
        cur = conn.execute("UPDATE entity_significance SET status = 'reviewed', updated_at = datetime('now') "
                           "WHERE entity_id = ? AND status = 'proposed'", (entity_id,))
        if cur.rowcount:
            log(conn, "approve-significance", entity_id, via=via)
        ok = ok and bool(cur.rowcount)
        print(f"  {'✓ approved' if cur.rowcount else '✗ no proposed significance for'} {entity_id}")
    conn.commit()
    conn.close()
    return 0 if ok else 1


def reject(ids, reason, via="cli"):
    """Delete proposed significance texts (reviewed ones stay), logging the text and the reason."""
    if not reason or not reason.strip():
        print("  ✗ a reason is required")
        return 1
    conn = connect()
    ensure_schema(conn)
    ok = True
    for entity_id in ids:
        row = conn.execute("SELECT text FROM entity_significance WHERE entity_id = ? AND status = 'proposed'",
                           (entity_id,)).fetchone()
        if row is None:
            ok = False
            print(f"  ✗ no proposed significance for {entity_id}")
            continue
        conn.execute("DELETE FROM entity_significance WHERE entity_id = ?", (entity_id,))
        log(conn, "reject-significance", entity_id, f"{row[0]} — {reason.strip()}", via=via)
        print(f"  ✓ rejected the significance of {entity_id}")
    conn.commit()
    conn.close()
    return 0 if ok else 1
