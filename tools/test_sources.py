"""Tests for tools/sources.py, run against a temporary copy of the db (never the real one).

Offline: Wikipedia is replaced by a fake. Run: npm run data:test
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
TMP = Path(tempfile.mkdtemp(prefix="dategolf-sources-"))
TEST_DB = TMP / "dategolf.db"
shutil.copy(HERE.parent / "data" / "dategolf.db", TEST_DB)
os.environ["DATEGOLF_DB"] = str(TEST_DB)  # must be set before the tools are imported
sys.path.insert(0, str(HERE))

import common  # noqa: E402
import drafts  # noqa: E402
import sources  # noqa: E402
import validate  # noqa: E402

FAKE_WIKI = {"Battle of Hastings": {"title": "Battle of Hastings", "fragment": None},
             "Fall of Rome": {"title": "Fall of the Western Roman Empire", "fragment": None},
             "Mercury": {"problem": "disambiguation page (Mercury)"}}


def fake_resolve(titles):
    return {t: FAKE_WIKI.get(t, {"problem": "no such article"}) for t in titles}


sources.resolve = fake_resolve


def quiet(fn, *args, **kwargs):
    with contextlib.redirect_stdout(io.StringIO()):
        return fn(*args, **kwargs)


def db():
    return sqlite3.connect(TEST_DB)


def entity_sources(entity_id):
    return db().execute("SELECT o.title, o.url, x.status, x.origin FROM entity_sources x "
                        "JOIN sources o ON o.id = x.source_id WHERE x.entity_id = ? ORDER BY o.url",
                        (entity_id,)).fetchall()


def some_event():
    """A published event with no source yet."""
    return db().execute("SELECT e.entity_id FROM events e JOIN entities n ON n.id = e.entity_id "
                        "WHERE n.editorial_status <> 'proposed' AND e.entity_id NOT IN "
                        "(SELECT entity_id FROM entity_sources) ORDER BY e.entity_id LIMIT 2").fetchall()


def batch(*rows, name="batch"):
    path = TMP / f"{name}.json"
    path.write_text(json.dumps({"sources": [
        {"id": i, "title": t, "url": sources.wiki_url(t), "origin": "ai_drafted", "confidence": "high"}
        for i, t in rows]}))
    return path


class TestHelpers(unittest.TestCase):
    def test_safety(self):
        self.assertEqual(common.DB_PATH, TEST_DB)

    def test_urls_round_trip(self):
        url = sources.wiki_url("Treaty of Versailles", "Reparations")
        self.assertEqual(url, "https://en.wikipedia.org/wiki/Treaty_of_Versailles#Reparations")
        self.assertEqual(sources.title_from_url(url), "Treaty of Versailles")
        self.assertEqual(sources.title_from_url("https://en.wikipedia.org/wiki/Ch%C3%A2teau_Gaillard"),
                         "Château Gaillard")


class TestCsvImport(unittest.TestCase):
    def test_import_is_reviewed_and_idempotent(self):
        conn = db()
        self.assertEqual(quiet(sources.import_csv), 0)
        n = conn.execute("SELECT count(*) FROM entity_sources WHERE origin = 'csv'").fetchone()[0]
        self.assertGreaterEqual(n, 50)
        self.assertEqual(conn.execute("SELECT count(*) FROM entity_sources WHERE origin = 'csv' "
                                      "AND status <> 'reviewed'").fetchone()[0], 0)
        quiet(sources.import_csv)
        self.assertEqual(conn.execute("SELECT count(*) FROM entity_sources WHERE origin = 'csv'").fetchone()[0], n)


class TestSuggest(unittest.TestCase):
    def test_names_and_picks(self):
        (a,), (b,) = some_event()
        picks = TMP / "picks.json"
        picks.write_text(json.dumps({"picks": {a: "Fall of Rome", b: {"title": "Mercury"}}}))
        out = TMP / "suggestions.json"
        self.assertEqual(quiet(sources.suggest, picks, out), 0)
        result = json.loads(out.read_text())
        found = {s["id"]: s for s in result["sources"]}
        self.assertEqual(found[a]["title"], "Fall of the Western Roman Empire")  # followed the redirect
        self.assertEqual((found[a]["origin"], found[a]["confidence"]), ("ai_drafted", "medium"))
        bad = {u["id"]: u for u in result["unresolved"]}
        self.assertIn("disambiguation", bad[b]["problem"])
        self.assertTrue(all(u["problem"] for u in result["unresolved"]))

    def test_null_pick_skips(self):
        (a,), _ = some_event()
        picks = TMP / "skip.json"
        picks.write_text(json.dumps({"picks": {a: None}}))
        out = TMP / "skip_out.json"
        quiet(sources.suggest, picks, out)
        result = json.loads(out.read_text())
        self.assertNotIn(a, {s["id"] for s in result["sources"] + result["unresolved"]})


class TestLoadAndReview(unittest.TestCase):
    def test_load_approve_reject(self):
        (a,), (b,) = some_event()
        self.assertEqual(quiet(sources.load, batch((a, "Battle of Hastings"), (b, "Fall of Rome"))), 0)
        self.assertEqual(entity_sources(a)[0][2:], ("proposed", "ai_drafted"))
        self.assertEqual(quiet(sources.approve, [a], "test"), 0)
        self.assertEqual(entity_sources(a)[0][2], "reviewed")
        self.assertEqual(quiet(sources.reject, [b], "wrong article", "test"), 0)
        self.assertEqual(entity_sources(b), [])
        self.assertIsNone(db().execute("SELECT 1 FROM sources WHERE title = 'Fall of Rome'").fetchone())  # orphan gone
        self.assertEqual(quiet(sources.reject, [a], "too late", "test"), 1)  # reviewed sources stay
        self.assertEqual(quiet(sources.reject, [a], " ", "test"), 1)

    def test_load_is_all_or_nothing(self):
        (a,), _ = some_event()
        path = batch((a, "Battle of Hastings"), ("no-such-id", "Battle of Hastings"), name="bad")
        self.assertEqual(quiet(sources.load, path), 1)
        self.assertEqual(entity_sources(a), [])

    def test_title_matches_bulk_approve(self):
        (a,), _ = some_event()
        conn = db()
        sources.attach(conn, a, "Battle of Hastings", sources.wiki_url("Battle of Hastings"), "proposed",
                       "title_match", "high")
        conn.commit()
        self.assertEqual(quiet(sources.approve, [], "test", True), 0)
        self.assertEqual(entity_sources(a)[0][2], "reviewed")


class TestDraftSources(unittest.TestCase):
    def draft(self, entity_id):
        path = TMP / f"{entity_id}.json"
        path.write_text(json.dumps({"origin": "test", "events": [{
            "id": entity_id, "name": f"Test {entity_id}", "year": 1234, "categories": ["Politics"],
            "region": "Europe", "aliases": ["test alias"], "description": "A test event.",
            "difficulty": "hard", "importance": 1, "source": "https://en.wikipedia.org/wiki/Test_" + entity_id}]}))
        quiet(drafts.load, path)

    def test_source_follows_its_draft(self):
        self.draft("source-test-a")
        self.assertEqual(entity_sources("source-test-a")[0][0], "Test source-test-a")
        self.assertEqual(entity_sources("source-test-a")[0][2], "proposed")
        quiet(drafts.approve, ["source-test-a"], "test")
        self.assertEqual(entity_sources("source-test-a")[0][2], "reviewed")
        self.draft("source-test-b")
        quiet(drafts.reject, ["source-test-b"], "test", "test")
        self.assertIsNone(db().execute("SELECT 1 FROM sources WHERE url LIKE '%source-test-b'").fetchone())


class TestValidate(unittest.TestCase):
    def test_still_no_errors(self):
        quiet(sources.import_csv)
        quiet(validate.run)
        report = json.loads((common.REPORTS / "validate.json").read_text())
        errors = [c["check"] for c in report["checks"] if c.get("severity") == "error" and c["rows"]]
        self.assertEqual(errors, [])


if __name__ == "__main__":
    unittest.main(verbosity=1)
