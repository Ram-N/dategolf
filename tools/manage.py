"""DateFlow data CLI. Run with: uv run python tools/manage.py <command>"""

import argparse
import json
import sqlite3
import subprocess
import sys

import ai_drafting
import countries
import drafts
import edit
import exporter
import identity
import links
import missing
import reconcile
import significance
import sources
import validate
from datetime import datetime

from common import APP_FILES, DATA, DB_PATH, LEGACY, LEGACY_CSV, REPORTS, ROOT, connect


def first_difference(a, b, path="$"):
    """Return the JSON path of the first structural difference, or None."""
    if type(a) is not type(b):
        return f"{path}: {type(a).__name__} vs {type(b).__name__}"
    if isinstance(a, dict):
        if list(a) != list(b):
            return f"{path}: keys differ ({sorted(set(a) ^ set(b))[:5] or 'order'})"
        for k in a:
            if (d := first_difference(a[k], b[k], f"{path}.{k}")):
                return d
    elif isinstance(a, list):
        if len(a) != len(b):
            return f"{path}: length {len(a)} vs {len(b)}"
        for i, (x, y) in enumerate(zip(a, b)):
            if (d := first_difference(x, y, f"{path}[{i}]")):
                return d
    elif a != b:
        return f"{path}: {a!r} vs {b!r}"
    return None


def compare_export(_args):
    """Regenerate every file in memory and diff it against what's committed."""
    conn = connect()
    rendered = exporter.render_all(conn)
    csv_text = exporter.render_csv(conn)
    conn.close()

    failures = 0
    for name, text in rendered.items():
        current = (ROOT / APP_FILES[name]).read_text(encoding="utf-8")
        if text == current:
            print(f"  ✓ {APP_FILES[name]} identical")
            continue
        failures += 1
        diff = first_difference(json.loads(current), json.loads(text))
        print(f"  ✗ {APP_FILES[name]} differs: {diff or 'formatting only'}")

    with open(LEGACY / LEGACY_CSV, encoding="utf-8", newline="") as f:
        legacy_csv = f.read()
    if csv_text == legacy_csv:
        print(f"  ✓ {LEGACY_CSV} rebuilds identically from legacy_csv_rows")
    else:
        failures += 1
        print(f"  ✗ {LEGACY_CSV} does not rebuild identically")

    # These check data rules, not export fidelity, so they don't count as differences.
    for script in ("scripts/validate-events.cjs", "scripts/validate-durations.cjs",
                   "scripts/validate-relationships.cjs"):
        proc = subprocess.run(["node", script], cwd=ROOT, capture_output=True, text=True)
        if proc.returncode == 0:
            print(f"  ✓ {script} passes")
        else:
            errors = [l.strip() for l in proc.stderr.splitlines() if l.strip().startswith("✗")]
            print(f"  ! {script} reports {len(errors)} data-rule error(s), e.g. {errors[:2]}")

    print(f"\n  {failures} difference(s)." if failures else "\n  Export matches.")
    return 1 if failures else 0


def bin_label(start, width):
    end = start + width - 1
    fmt = lambda y: f"{-y} BCE" if y < 0 else f"{y}"
    return f"{fmt(start or 1)}–{fmt(end)}"  # no year 0


def coverage(args):
    """What the database contains per time bin × region. Not a measure of history itself."""
    width = args.bin
    conn = connect()
    events = conn.execute("SELECT year, region FROM events").fetchall()
    spans = conn.execute("SELECT kind, start_year, end_year FROM time_spans "
                         "WHERE kind <> 'era'").fetchall()
    conn.close()

    regions = sorted({r["region"] for r in events},
                     key=lambda r: -sum(1 for e in events if e["region"] == r))
    lo = min(e["year"] for e in events) // width * width
    hi = max(e["year"] for e in events) // width * width
    bins = list(range(lo, hi + 1, width))

    grid = {b: {r: 0 for r in regions} for b in bins}
    for e in events:
        grid[e["year"] // width * width][e["region"]] += 1

    def active(kind, b):
        return sum(1 for s in spans if s["kind"] == kind
                   and s["start_year"] <= b + width - 1 and s["end_year"] >= b)

    head = ["Years", "Events"] + regions + ["Periods", "Empires"]
    lines = [f"# Coverage — events per {width}-year bin × region", "",
             "Counts what the database contains, not how much history happened.", "",
             "| " + " | ".join(head) + " |",
             "|" + "---|" + "---:|" * (len(head) - 1)]
    for b in bins:
        row = grid[b]
        cells = [bin_label(b, width), str(sum(row.values()))]
        cells += [str(row[r]) if row[r] else "·" for r in regions]
        cells += [str(active("period", b)), str(active("empire", b))]
        lines.append("| " + " | ".join(cells) + " |")
    empty = [bin_label(b, width) for b in bins if not sum(grid[b].values())]
    lines += ["", f"Bins with no events: {', '.join(empty) or 'none'}", ""]

    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "coverage.md").write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines))
    return 0


def backup(_args):
    """Snapshot the whole db to data/backup/dategolf_<date>_<time>.db and verify the copy."""
    dest_dir = DATA / "backup"
    dest_dir.mkdir(exist_ok=True)
    dest = dest_dir / f"dategolf_{datetime.now():%Y-%m-%d_%H%M%S}.db"

    # SQLite's backup API gives a consistent copy even while DB Browser has the file open.
    # It copies only written changes, so click Write Changes first.
    src = sqlite3.connect(DB_PATH)
    out = sqlite3.connect(dest)
    src.backup(out)
    src.close()

    ok = out.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
    counts = {t: out.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
              for t in ("entities", "events", "time_spans", "legacy_csv_crosswalk")}
    out.close()
    if not ok:
        dest.unlink()
        print("  ✗ Backup failed its integrity check and was deleted.")
        return 1
    size_kb = dest.stat().st_size // 1024
    print(f"  ✓ {dest.relative_to(ROOT)} ({size_kb} KB, integrity ok)")
    print("    " + ", ".join(f"{t}={n}" for t, n in counts.items()))
    return 0


def main():
    parser = argparse.ArgumentParser(prog="manage.py", description=__doc__)
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("validate", help="Integrity checks + reports").set_defaults(
        fn=lambda a: validate.run())
    sub.add_parser("export-json", help="Regenerate app JSON + SQL dump").set_defaults(
        fn=lambda a: exporter.run())
    sub.add_parser("compare-export", help="Diff a fresh export against committed files"
                   ).set_defaults(fn=compare_export)

    sub.add_parser("reconcile-events", help="Propose CSV row ↔ event matches for review"
                   ).set_defaults(fn=lambda a: reconcile.run())

    p = sub.add_parser("load-drafts", help="Load drafted events as proposed (not exported)")
    p.add_argument("path")
    p.set_defaults(fn=lambda a: drafts.load(a.path))

    p = sub.add_parser("approve", help="Mark proposed entities reviewed so they export")
    p.add_argument("ids", nargs="+")
    p.set_defaults(fn=lambda a: drafts.approve(a.ids))

    p = sub.add_parser("reject", help="Delete proposed drafts (logged, with a reason)")
    p.add_argument("ids", nargs="+")
    p.add_argument("--reason", required=True)
    p.set_defaults(fn=lambda a: drafts.reject(a.ids, a.reason))

    p = sub.add_parser("rename", help="Rename an event (old name kept as an alias) or a span; the id stays")
    p.add_argument("id")
    p.add_argument("name")
    p.add_argument("--description", help="A new description too (must not mention the year)")
    p.add_argument("--span", action="store_const", const="span", default="event", dest="facet",
                   help="Rename the span, not the event")
    p.set_defaults(fn=lambda a: edit.rename(a.id, a.name, a.description, a.facet))

    p = sub.add_parser("set-span-years", help="Change a span's start and end years (signed; -215 = 215 BCE)")
    p.add_argument("id")
    p.add_argument("start", type=int)
    p.add_argument("end", type=int)
    g = p.add_mutually_exclusive_group()
    g.add_argument("--approximate", action="store_const", const=True, dest="approximate", help="Mark as c.")
    g.add_argument("--exact", action="store_const", const=False, dest="approximate", help="Clear c.")
    p.set_defaults(fn=lambda a: edit.set_span_years(a.id, a.start, a.end, a.approximate))

    p = sub.add_parser("set-event-date", help="Change an event's year, 'c.' flag or displayed range")
    p.add_argument("id")
    p.add_argument("--year", type=int, help="Signed year; -2560 = 2560 BCE")
    g = p.add_mutually_exclusive_group()
    g.add_argument("--approximate", action="store_const", const=True, dest="approximate", help="Mark as c.")
    g.add_argument("--exact", action="store_const", const=False, dest="approximate", help="Clear c.")
    p.add_argument("--display", help='The true range, e.g. "c. 2600–2560 BCE" ("" clears it)')
    p.set_defaults(fn=lambda a: edit.set_event_date(a.id, a.year, a.approximate, a.display))

    p = sub.add_parser("dateflow-only", help="Keep an event out of DatePick and DateGolf (disputed date)")
    p.add_argument("id")
    p.add_argument("--reason", help="Why its date can't be guessed fairly")
    p.add_argument("--remove", action="store_true", help="Put it back in DatePick and DateGolf")
    p.set_defaults(fn=lambda a: edit.set_dateflow_only(a.id, a.reason, a.remove))

    p = sub.add_parser("set-memory-aid", help="Replace one DateLinks memory-aid item's text")
    p.add_argument("item_id", type=int)
    p.add_argument("text")
    p.set_defaults(fn=lambda a: edit.set_memory_aid(a.item_id, a.text))

    p = sub.add_parser("rename-memory-aid-group", help="Rename a DateLinks group of an entity")
    p.add_argument("id")
    p.add_argument("old_label")
    p.add_argument("new_label")
    p.set_defaults(fn=lambda a: edit.rename_memory_aid_group(a.id, a.old_label, a.new_label))

    p = sub.add_parser("set-countries", help='Replace an entity\'s country tags, e.g. "IN, PK/actor"')
    p.add_argument("id")
    p.add_argument("spec")
    p.add_argument("--note")
    p.set_defaults(fn=lambda a: countries.set_tags(a.id, a.spec, a.note))

    p = sub.add_parser("identity", help="Step 3a: decide shared event/span ids")
    p.add_argument("ids", nargs="+")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--one", action="store_const", const="one", dest="decision", help="One subject")
    g.add_argument("--split", action="store_const", const="split", dest="decision", help="Flag for a split")
    g.add_argument("--drop-span", action="store_const", const="drop-span", dest="decision",
                   help="Keep only the event: delete the span")
    g.add_argument("--drop-event", action="store_const", const="drop-event", dest="decision",
                   help="Keep only the span: delete the event")
    p.set_defaults(fn=lambda a: identity.decide(a.ids, a.decision))

    p = sub.add_parser("split", help="Step 3a: give a shared id's span its own new id")
    p.add_argument("id", help="The shared id (the event keeps it)")
    p.add_argument("new_span_id", help="The new id for the span, e.g. pax-romana-period")
    p.set_defaults(fn=lambda a: identity.split(a.id, a.new_span_id))

    p = sub.add_parser("load-links", help="Load a batch of links as proposed (all-or-nothing)")
    p.add_argument("path")
    p.set_defaults(fn=lambda a: links.load(a.path))

    p = sub.add_parser("approve-links", help="Mark proposed links reviewed")
    p.add_argument("ids", nargs="+", type=int)
    p.set_defaults(fn=lambda a: links.approve(a.ids))

    p = sub.add_parser("reject-links", help="Delete proposed links (logged, with a reason)")
    p.add_argument("ids", nargs="+", type=int)
    p.add_argument("--reason", required=True)
    p.set_defaults(fn=lambda a: links.reject(a.ids, a.reason))

    p = sub.add_parser("remove-links", help="Delete reviewed links, e.g. one a new step makes redundant (logged)")
    p.add_argument("ids", nargs="+", type=int)
    p.add_argument("--reason", required=True)
    p.set_defaults(fn=lambda a: links.remove(a.ids, a.reason))

    p = sub.add_parser("retype-link", help="Change links' type in place, e.g. part_of → began")
    p.add_argument("ids", nargs="+", type=int)
    p.add_argument("--type", required=True, dest="new_type")
    p.add_argument("--why", help="A new one-line 'why' (only sensible with one id)")
    p.set_defaults(fn=lambda a: links.retype(a.ids, a.new_type, a.why))

    p = sub.add_parser("add-link-type", help="Add a link type, e.g. ended / was ended by")
    p.add_argument("type")
    p.add_argument("--inverse", required=True, help="How it reads from the target, e.g. 'was ended by'")
    p.add_argument("--definition", required=True, help="When to use it")
    p.add_argument("--direction", required=True, help="Which way it is stored, e.g. 'ender → what ended'")
    p.add_argument("--causal", action="store_true", help="The source brings the target about (or its end)")
    p.add_argument("--symmetric", action="store_true", help="Reads the same both ways")
    p.set_defaults(fn=lambda a: links.add_type(a.type, a.inverse, a.definition, a.direction, a.causal, a.symmetric))

    p = sub.add_parser("suggest-part-of", help="Write part_of candidates to a draft file (loads nothing)")
    p.add_argument("--out", help="Output path (default data/drafts/<date>_part_of_suggestions.json)")
    p.set_defaults(fn=lambda a: links.suggest_part_of(a.out))

    sub.add_parser("import-csv-sources", help="Copy the CSV's Wikipedia URLs onto their events (reviewed)"
                   ).set_defaults(fn=lambda a: sources.import_csv())

    p = sub.add_parser("suggest-sources", help="Check Wikipedia titles for unsourced entities; write a draft file")
    p.add_argument("--picks", help="JSON of {entity id: article title} to try instead of the name")
    p.add_argument("--out", help="Output path (default data/drafts/<date>_sources_suggestions.json)")
    p.set_defaults(fn=lambda a: sources.suggest(a.picks, a.out))

    p = sub.add_parser("load-sources", help="Load a sources batch as proposed (all-or-nothing)")
    p.add_argument("path")
    p.set_defaults(fn=lambda a: sources.load(a.path))

    p = sub.add_parser("approve-sources", help="Mark an entity's proposed sources reviewed")
    p.add_argument("ids", nargs="*", help="Entity ids")
    p.add_argument("--title-matches", action="store_true", help="Approve every high-confidence name match")
    p.set_defaults(fn=lambda a: sources.approve(a.ids, title_matches=a.title_matches)
                   if (a.ids or a.title_matches) else sys.exit("Give entity ids or --title-matches"))

    p = sub.add_parser("reject-sources", help="Delete an entity's proposed sources (logged, with a reason)")
    p.add_argument("ids", nargs="+")
    p.add_argument("--reason", required=True)
    p.set_defaults(fn=lambda a: sources.reject(a.ids, a.reason))

    p = sub.add_parser("load-significance", help="Load a batch's 'significance' texts as proposed (all-or-nothing)")
    p.add_argument("path")
    p.set_defaults(fn=lambda a: significance.load(a.path))

    p = sub.add_parser("set-significance", help="Write or replace one item's 'Why it matters' (as proposed)")
    p.add_argument("id")
    p.add_argument("text")
    p.add_argument("--origin", default="ram", help="Who wrote it (default ram)")
    p.add_argument("--note", help="For the reviewer: what to check")
    p.set_defaults(fn=lambda a: significance.set_text(a.id, a.text, a.origin, a.note))

    p = sub.add_parser("approve-significance", help="Mark proposed significance texts reviewed so they export")
    p.add_argument("ids", nargs="+")
    p.set_defaults(fn=lambda a: significance.approve(a.ids))

    p = sub.add_parser("reject-significance", help="Delete proposed significance texts (logged, with a reason)")
    p.add_argument("ids", nargs="+")
    p.add_argument("--reason", required=True)
    p.set_defaults(fn=lambda a: significance.reject(a.ids, a.reason))

    p = sub.add_parser("ai-reference", help="Write the reference file to give outside AIs (doc 15)")
    p.add_argument("--out", help="Output path (default data/drafts/ai_reference.md)")
    p.set_defaults(fn=lambda a: ai_drafting.reference(a.out))

    p = sub.add_parser("check-drafts", help="Check an AI-drafted batch, with a trial load on a db copy (doc 15)")
    p.add_argument("path")
    p.set_defaults(fn=lambda a: ai_drafting.check(a.path))

    p = sub.add_parser("load-missing", help="Add noticed-but-missing events and spans to the list (all-or-nothing)")
    p.add_argument("path")
    p.set_defaults(fn=lambda a: missing.load(a.path))

    p = sub.add_parser("missing-status", help="Mark missing items wanted, dismissed (with --note) or open")
    p.add_argument("ids", nargs="+", type=int)
    p.add_argument("--status", required=True, choices=["open", "wanted", "dismissed"])
    p.add_argument("--note", help="Why (required to dismiss)")
    p.set_defaults(fn=lambda a: missing.set_status(a.ids, a.status, a.note))

    p = sub.add_parser("load-countries", help="Load drafted country tags as proposed")
    p.add_argument("path")
    p.set_defaults(fn=lambda a: countries.load(a.path))

    p = sub.add_parser("approve-countries", help="Mark country tags reviewed")
    p.add_argument("ids", nargs="*", help="Entity ids to approve")
    p.add_argument("--high", action="store_true", help="Approve every high-confidence entity")
    p.set_defaults(fn=lambda a: countries.approve(a.ids, a.high) if (a.ids or a.high)
                   else sys.exit("Give entity ids or --high"))

    sub.add_parser("backup", help="Snapshot the db to data/backup/ with a date-time name"
                   ).set_defaults(fn=backup)

    p = sub.add_parser("coverage", help="Events per time bin × region")
    p.add_argument("--bin", type=int, default=500, help="Bin width in years (default 500)")
    p.set_defaults(fn=coverage)

    args = parser.parse_args()
    sys.exit(args.fn(args) or 0)


if __name__ == "__main__":
    main()
