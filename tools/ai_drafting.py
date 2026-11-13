"""Drafting with outside AIs (doc 15): a reference file to give them, and a checker for what they send back.

  ai-reference [--out PATH]   writes the reference: allowed values, the gap list, every existing id
  check-drafts <file>         checks an AI's batch against the rules, then does a trial load on a db copy

The batch format is the one load-drafts and load-links already read: one JSON file with
"events", "spans" and "links". Nothing here writes to the real db.
"""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import date
from pathlib import Path

from common import DATA, DB_PATH, ROOT, connect
from reconcile import tokens
from links import overlapping_sequences, skip_links
from significance import row_text, text_problems

ID_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
KINDS = ("period", "empire")
DIFFICULTIES = ("easy", "medium", "hard")
WIKI = "https://en.wikipedia.org/wiki/"
YEAR_NOW = date.today().year


# ── The reference file ───────────────────────────────────────────────────────

def reference(out_path=None):
    conn = connect()  # read only: no ensure_schema, which would rewrite the db file
    q = lambda sql: conn.execute(sql).fetchall()
    regions = [r[0] for r in q("SELECT label FROM regions ORDER BY lane, label")]
    categories = [r[0] for r in q("SELECT label FROM categories ORDER BY label")]
    types = q("SELECT type, inverse_label, is_causal, definition FROM relationship_types "
              "WHERE type <> 'followed' ORDER BY is_causal, type")
    gaps = q("SELECT id, kind, name, year, end_year, approximate, why, status FROM missing_entities "
             "WHERE status IN ('open', 'wanted') ORDER BY status = 'wanted' DESC, coalesce(year, 9999)")
    events = q("SELECT e.entity_id, e.name, e.year, e.is_approximate FROM events e JOIN entities n ON n.id = e.entity_id "
               "WHERE n.editorial_status <> 'proposed' ORDER BY e.year, e.entity_id")
    spans = q("SELECT entity_id, name, start_year, end_year, kind FROM time_spans WHERE kind <> 'era' "
              "ORDER BY start_year, entity_id")
    has_why = {r[0] for r in q("SELECT entity_id FROM entity_significance")} if q(
        "SELECT 1 FROM sqlite_master WHERE name = 'entity_significance'") else set()
    conn.close()

    yr = lambda y: f"{-y} BCE" if y < 0 else str(y)
    lines = [
        "# DateGolf reference for AI drafting",
        "",
        f"Generated {date.today():%Y-%m-%d} by `manage.py ai-reference`. Give this file to the AI together with the",
        "prompt in docs/15. It lists what already exists (don't duplicate it; link to it by id) and the gap list.",
        "",
        "## Allowed values",
        "",
        f"- **region** (exactly one): {', '.join(regions)}",
        f"- **categories** (1 to 3, primary first): {', '.join(categories)}",
        f"- **difficulty**: {', '.join(DIFFICULTIES)}",
        "- **importance**: 1 to 9 (see the prompt)",
        f"- **span kind**: {', '.join(KINDS)}",
        "",
        "## Link types",
        "",
        "| type | reads from the source | reads from the target | causal | use when |",
        "|---|---|---|---|---|",
    ]
    for t, inverse, causal, definition in types:
        lines.append(f"| `{t}` | {t.replace('_', ' ')} | {inverse} | {'yes' if causal else 'no'} | {definition or ''} |")
    lines += ["", "## The gap list: missing events and spans worth drafting", "",
              "Set `fills_missing` to the number when your draft fills one.", "",
              "| # | kind | name | when | why | status |", "|---|---|---|---|---|---|"]
    for gid, kind, name, y, end, approx, why, status in gaps:
        when = "?" if y is None else (("c. " if approx else "") + yr(y) + (f" to {yr(end)}" if end else ""))
        lines.append(f"| {gid} | {kind} | {name} | {when} | {why} | {status} |")
    lines += ["", f"## Existing events ({len(events)}): use these ids in links; don't draft them again", "",
              "A ✓ in the last column means it already has a significance (\"Why it matters\"); "
              "an empty cell means you may write one in the batch's \"significance\" list.", "",
              "| id | name | year | why it matters |", "|---|---|---|---|"]
    tick = lambda i: "✓" if i in has_why else ""
    lines += [f"| {i} | {n} | {'c. ' if a else ''}{yr(y)} | {tick(i)} |" for i, n, y, a in events]
    lines += ["", f"## Existing spans ({len(spans)})", "",
              "| id | name | years | kind | why it matters |", "|---|---|---|---|---|"]
    lines += [f"| {i} | {n} | {yr(a)} to {yr(b)} | {k} | {tick(i)} |" for i, n, a, b, k in spans]
    out = Path(out_path) if out_path else DATA / "drafts" / "ai_reference.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"  Wrote {out} ({len(events)} events, {len(spans)} spans, {len(gaps)} gap items)")
    # The system prompt itself, copied out of doc 15 Part B (the doc stays its only source).
    doc = (ROOT / "docs" / "15_AI_Drafting_Prompt.md").read_text(encoding="utf-8")
    m = re.search(r"^````text\n(.*?)^````$", doc, re.S | re.M)
    if m:
        prompt = out.parent / "ai_prompt.txt"
        prompt.write_text(m.group(1), encoding="utf-8")
        print(f"  Wrote {prompt} (the doc 15 Part B prompt)")
    return 0


# ── Checking a batch ─────────────────────────────────────────────────────────

# A URL pasted from a chat window often arrives as a Markdown link: [url](url).
# The target (inside the parentheses) is kept: the link text can be cut short at a ")" in the URL.
MD_LINK = re.compile(r"\[https?://[^\]\s]*\]\((https?://(?:[^()\s]|\([^()\s]*\))*)\)")


def _read_batch(path):
    """The JSON, forgiving the code fences chat AIs like to add."""
    text = Path(path).read_text(encoding="utf-8").strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text)
    return json.loads(text)


def unwrap_links(path):
    """Rewrite Markdown-linked URLs in a batch file as bare URLs. Returns how many it fixed."""
    text = Path(path).read_text(encoding="utf-8")
    fixed, n = MD_LINK.subn(lambda m: m.group(1), text)
    if n:
        Path(path).write_text(fixed, encoding="utf-8")
    return n


def _year_leaks(text, year):
    plain = re.sub(r"\d{1,3}(?:,\d{3})+|\d+\.\d+", " ", text)
    return [n for n in re.findall(r"\b\d{3,4}\b", plain) if abs(int(n) - abs(year)) <= 50]


def check(path, trial=True):
    """Report errors (must fix) and warnings (please check) for an AI-drafted batch. Returns 1 on errors."""
    errors, warnings = [], []
    try:
        if (n := unwrap_links(path)):
            warnings.append(f"rewrote {n} Markdown-linked URL(s) in the file as bare URLs")
        batch = _read_batch(path)
    except (json.JSONDecodeError, OSError) as exc:
        print(f"  ✗ Not readable JSON: {exc}")
        return 1
    conn = connect()  # read only: no ensure_schema, which would rewrite the db file
    ids = {r[0] for r in conn.execute("SELECT id FROM entities")}
    names = {r[0].casefold(): r[1] for r in conn.execute(
        "SELECT name, entity_id FROM events UNION SELECT name, entity_id FROM time_spans")}
    existing = [(r[0], r[1], r[2]) for r in conn.execute(
        "SELECT entity_id, name, year FROM events UNION ALL SELECT entity_id, name, start_year FROM time_spans")]
    regions = {r[0] for r in conn.execute("SELECT label FROM regions")}
    categories = {r[0] for r in conn.execute("SELECT label FROM categories")}
    countries = {r[0] for r in conn.execute("SELECT code FROM countries")}
    gaps = {r[0]: (r[1], r[2], r[3]) for r in conn.execute("SELECT id, kind, name, status FROM missing_entities")}
    descriptions = dict(conn.execute("SELECT entity_id, description FROM events UNION ALL "
                                     "SELECT entity_id, description FROM time_spans WHERE kind <> 'era'"))
    has_why = {r[0] for r in conn.execute("SELECT entity_id FROM entity_significance")} if conn.execute(
        "SELECT 1 FROM sqlite_master WHERE name = 'entity_significance'").fetchone() else set()
    conn.close()

    unknown = set(batch) - {"origin", "about", "events", "spans", "links", "significance"}
    if unknown:
        errors.append(f"unknown top-level keys: {', '.join(sorted(unknown))}")
    if not str(batch.get("origin", "")).startswith("ai_drafted"):
        warnings.append('origin should be "ai_drafted:<model name>", so the review knows who drafted it')

    seen_ids, seen_names = set(), set()

    def common_checks(where, x, kind, year):
        i, name = x.get("id", ""), (x.get("name") or "").strip()
        if not ID_RE.match(i) or not 3 <= len(i) <= 60:
            errors.append(f"{where}: id must be lowercase-words-with-hyphens, 3 to 60 characters")
        if i in ids:
            errors.append(f"{where}: id {i} already exists")
        if i in seen_ids:
            errors.append(f"{where}: id {i} is used twice in this batch")
        seen_ids.add(i)
        if not name:
            errors.append(f"{where}: needs a name")
        elif name.casefold() in names:
            errors.append(f"{where}: an entity called {name!r} already exists ({names[name.casefold()]})")
        elif name.casefold() in seen_names:
            errors.append(f"{where}: the name {name!r} is used twice in this batch")
        seen_names.add(name.casefold())
        if re.search(r"\b\d{3,4}\b", name):
            warnings.append(f"{where}: the name contains a number that may give away the year")
        if x.get("region") not in regions:
            errors.append(f"{where}: region {x.get('region')!r} is not one of the allowed regions")
        cats = x.get("categories") or []
        if not cats or len(cats) > 3 or any(c not in categories for c in cats):
            errors.append(f"{where}: categories must be 1 to 3 of the allowed labels (got {cats})")
        if not isinstance(x.get("importance"), int) or not 1 <= x["importance"] <= 9:
            errors.append(f"{where}: importance must be a whole number from 1 to 9")
        desc = (x.get("description") or "").strip()
        words = len(desc.split())
        if not desc:
            errors.append(f"{where}: needs a description")
        elif not 12 <= words <= 90:
            warnings.append(f"{where}: description is {words} words (aim for 25 to 70)")
        if re.search(r"<[a-z]|\*\*|\[.+\]\(", desc):
            errors.append(f"{where}: the description must be plain text (no HTML or Markdown)")
        for code in x.get("countries") or []:
            c, _, role = str(code).partition("/")
            if c.strip().upper() not in countries or role.strip() not in ("", "actor"):
                errors.append(f"{where}: country {code!r} is not a known ISO code (or not CODE/actor)")
        if not x.get("countries"):
            warnings.append(f"{where}: no countries (location first, '/actor' for actors)")
        if x.get("significance") is not None:
            errs, warns = text_problems(x["significance"], desc)
            errors.extend(f"{where}: {m}" for m in errs)
            warnings.extend(f"{where}: {m}" for m in warns)
        src = x.get("source") or ""
        if not src.startswith(WIKI):
            errors.append(f"{where}: source must be one English Wikipedia article URL ({WIKI}...)")
        if x.get("fills_missing") is not None:
            gap = gaps.get(x["fills_missing"])
            if gap is None:
                errors.append(f"{where}: fills_missing #{x['fills_missing']} is not on the gap list")
            elif gap[0] != kind:
                errors.append(f"{where}: gap #{x['fills_missing']} is a {gap[0]}, not a {kind}")
            elif gap[2] not in ("open", "wanted"):
                errors.append(f"{where}: gap #{x['fills_missing']} is already {gap[2]}")
        # A possible duplicate: same distinctive words, a nearby year.
        words_x = tokens(name) - set(tokens("the of and a in empire dynasty battle war becomes founded"))
        if words_x and year is not None:
            for eid, ename, eyear in existing:
                if abs(eyear - year) <= 15 and len(words_x & tokens(ename)) >= max(2, len(words_x) - 1):
                    warnings.append(f"{where}: may duplicate {eid} ({ename}, {eyear})")
                    break

    for n, e in enumerate(batch.get("events") or [], start=1):
        where = f"event {n} ({e.get('id', '?')})"
        year = e.get("year")
        if not isinstance(year, int) or year == 0 or not -10000 <= year <= YEAR_NOW:
            errors.append(f"{where}: year must be a whole number (negative = BCE), never 0")
            year = None
        common_checks(where, e, "event", year)
        if e.get("difficulty") not in DIFFICULTIES:
            errors.append(f"{where}: difficulty must be easy, medium or hard")
        approx = e.get("approximate", e.get("is_approximate", False))
        if approx and not e.get("date_display"):
            errors.append(f"{where}: an approximate date needs date_display, e.g. \"c. 4000–3500 BCE\"")
        if e.get("date_display") and not approx:
            warnings.append(f"{where}: date_display given but approximate is false")
        aliases = e.get("aliases") or []
        if not 1 <= len(aliases) <= 8:
            warnings.append(f"{where}: give 2 to 6 aliases")
        if year is not None:
            if _year_leaks(e.get("description") or "", year):
                errors.append(f"{where}: the description mentions a year near the answer "
                              f"({', '.join(_year_leaks(e['description'], year))}): DatePick shows it before the guess")
            for a in aliases:
                if _year_leaks(a, year):
                    errors.append(f"{where}: alias {a!r} gives away the year")
        if re.search(r"\b(\d{1,2}(st|nd|rd|th)|[a-z]+(teenth|tieth|th)) century\b", (e.get("description") or "").lower()):
            warnings.append(f"{where}: the description names a century, a strong hint at the answer")

    for n, s in enumerate(batch.get("spans") or [], start=1):
        where = f"span {n} ({s.get('id', '?')})"
        a, b = s.get("start_year"), s.get("end_year")
        if not all(isinstance(v, int) and v != 0 for v in (a, b)) or a > b:
            errors.append(f"{where}: start_year and end_year must be whole numbers, never 0, start not after end")
            a = None
        if s.get("kind") not in KINDS:
            errors.append(f"{where}: kind must be period or empire")
        common_checks(where, s, "span", a)

    # Significance for existing items (or this batch's): one per item, never replacing one.
    seen_why = {x["id"] for x in (batch.get("events") or []) + (batch.get("spans") or [])
                if x.get("significance") is not None and "id" in x}
    for n, s in enumerate(batch.get("significance") or [], start=1):
        sid = s.get("id", "")
        where = f"significance {n} ({sid or '?'})"
        if sid not in descriptions and sid not in seen_ids:
            errors.append(f"{where}: {sid!r} is not an existing event or span, or one in this batch")
        if sid in has_why:
            errors.append(f"{where}: {sid} already has a significance (leave it out, or say why in a note to Ram)")
        if sid in seen_why:
            errors.append(f"{where}: {sid} has two significance texts in this batch")
        seen_why.add(sid)
        errs, warns = text_problems(row_text(s), descriptions.get(sid))
        errors.extend(f"{where}: {m}" for m in errs)
        warnings.extend(f"{where}: {m}" for m in warns)

    # New 'preceded' links can turn an existing one into a shortcut that skips the new step.
    conn = connect()
    stored = conn.execute("SELECT id, relationship_type, source_entity_id, target_entity_id FROM relationships").fetchall()
    conn.close()
    new = [("preceded", l.get("target"), l.get("source")) if l.get("type") == "followed"
           else (l.get("type"), l.get("source"), l.get("target")) for l in batch.get("links") or []]
    spans = {r[0]: (r[1], r[2]) for r in connect().execute("SELECT entity_id, start_year, end_year FROM time_spans")}
    spans.update({s.get("id"): (s.get("start_year"), s.get("end_year")) for s in batch.get("spans") or []
                  if isinstance(s.get("start_year"), int) and isinstance(s.get("end_year"), int)})
    for _, a, b, n in overlapping_sequences([(i, *x) for i, x in enumerate(new)], spans):
        warnings.append(f"link {a} preceded {b}: the two spans overlap by {n} years, so 'preceded' (a succession) "
                        "misleads; drop it or use another type")
    for lid, a, b, c in skip_links(stored, new):
        warnings.append(f"existing link #{lid} ({a} preceded {c}) will skip the new step {b}: "
                        f"after approval, `manage.py remove-links {lid}`")

    if not errors and trial:
        _trial_load(path, batch, errors)

    print(f"\n  Checked {len(batch.get('events') or [])} events, {len(batch.get('spans') or [])} spans, "
          f"{len(batch.get('links') or [])} links, {len(batch.get('significance') or [])} significance texts "
          f"from {path}")
    for e in errors:
        print(f"  ✗ {e}")
    for w in warnings:
        print(f"  ! {w}")
    if not errors:
        print("  ✓ Ready to load: `manage.py load-drafts <file>`"
              + (", then `manage.py load-links <file>`." if batch.get("links") else ".")
              + (" (Look at the warnings first.)" if warnings else ""))
    return 1 if errors else 0


def _trial_load(path, batch, errors):
    """Load the batch into a copy of the db with the real loaders, so their checks run too."""
    tmp = Path(tempfile.mkdtemp(prefix="dategolf-check-"))
    try:
        shutil.copy(DB_PATH, tmp / "dategolf.db")
        clean = tmp / "batch.json"
        clean.write_text(json.dumps({**batch, "origin": batch.get("origin") or "ai_drafted"}), encoding="utf-8")
        env = {**os.environ, "DATEGOLF_DB": str(tmp / "dategolf.db")}
        steps = ([["load-drafts", str(clean)]]
                 if (batch.get("events") or batch.get("spans") or batch.get("significance")) else [])
        if batch.get("links"):
            steps.append(["load-links", str(clean)])
        for step in steps:
            proc = subprocess.run([sys.executable, str(ROOT / "tools" / "manage.py"), *step], env=env,
                                  capture_output=True, text=True)
            if proc.returncode != 0:
                detail = (proc.stdout + proc.stderr).strip().replace("\n", "\n      ")
                errors.append(f"trial {step[0]} failed:\n      {detail}")
                break
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
