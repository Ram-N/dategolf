"""Overview: counts, data health, and the Validate / Export / Back up buttons."""

from datetime import datetime

import pandas as pd
import streamlit as st

from lib import actions
from lib.db import scalar

st.title("Overview")

# ── Action results from the previous run (buttons rerun the page) ────────────
if "action_result" in st.session_state:
    label, ok, output = st.session_state.pop("action_result")
    (st.success if ok else st.error)(f"{label}: {'done' if ok else 'failed'}")
    if output.strip():
        with st.expander("Tool output", expanded=not ok):
            st.code(output)

# ── Counts ────────────────────────────────────────────────────────────────────
pub = "editorial_status <> 'proposed'"
cols = st.columns(6)
cols[0].metric("Events", scalar(f"SELECT COUNT(*) FROM events JOIN entities ON id = entity_id WHERE {pub}"))
cols[1].metric("Spans", scalar("SELECT COUNT(*) FROM time_spans WHERE kind <> 'era'"))
cols[2].metric("Countries in use", scalar("SELECT COUNT(DISTINCT country) FROM entity_countries"))
cols[3].metric("Country tags", scalar("SELECT COUNT(*) FROM entity_countries"))
cols[4].metric("Links", scalar("SELECT COUNT(*) FROM relationships"))
cols[5].metric("DateLinks items", scalar("SELECT COUNT(*) FROM learning_content_items"))

queues = {
    "Event drafts": scalar("SELECT COUNT(*) FROM entities WHERE editorial_status = 'proposed'"),
    "Country tags": scalar("SELECT COUNT(DISTINCT entity_id) FROM entity_countries WHERE status = 'proposed'"),
    "Identity (Step 3a)": scalar("SELECT COUNT(*) FROM entities WHERE editorial_status = 'needs_review_identity'"),
}
st.caption("Waiting on you: " + " · ".join(f"**{k}** {v}" for k, v in queues.items()))

st.divider()

# ── Status ────────────────────────────────────────────────────────────────────
left, mid, right = st.columns(3)

with left:
    st.subheader("Game JSON")
    stale = actions.export_needed()
    if stale:
        st.error("Export needed: the db differs from the game files")
        st.caption("\n".join(f"- `{f}`" for f in stale))
    else:
        st.success("Up to date: the game files match the db")

with mid:
    st.subheader("Backup")
    backup = actions.last_backup()
    if backup is None:
        st.warning("No backup yet")
    else:
        name, when = backup
        age = (datetime.now() - when).days
        (st.warning if age > 35 else st.success)(f"Last backup {age} days ago")
        st.caption(f"`{name}`")

with right:
    st.subheader("Git")
    changes = actions.uncommitted_changes()
    if changes:
        st.warning(f"{len(changes)} data files not committed")
        st.caption("\n".join(f"- `{c.strip()}`" for c in changes))
    else:
        st.success("Data files committed")

# ── Buttons ───────────────────────────────────────────────────────────────────
b1, b2, b3, _ = st.columns([1, 1, 1, 3])
for col, label, fn in ((b1, "Validate now", actions.run_validate),
                       (b2, "Export now", actions.run_export),
                       (b3, "Back up now", actions.run_backup)):
    if col.button(label, width="stretch"):
        with st.spinner(f"{label}…"):
            ok, output = fn()
        st.session_state["action_result"] = (label, ok, output)
        st.cache_data.clear()
        st.rerun()

st.divider()

# ── Health (from the last validation run) ─────────────────────────────────────
st.subheader("Data health")
report, when = actions.validation_report()
if report is None:
    st.info("No validation report yet: click Validate now.")
else:
    checks = report["checks"]
    by_sev = {s: [c for c in checks if c["severity"] == s and c["count"]] for s in ("error", "warning", "review", "info")}
    m = st.columns(4)
    m[0].metric("Errors", len(by_sev["error"]))
    m[1].metric("Warnings", len(by_sev["warning"]))
    m[2].metric("Review items", len(by_sev["review"]))
    m[3].metric("Checks passed", sum(1 for c in checks if not c["count"]))
    st.caption(f"From the validation run at {when:%Y-%m-%d %H:%M}.")
    icons = {"error": "🔴", "warning": "🟠", "review": "🔵", "info": "⚪"}
    for sev in ("error", "warning", "review", "info"):
        for c in by_sev[sev]:
            with st.expander(f"{icons[sev]} {c['check']} ({c['count']})", expanded=(sev == "error")):
                rows = pd.DataFrame(c["rows"]).rename(columns={0: "item", 1: "detail"})
                st.dataframe(rows, hide_index=True, width="stretch")
