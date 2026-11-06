"""Load a batch of drafted events as `proposed` entities. They are not exported until approved.

Draft file shape (JSON):
  {"origin": "ai_drafted_from_csv",
   "events": [{id, name, year, categories, region, aliases, description, difficulty,
               importance, csv_event_id?, note?,
               is_approximate?, date_display?, date_precision?}, ...],
   "csv_triage": [{csv_event_id, outcome, related_entity_id?, note?}, ...]}
"""

import json
import sqlite3
from pathlib import Path

from common import connect, ensure_schema


def load(path):
    batch = json.loads(Path(path).read_text(encoding="utf-8"))
    origin = batch["origin"]
    conn = connect()
    ensure_schema(conn)
    ins = conn.execute
    try:
        for e in batch["events"]:
            ins("INSERT INTO entities (id, primary_type, editorial_status) "
                "VALUES (?, 'event', 'proposed')", (e["id"],))
            ins("INSERT INTO events (entity_id, name, year, region, description, difficulty, "
                "importance, is_approximate, date_display, date_precision) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (e["id"], e["name"], e["year"], e["region"], e["description"],
                 e["difficulty"], e["importance"], 1 if e.get("is_approximate") else None,
                 e.get("date_display"), e.get("date_precision")))
            conn.executemany("INSERT INTO event_aliases VALUES (?, ?, ?)",
                             [(e["id"], i, a) for i, a in enumerate(e["aliases"])])
            conn.executemany("INSERT INTO entity_categories VALUES (?, 'event', ?, ?)",
                             [(e["id"], i, c) for i, c in enumerate(e["categories"])])
            ins("INSERT INTO entity_provenance VALUES (?, ?, ?, ?)",
                (e["id"], origin, e.get("csv_event_id"), e.get("note")))

        # A re-draft of an already-drafted CSV row keeps its existing triage row.
        drafted = {e["csv_event_id"] for e in batch["events"] if e.get("csv_event_id") is not None}
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
    print(f"  Loaded {len(batch['events'])} proposed events "
          f"({len(drafted)} source CSV rows, {len(triage)} extra triage rows).")
    print("  They are NOT exported. To publish one, set entities.editorial_status = 'reviewed'.")
    return 0
