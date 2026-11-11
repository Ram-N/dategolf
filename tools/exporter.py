"""Generate the app's JSON files from dategolf.db, in their exact original formats."""

import csv
import io
import json
from pathlib import Path

from common import APP_FILES, DUMP_PATH, ROOT, connect

NULLS_LAST = "position IS NULL, position"
# Proposed entities (e.g. AI drafts) stay out of the app until a reviewer changes their status.
PUBLISHED = "entity_id NOT IN (SELECT id FROM entities WHERE editorial_status = 'proposed')"


def dumps(data):
    return json.dumps(data, indent=2, ensure_ascii=False) + "\n"


def categories(conn, entity_id, facet):
    return [r["category"] for r in conn.execute(
        "SELECT category FROM entity_categories WHERE entity_id = ? AND facet = ? "
        "ORDER BY position", (entity_id, facet))]


def significance(conn):
    """Reviewed "Why it matters" texts by entity id. Proposed ones stay out of the app."""
    if not conn.execute("SELECT 1 FROM sqlite_master WHERE name = 'entity_significance'").fetchone():
        return {}
    return dict(conn.execute("SELECT entity_id, text FROM entity_significance WHERE status = 'reviewed'"))


def render_events(conn):
    out = []
    why = significance(conn)
    dateflow_only = {r[0] for r in conn.execute("SELECT entity_id FROM dateflow_only_events")}
    for e in conn.execute(f"SELECT * FROM events WHERE {PUBLISHED} "
                          f"ORDER BY year, {NULLS_LAST}, entity_id"):
        aliases = [r["alias"] for r in conn.execute(
            "SELECT alias FROM event_aliases WHERE entity_id = ? ORDER BY position",
            (e["entity_id"],))]
        rec = {
            "id": e["entity_id"],
            "name": e["name"],
            "year": e["year"],
            "categories": categories(conn, e["entity_id"], "event"),
            "region": e["region"],
            "aliases": aliases,
            "description": e["description"],
            "difficulty": e["difficulty"],
            "importance": e["importance"],
        }
        if e["entity_id"] in why:
            rec["significance"] = why[e["entity_id"]]
        if e["entity_id"] in dateflow_only:
            rec["dateflowOnly"] = True
        if e["is_approximate"]:
            rec["approximate"] = True
            if e["date_display"]:
                rec["dateDisplay"] = e["date_display"]  # the true range, shown with the "c." year
        out.append(rec)
    return dumps(out)


def render_durations(conn):
    out = []
    why = significance(conn)
    for s in conn.execute(f"SELECT * FROM time_spans WHERE kind <> 'era' AND {PUBLISHED} "
                          f"ORDER BY start_year, {NULLS_LAST}, entity_id"):
        rec = {
            "id": s["entity_id"],
            "name": s["name"],
            "startYear": s["start_year"],
            "endYear": s["end_year"],
            "description": s["description"],
            "categories": categories(conn, s["entity_id"], "span"),
            "region": s["region"],
            "importance": s["importance"],
            "kind": s["kind"],
        }
        if s["entity_id"] in why:
            rec["significance"] = why[s["entity_id"]]
        if s["approximate"]:
            rec["approximate"] = True
        out.append(rec)
    return dumps(out)


def render_eras(conn):
    # One object per line with padded braces, matching the hand-written original.
    lines = []
    for s in conn.execute(f"SELECT * FROM time_spans WHERE kind = 'era' "
                          f"ORDER BY start_year, {NULLS_LAST}, entity_id"):
        rec = {"id": s["entity_id"], "name": s["name"], "start": s["start_year"],
               "end": s["end_year"]}
        lines.append("  { " + json.dumps(rec, ensure_ascii=False)[1:-1] + " }")
    return "[\n" + ",\n".join(lines) + "\n]\n"


def render_datelinks(conn):
    out = {}
    entities = conn.execute("SELECT entity_id FROM learning_content_groups "
                            "GROUP BY entity_id ORDER BY MIN(id)")
    for (entity_id,) in entities.fetchall():
        groups = []
        for g in conn.execute("SELECT id, label FROM learning_content_groups "
                              "WHERE entity_id = ? ORDER BY display_order", (entity_id,)):
            items = [r["body"] for r in conn.execute(
                "SELECT body FROM learning_content_items WHERE group_id = ? "
                "ORDER BY display_order", (g["id"],))]
            groups.append({"label": g["label"], "items": items})
        out[entity_id] = {"groups": groups}
    return dumps(out)


def render_milestones(conn):
    return dumps([r["entity_id"] for r in conn.execute(
        "SELECT entity_id FROM milestone_designations "
        "WHERE milestone_set = 'legacy_default' AND active = 1 ORDER BY display_order")])


def render_daily(conn):
    out = {}
    for r in conn.execute("SELECT * FROM daily_challenges ORDER BY date_key, position"):
        out.setdefault(r["date_key"], []).append(r["year"])
    return dumps(out)


LANE_ORDER = ["south-asia", "east-asia", "europe", "middle-east", "africa", "americas", "global"]


def render_regions(conn):
    """{region label: DateFlow lane id}, grouped by lane in lanes.ts order."""
    rows = conn.execute("SELECT label, lane FROM regions").fetchall()
    rows.sort(key=lambda r: (LANE_ORDER.index(r["lane"]), r["label"]))
    return dumps({r["label"]: r["lane"] for r in rows})


def render_csv(conn):
    """Rebuild events_master.csv. Used only to prove the legacy rows are lossless."""
    header = json.loads(conn.execute(
        "SELECT value FROM meta WHERE key = 'csv_header'").fetchone()[0])
    buf = io.StringIO()
    writer = csv.writer(buf, lineterminator="\r\n")
    writer.writerow(header)
    for r in conn.execute("SELECT * FROM legacy_csv_rows ORDER BY row_number"):
        flags = json.loads(r["flags_json"])
        writer.writerow([str(r["event_id"]), r["stem"], r["event"], r["details"],
                         r["wikipedia"], r["mnemonic"], r["item_difficulty"],
                         r["categories_raw"], *flags.values(), str(r["year_num"])])
    return buf.getvalue()


# How a link reads from its source; the inverse (from the target) is relationship_types.inverse_label.
FORWARD_LABELS = {"part_of": "is part of", "contributed_to": "contributed to", "evolved_into": "evolved into",
                  "contemporary_with": "was contemporary with", "interacted_with": "interacted with"}


# How DateFlow's stories use each type (Phase 9): a sequence is never presented as a cause.
SEQUENCE_TYPES = {"preceded"}
FRAME_TYPES = {"began", "ended"}  # open or close a span; causal in the db, but shown as framing


def story_role(rtype, is_causal):
    if rtype in SEQUENCE_TYPES:
        return "sequence"
    if rtype in FRAME_TYPES:
        return "frame"
    return "cause" if is_causal else "context"


def render_relationships(conn):
    """Reviewed links between published entities, for DateFlow's Connections (doc 09, Phase 8)."""
    published = f"NOT IN (SELECT id FROM entities WHERE editorial_status = 'proposed')"
    links = conn.execute(f"""
        SELECT source_entity_id, relationship_type, target_entity_id, description, confidence FROM relationships
        WHERE editorial_status = 'reviewed' AND source_entity_id {published} AND target_entity_id {published}
        ORDER BY id""").fetchall()
    used = sorted({r[1] for r in links})
    types = {}
    for t in conn.execute(f"SELECT type, inverse_label, is_causal FROM relationship_types "
                          f"WHERE type IN ({','.join('?' * len(used))}) ORDER BY type", used):
        types[t["type"]] = {"label": FORWARD_LABELS.get(t["type"], t["type"].replace("_", " ")),
                            "inverse": t["inverse_label"], "causal": bool(t["is_causal"]),
                            "story": story_role(t["type"], t["is_causal"])}
    out = []
    for s, t, g, w, c in links:
        link = {"source": s, "type": t, "target": g, "why": w or ""}
        if c:
            link["confidence"] = c  # medium/low links are shown as debated
        out.append(link)
    return dumps({"types": types, "links": out})


RENDERERS = {
    "events.json": render_events,
    "durations.json": render_durations,
    "datelinks.json": render_datelinks,
    "milestones.json": render_milestones,
    "eras.json": render_eras,
    "daily_challenges.json": render_daily,
    "regions.json": render_regions,
    "relationships.json": render_relationships,
}


def render_all(conn):
    return {name: fn(conn) for name, fn in RENDERERS.items()}


def write_dump(conn, path=DUMP_PATH):
    Path(path).write_text("\n".join(conn.iterdump()) + "\n", encoding="utf-8")


def run(root=ROOT):
    conn = connect()
    for name, text in render_all(conn).items():
        dest = Path(root) / APP_FILES[name]
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(text, encoding="utf-8", newline="")
        print(f"  wrote {APP_FILES[name]}")
    write_dump(conn)
    print("  wrote data/dategolf.sql")
    conn.close()
