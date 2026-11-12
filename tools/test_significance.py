"""Tests for tools/significance.py ("Why it matters", doc 17), run against a temporary copy of the db.

Run: npm run data:test
"""

import contextlib
import io
import json
import os
import shutil
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
TMP = Path(tempfile.mkdtemp(prefix="dategolf-significance-"))
TEST_DB = TMP / "dategolf.db"
shutil.copy(HERE.parent / "data" / "dategolf.db", TEST_DB)
os.environ["DATEGOLF_DB"] = str(TEST_DB)  # must be set before the tools are imported
sys.path.insert(0, str(HERE))

import common  # noqa: E402
import drafts  # noqa: E402
import exporter  # noqa: E402
import significance  # noqa: E402
import validate  # noqa: E402

TEXT = ("The empire's revenue system, courtly culture and architecture shaped South Asia for centuries, "
        "and its decline opened the way for regional powers and, later, British rule.")


def quiet(fn, *args, **kwargs):
    with contextlib.redirect_stdout(io.StringIO()):
        return fn(*args, **kwargs)


def db():
    return sqlite3.connect(TEST_DB)


def row(entity_id):
    return db().execute("SELECT text, status, origin FROM entity_significance WHERE entity_id = ?",
                        (entity_id,)).fetchone()


def exported(name, entity_id):
    conn = common.connect()
    render = exporter.render_events if name == "events" else exporter.render_durations
    recs = {r["id"]: r for r in json.loads(render(conn))}
    conn.close()
    return recs[entity_id].get("significance")


def batch(rows, name="batch", **extra):
    path = TMP / f"{name}.json"
    path.write_text(json.dumps({"origin": "test", "significance": rows, **extra}))
    return path


with contextlib.closing(common.connect()) as _conn:  # the copy gets the table, emptied: tests own its rows
    common.ensure_schema(_conn)
    _conn.execute("DELETE FROM entity_significance")
    _conn.commit()


class TestText(unittest.TestCase):
    def test_safety(self):
        self.assertEqual(common.DB_PATH, TEST_DB)

    def test_problems(self):
        self.assertEqual(significance.text_problems(TEXT), ([], []))
        self.assertIn("empty", significance.text_problems("  ")[0][0])
        self.assertIn("plain text", significance.text_problems("**Big** " + TEXT)[0][0])
        self.assertIn("words", significance.text_problems("Too short.")[1][0])
        self.assertIn("whole story", significance.text_problems(TEXT + " It single-handedly ended it.")[1][0])
        self.assertIn("repeats", significance.text_problems(TEXT, description=TEXT)[1][0])


class TestReview(unittest.TestCase):
    def test_only_reviewed_text_exports(self):
        quiet(significance.load, batch([{"id": "mughal-empire", "text": TEXT}], "mughal"))
        self.assertEqual(row("mughal-empire"), (TEXT, "proposed", "test"))
        self.assertIsNone(exported("durations", "mughal-empire"))
        self.assertEqual(quiet(significance.approve, ["mughal-empire"], "test"), 0)
        self.assertEqual(exported("durations", "mughal-empire"), TEXT)

    def test_editing_makes_it_proposed_again(self):
        quiet(significance.set_text, "chernobyl-disaster", TEXT, "test")
        quiet(significance.approve, ["chernobyl-disaster"], "test")
        self.assertEqual(exported("events", "chernobyl-disaster"), TEXT)
        quiet(significance.set_text, "chernobyl-disaster", TEXT + " Edited.", "test")
        self.assertEqual(row("chernobyl-disaster")[1], "proposed")
        self.assertIsNone(exported("events", "chernobyl-disaster"))

    def test_reject_needs_a_reason_and_logs_it(self):
        quiet(significance.set_text, "death-of-akbar", TEXT, "test")
        self.assertEqual(quiet(significance.reject, ["death-of-akbar"], " ", "test"), 1)
        self.assertEqual(quiet(significance.reject, ["death-of-akbar"], "overclaims", "test"), 0)
        self.assertIsNone(row("death-of-akbar"))
        detail = db().execute("SELECT detail FROM review_log WHERE action = 'reject-significance' "
                              "AND entity_id = 'death-of-akbar'").fetchone()[0]
        self.assertIn("overclaims", detail)

    def test_bad_batches_load_nothing(self):
        cases = {"unknown": [{"id": "no-such-id", "text": TEXT}],
                 "empty": [{"id": "soviet-union", "text": " "}],
                 "twice": [{"id": "soviet-union", "text": TEXT}, {"id": "soviet-union", "text": TEXT}]}
        for name, rows in cases.items():
            with self.assertRaises(SystemExit, msg=name):
                quiet(significance.load, batch(rows, name))
            self.assertIsNone(row("soviet-union"), name)

    def test_unknown_id_is_refused(self):
        self.assertEqual(quiet(significance.set_text, "no-such-id", TEXT), 1)


class TestDrafts(unittest.TestCase):
    def test_follows_its_draft(self):
        path = TMP / "draft.json"
        path.write_text(json.dumps({"origin": "test", "events": [{
            "id": "significance-test", "name": "Significance Test", "year": 1234, "categories": ["Politics"],
            "region": "Europe", "aliases": ["test alias"], "description": "A test event.",
            "difficulty": "hard", "importance": 1, "significance": TEXT}]}))
        quiet(drafts.load, path)
        self.assertEqual(row("significance-test")[1], "proposed")
        quiet(drafts.approve, ["significance-test"], "test")
        self.assertEqual(row("significance-test")[1], "reviewed")
        self.assertEqual(exported("events", "significance-test"), TEXT)

    def test_significance_only_batch(self):
        quiet(drafts.load, batch([{"id": "soviet-afghan-war", "text": TEXT}], "only"))
        self.assertEqual(row("soviet-afghan-war")[1], "proposed")

    def test_accepts_significance_as_the_key(self):
        quiet(significance.load, batch([{"id": "ottoman-empire", "significance": TEXT}], "key"))
        self.assertEqual(row("ottoman-empire")[0], TEXT)


class TestValidate(unittest.TestCase):
    def test_still_no_errors(self):
        quiet(validate.run)
        report = json.loads((common.REPORTS / "validate.json").read_text())
        errors = [c["check"] for c in report["checks"] if c.get("severity") == "error" and c["rows"]]
        self.assertEqual(errors, [])


if __name__ == "__main__":
    try:
        unittest.main(verbosity=1)
    finally:
        shutil.rmtree(TMP, ignore_errors=True)
