"""Sources (Step 5): attach a Wikipedia article (or another source) to each event and span.

Three ways in:
  import-csv-sources   the URLs in events_master.csv, copied as reviewed (they're the user's own data)
  suggest-sources      writes a draft file: each unsourced entity's name, or a picked title, checked
                       against Wikipedia (exists? redirect? disambiguation?). Loads nothing.
  load-sources <file>  loads a draft file as proposed (all-or-nothing)

Picks file (JSON) for suggest-sources --picks:
  {"picks": {"<entity id>": "Article title" | {"title", "confidence"?, "note"?} | null}}
null means "no good article": the entity is left out of the batch.
"""

import json
import sqlite3
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

from common import DATA, connect, ensure_schema, log

API = "https://en.wikipedia.org/w/api.php"
WIKI = "https://en.wikipedia.org/wiki/"
# Wikipedia asks for a descriptive User-Agent with a contact; no personal data is sent.
USER_AGENT = "DateGolfDataTool/0.1 (https://github.com/Ram-N; educational history games)"


def wiki_url(title, fragment=None):
    url = WIKI + urllib.parse.quote(title.replace(" ", "_"), safe="_()',-.!:/")
    if fragment:
        url += "#" + urllib.parse.quote(fragment.replace(" ", "_"), safe="_()',-.!:/")
    return url


def title_from_url(url):
    """The page title in a Wikipedia URL, without its #section."""
    path = urllib.parse.urlsplit(url).path
    return urllib.parse.unquote(path.rsplit("/wiki/", 1)[-1]).replace("_", " ")


def wikipedia_resolve(titles):
    """Ask Wikipedia about each title. Returns {asked: {"title", "fragment"} or {"problem"}}.

    Follows normalisation ("printing press" → "Printing press") and redirects
    ("Fall of Rome" → "Fall of the Western Roman Empire"); flags missing and disambiguation pages.
    """
    out = {}
    titles = list(dict.fromkeys(titles))
    for i in range(0, len(titles), 50):
        chunk = titles[i:i + 50]
        query = urllib.parse.urlencode({"action": "query", "format": "json", "redirects": 1, "prop": "pageprops",
                                        "ppprop": "disambiguation", "titles": "|".join(chunk)})
        request = urllib.request.Request(f"{API}?{query}", headers={"User-Agent": USER_AGENT})
        for attempt in range(4):
            try:
                with urllib.request.urlopen(request, timeout=30) as resp:
                    data = json.load(resp)["query"]
                break
            except urllib.error.HTTPError as exc:
                if exc.code != 429 or attempt == 3:
                    raise
                time.sleep(5 * (attempt + 1))
        normalized = {n["from"]: n["to"] for n in data.get("normalized", [])}
        redirects = {r["from"]: (r["to"], r.get("tofragment")) for r in data.get("redirects", [])}
        pages = {p["title"]: p for p in data.get("pages", {}).values()}
        for asked in chunk:
            title = normalized.get(asked, asked)
            title, fragment = redirects.get(title, (title, None))
            page = pages.get(title, {})
            if "missing" in page or "invalid" in page or not page:
                out[asked] = {"problem": "no such article"}
            elif "pageprops" in page:
                out[asked] = {"problem": f"disambiguation page ({title})"}
            else:
                out[asked] = {"title": title, "fragment": fragment}
        time.sleep(1)
    return out


resolve = wikipedia_resolve  # tests swap in an offline fake


def attach(conn, entity_id, title, url, status, origin, confidence=None, note=None, kind="wikipedia"):
    """Link a source to an entity, creating the source row if it's new. Returns True if newly linked."""
    conn.execute("INSERT OR IGNORE INTO sources (kind, title, url) VALUES (?, ?, ?)", (kind, title, url))
    source_id = conn.execute("SELECT id FROM sources WHERE url = ?", (url,)).fetchone()[0]
    cur = conn.execute("INSERT OR IGNORE INTO entity_sources (entity_id, source_id, status, origin, confidence, note) "
                       "VALUES (?, ?, ?, ?, ?, ?)", (entity_id, source_id, status, origin, confidence, note))
    return bool(cur.rowcount)


def drop_orphans(conn):
    """Delete sources that no entity uses any more (after a reject)."""
    conn.execute("DELETE FROM sources WHERE id NOT IN (SELECT source_id FROM entity_sources)")


# ── CSV URLs ─────────────────────────────────────────────────────────────────

def import_csv():
    """Copy the CSV's Wikipedia URLs onto their events (accepted matches and drafts made from a row)."""
    conn = connect()
    ensure_schema(conn)
    rows = conn.execute("""
        SELECT x.entity_id, c.wikipedia, c.event_id FROM legacy_csv_rows c
        JOIN legacy_csv_crosswalk x ON x.csv_event_id = c.event_id AND x.decision = 'accepted'
        WHERE c.wikipedia <> ''
        UNION
        SELECT p.entity_id, c.wikipedia, c.event_id FROM legacy_csv_rows c
        JOIN entity_provenance p ON p.csv_event_id = c.event_id
        WHERE c.wikipedia <> ''
        ORDER BY 1""").fetchall()
    added = 0
    for entity_id, url, csv_id in rows:
        url = url.strip()
        if attach(conn, entity_id, title_from_url(url), url, "reviewed", "csv", note=f"CSV row {csv_id}"):
            log(conn, "import-csv-source", entity_id, url)
            added += 1
    conn.commit()
    conn.close()
    print(f"  {added} CSV sources newly attached ({len(rows)} CSV row links checked; repeats and "
          "ones already attached are skipped).")
    return 0


# ── Suggest, then load ───────────────────────────────────────────────────────

def _read_picks(path):
    if not path:
        return {}
    picks = json.loads(Path(path).read_text(encoding="utf-8"))["picks"]
    return {k: ({"title": v} if isinstance(v, str) else v) for k, v in picks.items()}


def suggest(picks_path=None, out_path=None):
    """Write a draft batch of sources for every entity that has none. Never loads anything."""
    picks = _read_picks(picks_path)
    conn = connect()
    ensure_schema(conn)
    unsourced = conn.execute("""
        SELECT n.id, coalesce(e.name, s.name) AS name, coalesce(e.year, s.start_year) AS year
        FROM entities n LEFT JOIN events e ON e.entity_id = n.id LEFT JOIN time_spans s ON s.entity_id = n.id
        WHERE n.editorial_status <> 'proposed' AND n.id NOT IN (SELECT entity_id FROM entity_sources)
        ORDER BY year, n.id""").fetchall()
    conn.close()

    asks = {}
    for entity_id, name, _ in unsourced:
        if entity_id not in picks:
            asks[entity_id] = {"title": name, "_name": True}  # try the name itself
        elif picks[entity_id] is not None:
            asks[entity_id] = picks[entity_id]
    answers = resolve([a["title"] for a in asks.values()]) if asks else {}

    found, unresolved, skipped = [], [], 0
    for entity_id, name, year in unsourced:
        pick = asks.get(entity_id)
        if pick is None:
            skipped += 1
            continue
        answer = answers[pick["title"]]
        if "problem" in answer:
            unresolved.append({"id": entity_id, "name": name, "year": year, "asked": pick["title"],
                               "problem": answer["problem"]})
            continue
        by_name = pick.get("_name", False)
        exact = answer["title"].casefold() == pick["title"].casefold() and not answer["fragment"]
        found.append({
            "id": entity_id, "name": name, "year": year, "title": answer["title"],
            "url": wiki_url(answer["title"], answer["fragment"]),
            "origin": "title_match" if by_name else "ai_drafted",
            "confidence": pick.get("confidence") or ("high" if exact else "medium"),
            "asked": pick["title"], "note": pick.get("note"),
        })
    out = Path(out_path) if out_path else DATA / "drafts" / f"{date.today():%Y-%m-%d}_sources_suggestions.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({
        "about": "From suggest-sources. Every title was checked against Wikipedia. 'unresolved' entities "
                 "need a pick (suggest-sources --picks). load-sources loads 'sources' only.",
        "sources": found, "unresolved": unresolved}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"  {len(found)} sources found, {len(unresolved)} unresolved, {skipped} picked as 'no article'. "
          f"Wrote {out}")
    return 0


def load(path):
    """Load a batch's 'sources' as proposed. One bad entry rejects the whole batch."""
    batch = json.loads(Path(path).read_text(encoding="utf-8"))
    conn = connect()
    ensure_schema(conn)
    known = {r[0] for r in conn.execute("SELECT id FROM entities")}
    existing = {tuple(r) for r in conn.execute(
        "SELECT x.entity_id, o.url FROM entity_sources x JOIN sources o ON o.id = x.source_id")}
    problems, seen = [], set()
    for n, s in enumerate(batch["sources"], start=1):
        entity_id, url, title = s.get("id", ""), s.get("url") or "", s.get("title") or ""
        where = f"source {n} ({entity_id})"
        if entity_id not in known:
            problems.append(f"{where}: unknown id")
        if not url.startswith("https://") or not title:
            problems.append(f"{where}: needs a title and an https url")
        if (entity_id, url) in existing or (entity_id, url) in seen:
            problems.append(f"{where}: already has {url}")
        if s.get("origin") not in ("title_match", "ai_drafted"):
            problems.append(f"{where}: origin must be title_match or ai_drafted")
        seen.add((entity_id, url))
    if problems:
        print("  ✗ Nothing loaded:\n    " + "\n    ".join(problems))
        conn.close()
        return 1
    try:
        for s in batch["sources"]:
            attach(conn, s["id"], s["title"], s["url"], "proposed", s["origin"], s.get("confidence"), s.get("note"))
    except sqlite3.Error as exc:
        conn.rollback()
        raise SystemExit(f"Nothing loaded: {exc} (while loading {path})")
    conn.commit()
    conn.close()
    print(f"  Loaded {len(batch['sources'])} sources as proposed. Review them on the dashboard "
          "(Review → Sources) or with approve-sources / reject-sources.")
    return 0


# ── Review ───────────────────────────────────────────────────────────────────

def approve(ids, via="cli", title_matches=False):
    """Mark an entity's proposed sources reviewed. title_matches: every high-confidence name match."""
    conn = connect()
    if title_matches:
        ids = [r[0] for r in conn.execute("SELECT DISTINCT entity_id FROM entity_sources WHERE status = 'proposed' "
                                          "AND origin = 'title_match' AND confidence = 'high' ORDER BY 1")]
    ok = True
    for entity_id in ids:
        titles = [r[0] for r in conn.execute(
            "SELECT o.title FROM entity_sources x JOIN sources o ON o.id = x.source_id "
            "WHERE x.entity_id = ? AND x.status = 'proposed'", (entity_id,))]
        if not titles:
            ok = False
            print(f"  ✗ no proposed source for {entity_id}")
            continue
        conn.execute("UPDATE entity_sources SET status = 'reviewed' WHERE entity_id = ? AND status = 'proposed'",
                     (entity_id,))
        log(conn, "approve-source", entity_id, "; ".join(titles), via=via)
        print(f"  ✓ approved {entity_id}: {'; '.join(titles)}")
    conn.commit()
    conn.close()
    return 0 if ok else 1


def reject(ids, reason, via="cli"):
    """Delete an entity's proposed sources (reviewed ones stay)."""
    if not reason or not reason.strip():
        print("  ✗ a reason is required")
        return 1
    conn = connect()
    ok = True
    for entity_id in ids:
        titles = [r[0] for r in conn.execute(
            "SELECT o.title FROM entity_sources x JOIN sources o ON o.id = x.source_id "
            "WHERE x.entity_id = ? AND x.status = 'proposed'", (entity_id,))]
        if not titles:
            ok = False
            print(f"  ✗ no proposed source for {entity_id}")
            continue
        conn.execute("DELETE FROM entity_sources WHERE entity_id = ? AND status = 'proposed'", (entity_id,))
        log(conn, "reject-source", entity_id, f"{'; '.join(titles)} — {reason.strip()}", via=via)
        print(f"  ✓ rejected {entity_id}: {'; '.join(titles)}")
    drop_orphans(conn)
    conn.commit()
    conn.close()
    return 0 if ok else 1
