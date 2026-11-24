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
import exporter  # noqa: E402
import identity  # noqa: E402
import journeys  # noqa: E402
import memory_aids  # noqa: E402
import phases  # noqa: E402
import states  # noqa: E402
import missing  # noqa: E402


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


    def test_set_span_kind(self):
        self.assertEqual(quiet(edit.set_span_kind, "mongol-conquests", "period", via="test"), 0)
        self.assertEqual(quiet(edit.set_span_kind, "mongol-conquests", "state", via="test"), 0)
        self.assertEqual(db().execute("SELECT s.kind, n.primary_type FROM time_spans s JOIN entities n "
                                      "ON n.id = s.entity_id WHERE s.entity_id = 'mongol-conquests'").fetchone(),
                         ("state", "state"))
        self.assertEqual(log_rows("mongol-conquests")[-1][0], "set-span-kind")
        self.assertEqual(quiet(edit.set_span_kind, "mongol-conquests", "era", via="test"), 1)
        self.assertEqual(quiet(edit.set_span_kind, "no-such-id", "period", via="test"), 1)

    def test_set_span_years(self):
        self.assertEqual(quiet(edit.set_span_years, "construction-great-wall", -215, -206, True, via="test"), 0)
        self.assertEqual(db().execute("SELECT start_year, end_year, approximate FROM time_spans "
                                      "WHERE entity_id = 'construction-great-wall'").fetchone(), (-215, -206, 1))
        self.assertEqual(log_rows("construction-great-wall")[-1][0], "set-span-years")
        self.assertEqual(quiet(edit.set_span_years, "construction-great-wall", -215, -206, None, "c. 215–206 BCE",
                               via="test"), 0)
        self.assertEqual(db().execute("SELECT approximate, date_display FROM time_spans "
                                      "WHERE entity_id = 'construction-great-wall'").fetchone(), (1, "c. 215–206 BCE"))
        quiet(edit.set_span_years, "construction-great-wall", -215, -206, None, "", via="test")
        self.assertIsNone(db().execute("SELECT date_display FROM time_spans "
                                       "WHERE entity_id = 'construction-great-wall'").fetchone()[0])
        self.assertEqual(quiet(edit.set_span_years, "construction-great-wall", -200, -206, via="test"), 1)
        self.assertEqual(quiet(edit.set_span_years, "construction-great-wall", -1, 0, via="test"), 1)
        self.assertEqual(quiet(edit.set_span_years, "no-such-id", 1, 2, via="test"), 1)


    def test_set_event_date(self):
        self.assertEqual(quiet(edit.set_event_date, "egyptian-pyramids-built", None, True, "c. 2600–2560 BCE",
                               via="test"), 0)
        self.assertEqual(db().execute("SELECT year, is_approximate, date_display FROM events "
                                      "WHERE entity_id = 'egyptian-pyramids-built'").fetchone(),
                         (-2560, 1, "c. 2600–2560 BCE"))
        self.assertEqual(log_rows("egyptian-pyramids-built")[-1][0], "set-event-date")
        self.assertEqual(quiet(edit.set_event_date, "egyptian-pyramids-built", 0, via="test"), 1)
        self.assertEqual(quiet(edit.set_event_date, "no-such-id", 5, via="test"), 1)


class TestAccuracyTools(unittest.TestCase):
    def test_dateflow_only(self):
        self.assertEqual(quiet(edit.set_dateflow_only, "fall-of-troy", "test reason", via="test"), 0)
        self.assertIsNotNone(db().execute("SELECT 1 FROM dateflow_only_events WHERE entity_id = 'fall-of-troy'"
                                          ).fetchone())
        self.assertEqual(quiet(edit.set_dateflow_only, "fall-of-troy", remove=True, via="test"), 0)
        self.assertIsNone(db().execute("SELECT 1 FROM dateflow_only_events WHERE entity_id = 'fall-of-troy'"
                                       ).fetchone())
        self.assertEqual(quiet(edit.set_dateflow_only, "fall-of-troy", " ", via="test"), 1)

    def test_current(self):
        self.assertEqual(quiet(edit.set_current, ["industrial-revolution"], via="test"), 0)
        current = "SELECT 1 FROM historical_currents WHERE entity_id = 'industrial-revolution'"
        self.assertIsNotNone(db().execute(current).fetchone())
        self.assertEqual(log_rows("industrial-revolution")[-1][0], "current")
        self.assertEqual(quiet(edit.set_current, ["industrial-revolution"], remove=True, via="test"), 0)
        self.assertIsNone(db().execute(current).fetchone())
        self.assertEqual(quiet(edit.set_current, ["fall-of-troy"], via="test"), 1)  # an event, not a span

    def test_memory_aids(self):
        item, entity, label = db().execute(
            "SELECT i.id, g.entity_id, g.label FROM learning_content_items i "
            "JOIN learning_content_groups g ON g.id = i.group_id ORDER BY i.id LIMIT 1").fetchone()
        self.assertEqual(quiet(edit.set_memory_aid, item, "New aid text.", via="test"), 0)
        self.assertEqual(db().execute("SELECT body FROM learning_content_items WHERE id = ?", (item,)).fetchone()[0],
                         "New aid text.")
        self.assertEqual(quiet(edit.rename_memory_aid_group, entity, label, "Test label", via="test"), 0)
        self.assertEqual(quiet(edit.rename_memory_aid_group, entity, "no such", "x", via="test"), 1)
        self.assertEqual(quiet(edit.set_memory_aid, 999999, "x", via="test"), 1)


class TestMissing(unittest.TestCase):
    def batch(self, *items, name="missing"):
        path = TMP / f"{name}.json"
        path.write_text(json.dumps({"found_while": "test", "items": list(items)}))
        return path

    def test_load_status_and_fill(self):
        item = {"kind": "event", "name": "Test Akbar Accession", "year": 1556, "why": "Pairs with Death of Akbar.",
                "related_ids": ["death-of-akbar"]}
        self.assertEqual(quiet(missing.load, self.batch(item, name="m1")), 0)
        item_id = db().execute("SELECT id FROM missing_entities WHERE name = 'Test Akbar Accession'").fetchone()[0]
        self.assertEqual(quiet(missing.load, self.batch(item, name="m2")), 1)  # already listed
        self.assertEqual(quiet(missing.set_status, [item_id], "wanted", via="test"), 0)
        self.assertEqual(quiet(missing.set_status, [item_id], "dismissed", via="test"), 1)  # needs a reason
        path = TMP / "fill.json"
        path.write_text(json.dumps({"origin": "test", "events": [{
            "id": "test-akbar-accession", "name": "Test Akbar Accession", "year": 1556, "categories": ["Politics"],
            "region": "South Asia", "aliases": [], "description": "A test.", "difficulty": "hard", "importance": 1,
            "fills_missing": item_id}]}))
        quiet(drafts.load, path)
        self.assertEqual(db().execute("SELECT status, entity_id FROM missing_entities WHERE id = ?", (item_id,)
                                      ).fetchone(), ("drafted", "test-akbar-accession"))
        self.assertEqual(quiet(missing.set_status, [item_id], "open", via="test"), 1)  # it has a live draft

        # Rejecting the draft closes the gap item with the reason; it can then be decided again
        quiet(drafts.reject, ["test-akbar-accession"], "false precision", "test")
        status, note = db().execute("SELECT status, note FROM missing_entities WHERE id = ?", (item_id,)).fetchone()
        self.assertEqual(status, "dismissed")
        self.assertIn("false precision", note)
        self.assertEqual(quiet(missing.set_status, [item_id], "wanted", via="test"), 0)

    def test_refuses_bad_items(self):
        existing = db().execute("SELECT name FROM events LIMIT 1").fetchone()[0]
        self.assertEqual(quiet(missing.load, self.batch({"kind": "event", "name": existing, "why": "x"}, name="m3")), 1)
        self.assertEqual(quiet(missing.load, self.batch({"kind": "battle", "name": "X", "why": "x"}, name="m4")), 1)
        self.assertEqual(quiet(missing.load, self.batch({"kind": "event", "name": "Y", "year": 0, "why": "x"},
                                                        name="m5")), 1)


class TestSpanDrafts(unittest.TestCase):
    def test_span_draft_loads_and_approves(self):
        path = TMP / "span.json"
        path.write_text(json.dumps({"origin": "test", "events": [], "spans": [{
            "id": "test-span", "kind": "period", "name": "Test Span", "start_year": 1500, "end_year": 1600,
            "description": "A test span.", "region": "Europe", "importance": 3, "categories": ["Politics"],
            "approximate": True, "date_display": "c. 1500–1600 (test)",
            "countries": ["FR"], "source": "https://en.wikipedia.org/wiki/Test_span"}]}))
        quiet(drafts.load, path)
        conn = db()
        self.assertEqual(conn.execute("SELECT editorial_status, primary_type FROM entities WHERE id = 'test-span'"
                                      ).fetchone(), ("proposed", "period"))
        self.assertEqual(conn.execute("SELECT approximate, date_display FROM time_spans WHERE entity_id = 'test-span'"
                                      ).fetchone(), (1, "c. 1500–1600 (test)"))
        self.assertEqual(conn.execute("SELECT country, status FROM entity_countries WHERE entity_id = 'test-span'"
                                      ).fetchone(), ("FR", "proposed"))
        quiet(drafts.approve, ["test-span"], "test")
        self.assertEqual(db().execute("SELECT editorial_status FROM entities WHERE id = 'test-span'").fetchone()[0],
                         "reviewed")


class TestPeople(unittest.TestCase):
    def test_person_from_a_draft_and_from_the_cli(self):
        path = TMP / "person.json"
        path.write_text(json.dumps({"origin": "test", "events": [], "spans": [{
            "id": "test-person", "kind": "period", "name": "Test Person", "start_year": 1500, "end_year": 1570,
            "description": "A test life.", "region": "Europe", "importance": 3, "categories": ["Politics"],
            "person": True, "role": "Test ruler"}]}))
        quiet(drafts.load, path)
        self.assertEqual(db().execute("SELECT role FROM people WHERE entity_id = 'test-person'").fetchone()[0],
                         "Test ruler")
        quiet(drafts.approve, ["test-person"], "test")
        spans = {d["id"]: d for d in json.loads(exporter.render_durations(common.connect()))}
        self.assertEqual((spans["test-person"]["person"], spans["test-person"]["role"]), (True, "Test ruler"))
        self.assertNotIn("person", spans["roman-empire"])

        # The CLI flags an existing span (and keeps its role when none is given); rejecting a draft drops it
        self.assertEqual(quiet(edit.set_person, ["life-of-the-buddha"], "Teacher", via="test"), 0)
        self.assertEqual(quiet(edit.set_person, ["life-of-the-buddha"], via="test"), 0)
        self.assertEqual(db().execute("SELECT role FROM people WHERE entity_id = 'life-of-the-buddha'").fetchone()[0],
                         "Teacher")
        self.assertEqual(quiet(edit.set_person, ["no-such-span"], via="test"), 1)
        self.assertEqual(quiet(edit.set_person, ["life-of-the-buddha"], remove=True, via="test"), 0)
        self.assertIsNone(db().execute("SELECT 1 FROM people WHERE entity_id = 'life-of-the-buddha'").fetchone())


class TestCountries(unittest.TestCase):
    def test_add_country(self):
        self.assertEqual(quiet(countries.add_country, "XQ", "Testland", "Africa", "XQT", via="test"), 0)
        self.assertEqual(db().execute("SELECT region, iso3 FROM countries WHERE code = 'XQ'").fetchone(), ("Africa", "XQT"))
        self.assertEqual(quiet(countries.add_country, "XQ", "Testland Again", "Africa", "XQU"), 1)  # code taken
        self.assertEqual(quiet(countries.add_country, "XR", "Nowhere", "Atlantis", "XRR"), 1)  # unknown region
        self.assertEqual(quiet(countries.add_country, "XRR", "Bad Code", "Africa", "XR"), 1)

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

    def test_split_moves_a_current_and_copies_sources(self):
        eid, new = "protestant-reformation", "protestant-reformation-period"
        n_sources = db().execute("SELECT COUNT(*) FROM entity_sources WHERE entity_id = ?", (eid,)).fetchone()[0]
        self.assertEqual(quiet(identity.split, eid, new, via="test"), 0)
        con = db()
        self.assertEqual(con.execute("SELECT entity_id FROM historical_currents WHERE entity_id LIKE "
                                     "'protestant-reformation%'").fetchall(), [(new,)])
        self.assertEqual(con.execute("SELECT COUNT(*) FROM entity_sources WHERE entity_id = ?", (new,)).fetchone()[0],
                         n_sources)
        self.assertEqual(con.execute("PRAGMA foreign_key_check").fetchall(), [])

    def test_split_refuses_bad_ids(self):
        self.assertEqual(quiet(identity.split, "battle-of-plassey", "plassey-period"), 1)  # not shared
        self.assertEqual(quiet(identity.split, "french-revolution", "french-revolution"), 1)  # same id
        self.assertEqual(quiet(identity.split, "french-revolution", "roman-empire"), 1)  # already exists
        self.assertEqual(quiet(identity.split, "french-revolution", "Bad Id"), 1)  # not kebab-case

    def test_refuses_ids_that_are_not_shared(self):
        self.assertEqual(quiet(identity.decide, ["battle-of-plassey"], "one"), 1)
        self.assertEqual(quiet(identity.decide, ["punic-wars"], "maybe"), 1)


class TestPhases(unittest.TestCase):
    def batch(self, spans, name):
        path = TMP / f"{name}.json"
        path.write_text(json.dumps({"origin": "test", "phases": spans}))
        return path

    def test_load_review_and_export(self):
        sid = "sur-empire"  # 1540–1556
        a, b = db().execute("SELECT start_year, end_year FROM time_spans WHERE entity_id = ?", (sid,)).fetchone()
        mid = (a + b) // 2
        good = [{"kind": "foundation", "title": "Sher Shah takes power", "start_year": a, "end_year": mid,
                 "description": "x", "start_event": "humayun-defeated-kanauj"},
                {"kind": "end", "title": "Humayun returns", "start_year": mid, "end_year": b, "description": "y"}]
        durations = lambda: {d["id"]: d for d in json.loads(exporter.render_durations(common.connect()))}

        for bad in ([{**good[0], "end_year": mid - 1}, good[1]],                    # a gap
                    [{**good[0], "start_year": a + 1}, good[1]],                    # doesn't start with the span
                    [{**good[0], "kind": "golden age"}, good[1]],                   # not a neutral kind
                    [{**good[0], "start_event": "no-such-event"}, good[1]],
                    [{**good[0], "date_display": "c. x"}, good[1]],                 # range without approximate
                    [good[0]]):                                                     # one phase isn't a life cycle
            self.assertEqual(quiet(phases.load, self.batch({sid: bad}, "bad")), 1)
        self.assertEqual(quiet(phases.load, self.batch({"ancient": good}, "era")), 1)  # eras have no phases
        self.assertIsNone(db().execute("SELECT 1 FROM entity_phases WHERE entity_id = ?", (sid,)).fetchone())

        self.assertEqual(quiet(phases.load, self.batch({sid: good}, "good")), 0)
        self.assertEqual(quiet(phases.load, self.batch({sid: good}, "again")), 1)  # already has phases
        self.assertNotIn("phases", durations()[sid])                                # proposed: not exported
        self.assertEqual(quiet(phases.approve, [sid], "test"), 0)
        out = durations()[sid]["phases"]
        self.assertEqual([p["kind"] for p in out], ["foundation", "end"])
        self.assertEqual(out[0]["startEvent"], "humayun-defeated-kanauj")
        self.assertEqual(log_rows(sid)[-1][0], "approve-phases")

        self.assertEqual(quiet(phases.reject, [sid], "x", "test"), 1)               # only proposed ones
        self.assertEqual(quiet(phases.remove, [sid], "replacing", "test"), 0)
        self.assertNotIn("phases", durations()[sid])


class TestJourneys(unittest.TestCase):
    def batch(self, journeys_, name):
        path = TMP / f"{name}.json"
        path.write_text(json.dumps({"origin": "test", "journeys": journeys_}))
        return path

    def test_years_in(self):
        self.assertEqual(journeys.years_in("Cyrus took Babylon in 539 BCE; by 1453, and 44 BC"), [-539, 1453, -44])
        self.assertEqual(journeys.years_in("over 2,500 years, 300 ships, the 1920s, the 24th"), [])

    def test_load_review_and_export(self):
        stops = [{"items": ["achaemenid-empire"], "narration": "Cyrus builds it."},
                 {"items": ["alexanders-conquests"], "narration": "Alexander dies in 323 BCE.", "question": "Why?"},
                 {"items": ["roman-empire", "byzantine-empire"], "title": "Rome", "narration": "East and west."}]
        good = {"id": "test-empires", "title": "Empires", "intro": "Watch the bars.", "stops": stops}
        exported = lambda: {j["id"]: j for j in json.loads(exporter.render_journeys(common.connect()))}

        for bad in ({**good, "id": "Test Empires"},
                    {**good, "stops": stops[:2]},                                                # too few stops
                    {**good, "stops": [stops[0], {**stops[1], "items": ["no-such-id"]}, stops[2]]},
                    {**good, "stops": [stops[0], stops[1], {**stops[2], "title": None}]},        # several items, no title
                    {**good, "stops": [{**stops[0], "title": "Persia"}, stops[1], stops[2]]},    # one item, titled
                    {**good, "stops": [stops[0], {**stops[1], "narration": "He dies in 320 BCE."}, stops[2]]},
                    {**good, "intro": "From 1066 on."},                                         # no item's year
                    {**good, "stops": [stops[2], stops[0], stops[1]]}):                          # runs backwards
            self.assertEqual(quiet(journeys.load, self.batch([bad], "bad")), 1)
        self.assertIsNone(db().execute("SELECT 1 FROM journeys WHERE id = 'test-empires'").fetchone())

        self.assertEqual(quiet(journeys.load, self.batch([good], "good")), 0)
        self.assertEqual(quiet(journeys.load, self.batch([good], "again")), 1)  # already exists
        self.assertNotIn("test-empires", exported())                            # proposed: not exported
        self.assertEqual(quiet(journeys.approve, ["test-empires"], "test"), 0)
        out = exported()["test-empires"]
        self.assertEqual([s["items"] for s in out["stops"]], [s["items"] for s in stops])
        self.assertEqual(out["stops"][1]["question"], "Why?")
        self.assertNotIn("title", out["stops"][0])
        self.assertEqual(log_rows("test-empires")[-1][0], "approve-journey")

        self.assertEqual(quiet(journeys.reject, ["test-empires"], "x", "test"), 1)  # only proposed ones
        self.assertEqual(quiet(journeys.remove, ["test-empires"], "replacing", "test"), 0)
        self.assertIsNone(db().execute("SELECT 1 FROM journey_stop_items WHERE journey_id = 'test-empires'").fetchone())

    def test_waits_on_unpublished_items(self):
        load_draft("test-journey-event")  # proposed, 1234
        stops = [{"items": ["achaemenid-empire"], "narration": "a"}, {"items": ["roman-empire"], "narration": "b"},
                 {"items": ["test-journey-event"], "narration": "c"}]
        quiet(journeys.load, self.batch([{"id": "test-waits", "title": "T", "intro": "i", "stops": stops}], "waits"))
        quiet(journeys.approve, ["test-waits"], "test")
        self.assertNotIn("test-waits", [j["id"] for j in json.loads(exporter.render_journeys(common.connect()))])
        quiet(drafts.approve, ["test-journey-event"], "test")
        self.assertIn("test-waits", [j["id"] for j in json.loads(exporter.render_journeys(common.connect()))])


class TestStates(unittest.TestCase):
    def batch(self, ties, name):
        path = TMP / f"{name}.json"
        path.write_text(json.dumps({"origin": "test", "ties": ties}))
        return path

    def test_links_already_place_events(self):
        linked = states.linked(common.connect())
        self.assertEqual(linked["fall-of-constantinople"], {"byzantine-empire", "ottoman-empire"})  # two states
        self.assertIn("mughal-empire", linked["shah-jahan-becomes-mughal-emperor"])  # began a reign inside it

    def test_load_review_and_export(self):
        with db() as conn:  # the copied db holds the real drafted ties; start from none
            conn.execute("DELETE FROM event_states")
        exported = lambda: json.loads(exporter.render_states(common.connect()))
        good = [{"event": "battle-of-chausa", "states": ["mughal-empire"], "note": "Humayun lost"},
                {"event": "birth-of-akbar", "states": ["mughal-empire", "sur-empire"]}]
        for bad in ([{"event": "no-such-event", "states": ["mughal-empire"]}],
                    [{"event": "battle-of-chausa", "states": ["sur-empire"]}],                   # a year before it
                    [{"event": "battle-of-chausa", "states": ["reign-of-akbar"]}],               # not a state
                    [{"event": "battle-of-hastings", "states": []}],
                    [{"event": "humayun-succeeds-babur", "states": ["mughal-empire"]}],          # a link says it
                    [{"event": "alauddin-khalji-accession", "states": ["khalji-dynasty"]}],      # a link says it
                    [good[0], {"event": "battle-of-chausa", "states": ["sur-empire"]}]):         # event twice
            self.assertEqual(quiet(states.load, self.batch(bad, "bad-states")), 1)
        self.assertEqual(quiet(states.load, self.batch(
            [{"event": "razia-sultana-accession", "states": ["delhi-sultanate"]}], "parent")), 1)  # already via its sub-state
        self.assertIsNone(db().execute("SELECT 1 FROM event_states WHERE event_id = 'battle-of-chausa'").fetchone())

        self.assertEqual(quiet(states.load, self.batch(good, "good-states")), 0)
        self.assertNotIn("battle-of-chausa", exported())                                   # proposed: not exported
        self.assertEqual(quiet(states.approve, ["battle-of-chausa|mughal-empire"], "test"), 0)
        self.assertEqual(exported()["battle-of-chausa"], ["mughal-empire"])
        self.assertEqual(log_rows("battle-of-chausa")[-1], ("approve-state", "mughal-empire", "test"))
        self.assertEqual(quiet(states.reject, ["birth-of-akbar|sur-empire"], " ", "test"), 1)  # needs a reason
        self.assertEqual(quiet(states.reject, ["birth-of-akbar|sur-empire"], "no", "test"), 0)
        self.assertEqual(quiet(states.reject, ["battle-of-chausa|mughal-empire"], "no", "test"), 1)  # reviewed
        self.assertEqual(exported()["fall-of-constantinople"], ["byzantine-empire", "ottoman-empire"])


class TestMemoryAids(unittest.TestCase):
    def batch(self, aids, name):
        path = TMP / f"{name}.json"
        path.write_text(json.dumps({"origin": "test", "aids": aids}))
        return path

    def test_load_review_and_export(self):
        conn = db()
        bare = [r[0] for r in conn.execute("SELECT entity_id FROM events WHERE year > 0 AND entity_id NOT IN "
                                           "(SELECT entity_id FROM learning_content_groups) ORDER BY entity_id LIMIT 2")]
        has = conn.execute("SELECT entity_id FROM learning_content_groups LIMIT 1").fetchone()[0]
        a, b = bare
        year = conn.execute("SELECT year FROM events WHERE entity_id = ?", (a,)).fetchone()[0]
        good = {"groups": [{"label": "Look Back", "items": ["One.", "Two."]},
                           {"label": f"Year of {year}", "items": ["Three."]}]}
        exported = lambda: json.loads(exporter.render_datelinks(common.connect()))

        # All-or-nothing: one bad entry (wrong year label, bad order, existing aids, not an event) loads nothing
        for bad in ({b: {"groups": [{"label": "Year of 1", "items": ["x"]}]}},
                    {b: {"groups": [{"label": "Look Ahead", "items": ["x"]}, {"label": "Look Back", "items": ["y"]}]}},
                    {b: {"groups": [{"label": "Event Timeline", "items": ["1 — x", "2 — y"]}]}},  # a timeline needs 3–6
                    {has: good}, {"no-such-event": good}):
            self.assertEqual(quiet(memory_aids.load, self.batch({a: good, **bad}, "bad")), 1)
        self.assertIsNone(db().execute("SELECT 1 FROM learning_content_groups WHERE entity_id = ?", (a,)).fetchone())

        # Loads as proposed and stays out of the export until approved
        self.assertEqual(quiet(memory_aids.load, self.batch({a: good}, "good")), 0)
        self.assertNotIn(a, exported())
        self.assertEqual(quiet(memory_aids.approve, [a], "test"), 0)
        self.assertEqual(exported()[a], good)
        self.assertEqual(log_rows(a)[-1][0], "approve-memory-aids")

        # Reject only touches proposed aids; remove takes published ones too
        self.assertEqual(quiet(memory_aids.reject, [a], "wrong anchor", "test"), 1)
        self.assertEqual(quiet(memory_aids.remove, [a], "replacing", "test"), 0)
        self.assertNotIn(a, exported())
        quiet(memory_aids.load, self.batch({a: good}, "again"))
        self.assertEqual(quiet(memory_aids.reject, [a], "wrong anchor", "test"), 0)
        self.assertIn("wrong anchor", log_rows(a)[-1][1])
        self.assertEqual(quiet(memory_aids.reject, [a], " ", "test"), 1)  # a reason is required

    def test_year_label(self):
        self.assertEqual(memory_aids.year_label(-587), "Year of 587 BCE")
        self.assertEqual(memory_aids.year_label(1962), "Year of 1962")


if __name__ == "__main__":
    try:
        unittest.main(verbosity=2)
    finally:
        shutil.rmtree(TMP, ignore_errors=True)
