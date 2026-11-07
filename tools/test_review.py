"""Tests for the review functions, run against a temporary copy of the db (never the real one).

Run: npm run data:test   (or: uv run python tools/test_review.py)
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
TMP = Path(tempfile.mkdtemp(prefix="dategolf-test-"))
TEST_DB = TMP / "dategolf.db"
shutil.copy(HERE.parent / "data" / "dategolf.db", TEST_DB)
os.environ["DATEGOLF_DB"] = str(TEST_DB)  # must be set before the tools are imported
sys.path.insert(0, str(HERE))

import common  # noqa: E402
import countries  # noqa: E402
import drafts  # noqa: E402
import identity  # noqa: E402


def quiet(fn, *args, **kwargs):
    with contextlib.redirect_stdout(io.StringIO()):
        return fn(*args, **kwargs)


def db():
    return sqlite3.connect(TEST_DB)


def load_draft(entity_id, csv_event_id=None):
    batch = {"origin": "test", "events": [{
        "id": entity_id, "name": f"Test {entity_id}", "year": 1234, "categories": ["Politics"],
        "region": "Europe", "aliases": ["test alias"], "description": "A test event.",
        "difficulty": "hard", "importance": 1, **({"csv_event_id": csv_event_id} if csv_event_id else {})}]}
    path = TMP / f"{entity_id}.json"
    path.write_text(json.dumps(batch))
    quiet(drafts.load, path)


def log_rows(entity_id):
    return db().execute("SELECT action, detail, via FROM review_log WHERE entity_id = ?", (entity_id,)).fetchall()


class TestSafety(unittest.TestCase):
    def test_uses_the_temporary_copy(self):
        self.assertEqual(common.DB_PATH, TEST_DB)
        self.assertEqual(common.REPORTS, TMP / "reports")


class TestDrafts(unittest.TestCase):
    def test_approve_publishes_and_logs(self):
        load_draft("test-approve")
        self.assertEqual(quiet(drafts.approve, ["test-approve"], via="test"), 0)
        status = db().execute("SELECT editorial_status FROM entities WHERE id = 'test-approve'").fetchone()[0]
        self.assertEqual(status, "reviewed")
        self.assertEqual(log_rows("test-approve"), [("approve-draft", None, "test")])

    def test_approve_refuses_non_drafts(self):
        self.assertEqual(quiet(drafts.approve, ["battle-of-plassey"]), 1)

    def test_reject_deletes_and_logs(self):
        load_draft("test-reject")
        self.assertEqual(quiet(drafts.reject, ["test-reject"], "duplicate", via="test"), 0)
        self.assertIsNone(db().execute("SELECT 1 FROM entities WHERE id = 'test-reject'").fetchone())
        self.assertIsNone(db().execute("SELECT 1 FROM event_aliases WHERE entity_id = 'test-reject'").fetchone())
        self.assertEqual(log_rows("test-reject"), [("reject-draft", "duplicate", "test")])

    def test_reject_needs_a_reason(self):
        load_draft("test-reason")
        self.assertEqual(quiet(drafts.reject, ["test-reason"], "  "), 1)
        self.assertIsNotNone(db().execute("SELECT 1 FROM entities WHERE id = 'test-reason'").fetchone())

    def test_reject_notes_the_csv_row(self):
        # CSV row 21 also produced life-of-the-buddha, so the row stays 'drafted' but gains a note.
        load_draft("test-csv-draft", csv_event_id=21)
        quiet(drafts.reject, ["test-csv-draft"], "not needed")
        outcome, note = db().execute("SELECT outcome, note FROM legacy_csv_triage WHERE csv_event_id = 21").fetchone()
        self.assertEqual(outcome, "drafted")
        self.assertIn("Draft test-csv-draft rejected at review: not needed", note)


class TestCountries(unittest.TestCase):
    def test_set_tags_replaces_and_logs(self):
        self.assertEqual(quiet(countries.set_tags, "battle-of-zama", "TN, IT/actor", via="test"), 0)
        rows = db().execute("SELECT country, role, status FROM entity_countries WHERE entity_id = 'battle-of-zama' "
                            "ORDER BY position").fetchall()
        self.assertEqual(rows, [("TN", "location", "reviewed"), ("IT", "actor", "reviewed")])
        self.assertEqual(log_rows("battle-of-zama")[-1][0], "set-countries")

    def test_set_tags_refuses_bad_input(self):
        before = db().execute("SELECT country FROM entity_countries WHERE entity_id = 'hijra'").fetchall()
        for spec in ("QQ", "SA/boss", "SA, SA", ""):
            self.assertEqual(quiet(countries.set_tags, "hijra", spec), 1, spec)
        after = db().execute("SELECT country FROM entity_countries WHERE entity_id = 'hijra'").fetchall()
        self.assertEqual(before, after)

    def test_approve_with_nothing_to_approve(self):
        self.assertEqual(quiet(countries.approve, [], True), 0)


class TestIdentity(unittest.TestCase):
    def test_one_subject(self):
        self.assertEqual(quiet(identity.decide, ["punic-wars"], "one", via="test"), 0)
        status = db().execute("SELECT editorial_status FROM entities WHERE id = 'punic-wars'").fetchone()[0]
        self.assertEqual(status, "reviewed")
        self.assertEqual(log_rows("punic-wars"), [("identity-one", None, "test")])

    def test_split_flag(self):
        quiet(identity.decide, ["korean-war"], "split")
        status = db().execute("SELECT editorial_status FROM entities WHERE id = 'korean-war'").fetchone()[0]
        self.assertEqual(status, "needs_split")

    def test_refuses_ids_that_are_not_shared(self):
        self.assertEqual(quiet(identity.decide, ["battle-of-plassey"], "one"), 1)
        self.assertEqual(quiet(identity.decide, ["punic-wars"], "maybe"), 1)


if __name__ == "__main__":
    try:
        unittest.main(verbosity=2)
    finally:
        shutil.rmtree(TMP, ignore_errors=True)
