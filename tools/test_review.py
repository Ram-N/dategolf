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
import edit  # noqa: E402
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
    """Log rows written by these tests (the copied db already holds the real decisions)."""
    return db().execute("SELECT action, detail, via FROM review_log WHERE entity_id = ? AND via = 'test' "
                        "ORDER BY id", (entity_id,)).fetchall()


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


class TestRename(unittest.TestCase):
    def test_event_keeps_old_name_as_alias(self):
        conn = db()
        old = conn.execute("SELECT name FROM events WHERE entity_id = 'holocaust'").fetchone()[0]
        self.assertEqual(quiet(edit.rename, "holocaust", "Test Holocaust Begins", "New text.", via="test"), 0)
        self.assertEqual(conn.execute("SELECT name, description FROM events WHERE entity_id = 'holocaust'").fetchone(),
                         ("Test Holocaust Begins", "New text."))
        aliases = [r[0] for r in conn.execute("SELECT alias FROM event_aliases WHERE entity_id = 'holocaust'")]
        self.assertIn(old, aliases)
        self.assertEqual(log_rows("holocaust")[-1][0], "rename-event")

    def test_span_and_refusals(self):
        self.assertEqual(quiet(edit.rename, "meiji-restoration", "Test Meiji Era", facet="span", via="test"), 0)
        self.assertEqual(db().execute("SELECT name FROM time_spans WHERE entity_id = 'meiji-restoration'"
                                      ).fetchone()[0], "Test Meiji Era")
        taken = db().execute("SELECT name FROM events WHERE entity_id = 'magna-carta'").fetchone()[0]
        self.assertEqual(quiet(edit.rename, "battle-of-hastings", taken, via="test"), 1)
        self.assertEqual(quiet(edit.rename, "no-such-id", "X", via="test"), 1)
        self.assertEqual(quiet(edit.rename, "battle-of-hastings", "  ", via="test"), 1)


    def test_set_span_years(self):
        self.assertEqual(quiet(edit.set_span_years, "construction-great-wall", -215, -206, True, via="test"), 0)
        self.assertEqual(db().execute("SELECT start_year, end_year, approximate FROM time_spans "
                                      "WHERE entity_id = 'construction-great-wall'").fetchone(), (-215, -206, 1))
        self.assertEqual(log_rows("construction-great-wall")[-1][0], "set-span-years")
        self.assertEqual(quiet(edit.set_span_years, "construction-great-wall", -200, -206, via="test"), 1)
        self.assertEqual(quiet(edit.set_span_years, "construction-great-wall", -1, 0, via="test"), 1)
        self.assertEqual(quiet(edit.set_span_years, "no-such-id", 1, 2, via="test"), 1)


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

    def test_drop_span_keeps_the_event(self):
        self.assertEqual(quiet(identity.decide, ["spanish-civil-war"], "drop-span", via="test"), 0)
        con = db()
        self.assertIsNone(con.execute("SELECT 1 FROM time_spans WHERE entity_id = 'spanish-civil-war'").fetchone())
        self.assertIsNone(con.execute("SELECT 1 FROM entity_categories WHERE entity_id = 'spanish-civil-war' "
                                      "AND facet = 'span'").fetchone())
        self.assertIsNotNone(con.execute("SELECT 1 FROM events WHERE entity_id = 'spanish-civil-war'").fetchone())
        self.assertIsNotNone(con.execute("SELECT 1 FROM entity_categories WHERE entity_id = 'spanish-civil-war' "
                                         "AND facet = 'event'").fetchone())
        self.assertEqual(con.execute("SELECT editorial_status FROM entities WHERE id = 'spanish-civil-war'").fetchone()[0],
                         "reviewed")
        action, detail, _ = log_rows("spanish-civil-war")[-1]
        self.assertEqual(action, "identity-drop-span")
        self.assertIn("1936 to 1939", detail)

    def test_drop_event_keeps_the_span(self):
        eid = "russo-japanese-war"  # each identity test uses its own id
        kind = db().execute("SELECT kind FROM time_spans WHERE entity_id = ?", (eid,)).fetchone()[0]
        self.assertEqual(quiet(identity.decide, [eid], "drop-event", via="test"), 0)
        con = db()
        self.assertIsNone(con.execute("SELECT 1 FROM events WHERE entity_id = ?", (eid,)).fetchone())
        self.assertIsNone(con.execute("SELECT 1 FROM event_aliases WHERE entity_id = ?", (eid,)).fetchone())
        self.assertIsNone(con.execute("SELECT 1 FROM entity_categories WHERE entity_id = ? AND facet = 'event'",
                                      (eid,)).fetchone())
        self.assertIsNotNone(con.execute("SELECT 1 FROM time_spans WHERE entity_id = ?", (eid,)).fetchone())
        self.assertIsNotNone(con.execute("SELECT 1 FROM entity_countries WHERE entity_id = ?", (eid,)).fetchone())
        self.assertEqual(con.execute("SELECT primary_type FROM entities WHERE id = ?", (eid,)).fetchone()[0], kind)
        action, detail, _ = log_rows(eid)[-1]
        self.assertEqual(action, "identity-drop-event")
        self.assertIn("(1904)", detail)

    def test_drop_event_refuses_a_milestone(self):
        con = db()
        con.execute("INSERT INTO milestone_designations (entity_id, display_order) VALUES ('russian-revolution', 99)")
        con.commit()
        self.assertEqual(quiet(identity.decide, ["russian-revolution"], "drop-event"), 1)
        self.assertIsNotNone(db().execute("SELECT 1 FROM events WHERE entity_id = 'russian-revolution'").fetchone())

    def test_split_moves_the_span_and_links_it(self):
        eid, new = "american-civil-war", "american-civil-war-period"
        span_cats = db().execute("SELECT category FROM entity_categories WHERE entity_id = ? AND facet = 'span'",
                                 (eid,)).fetchall()
        n_countries = db().execute("SELECT COUNT(*) FROM entity_countries WHERE entity_id = ?", (eid,)).fetchone()[0]
        self.assertEqual(quiet(identity.split, eid, new, via="test"), 0)
        con = db()
        self.assertIsNotNone(con.execute("SELECT 1 FROM events WHERE entity_id = ?", (eid,)).fetchone())
        self.assertIsNone(con.execute("SELECT 1 FROM time_spans WHERE entity_id = ?", (eid,)).fetchone())
        self.assertIsNotNone(con.execute("SELECT 1 FROM time_spans WHERE entity_id = ?", (new,)).fetchone())
        self.assertEqual(con.execute("SELECT category FROM entity_categories WHERE entity_id = ? AND facet = 'span'",
                                     (new,)).fetchall(), span_cats)
        self.assertEqual(con.execute("SELECT COUNT(*) FROM entity_countries WHERE entity_id = ?", (new,)).fetchone()[0],
                         n_countries)
        self.assertIsNotNone(con.execute("SELECT 1 FROM relationships WHERE source_entity_id = ? AND "
                                         "relationship_type = 'part_of' AND target_entity_id = ?", (eid, new)).fetchone())
        self.assertEqual(con.execute("PRAGMA foreign_key_check").fetchall(), [])
        self.assertEqual(log_rows(eid)[-1][0], "identity-split-done")

    def test_split_refuses_bad_ids(self):
        self.assertEqual(quiet(identity.split, "battle-of-plassey", "plassey-period"), 1)  # not shared
        self.assertEqual(quiet(identity.split, "french-revolution", "french-revolution"), 1)  # same id
        self.assertEqual(quiet(identity.split, "french-revolution", "roman-empire"), 1)  # already exists
        self.assertEqual(quiet(identity.split, "french-revolution", "Bad Id"), 1)  # not kebab-case

    def test_refuses_ids_that_are_not_shared(self):
        self.assertEqual(quiet(identity.decide, ["battle-of-plassey"], "one"), 1)
        self.assertEqual(quiet(identity.decide, ["punic-wars"], "maybe"), 1)


if __name__ == "__main__":
    try:
        unittest.main(verbosity=2)
    finally:
        shutil.rmtree(TMP, ignore_errors=True)
