"""Links between entities (Step 3b): load batches, approve or reject them, and suggest part_of candidates.

A link is stored once and read from either end (doc 11, 3b-tooling):
  source --type--> target      e.g.  kilby-first-integrated-circuit --preceded--> noyce-silicon-chip
  target --inverse--> source   e.g.  noyce-silicon-chip "followed" kilby-first-integrated-circuit

Batch file (JSON):
  {"origin": "ai_drafted",
   "links": [{source, type, target, why, confidence?}, ...]}
'followed' may be written; it is stored as 'preceded' with the ends swapped.
"""

import json
import sqlite3
from datetime import date
from pathlib import Path

from common import DATA, connect, ensure_schema, log
from reconcile import tokens

# Written forms that are stored as their inverse type, with the ends swapped.
WRITTEN_INVERSES = {"followed": "preceded"}


def normalize(source, rtype, target, symmetric_types):
    """The one stored form of a link, however it was written."""
    if rtype in WRITTEN_INVERSES:
        return target, WRITTEN_INVERSES[rtype], source
    if rtype in symmetric_types and source > target:
        return target, rtype, source
    return source, rtype, target


def _sentence(conn, link_id):
    r = conn.execute("SELECT source_id, type, target_id FROM v_link_review WHERE id = ?", (link_id,)).fetchone()
    return f"link #{link_id}: {r[0]} {r[1]} {r[2]}" if r else f"link #{link_id}"


def load(path):
    batch = json.loads(Path(path).read_text(encoding="utf-8"))
    conn = connect()
    ensure_schema(conn)
    types = {r[0]: r[1] for r in conn.execute("SELECT type, symmetric FROM relationship_types")}
    symmetric = {t for t, s in types.items() if s}
    known = {r[0] for r in conn.execute("SELECT id FROM entities")}
    existing = {tuple(r) for r in conn.execute(
        "SELECT source_entity_id, relationship_type, target_entity_id FROM relationships")}

    problems, rows, seen = [], [], set()
    for n, link in enumerate(batch["links"], start=1):
        src, rtype, tgt = link.get("source", ""), link.get("type", ""), link.get("target", "")
        why = (link.get("why") or "").strip()
        where = f"link {n} ({src} {rtype} {tgt})"
        if rtype not in types:
            problems.append(f"{where}: unknown type")
            continue
        for end in (src, tgt):
            if end not in known:
                problems.append(f"{where}: unknown id {end}")
        if src == tgt:
            problems.append(f"{where}: links to itself")
        if not why:
            problems.append(f"{where}: needs a 'why'")
        key = normalize(src, rtype, tgt, symmetric)
        if key in existing or key in seen:
            problems.append(f"{where}: already exists (as {key[0]} {key[1]} {key[2]})")
        reverse = (key[2], key[1], key[0])
        if key[1] not in symmetric and (reverse in existing or reverse in seen):
            problems.append(f"{where}: contradicts the reverse link {reverse[0]} {reverse[1]} {reverse[2]}")
        seen.add(key)
        rows.append((*key, why, link.get("confidence"), link.get("origin") or batch.get("origin")))
    if problems:
        print("  ✗ Nothing loaded:\n    " + "\n    ".join(problems))
        conn.close()
        return 1
    try:
        conn.executemany(
            "INSERT INTO relationships (source_entity_id, relationship_type, target_entity_id, description, "
            "confidence, editorial_status, origin, created_at) VALUES (?, ?, ?, ?, ?, 'proposed', ?, datetime('now'))",
            rows)
    except sqlite3.Error as exc:
        conn.rollback()
        raise SystemExit(f"Nothing loaded: {exc} (while loading {path})")
    conn.commit()
    conn.close()
    print(f"  Loaded {len(rows)} links as proposed. Review them on the dashboard (Review → Links) "
          "or with approve-links / reject-links.")
    return 0


def approve(ids, via="cli"):
    conn = connect()
    ok = True
    for link_id in ids:
        what = _sentence(conn, link_id)
        cur = conn.execute("UPDATE relationships SET editorial_status = 'reviewed' "
                           "WHERE id = ? AND editorial_status = 'proposed'", (link_id,))
        if cur.rowcount:
            source = conn.execute("SELECT source_entity_id FROM relationships WHERE id = ?", (link_id,)).fetchone()[0]
            log(conn, "approve-link", source, what, via=via)
            print(f"  ✓ approved {what}")
        else:
            ok = False
            print(f"  ✗ not a proposed link: #{link_id}")
    conn.commit()
    conn.close()
    return 0 if ok else 1


def reject(ids, reason, via="cli"):
    if not reason or not reason.strip():
        print("  ✗ a reason is required")
        return 1
    conn = connect()
    ok = True
    for link_id in ids:
        row = conn.execute("SELECT source_entity_id FROM relationships WHERE id = ? AND editorial_status = 'proposed'",
                           (link_id,)).fetchone()
        if row is None:
            ok = False
            print(f"  ✗ not a proposed link: #{link_id}")
            continue
        what = _sentence(conn, link_id)
        conn.execute("DELETE FROM relationships WHERE id = ?", (link_id,))
        log(conn, "reject-link", row[0], f"{what} — {reason.strip()}", via=via)
        print(f"  ✓ rejected {what}")
    conn.commit()
    conn.close()
    return 0 if ok else 1


def add_type(rtype, inverse, definition, direction, causal=False, symmetric=False, via="cli"):
    """Add a link type (e.g. ended / was ended by). Existing types are never changed."""
    if not rtype.replace("_", "").isalpha() or rtype != rtype.lower():
        print(f"  ✗ a type is lowercase words joined by _, not {rtype!r}")
        return 1
    if not (inverse.strip() and definition.strip() and direction.strip()):
        print("  ✗ an inverse label, a definition and a direction are all required")
        return 1
    conn = connect()
    ensure_schema(conn)
    if conn.execute("SELECT 1 FROM relationship_types WHERE type = ?", (rtype,)).fetchone():
        print(f"  ✗ the type {rtype} already exists")
        conn.close()
        return 1
    conn.execute("INSERT INTO relationship_types (type, is_causal, definition, direction, inverse_label, symmetric) "
                 "VALUES (?, ?, ?, ?, ?, ?)", (rtype, int(causal), definition.strip(), direction.strip(),
                                               inverse.strip(), int(symmetric)))
    log(conn, "add-link-type", f"type:{rtype}", f"{rtype} / {inverse.strip()}: {definition.strip()}", via=via)
    conn.commit()
    conn.close()
    print(f"  ✓ added link type {rtype} (inverse: {inverse.strip()})")
    return 0


def retype(ids, new_type, why=None, via="cli"):
    """Change links' type in place (any status), keeping id and status; optionally a new 'why'."""
    conn = connect()
    ensure_schema(conn)
    types = {r[0]: r[1] for r in conn.execute("SELECT type, symmetric FROM relationship_types")}
    if new_type not in types or new_type in WRITTEN_INVERSES:
        print(f"  ✗ unknown type {new_type}")
        conn.close()
        return 1
    ok = True
    for link_id in ids:
        row = conn.execute("SELECT source_entity_id, relationship_type, target_entity_id FROM relationships "
                           "WHERE id = ?", (link_id,)).fetchone()
        if row is None:
            ok = False
            print(f"  ✗ no link #{link_id}")
            continue
        src, old, tgt = row
        if conn.execute("SELECT 1 FROM relationships WHERE source_entity_id = ? AND relationship_type = ? "
                        "AND target_entity_id = ?", (src, new_type, tgt)).fetchone():
            ok = False
            print(f"  ✗ link #{link_id}: {src} {new_type} {tgt} already exists")
            continue
        conn.execute("UPDATE relationships SET relationship_type = ?, description = coalesce(?, description) "
                     "WHERE id = ?", (new_type, why, link_id))
        log(conn, "retype-link", src, f"link #{link_id}: {src} {old} → {new_type} {tgt}", via=via)
        print(f"  ✓ link #{link_id}: {src} {old} → {new_type} {tgt}")
    conn.commit()
    conn.close()
    return 0 if ok else 1


# ── part_of candidates ────────────────────────────────────────────────────────

# Words too common in span names to count as evidence on their own.
GENERIC = set(tokens("the of and a an in great period age era empire dynasty war wars kingdom "
                     "civilization civilisation movement revolution rule"))


def suggest_part_of(out_path=None):
    """Write a draft batch of part_of candidates. Never loads anything.

    A candidate is an event whose year falls inside a span's years, in the same lane or sharing a
    location country, and sharing a distinctive word with the span's name.
    """
    conn = connect()
    pub = "NOT IN (SELECT id FROM entities WHERE editorial_status = 'proposed')"
    spans = conn.execute(f"""
        SELECT s.entity_id, s.name, s.start_year, s.end_year, r.lane FROM time_spans s
        JOIN regions r ON r.label = s.region WHERE s.kind <> 'era' AND s.entity_id {pub}""").fetchall()
    events = conn.execute(f"""
        SELECT e.entity_id, e.name, e.year, e.description, r.lane,
               (SELECT group_concat(alias, ' ') FROM event_aliases a WHERE a.entity_id = e.entity_id) AS aliases
        FROM events e JOIN regions r ON r.label = e.region WHERE e.entity_id {pub}""").fetchall()
    countries = {}
    for eid, code in conn.execute("SELECT entity_id, country FROM entity_countries WHERE role = 'location'"):
        countries.setdefault(eid, set()).add(code)
    linked = {frozenset(r) for r in conn.execute("SELECT source_entity_id, target_entity_id FROM relationships")}
    conn.close()

    suggestions = []
    for sid, sname, start, end, slane in spans:
        words = tokens(sname) - GENERIC
        if not words:
            continue
        for eid, ename, year, desc, elane, aliases in events:
            if eid == sid or not (start <= year <= end) or frozenset((eid, sid)) in linked:
                continue
            shared = countries.get(eid, set()) & countries.get(sid, set())
            if elane != slane and not shared:  # wars cross regions: Zama (Africa) is part of the Punic Wars
                continue
            hits = words & tokens(f"{ename} {aliases or ''} {desc}")
            if not hits:
                continue
            score = 2 * len(hits) + len(shared)
            suggestions.append({
                "source": eid, "type": "part_of", "target": sid, "why": "",
                "evidence": f"{ename} ({year}) inside {sname} ({start} to {end}); words: {', '.join(sorted(hits))}"
                            + (f"; countries: {', '.join(sorted(shared))}" if shared else ""),
                "score": score,
            })
    suggestions.sort(key=lambda s: (-s["score"], s["target"], s["source"]))
    out = Path(out_path) if out_path else DATA / "drafts" / f"{date.today():%Y-%m-%d}_part_of_suggestions.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({
        "origin": "suggested",
        "about": "Candidates from suggest-part-of. Curate before loading: delete wrong ones and write each 'why'. "
                 "Links with an empty 'why' are refused by load-links.",
        "links": suggestions}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"  Wrote {len(suggestions)} part_of candidates to {out}")
    return 0
