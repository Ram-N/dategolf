"""DateFlow data CLI. Run with: uv run python tools/manage.py <command>"""

import argparse
import json
import subprocess
import sys

import drafts
import exporter
import reconcile
import validate
from common import APP_FILES, LEGACY, LEGACY_CSV, REPORTS, ROOT, connect


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
    for script in ("scripts/validate-events.cjs", "scripts/validate-durations.cjs"):
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


def approve(args):
    """Publish proposed entities: they are exported from the next export-json on."""
    conn = connect()
    for entity_id in args.ids:
        cur = conn.execute("UPDATE entities SET editorial_status = 'reviewed', "
                           "updated_at = datetime('now') "
                           "WHERE id = ? AND editorial_status = 'proposed'", (entity_id,))
        print(f"  {'✓ approved' if cur.rowcount else '✗ not a proposed entity:'} {entity_id}")
    conn.commit()
    conn.close()
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
    p.set_defaults(fn=approve)

    p = sub.add_parser("coverage", help="Events per time bin × region")
    p.add_argument("--bin", type=int, default=500, help="Bin width in years (default 500)")
    p.set_defaults(fn=coverage)

    args = parser.parse_args()
    sys.exit(args.fn(args) or 0)


if __name__ == "__main__":
    main()
