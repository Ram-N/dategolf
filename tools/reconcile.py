"""Propose events_master.csv ↔ events matches. Proposes only; never merges or edits content."""

import math
import re
import unicodedata

from common import REPORTS, connect, ensure_schema

MAX_CANDIDATES = 3
MIN_TEXT = 0.3  # a candidate needs real text evidence; a shared year alone is never enough

STOPWORDS = set("""
a an and are as at be by for from has have in into is it its of on or the this to was were
with first new his her their which who that after during over under between against
""".split())


def tokens(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    words = re.findall(r"[a-z0-9]+", text)
    # Light stemming so "revolution"/"revolutions" and "invented"/"invention" meet.
    stems = {re.sub(r"(ions?|ed|es|s)$", "", w) for w in words if w not in STOPWORDS}
    return {w for w in stems if len(w) > 2 or w.isdigit()}


def idf_weights(docs):
    """Rare words weigh more: 'ironworking' is strong evidence, 'independence' is weak."""
    df = {}
    for doc in docs:
        for t in doc:
            df[t] = df.get(t, 0) + 1
    n = len(docs)
    weights = {t: math.log((n + 1) / (c + 1)) + 1 for t, c in df.items()}
    return lambda t: weights.get(t, math.log(n + 1) + 1)  # unseen words count as rarest


def coverage(phrase, pool, weight):
    """Rarity-weighted share of the phrase's words found in pool."""
    total = sum(weight(t) for t in phrase)
    return sum(weight(t) for t in phrase & pool) / total if total else 0.0


def year_score(delta):
    if delta == 0:
        return 1.0
    if delta <= 2:   # c./approximate dates, BCE off-by-one
        return 0.7
    if delta <= 10:
        return 0.4
    if delta <= 50:
        return 0.15
    return 0.0


def score_pair(csv_tokens, csv_year, ev, weight):
    name_cov = coverage(ev["name_tokens"], csv_tokens, weight)
    alias_cov, alias = max(((coverage(t, csv_tokens, weight), a) for a, t in ev["aliases"]),
                           default=(0.0, None))
    desc_cov = coverage(csv_tokens, ev["desc_tokens"], weight)
    text = 0.7 * max(name_cov, alias_cov) + 0.3 * desc_cov
    delta = abs(csv_year - ev["year"])
    score = 0.6 * text + 0.4 * year_score(delta)

    reasons = [f"year {'exact' if delta == 0 else f'±{delta}'}",
               f"name {name_cov:.0%}"]
    if alias and alias_cov > name_cov:
        reasons.append(f"alias '{alias}' {alias_cov:.0%}")
    reasons.append(f"description {desc_cov:.0%}")
    return text, score, delta, "; ".join(reasons)


def tier(text, score, delta):
    if delta == 0 and text >= 0.7:
        return "exact_match"
    if score >= 0.6:
        return "likely_match_needs_review"
    if score >= 0.4:
        return "possible_match"
    return None


def run():
    conn = connect()
    ensure_schema(conn)

    events = []
    for e in conn.execute("SELECT entity_id, name, year, description FROM events"):
        aliases = [(r["alias"], tokens(r["alias"])) for r in conn.execute(
            "SELECT alias FROM event_aliases WHERE entity_id = ?", (e["entity_id"],))]
        events.append({
            "id": e["entity_id"], "year": e["year"], "name_tokens": tokens(e["name"]),
            "desc_tokens": tokens(e["description"]),
            "aliases": [(a, t) for a, t in aliases if t],
        })

    weight = idf_weights([ev["name_tokens"] | ev["desc_tokens"]
                          | set().union(*(t for _, t in ev["aliases"])) for ev in events])
    # A one-word alias counts only if the word is rare (in ≤ 2 events): 'metallurgy', not 'wheel'.
    rare = math.log((len(events) + 1) / 3) + 1
    for ev in events:
        ev["aliases"] = [(a, t) for a, t in ev["aliases"]
                         if len(t) >= 2 or weight(next(iter(t))) >= rare]

    decided = {(r[0], r[1]) for r in conn.execute(
        "SELECT csv_event_id, entity_id FROM legacy_csv_crosswalk WHERE decision IS NOT NULL")}
    conn.execute("DELETE FROM legacy_csv_crosswalk WHERE decision IS NULL")

    rows = conn.execute("SELECT event_id, year_num, event, details FROM legacy_csv_rows "
                        "ORDER BY row_number").fetchall()
    proposed = 0
    for r in rows:
        csv_tokens = tokens(r["event"] + " " + r["details"])
        candidates = []
        for ev in events:
            text, score, delta, reasons = score_pair(csv_tokens, r["year_num"], ev, weight)
            t = tier(text, score, delta)
            if t and text >= MIN_TEXT:
                candidates.append((score, ev["id"], t, reasons))
        candidates.sort(key=lambda c: (-c[0], c[1]))
        for rank, (score, entity_id, t, reasons) in enumerate(candidates[:MAX_CANDIDATES], 1):
            if (r["event_id"], entity_id) in decided:
                continue
            conn.execute("INSERT INTO legacy_csv_crosswalk (csv_event_id, entity_id, rank, score, "
                         "tier, reasons) VALUES (?, ?, ?, ?, ?, ?)",
                         (r["event_id"], entity_id, rank, round(score, 3), t, reasons))
            proposed += 1
    conn.commit()

    write_report(conn, len(rows), proposed, len(decided))
    conn.close()
    return 0


def write_report(conn, total_rows, proposed, decided):
    q = lambda sql: conn.execute(sql).fetchall()
    best = "SELECT * FROM legacy_csv_crosswalk WHERE rank = 1"
    tiers = q(f"SELECT tier, COUNT(*) FROM ({best}) GROUP BY tier ORDER BY 2 DESC")
    unmatched = q("SELECT event_id, year_num, stem, event FROM legacy_csv_rows WHERE event_id "
                  "NOT IN (SELECT csv_event_id FROM legacy_csv_crosswalk) ORDER BY row_number")
    shared = q(f"SELECT entity_id, group_concat(csv_event_id, ', ') FROM ({best}) "
               "GROUP BY entity_id HAVING COUNT(*) > 1 ORDER BY COUNT(*) DESC, entity_id")
    orphan_events = q("SELECT COUNT(*) FROM events WHERE entity_id NOT IN "
                      "(SELECT entity_id FROM legacy_csv_crosswalk)")[0][0]

    matched_rows = total_rows - len(unmatched)
    lines = [
        "# CSV ↔ events reconciliation (proposals)", "",
        "Generated by `manage.py reconcile-events`. **Nothing has been merged.** Review pairs in"
        " the `v_csv_crosswalk_review` view and set `legacy_csv_crosswalk.decision` to"
        " `accepted` or `rejected`. Re-running keeps every decided pair.", "",
        "Score = 0.6 × text + 0.4 × year. Text = 0.7 × best of (name, alias) word coverage"
        " + 0.3 × the share of CSV words found in the event description. Words are weighted by"
        " rarity (IDF), so distinctive names count more than generic words. A shared year alone"
        f" never makes a candidate (text ≥ {MIN_TEXT}).", "",
        "## Summary", "",
        f"- CSV rows: {total_rows}. With at least one candidate: {matched_rows}."
        f" With none: {len(unmatched)}.",
        f"- Candidate pairs proposed this run: {proposed} (max {MAX_CANDIDATES} per row)."
        f" Pairs already decided and kept: {decided}.",
        f"- Events with no CSV candidate at all: {orphan_events}. These are probably newer"
        " than the CSV.", "",
        "Best candidate per CSV row, by tier:", "",
        *[f"- {t}: {n}" for t, n in tiers], "",
        f"## Events that are the best match for several CSV rows ({len(shared)})", "",
        "These are probably duplicate legacy rows, or rows that bundle several events.", "",
        *[f"- `{e}` ← CSV {ids}" for e, ids in shared], "",
        f"## CSV rows with no candidate ({len(unmatched)})", "",
        "These may be events the app doesn't have yet. They're worth reviewing as additions.", "",
        "| CSV id | Date | Event |", "|---:|---|---|",
        *[f"| {i} | {stem} | {text.replace('|', '/')[:140]} |" for i, _, stem, text in unmatched],
        "",
    ]
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "reconciliation.md").write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines[:16]))
    print(f"  ...full report: data/reports/reconciliation.md")
