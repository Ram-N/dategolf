"""Tests for tools/links.py, run against a temporary copy of the db (never the real one).

Run: npm run data:test   (runs this and test_review.py)
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
TMP = Path(tempfile.mkdtemp(prefix="dategolf-links-"))
TEST_DB = TMP / "dategolf.db"
shutil.copy(HERE.parent / "data" / "dategolf.db", TEST_DB)
os.environ["DATEGOLF_DB"] = str(TEST_DB)  # must be set before the tools are imported
sys.path.insert(0, str(HERE))

import common  # noqa: E402
import links  # noqa: E402
import validate  # noqa: E402


def quiet(fn, *args, **kwargs):
    with contextlib.redirect_stdout(io.StringIO()):
        return fn(*args, **kwargs)


def db():
    return sqlite3.connect(TEST_DB)


def load(*rows, name="batch"):
    path = TMP / f"{name}.json"
    path.write_text(json.dumps({"origin": "test", "links": [
        dict(zip(("source", "type", "target", "why"), r)) for r in rows]}))
    return quiet(links.load, path)


def stored(source, rtype, target):
    return db().execute("SELECT id, editorial_status, origin FROM relationships WHERE source_entity_id = ? "
                        "AND relationship_type = ? AND target_entity_id = ?", (source, rtype, target)).fetchone()


class TestLoad(unittest.TestCase):
    def test_safety(self):
        self.assertEqual(common.DB_PATH, TEST_DB)

    def test_loads_as_proposed(self):
        # Sample links are deliberately absurd: a real one would break the test once a batch adds it.
        self.assertEqual(load(("thales-solar-eclipse", "triggered", "iphone-launched", "test only")), 0)
        row = stored("thales-solar-eclipse", "triggered", "iphone-launched")
        self.assertEqual(row[1:], ("proposed", "test"))

    def test_followed_is_stored_as_preceded(self):
        self.assertEqual(load(("noyce-silicon-chip", "followed", "kilby-first-integrated-circuit", "came after")), 0)
        self.assertIsNotNone(stored("kilby-first-integrated-circuit", "preceded", "noyce-silicon-chip"))
        self.assertIsNone(stored("noyce-silicon-chip", "followed", "kilby-first-integrated-circuit"))

    def test_same_link_written_both_ways_is_a_duplicate(self):
        # A pair that will never be a real link, so the test doesn't depend on the data.
        self.assertEqual(load(("fall-of-troy", "preceded", "sputnik-launch", "x"),
                              ("sputnik-launch", "followed", "fall-of-troy", "x")), 1)
        self.assertIsNone(stored("fall-of-troy", "preceded", "sputnik-launch"))  # all-or-nothing

    def test_symmetric_links_are_stored_in_order(self):
        self.assertEqual(load(("moon-landing", "contemporary_with", "jfk-assassination", "same decade")), 0)
        self.assertIsNotNone(stored("jfk-assassination", "contemporary_with", "moon-landing"))
        self.assertEqual(load(("jfk-assassination", "contemporary_with", "moon-landing", "again"), name="b2"), 1)

    def test_refuses_bad_links(self):
        cases = [("nope", "part_of", "punic-wars", "x"),           # unknown id
                 ("battle-of-zama", "caused_by", "punic-wars", "x"),  # unknown type
                 ("battle-of-zama", "part_of", "battle-of-zama", "x"),  # self-link
                 ("battle-of-zama", "part_of", "punic-wars", "")]   # no why
        for i, case in enumerate(cases):
            self.assertEqual(load(case, name=f"bad{i}"), 1, case)

    def test_refuses_a_contradiction(self):
        self.assertEqual(load(("battle-of-hastings", "preceded", "magna-carta", "x"), name="c1"), 0)
        self.assertEqual(load(("magna-carta", "preceded", "battle-of-hastings", "x"), name="c2"), 1)


class TestReview(unittest.TestCase):
    def test_approve_and_reject_are_logged(self):
        load(("fall-of-troy", "contributed_to", "google-founded", "test only"),
             ("salt-march-placeholder", "part_of", "x", "x"), name="rv")  # whole batch refused: unknown ids
        self.assertIsNone(stored("fall-of-troy", "contributed_to", "google-founded"))
        load(("fall-of-troy", "contributed_to", "google-founded", "test only"), name="rv2")
        lid = stored("fall-of-troy", "contributed_to", "google-founded")[0]
        self.assertEqual(quiet(links.approve, [lid], via="test"), 0)
        self.assertEqual(stored("fall-of-troy", "contributed_to", "google-founded")[1], "reviewed")
        self.assertEqual(quiet(links.approve, [lid]), 1)  # no longer proposed

        load(("eruption-of-vesuvius", "enabled", "amazon-founded", "test only"), name="rv3")
        lid2 = stored("eruption-of-vesuvius", "enabled", "amazon-founded")[0]
        self.assertEqual(quiet(links.reject, [lid2], "  "), 1)  # reason required
        self.assertEqual(quiet(links.reject, [lid2], "duplicate idea", via="test"), 0)
        self.assertIsNone(stored("eruption-of-vesuvius", "enabled", "amazon-founded"))
        actions = [r[0] for r in db().execute("SELECT action FROM review_log WHERE via = 'test'")]
        self.assertIn("approve-link", actions)
        self.assertIn("reject-link", actions)


class TestValidation(unittest.TestCase):
    def check_rows(self, name):
        quiet(validate.run)
        report = json.loads((common.REPORTS / "validate.json").read_text())
        return next(c for c in report["checks"] if c["check"].startswith(name))["rows"]

    def test_backwards_cause_is_flagged(self):
        load(("moon-landing", "triggered", "sputnik-launch", "wrong way round"), name="v1")
        rows = self.check_rows("Link runs backwards in time")
        self.assertTrue(any("moon-landing" in r[1] for r in rows))


class TestTypes(unittest.TestCase):
    def test_add_type_then_use_it(self):
        self.assertEqual(quiet(links.add_type, "test_ended", "was test-ended by", "Test.", "a → b", True,
                               via="test"), 0)
        self.assertEqual(quiet(links.add_type, "test_ended", "x", "x", "x", via="test"), 1)  # exists
        self.assertEqual(quiet(links.add_type, "Bad Type", "x", "x", "x", via="test"), 1)
        self.assertEqual(quiet(links.add_type, "test_other", " ", "x", "x", via="test"), 1)
        self.assertEqual(load(("meiji-restoration-japan", "test_ended", "tokugawa-shogunate", "it ended it"),
                              name="t1"), 0)

    def test_ended_date_check(self):
        conn = db()
        if not conn.execute("SELECT 1 FROM relationship_types WHERE type = 'ended'").fetchone():
            quiet(links.add_type, "ended", "was ended by", "Test.", "ender → ended", True, via="test")
        load(("sputnik-launch", "ended", "tokugawa-shogunate", "wrong end"), name="t2")
        rows = TestValidation.check_rows(self, "began / ended link not at")
        self.assertTrue(any("sputnik-launch" in r[1] for r in rows))


class TestRetype(unittest.TestCase):
    def test_retype_keeps_id_and_status(self):
        load(("battle-of-hastings", "part_of", "kievan-rus-founded", "test link"), name="r1")
        lid, status, _ = stored("battle-of-hastings", "part_of", "kievan-rus-founded")
        self.assertEqual(quiet(links.retype, [lid], "influenced", "new why", via="test"), 0)
        row = db().execute("SELECT relationship_type, editorial_status, description FROM relationships WHERE id = ?",
                           (lid,)).fetchone()
        self.assertEqual(row, ("influenced", status, "new why"))
        self.assertEqual(quiet(links.retype, [lid], "no_such_type", via="test"), 1)
        self.assertEqual(quiet(links.retype, [999999], "part_of", via="test"), 1)


class TestSuggest(unittest.TestCase):
    def test_suggests_without_loading(self):
        out = TMP / "suggest.json"
        conn = db()  # already-linked pairs are skipped, so unlink the one this test expects
        conn.execute("DELETE FROM relationships WHERE source_entity_id = 'battle-of-zama' "
                     "AND target_entity_id = 'punic-wars'")
        conn.commit()
        before = db().execute("SELECT COUNT(*) FROM relationships").fetchone()[0]
        self.assertEqual(quiet(links.suggest_part_of, out), 0)
        data = json.loads(out.read_text())
        self.assertTrue(data["links"])
        self.assertTrue(all(link["type"] == "part_of" and link["why"] == "" for link in data["links"]))
        pairs = {(link["source"], link["target"]) for link in data["links"]}
        self.assertIn(("battle-of-zama", "punic-wars"), pairs)
        self.assertEqual(db().execute("SELECT COUNT(*) FROM relationships").fetchone()[0], before)  # nothing loaded


if __name__ == "__main__":
    try:
        unittest.main(verbosity=1)
    finally:
        shutil.rmtree(TMP, ignore_errors=True)
