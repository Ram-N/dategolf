"""Build dategolf.db from the frozen files in data/legacy/. Lossless, no semantic changes."""

import csv
import hashlib
import json
import os
import sqlite3
from datetime import datetime, timezone

from common import DB_PATH, LEGACY, LEGACY_CSV, REPORTS, SCHEMA

SCHEMA_VERSION = "1"

# Doc 10 §4.5. Only the first five assert causation.
RELATIONSHIP_TYPES = [
    ("caused", 1), ("contributed_to", 1), ("enabled", 1), ("influenced", 1), ("triggered", 1),
    ("preceded", 0), ("followed", 0), ("part_of", 0), ("contemporary_with", 0),
    ("opposed", 0), ("interacted_with", 0), ("evolved_into", 0),
]

# Fixed CSV columns; everything else between `categories` and `YearNum` is a flag.
CSV_FIXED = ["eventID", "stem", "event", "details", "wikipedia", "mnemonic",
             "itemDifficulty", "categories"]


def load_json(name):
    return json.loads((LEGACY / name).read_text(encoding="utf-8"))


def raw(record):
    return json.dumps(record, ensure_ascii=False)


def build(conn):
    """Populate an empty, schema-initialised connection. Returns a summary dict."""
    events = load_json("events.json")
    durations = load_json("durations.json")
    eras = load_json("eras.json")
    datelinks = load_json("datelinks.json")
    milestones = load_json("milestones.json")
    daily = load_json("daily_challenges.json")
    with open(LEGACY / LEGACY_CSV, encoding="utf-8", newline="") as f:
        csv_rows = list(csv.reader(f))
    header, body = csv_rows[0], csv_rows[1:]

    ins = conn.execute
    ins("INSERT INTO meta VALUES ('schema_version', ?)", (SCHEMA_VERSION,))
    ins("INSERT INTO meta VALUES ('csv_header', ?)", (json.dumps(header),))
    ins("INSERT INTO meta VALUES ('year_convention', 'signed; -1 = 1 BCE, 1 = 1 CE; no year 0')")

    labels = sorted({c for r in events + durations for c in r["categories"]})
    conn.executemany("INSERT INTO categories VALUES (?)", [(c,) for c in labels])
    conn.executemany("INSERT INTO relationship_types VALUES (?, ?)", RELATIONSHIP_TYPES)

    def add_categories(entity_id, facet, cats):
        conn.executemany(
            "INSERT INTO entity_categories VALUES (?, ?, ?, ?)",
            [(entity_id, facet, i, c) for i, c in enumerate(cats)],
        )

    def record(source, key, pos, rec):
        ins("INSERT INTO import_records VALUES (?, ?, ?, ?)", (source, str(key), pos, raw(rec)))

    for pos, e in enumerate(events):
        ins("INSERT INTO entities (id, primary_type, editorial_status, created_at) "
            "VALUES (?, 'event', 'imported', NULL)", (e["id"],))
        ins("INSERT INTO events (entity_id, name, year, region, description, difficulty, "
            "importance, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (e["id"], e["name"], e["year"], e["region"], e["description"], e["difficulty"],
             e["importance"], pos))
        conn.executemany("INSERT INTO event_aliases VALUES (?, ?, ?)",
                         [(e["id"], i, a) for i, a in enumerate(e["aliases"])])
        add_categories(e["id"], "event", e["categories"])
        record("events.json", e["id"], pos, e)

    overlaps = []
    for pos, d in enumerate(durations):
        exists = ins("SELECT 1 FROM entities WHERE id = ?", (d["id"],)).fetchone()
        if exists:
            overlaps.append(d["id"])
            ins("UPDATE entities SET editorial_status = 'needs_review_identity' WHERE id = ?",
                (d["id"],))
        else:
            ins("INSERT INTO entities (id, primary_type, editorial_status, created_at) "
                "VALUES (?, ?, 'imported', NULL)", (d["id"], d["kind"]))
        ins("INSERT INTO time_spans (entity_id, kind, name, start_year, end_year, description, "
            "region, importance, approximate, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (d["id"], d["kind"], d["name"], d["startYear"], d["endYear"], d["description"],
             d["region"], d["importance"], 1 if d.get("approximate") else None, pos))
        add_categories(d["id"], "span", d["categories"])
        record("durations.json", d["id"], pos, d)

    for pos, era in enumerate(eras):
        ins("INSERT INTO entities (id, primary_type, editorial_status, created_at) "
            "VALUES (?, 'era', 'imported', NULL)", (era["id"],))
        ins("INSERT INTO time_spans (entity_id, kind, name, start_year, end_year, position) "
            "VALUES (?, 'era', ?, ?, ?, ?)",
            (era["id"], era["name"], era["start"], era["end"], pos))
        record("eras.json", era["id"], pos, era)

    groups = items = 0
    for pos, (entity_id, content) in enumerate(datelinks.items()):
        for g_order, group in enumerate(content["groups"]):
            group_id = ins("INSERT INTO learning_content_groups (entity_id, label, display_order) "
                           "VALUES (?, ?, ?)", (entity_id, group["label"], g_order)).lastrowid
            conn.executemany(
                "INSERT INTO learning_content_items (group_id, display_order, body, "
                "editorial_status) VALUES (?, ?, ?, 'imported')",
                [(group_id, i, body) for i, body in enumerate(group["items"])])
            groups += 1
            items += len(group["items"])
        record("datelinks.json", entity_id, pos, content)

    for pos, entity_id in enumerate(milestones):
        ins("INSERT INTO milestone_designations (entity_id, display_order) VALUES (?, ?)",
            (entity_id, pos))
        record("milestones.json", entity_id, pos, entity_id)

    for pos, (date_key, years) in enumerate(daily.items()):
        conn.executemany("INSERT INTO daily_challenges VALUES (?, ?, ?)",
                         [(date_key, i, y) for i, y in enumerate(years)])
        record("daily_challenges.json", date_key, pos, years)

    flag_cols = header[len(CSV_FIXED):-1]
    for n, values in enumerate(body, start=1):
        row = dict(zip(header, values))
        ins("INSERT INTO legacy_csv_rows VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (int(row["eventID"]), n, row["stem"], row["event"], row["details"],
             row["wikipedia"], row["mnemonic"], row["itemDifficulty"], row["categories"],
             json.dumps({c: row[c] for c in flag_cols}), int(row["YearNum"])))
        record(LEGACY_CSV, row["eventID"], n - 1, row)

    return {
        "events": len(events),
        "time_spans": len(durations),
        "eras": len(eras),
        "datelinks_keys": len(datelinks),
        "datelinks_groups": groups,
        "datelinks_items": items,
        "milestones": len(milestones),
        "daily_challenge_dates": len(daily),
        "csv_rows": len(body),
        "event_span_overlaps": overlaps,
        "categories": labels,
    }


def manifest():
    files = {}
    for path in sorted(LEGACY.iterdir()):
        if path.name == "MANIFEST.json":
            continue
        data = path.read_bytes()
        files[path.name] = {"sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)}
    return files


def write_report(summary, files, imported_at):
    REPORTS.mkdir(parents=True, exist_ok=True)
    overlaps = summary["event_span_overlaps"]
    lines = [
        "# Migration report — legacy files → dategolf.db",
        "",
        f"Imported at {imported_at} (schema v{SCHEMA_VERSION}).",
        "",
        "## Records imported",
        "",
        "| Source | Count |",
        "|---|---:|",
        f"| events.json | {summary['events']} events |",
        f"| durations.json | {summary['time_spans']} time spans |",
        f"| eras.json | {summary['eras']} eras (time_spans, kind = era) |",
        f"| datelinks.json | {summary['datelinks_keys']} keys / {summary['datelinks_groups']} groups"
        f" / {summary['datelinks_items']} items |",
        f"| milestones.json | {summary['milestones']} designations (set legacy_default) |",
        f"| daily_challenges.json | {summary['daily_challenge_dates']} dates |",
        f"| events_master.csv | {summary['csv_rows']} legacy rows (not reconciled) |",
        "",
        "## Transformations",
        "",
        "- None to content. Text, dates, labels and order are stored verbatim.",
        "- Lists (categories, aliases, groups, items, daily years) are split into rows with an"
        " explicit position, so order is preserved.",
        "- `approximate` is stored as 1 or NULL. It is exported only where it is 1.",
        "- Legacy categories are kept as-is (12 labels). `category_mappings` is empty.",
        "- Every source record's raw JSON is kept in `import_records`.",
        "",
        f"## Needs review: {len(overlaps)} IDs that are both an event and a time span",
        "",
        "Each one is a single entity with an `events` row and a `time_spans` row, with"
        " `editorial_status = needs_review_identity`. Decide whether each is one subject"
        " (keep it) or two (split the IDs).",
        "",
        *[f"- `{i}`" for i in overlaps],
        "",
        "## Unresolved",
        "",
        f"- The {summary['csv_rows']} CSV rows are not linked to events. Reconciling them is a"
        " separate step.",
        "- Regions are legacy free text with no hierarchy.",
        "",
        "## Source files",
        "",
        "| File | Bytes | sha256 |",
        "|---|---:|---|",
        *[f"| {name} | {f['bytes']} | `{f['sha256'][:16]}…` |" for name, f in files.items()],
        "",
    ]
    (REPORTS / "migration.md").write_text("\n".join(lines), encoding="utf-8")


def run(dry_run=False, force=False):
    if DB_PATH.exists() and not (force or dry_run):
        raise SystemExit(
            f"{DB_PATH.relative_to(DB_PATH.parent.parent)} already exists and may contain edits.\n"
            "Re-run with --force to rebuild it from data/legacy/ (edits will be lost).")

    target = ":memory:" if dry_run else str(DB_PATH) + ".tmp"
    if not dry_run and os.path.exists(target):
        os.remove(target)
    conn = sqlite3.connect(target)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(SCHEMA.read_text(encoding="utf-8"))
    summary = build(conn)
    problems = conn.execute("PRAGMA foreign_key_check").fetchall()
    if problems:
        raise SystemExit(f"Foreign key violations after import: {problems[:5]}")
    conn.commit()

    for key in ("events", "time_spans", "eras", "datelinks_keys", "datelinks_groups",
                "datelinks_items", "milestones", "daily_challenge_dates", "csv_rows"):
        print(f"  {key:<22} {summary[key]}")
    print(f"  {'event_span_overlaps':<22} {len(summary['event_span_overlaps'])}")

    if dry_run:
        conn.close()
        print("\nDry run: nothing written.")
        return

    conn.execute("VACUUM")
    conn.close()
    os.replace(target, DB_PATH)

    imported_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    files = manifest()
    counts = {k: v for k, v in summary.items() if isinstance(v, int)}
    (LEGACY / "MANIFEST.json").write_text(
        json.dumps({"imported_at": imported_at, "schema_version": SCHEMA_VERSION,
                    "files": files, "counts": counts}, indent=2) + "\n", encoding="utf-8")
    write_report(summary, files, imported_at)
    print(f"\nWrote data/dategolf.db, data/legacy/MANIFEST.json, data/reports/migration.md")
