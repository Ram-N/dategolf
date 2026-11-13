"""Load a batch of drafted events as `proposed` entities. They are not exported until approved.

Draft file shape (JSON):
  {"origin": "ai_drafted_from_csv",
   "events": [{id, name, year, categories, region, aliases, description, difficulty,
               importance, csv_event_id?, note?, source?, countries?, fills_missing?,
               approximate? (or is_approximate), date_display?, date_precision?, significance?}, ...],
   "spans": [{id, kind, name, start_year, end_year, description, region, importance,
              categories, countries?, approximate?, note?, source?, significance?}, ...],
   "significance": [{id, text, note?}, ...],
   "csv_triage": [{csv_event_id, outcome, related_entity_id?, note?}, ...]}
`source` is a Wikipedia URL. It loads as a proposed source and is approved with its draft.
`countries` lists ISO codes, primary first, with "/actor" for an actor (e.g. ["IN", "AF/actor"]);
they load as proposed tags (approve-countries).
`fills_missing` (an id from missing_entities) marks that item drafted, pointing at this draft.
`significance` ("Why it matters") loads as proposed and is approved with its draft. The top-level
"significance" list adds texts to existing items (or this batch's); those are reviewed on their own.
"""

import json
import sqlite3
from pathlib import Path

import missing
import significance
import sources
from common import connect, ensure_schema, log


def country_rows(entity_id, codes):
    """["IN", "AF/actor"] → entity_countries rows (proposed, high confidence)."""
    rows = []
    for i, code in enumerate(codes):
        c, _, role = code.strip().partition("/")
        rows.append((entity_id, i, c.strip().upper(), "actor" if role.strip() == "actor" else "location"))
    return rows


def load(path):
    batch = json.loads(Path(path).read_text(encoding="utf-8"))
    origin = batch["origin"]
    conn = connect()
    ensure_schema(conn)
    ins = conn.execute
    try:
        for e in batch.get("events", []):
            ins("INSERT INTO entities (id, primary_type, editorial_status) "
                "VALUES (?, 'event', 'proposed')", (e["id"],))
            ins("INSERT INTO events (entity_id, name, year, region, description, difficulty, "
                "importance, is_approximate, date_display, date_precision) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (e["id"], e["name"], e["year"], e["region"], e["description"],
                 e["difficulty"], e["importance"], 1 if (e.get("is_approximate") or e.get("approximate")) else None,
                 e.get("date_display"), e.get("date_precision")))
            conn.executemany("INSERT INTO entity_countries (entity_id, position, country, confidence, status, role) "
                             "VALUES (?, ?, ?, 'high', 'proposed', ?)", country_rows(e["id"], e.get("countries", [])))
            conn.executemany("INSERT INTO event_aliases VALUES (?, ?, ?)",
                             [(e["id"], i, a) for i, a in enumerate(e["aliases"])])
            conn.executemany("INSERT INTO entity_categories VALUES (?, 'event', ?, ?)",
                             [(e["id"], i, c) for i, c in enumerate(e["categories"])])
            ins("INSERT INTO entity_provenance VALUES (?, ?, ?, ?)",
                (e["id"], origin, e.get("csv_event_id"), e.get("note")))
            if e.get("fills_missing"):
                missing.mark_drafted(conn, e["fills_missing"], e["id"])
            if e.get("source"):
                if not e["source"].startswith("https://"):
                    raise sqlite3.IntegrityError(f"{e['id']}: source must be an https URL")
                sources.attach(conn, e["id"], sources.title_from_url(e["source"]), e["source"],
                               "proposed", "ai_drafted")
            if e.get("significance"):
                significance.add(conn, e["id"], e["significance"], origin)

        for t in batch.get("spans", []):
            ins("INSERT INTO entities (id, primary_type, editorial_status) VALUES (?, ?, 'proposed')",
                (t["id"], t["kind"]))
            ins("INSERT INTO time_spans (entity_id, kind, name, start_year, end_year, description, region, "
                "importance, approximate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (t["id"], t["kind"], t["name"], t["start_year"], t["end_year"], t["description"], t["region"],
                 t["importance"], 1 if t.get("approximate") else None))
            conn.executemany("INSERT INTO entity_categories VALUES (?, 'span', ?, ?)",
                             [(t["id"], i, c) for i, c in enumerate(t["categories"])])
            conn.executemany("INSERT INTO entity_countries (entity_id, position, country, confidence, status, role) "
                             "VALUES (?, ?, ?, 'high', 'proposed', ?)", country_rows(t["id"], t.get("countries", [])))
            ins("INSERT INTO entity_provenance VALUES (?, ?, NULL, ?)", (t["id"], origin, t.get("note")))
            if t.get("fills_missing"):
                missing.mark_drafted(conn, t["fills_missing"], t["id"])
            if t.get("source"):
                sources.attach(conn, t["id"], sources.title_from_url(t["source"]), t["source"],
                               "proposed", "ai_drafted")
            if t.get("significance"):
                significance.add(conn, t["id"], t["significance"], origin)
        significance.load_rows(conn, batch.get("significance", []), origin)

        # A re-draft of an already-drafted CSV row keeps its existing triage row.
        drafted = {e["csv_event_id"] for e in batch.get("events", []) if e.get("csv_event_id") is not None}
        conn.executemany("INSERT OR IGNORE INTO legacy_csv_triage VALUES (?, 'drafted', NULL, NULL)",
                         [(i,) for i in sorted(drafted)])
        triage = [(t["csv_event_id"], t["outcome"], t.get("related_entity_id"), t.get("note"))
                  for t in batch.get("csv_triage", [])]
        conn.executemany("INSERT INTO legacy_csv_triage VALUES (?, ?, ?, ?)", triage)
    except sqlite3.Error as exc:
        conn.rollback()
        raise SystemExit(f"Nothing loaded: {exc} (while loading {path})")
    conn.commit()
    conn.close()
    print(f"  Loaded {len(batch.get('events', []))} proposed events, {len(batch.get('spans', []))} proposed spans, "
          f"{len(batch.get('significance', []))} significance texts "
          f"({len(drafted)} source CSV rows, {len(triage)} extra triage rows).")
    if batch.get("events") or batch.get("spans"):
        print("  They are NOT exported until approved: Review → Event drafts / Span drafts, or `manage.py approve <id>`.")
    if batch.get("significance"):
        print("  Significance texts are NOT exported until approved: Review → Significance.")
    return 0


def approve(ids, via="cli"):
    """Publish proposed entities: they are exported from the next export-json on."""
    conn = connect()
    ok = True
    for entity_id in ids:
        cur = conn.execute("UPDATE entities SET editorial_status = 'reviewed', updated_at = datetime('now') "
                           "WHERE id = ? AND editorial_status = 'proposed'", (entity_id,))
        if cur.rowcount:
            conn.execute("UPDATE entity_sources SET status = 'reviewed' WHERE entity_id = ?", (entity_id,))
            conn.execute("UPDATE entity_significance SET status = 'reviewed', updated_at = datetime('now') "
                         "WHERE entity_id = ?", (entity_id,))
            log(conn, "approve-draft", entity_id, via=via)
        ok = ok and bool(cur.rowcount)
        print(f"  {'✓ approved' if cur.rowcount else '✗ not a proposed entity:'} {entity_id}")
    conn.commit()
    conn.close()
    return 0 if ok else 1


def reject(ids, reason, via="cli"):
    """Delete proposed drafts. A draft from a CSV row leaves a note on that row's triage."""
    if not reason or not reason.strip():
        print("  ✗ a reason is required")
        return 1
    conn = connect()
    ok = True
    for entity_id in ids:
        row = conn.execute("SELECT p.csv_event_id FROM entities n LEFT JOIN entity_provenance p "
                           "ON p.entity_id = n.id WHERE n.id = ? AND n.editorial_status = 'proposed'",
                           (entity_id,)).fetchone()
        if row is None:
            print(f"  ✗ not a proposed entity: {entity_id}")
            ok = False
            continue
        csv_id = row[0]
        conn.execute("DELETE FROM entities WHERE id = ?", (entity_id,))  # cascades to its rows
        if csv_id is not None:
            note = f"Draft {entity_id} rejected at review: {reason.strip()}"
            conn.execute("UPDATE legacy_csv_triage SET note = trim(coalesce(note || ' ', '') || ?) "
                         "WHERE csv_event_id = ?", (note, csv_id))
            # No surviving draft from this row? Then it's closed as not recommended.
            if not conn.execute("SELECT 1 FROM entity_provenance WHERE csv_event_id = ?", (csv_id,)).fetchone():
                conn.execute("UPDATE legacy_csv_triage SET outcome = 'not_recommended' "
                             "WHERE csv_event_id = ? AND outcome = 'drafted'", (csv_id,))
        log(conn, "reject-draft", entity_id, reason.strip(), via=via)
        print(f"  ✓ rejected {entity_id}")
    sources.drop_orphans(conn)
    conn.commit()
    conn.close()
    return 0 if ok else 1
