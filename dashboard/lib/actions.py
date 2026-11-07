"""The dashboard's only writes: thin wrappers around the data tools, so their rules always apply."""

import contextlib
import io
import json
import sqlite3
import subprocess
import sys
from datetime import datetime

from lib.db import ROOT

sys.path.insert(0, str(ROOT / "tools"))
import common  # noqa: E402  (tools/ is not a package)
import countries  # noqa: E402
import drafts  # noqa: E402
import exporter  # noqa: E402
import identity  # noqa: E402
import links  # noqa: E402
import manage  # noqa: E402
import validate  # noqa: E402

LOCKED_HINT = ("The database is locked, probably by DB Browser holding unwritten changes. "
               "Click Write Changes (or Revert Changes) there, then try again.")


def _run(fn, *args):
    """Run a tool function, capturing what it prints. Returns (ok, output)."""
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            result = fn(*args)
        return (result in (None, 0)), buf.getvalue()
    except sqlite3.OperationalError as exc:
        return False, LOCKED_HINT if "locked" in str(exc) else f"{exc}\n{buf.getvalue()}"
    except SystemExit as exc:
        return False, f"{exc}\n{buf.getvalue()}"


def run_validate():
    return _run(validate.run)


def run_export():
    return _run(exporter.run)


def run_backup():
    return _run(manage.backup, None)


# ── Review decisions (v2): each calls the same tool function as the CLI ──────

def approve_drafts(ids):
    return _run(drafts.approve, ids, "dashboard")


def reject_drafts(ids, reason):
    return _run(drafts.reject, ids, reason, "dashboard")


def approve_country_tags(ids, high=False):
    return _run(countries.approve, ids, high, "dashboard")


def set_country_tags(entity_id, spec, note=None):
    return _run(countries.set_tags, entity_id, spec, note, "dashboard")


def decide_identity(ids, decision):
    return _run(identity.decide, ids, decision, "dashboard")


def approve_links(ids):
    return _run(links.approve, ids, "dashboard")


def reject_links(ids, reason):
    return _run(links.reject, ids, reason, "dashboard")


# ── Status checks (read-only) ─────────────────────────────────────────────────

def export_needed() -> list[str]:
    """App files whose committed JSON differs from a fresh export (same check as compare-export)."""
    conn = common.connect()
    try:
        rendered = exporter.render_all(conn)
    finally:
        conn.close()
    return [common.APP_FILES[name] for name, text in rendered.items()
            if (ROOT / common.APP_FILES[name]).read_text(encoding="utf-8") != text]


def last_backup():
    """(file name, datetime) of the newest backup, or None."""
    files = sorted((ROOT / "data" / "backup").glob("dategolf_*.db"))
    if not files:
        return None
    return files[-1].name, datetime.fromtimestamp(files[-1].stat().st_mtime)


def validation_report():
    """The latest data/reports/validate.json and when it was written, or (None, None)."""
    path = common.REPORTS / "validate.json"
    if not path.exists():
        return None, None
    return json.loads(path.read_text(encoding="utf-8")), datetime.fromtimestamp(path.stat().st_mtime)


def uncommitted_changes() -> list[str]:
    out = subprocess.run(["git", "status", "--porcelain", "data", "src/data", "public/data"],
                         cwd=ROOT, capture_output=True, text=True)
    return [line for line in out.stdout.splitlines() if line.strip()]
