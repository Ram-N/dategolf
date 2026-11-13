"""Tests for tools/ai_drafting.py (doc 15). The checker only reads the db; the trial load uses a copy.

Run: npm run data:test
"""

import contextlib
import copy
import io
import json
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
TMP = Path(tempfile.mkdtemp(prefix="dategolf-ai-"))
TEST_DB = TMP / "dategolf.db"
shutil.copy(HERE.parent / "data" / "dategolf.db", TEST_DB)
os.environ["DATEGOLF_DB"] = str(TEST_DB)  # must be set before the tools are imported
sys.path.insert(0, str(HERE))

import ai_drafting  # noqa: E402
import common  # noqa: E402

EXAMPLE = json.loads((HERE.parent / "data" / "drafts" / "examples" / "ai_draft_example_akbar.json").read_text())

# The example drafts real gap items; once those are drafted in the live db, take them out of the copy again.
with __import__("sqlite3").connect(TEST_DB) as _db:
    _db.execute("PRAGMA foreign_keys = ON")
    _ids = [x["id"] for x in EXAMPLE["events"] + EXAMPLE["spans"]]
    _db.execute(f"DELETE FROM entities WHERE id IN ({','.join('?' * len(_ids))})", _ids)
    _db.execute("UPDATE missing_entities SET status = 'wanted', entity_id = NULL WHERE id IN (2, 3)")


def check(batch, name, fenced=False, trial=False):
    path = TMP / f"{name}.json"
    text = json.dumps(batch)
    path.write_text(f"```json\n{text}\n```" if fenced else text)
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        code = ai_drafting.check(path, trial=trial)
    return code, out.getvalue()


def variant(**changes):
    b = copy.deepcopy(EXAMPLE)
    b["events"][0].update(changes)
    return b


class TestCheck(unittest.TestCase):
    def test_safety(self):
        self.assertEqual(common.DB_PATH, TEST_DB)

    def test_the_doc_15_example_passes_with_a_trial_load(self):
        code, out = check(EXAMPLE, "example", fenced=True, trial=True)
        self.assertEqual(code, 0, out)
        self.assertIn("Ready to load", out)
        self.assertIsNone(__import__("sqlite3").connect(TEST_DB).execute(
            "SELECT 1 FROM entities WHERE id = 'akbar-becomes-mughal-emperor'").fetchone())  # trial only

    def test_catches_each_kind_of_mistake(self):
        cases = {
            "leak": (variant(description="In 1556 the young Akbar becomes emperor after his father dies in a fall."),
                     "mentions a year near the answer"),
            "region": (variant(region="India"), "not one of the allowed regions"),
            "existing": (variant(id="death-of-akbar"), "already exists"),
            "approx": (variant(approximate=True), "needs date_display"),
            "gap": (variant(fills_missing=3), "is a span, not a event"),
            "country": (variant(countries=["XX"]), "not a known ISO code"),
            "id": (variant(id="Akbar_Accession"), "lowercase-words-with-hyphens"),
            "year0": (variant(year=0), "never 0"),
            "source": (variant(source="https://example.com/akbar"), "English Wikipedia"),
            "alias": (variant(aliases=["Akbar 1556"]), "gives away the year"),
        }
        for name, (batch, expected) in cases.items():
            code, out = check(batch, name)
            self.assertEqual(code, 1, name)
            self.assertIn(expected, out, name)

    def test_checks_significance(self):
        text = "Its reforms and conquests shaped the empire for a century and gave it a durable structure."
        cases = {
            "markup": (variant(significance="<b>Big</b> " + text), "plain text"),
            "unknown": ({"origin": "ai_drafted:test", "significance": [{"id": "no-such-id", "text": text}]},
                        "not an existing event or span"),
            "twice": ({"origin": "ai_drafted:test", "significance": [{"id": "death-of-akbar", "text": text}] * 2},
                      "two significance texts"),
        }
        for name, (batch, expected) in cases.items():
            code, out = check(batch, name)
            self.assertEqual(code, 1, name)
            self.assertIn(expected, out, name)
        code, out = check({"origin": "ai_drafted:test", "significance": [{"id": "death-of-akbar", "text": text}]},
                          "backfill", trial=True)
        self.assertEqual(code, 0, out)

    def test_trial_load_catches_a_bad_link(self):
        b = copy.deepcopy(EXAMPLE)
        b["links"].append({"source": "reign-of-akbar", "type": "part_of", "target": "no-such-id", "why": "x"})
        code, out = check(b, "badlink", trial=True)
        self.assertEqual(code, 1)
        self.assertIn("unknown id no-such-id", out)

    def test_reference_lists_ids_and_gaps(self):
        out = TMP / "ref.md"
        with contextlib.redirect_stdout(io.StringIO()):
            ai_drafting.reference(out)
        text = out.read_text()
        self.assertIn("| death-of-akbar | Death of Akbar | 1605 |", text)
        self.assertIn("Akbar Becomes Mughal Emperor", text)  # gap item 2
        self.assertIn("`began`", text)


if __name__ == "__main__":
    try:
        unittest.main(verbosity=1)
    finally:
        shutil.rmtree(TMP, ignore_errors=True)
