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

shutil.rmtree(TMP, ignore_errors=True)
if problems:
    print("FAIL\n" + "\n".join(problems))
    sys.exit(1)
print(f"OK: {len(PAGES)} pages render, 'Validate now' runs, and a review decision works (on a temporary copy)")
