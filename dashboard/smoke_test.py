"""Headless check that every dashboard page renders without errors.

Run: npm run data:dashboard:test  (or: uv run --project dashboard python dashboard/smoke_test.py)
"""

import os
import shutil
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
TMP = Path(tempfile.mkdtemp(prefix="dategolf-smoke-"))
shutil.copy(HERE.parent / "data" / "dategolf.db", TMP / "dategolf.db")
os.environ["DATEGOLF_DB"] = str(TMP / "dategolf.db")  # every write lands in the copy, never data/
sys.path.insert(0, str(HERE))  # so pages can `from lib import ...`

from streamlit.testing.v1 import AppTest  # noqa: E402

PAGES = ["views/overview.py", "views/review.py", "views/connections.py", "views/coverage.py", "views/map.py"]


def check(path: str, after=None) -> list[str]:
    at = AppTest.from_file(str(HERE / path), default_timeout=60).run()
    if after:
        at = after(at)
    return [f"{path}: {e.message}" for e in at.exception]


def click_validate(at):
    button = next(b for b in at.button if b.label == "Validate now")
    return button.click().run()


from lib import actions  # noqa: E402

ok, output = actions.update_schema()  # what app.py does once at startup
problems = [] if ok else [f"update_schema failed: {output}"]
problems += [p for page in PAGES for p in check(page)]
problems += check("views/overview.py", after=click_validate)

# A real review decision through the dashboard's action layer, on the copy.

ok, output = actions.decide_identity(["punic-wars"], "one")
if not ok:
    problems.append(f"decide_identity failed: {output}")
problems += check("views/review.py")  # still renders after a decision

# Links: load a batch on the copy (written as "followed"), then the Review and Connections pages must render.
import json  # noqa: E402

batch = TMP / "links.json"
batch.write_text(json.dumps({"origin": "test", "links": [
    {"source": "noyce-silicon-chip", "type": "followed", "target": "kilby-first-integrated-circuit",
     "why": "Noyce's silicon chip came a year after Kilby's germanium one, developed independently."}]}))
sys.path.insert(0, str(HERE.parent / "tools"))
import links  # noqa: E402

if links.load(batch) != 0:
    problems.append("links.load failed")
problems += check("views/review.py") + check("views/connections.py")

# Sources: the CSV import, then a proposed one; both pages render, and approving through the dashboard works.
import sources  # noqa: E402

sources.import_csv()
batch = TMP / "sources.json"
batch.write_text(json.dumps({"sources": [{"id": "noyce-silicon-chip", "title": "Integrated circuit",
                                          "url": "https://en.wikipedia.org/wiki/Integrated_circuit",
                                          "origin": "ai_drafted", "confidence": "high"}]}))
if sources.load(batch) != 0:
    problems.append("sources.load failed")
problems += check("views/review.py") + check("views/connections.py")
ok, output = actions.approve_sources(["noyce-silicon-chip"])
if not ok:
    problems.append(f"approve_sources failed: {output}")

# A draft with country tags fills two queues at once (Event drafts and Country tags). Their buttons
# share labels such as "Approve (0)", which crashed the page until every button had its own key.
import drafts  # noqa: E402

draft = TMP / "draft.json"
draft.write_text(json.dumps({"origin": "test", "events": [{
    "id": "smoke-test-draft", "name": "Smoke Test Draft", "year": 1234, "categories": ["Politics"],
    "region": "Europe", "aliases": ["smoke"], "description": "A test event.", "difficulty": "hard",
    "importance": 1, "countries": ["FR"]}]}))
drafts.load(draft)
problems += check("views/review.py")

# Span drafts have their own queue; approving one through the dashboard publishes it.
span = TMP / "span.json"
span.write_text(json.dumps({"origin": "test", "spans": [{
    "id": "smoke-test-span", "kind": "period", "name": "Smoke Test Span", "start_year": 1200, "end_year": 1250,
    "region": "Europe", "categories": ["Politics"], "importance": 1, "description": "A test span.",
    "countries": ["FR"], "approximate": True}]}))
drafts.load(span)
at = AppTest.from_file(str(HERE / "views/review.py"), default_timeout=60).run()
problems += [f"views/review.py: {e.message}" for e in at.exception]
if not any(t.label.startswith("Span drafts (") and t.label != "Span drafts (0)" for t in at.tabs):
    problems.append("the Span drafts tab doesn't list the proposed span")
ok, output = actions.approve_drafts(["smoke-test-span"])
if not ok:
    problems.append(f"approving a span draft failed: {output}")

# Significance: a proposed text shows in its queue; approving through the dashboard works.
ok, output = actions.set_significance("mughal-empire", "Its revenue system, courtly culture and architecture "
                                      "shaped South Asia for centuries, and its decline opened the way for "
                                      "regional powers.")
if not ok:
    problems.append(f"set_significance failed: {output}")
problems += check("views/review.py")
ok, output = actions.approve_significance(["mughal-empire"])
if not ok:
    problems.append(f"approve_significance failed: {output}")

# Memory aids: load one on the copy; the Review page must render it, and approving through actions must work.
import memory_aids  # noqa: E402
import sqlite3  # noqa: E402

aid_event = sqlite3.connect(TMP / "dategolf.db").execute(
    "SELECT entity_id FROM events WHERE year > 0 AND entity_id NOT IN "
    "(SELECT entity_id FROM learning_content_groups) ORDER BY entity_id LIMIT 1").fetchone()[0]
aids = TMP / "aids.json"
aids.write_text(json.dumps({"origin": "smoke", "aids": {aid_event: {"groups": [
    {"label": "Look Back", "items": ["A smoke-test anchor."]}]}}}))
if memory_aids.load(aids) != 0:
    problems.append("memory_aids.load failed")
problems += check("views/review.py")
ok, output = actions.approve_memory_aids([aid_event])
if not ok:
    problems.append(f"approve_memory_aids failed: {output}")

# Life-cycle phases: load a pair on the copy; the Review page must render them, and approving must work.
import phases  # noqa: E402

life = TMP / "phases.json"
life.write_text(json.dumps({"origin": "smoke", "phases": {"sur-empire": [
    {"kind": "foundation", "title": "A", "start_year": 1540, "end_year": 1545, "description": "x"},
    {"kind": "end", "title": "B", "start_year": 1545, "end_year": 1556, "description": "y"}]}}))
if phases.load(life) != 0:
    problems.append("phases.load failed")
problems += check("views/review.py")
ok, output = actions.approve_phases(["sur-empire"])
if not ok:
    problems.append(f"approve_phases failed: {output}")

# Search: the matching rule, then typed into the Review page's boxes (each must still render).
import pandas as pd  # noqa: E402
from lib.search import filter_rows  # noqa: E402

rows = pd.DataFrame({"name": ["Battle of Bạch Đằng", "Battle of Kadesh", "Borobudur"], "year": [938, -1274, None]})
for query, expected in [("", 3), ("battle", 2), ("bach dang", 1), ("BATTLE kadesh", 1), ("-1274", 1),
                        ("battle borobudur", 0), ("nan", 0)]:
    if len(filter_rows(rows, query)) != expected:
        problems.append(f"search {query!r}: {len(filter_rows(rows, query))} rows, expected {expected}")


def search_everywhere(at):
    for box in at.text_input:
        if box.key and box.key.startswith("search-"):
            box.input("kadesh")
    return at.run()


problems += check("views/review.py", after=search_everywhere)
shutil.rmtree(TMP, ignore_errors=True)

if problems:
    print("FAIL\n" + "\n".join(problems))
    sys.exit(1)
print(f"OK: {len(PAGES)} pages render, 'Validate now' runs, search works, and a review decision works "
      "(on a temporary copy)")
