"""Integrity checks over dategolf.db. Reports problems; never fixes them."""

import json

from common import LEGACY, REPORTS, connect, ensure_schema

# (severity, check, SQL returning offending rows as (key, detail))
CHECKS = [
    ("error", "Year 0 in an event",
     "SELECT entity_id, year FROM events WHERE year = 0"),
    ("error", "Year 0 in a time span",
     "SELECT entity_id, start_year || '..' || end_year FROM time_spans "
     "WHERE start_year = 0 OR end_year = 0"),
    ("error", "Time span starts after it ends",
     "SELECT entity_id, start_year || '..' || end_year FROM time_spans "
     "WHERE start_year > end_year"),
    ("error", "Entity with no event or time-span facet",
     "SELECT id, primary_type FROM entities WHERE id NOT IN (SELECT entity_id FROM events) "
     "AND id NOT IN (SELECT entity_id FROM time_spans)"),
    ("error", "Event with no categories",
     "SELECT entity_id, name FROM events WHERE entity_id NOT IN "
     "(SELECT entity_id FROM entity_categories WHERE facet = 'event')"),
    ("error", "Period/empire with no categories",
     "SELECT entity_id, name FROM time_spans WHERE kind <> 'era' AND entity_id NOT IN "
     "(SELECT entity_id FROM entity_categories WHERE facet = 'span')"),
    ("error", "Category row for a facet the entity doesn't have",
     "SELECT entity_id, facet || ':' || category FROM entity_categories c WHERE "
     "(facet = 'event' AND entity_id NOT IN (SELECT entity_id FROM events)) OR "
     "(facet = 'span' AND entity_id NOT IN (SELECT entity_id FROM time_spans))"),
    ("error", "Milestone that is not an event",
     "SELECT entity_id, milestone_set FROM milestone_designations "
     "WHERE entity_id NOT IN (SELECT entity_id FROM events)"),
    ("error", "DateLinks content for an entity that is not an event",
     "SELECT DISTINCT entity_id, label FROM learning_content_groups "
     "WHERE entity_id NOT IN (SELECT entity_id FROM events)"),
    ("error", "DateLinks group with no items",
     "SELECT entity_id, label FROM learning_content_groups "
     "WHERE id NOT IN (SELECT group_id FROM learning_content_items)"),
    ("error", "Daily challenge date without exactly 5 years",
     "SELECT date_key, COUNT(*) FROM daily_challenges GROUP BY date_key HAVING COUNT(*) <> 5"),
    ("error", "Empty event name or description",
     "SELECT entity_id, name FROM events WHERE trim(name) = '' OR trim(description) = ''"),
    ("error", "Milestone or DateLinks content on a proposed (unexported) entity",
     "SELECT entity_id, 'milestone' FROM milestone_designations WHERE entity_id IN "
     "(SELECT id FROM entities WHERE editorial_status = 'proposed') UNION "
     "SELECT entity_id, 'datelinks' FROM learning_content_groups WHERE entity_id IN "
     "(SELECT id FROM entities WHERE editorial_status = 'proposed')"),
    ("warning", "Event name contains a 4-digit year (gives the answer away)",
     "SELECT entity_id, name FROM events WHERE name GLOB '*[0-9][0-9][0-9][0-9]*'"),
    ("warning", "Alias contains a 4-digit year (search would reveal the answer)",
     "SELECT entity_id, alias FROM event_aliases WHERE alias GLOB '*[0-9][0-9][0-9][0-9]*'"),
    ("warning", "Time spans with the same normalised name",
     "SELECT group_concat(entity_id, ', '), lower(trim(name)) FROM time_spans "
     "GROUP BY lower(trim(name)) HAVING COUNT(*) > 1"),
    ("warning", "Event names that differ only in case or spacing",
     "SELECT group_concat(entity_id, ', '), lower(trim(name)) FROM events "
     "GROUP BY lower(trim(name)) HAVING COUNT(*) > 1"),
    ("warning", "Event with no aliases (search falls back to name only)",
     "SELECT entity_id, name FROM events WHERE entity_id NOT IN "
     "(SELECT entity_id FROM event_aliases)"),
    ("warning", "Imported entity with no import record (provenance lost)",
     "SELECT id, primary_type FROM entities WHERE created_at IS NULL AND id NOT IN "
     "(SELECT source_key FROM import_records)"),
    ("review", "Event + time span share one ID (identity decision needed)",
     "SELECT id, primary_type FROM entities WHERE editorial_status = 'needs_review_identity'"),
    ("review", "Legacy CSV rows with no accepted match and no triage outcome",
     "SELECT 'events_master.csv', COUNT(*) || ' rows (manage.py reconcile-events proposes)' "
     "FROM legacy_csv_rows WHERE event_id NOT IN (SELECT csv_event_id FROM "
     "legacy_csv_crosswalk WHERE decision = 'accepted') "
     "AND event_id NOT IN (SELECT csv_event_id FROM legacy_csv_triage) HAVING COUNT(*) > 0"),
    ("review", "Proposed events awaiting approval (not exported; manage.py approve <id>)",
     "SELECT e.id, ev.year || ' · ' || ev.name || coalesce(' — ' || p.note, '') "
     "FROM entities e JOIN events ev ON ev.entity_id = e.id "
     "LEFT JOIN entity_provenance p ON p.entity_id = e.id "
     "WHERE e.editorial_status = 'proposed' ORDER BY p.note IS NULL, ev.year"),
    ("review", "CSV rows triaged as duplicate / not recommended (incl. date conflicts)",
     "SELECT 'csv ' || csv_event_id, outcome || coalesce(' → ' || related_entity_id, '') "
     "|| coalesce(' — ' || note, '') FROM legacy_csv_triage "
     "WHERE outcome <> 'drafted' ORDER BY note NOT LIKE 'DATE CONFLICT%', csv_event_id"),
    ("review", "Legacy region labels (no reviewed hierarchy yet)",
     "SELECT region, COUNT(*) || ' records' FROM (SELECT region FROM events UNION ALL "
     "SELECT region FROM time_spans WHERE region IS NOT NULL) GROUP BY region ORDER BY 2 DESC"),
    ("review", "Legacy categories with no mapping to the planned taxonomy",
     "SELECT label, '' FROM categories WHERE label NOT IN "
     "(SELECT legacy_label FROM category_mappings)"),
]

COUNT_SQL = {
    "events": "SELECT COUNT(*) FROM events",
    "time_spans": "SELECT COUNT(*) FROM time_spans WHERE kind <> 'era'",
    "eras": "SELECT COUNT(*) FROM time_spans WHERE kind = 'era'",
    "datelinks_keys": "SELECT COUNT(DISTINCT entity_id) FROM learning_content_groups",
    "datelinks_groups": "SELECT COUNT(*) FROM learning_content_groups",
    "datelinks_items": "SELECT COUNT(*) FROM learning_content_items",
    "milestones": "SELECT COUNT(*) FROM milestone_designations WHERE active = 1",
    "daily_challenge_dates": "SELECT COUNT(DISTINCT date_key) FROM daily_challenges",
    "csv_rows": "SELECT COUNT(*) FROM legacy_csv_rows",
}


def run():
    conn = connect()
    ensure_schema(conn)
    results = []

    integrity = conn.execute("PRAGMA integrity_check").fetchone()[0]
    results.append(("error", "SQLite integrity_check",
                    [] if integrity == "ok" else [("db", integrity)]))
    fk = conn.execute("PRAGMA foreign_key_check").fetchall()
    results.append(("error", "Foreign key violations",
                    [(r[0], f"rowid {r[1]} -> {r[2]}") for r in fk]))
    for severity, name, sql in CHECKS:
        results.append((severity, name, [tuple(r) for r in conn.execute(sql)]))

    manifest_path = LEGACY / "MANIFEST.json"
    baseline = json.loads(manifest_path.read_text())["counts"] if manifest_path.exists() else {}
    counts = {k: conn.execute(sql).fetchone()[0] for k, sql in COUNT_SQL.items()}
    changed = [(k, f"{baseline[k]} at import -> {v} now")
               for k, v in counts.items() if k in baseline and baseline[k] != v]
    results.append(("info", "Counts changed since the legacy import", changed))
    conn.close()

    errors = sum(1 for sev, _, rows in results if sev == "error" and rows)
    icon = {"error": "✗", "warning": "!", "review": "?", "info": "i"}
    print()
    for sev, name, rows in results:
        mark = "✓" if not rows else icon[sev]
        suffix = f" ({len(rows)})" if rows else ""
        print(f"  {mark} {name}{suffix}")
    print("\n  Counts: " + ", ".join(f"{k}={v}" for k, v in counts.items()))

    write_reports(results, counts)
    print(f"\n  {errors} error check(s) failed. Details: data/reports/validate.md")
    return errors


def write_reports(results, counts):
    REPORTS.mkdir(parents=True, exist_ok=True)
    payload = {
        "counts": counts,
        "checks": [{"severity": s, "check": n, "count": len(r),
                    "rows": [list(x) for x in r]} for s, n, r in results],
    }
    (REPORTS / "validate.json").write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    lines = ["# Validation report", "",
             "| Severity | Check | Result |", "|---|---|---:|"]
    for sev, name, rows in results:
        lines.append(f"| {sev} | {name} | {'pass' if not rows else len(rows)} |")
    lines += ["", "## Counts", ""] + [f"- {k}: {v}" for k, v in counts.items()]
    for sev, name, rows in results:
        if rows:
            lines += ["", f"## [{sev}] {name}", ""]
            lines += [f"- `{r[0]}` — {r[1]}" for r in rows]
    (REPORTS / "validate.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
