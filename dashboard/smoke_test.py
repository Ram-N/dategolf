"""Headless check that every dashboard page renders without errors.

Run: npm run data:dashboard:test  (or: uv run --project dashboard python dashboard/smoke_test.py)
"""

import sys
from pathlib import Path

from streamlit.testing.v1 import AppTest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))  # so pages can `from lib import ...`

PAGES = ["views/overview.py", "views/coverage.py", "views/map.py"]


def check(path: str, after=None) -> list[str]:
    at = AppTest.from_file(str(HERE / path), default_timeout=60).run()
    if after:
        at = after(at)
    return [f"{path}: {e.message}" for e in at.exception]


def click_validate(at):
    button = next(b for b in at.button if b.label == "Validate now")
    return button.click().run()


problems = [p for page in PAGES for p in check(page)]
problems += check("views/overview.py", after=click_validate)

if problems:
    print("FAIL\n" + "\n".join(problems))
    sys.exit(1)
print(f"OK: {len(PAGES)} pages render, and 'Validate now' runs")
