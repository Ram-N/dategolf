"""Review: every decision waiting on a human. Each button calls a tools/ function (doc 13 §4.2)."""

import hashlib

import streamlit as st

from lib import actions
from lib.db import link_sentence, q

st.title("Review")


def finish(label, result):
    """Store a tool's result for the next run, then refresh everything."""
    st.session_state["review_result"] = (label, *result)
    st.cache_data.clear()
    st.rerun()


if "review_result" in st.session_state:
    label, ok, output = st.session_state.pop("review_result")
    (st.success if ok else st.error)(f"{label}: {'done' if ok else 'some items failed'}")
    if output.strip():
        with st.expander("Tool output", expanded=not ok):
            st.code(output)
    if ok and actions.export_needed():
        st.info("The game JSON now differs from the db: **Export** on the Overview page when you're done reviewing.")


def selectable(df, key, columns=None, id_col="entity_id"):
    """A table with tickable rows; returns the selected rows as a DataFrame.

    Streamlit remembers a selection by row *position*. After an action the rows change
    (decided items leave, flagged ones move), so a remembered position could point at the
    wrong item. Keying the widget on the exact list of ids resets the ticks whenever it changes.
    """
    ids = "|".join(df[id_col].astype(str))
    widget_key = f"{key}-{hashlib.sha1(ids.encode()).hexdigest()[:10]}"
    shown = df[columns] if columns else df
    event = st.dataframe(shown, hide_index=True, width="stretch", key=widget_key,
                         on_select="rerun", selection_mode="multi-row")
    rows = [r for r in event.selection.rows if r < len(df)]  # belt and braces
    return df.iloc[rows]


drafts = q("SELECT * FROM v_proposed_events")
tags = q("SELECT * FROM v_country_review WHERE status = 'proposed'")
shared = q("""
    SELECT e.entity_id, e.year AS event_year, e.name AS event_name,
           s.start_year || ' to ' || s.end_year AS span_years, s.name AS span_name,
           n.editorial_status AS status, e.description AS event_description, s.description AS span_description
    FROM events e JOIN time_spans s ON s.entity_id = e.entity_id JOIN entities n ON n.id = e.entity_id
    WHERE n.editorial_status IN ('needs_review_identity', 'needs_split')
    ORDER BY n.editorial_status = 'needs_split', e.year""")

proposed_links = q("SELECT * FROM v_link_review WHERE status = 'proposed'")

t_drafts, t_tags, t_identity, t_links, t_fix, t_log = st.tabs([
    f"Event drafts ({len(drafts)})", f"Country tags ({len(tags)})", f"Identity, Step 3a ({len(shared)})",
    f"Links ({len(proposed_links)})", "Fix any country tags", "Decision log"])

# ── Event drafts ─────────────────────────────────────────────────────────────
with t_drafts:
    if drafts.empty:
        st.success("No event drafts waiting. New batches arrive with `load-drafts`.")
    else:
        picked = selectable(drafts, "drafts", ["year", "name", "region", "categories", "importance", "review_note"])
        if len(picked) == 1:
            d = picked.iloc[0]
            with st.container(border=True):
                st.markdown(f"**{d['name']}** · {d['year']} · {d['region']} · {d['categories']} · "
                            f"importance {d['importance']} · {d['difficulty']}")
                st.write(d["description"])
                st.caption(f"Aliases: {d['aliases']}")
                if d["review_note"]:
                    st.warning(f"Review note: {d['review_note']}")
                if d["csv_text"]:
                    st.caption(f"Source CSV text: {d['csv_text']}")
        ids = picked["entity_id"].tolist()
        c1, c2, _ = st.columns([1, 1, 4])
        if c1.button(f"Approve ({len(ids)})", disabled=not ids, type="primary"):
            finish("Approve drafts", actions.approve_drafts(ids))

        @st.dialog("Reject drafts")
        def reject_dialog(ids):
            st.write(f"Delete {len(ids)} draft(s): " + ", ".join(f"`{i}`" for i in ids))
            reason = st.text_input("Reason (recorded in the log)")
            if st.button("Reject", type="primary", disabled=not reason.strip()):
                finish("Reject drafts", actions.reject_drafts(ids, reason))

        if c2.button(f"Reject ({len(ids)})…", disabled=not ids):
            reject_dialog(ids)

# ── Country tags ─────────────────────────────────────────────────────────────
with t_tags:
    if tags.empty:
        st.success("No country tags waiting. Use **Fix any country tags** to change a reviewed one.")
    else:
        picked = selectable(tags, "tags", ["year", "name", "region", "countries", "confidence", "note"])
        ids = picked["entity_id"].tolist()
        c1, c2, _ = st.columns([1, 2, 3])
        if c1.button(f"Approve ({len(ids)})", disabled=not ids, type="primary"):
            finish("Approve country tags", actions.approve_country_tags(ids))
        n_high = int((tags["confidence"] == "high").sum())
        if c2.button(f"Approve all high-confidence ({n_high})", disabled=not n_high):
            finish("Approve high-confidence tags", actions.approve_country_tags([], high=True))

# ── Identity (Step 3a) ───────────────────────────────────────────────────────
with t_identity:
    if shared.empty:
        st.success("Every shared event/span id has been decided.")
    else:
        st.caption("Each id exists both as an event (the key moment) and as a span (the whole period). "
                   "**One subject** is the usual answer (doc 11, Step 3a).")
        picked = selectable(shared, "identity", ["event_year", "event_name", "span_years", "span_name", "status"])
        if len(picked) == 1:
            d = picked.iloc[0]
            left, right = st.columns(2)
            with left.container(border=True):
                st.markdown(f"**Event:** {d['event_name']} ({d['event_year']})")
                st.write(d["event_description"])
            with right.container(border=True):
                st.markdown(f"**Span:** {d['span_name']} ({d['span_years']})")
                st.write(d["span_description"])
        ids = picked["entity_id"].tolist()
        undecided = shared.loc[shared["status"] == "needs_review_identity", "entity_id"].tolist()
        c1, c2, c3, c4, c5 = st.columns([1, 1, 1, 1, 2])
        if c1.button(f"One subject ({len(ids)})", disabled=not ids, type="primary"):
            finish("Identity: one subject", actions.decide_identity(ids, "one"))

        @st.dialog("Flag for a split")
        def split_dialog(ids):
            st.write("These ids will be flagged `needs_split`. The split itself (a new span id) "
                     "is done with Claude: " + ", ".join(f"`{i}`" for i in ids))
            if st.button("Flag for a split", type="primary"):
                finish("Identity: flagged for split", actions.decide_identity(ids, "split"))

        @st.dialog("All one subject")
        def all_one_dialog(ids):
            st.write(f"Mark all {len(ids)} undecided ids as **one subject**?")
            if st.button("Confirm all", type="primary"):
                finish("Identity: one subject (all)", actions.decide_identity(ids, "one"))

        @st.dialog("Keep the event only")
        def drop_span_dialog(ids):
            st.write("The **span** (and its span categories) will be deleted; the **event** stays. "
                     "DateFlow will no longer show these as bars: " + ", ".join(f"`{i}`" for i in ids))
            if st.button("Delete the spans", type="primary"):
                finish("Identity: span dropped", actions.decide_identity(ids, "drop-span"))

        if c2.button(f"Needs a split ({len(ids)})…", disabled=not ids):
            split_dialog(ids)
        if c3.button(f"Keep event only ({len(ids)})…", disabled=not ids):
            drop_span_dialog(ids)
        @st.dialog("Keep the span only")
        def drop_event_dialog(ids):
            st.write("The **event** (with its aliases and event categories) will be deleted; the **span** stays. "
                     "DatePick and DateGolf will no longer use it: " + ", ".join(f"`{i}`" for i in ids))
            st.caption("Refused for milestones or events with DateLinks content, which hang off the event.")
            if st.button("Delete the events", type="primary"):
                finish("Identity: event dropped", actions.decide_identity(ids, "drop-event"))

        if c4.button(f"Keep span only ({len(ids)})…", disabled=not ids):
            drop_event_dialog(ids)
        if c5.button(f"All undecided are one subject ({len(undecided)})…", disabled=not undecided):
            all_one_dialog(undecided)

# ── Links ────────────────────────────────────────────────────────────────────
with t_links:
    if proposed_links.empty:
        st.success("No links waiting. New batches arrive with `load-links` (doc 11, 3b).")
    else:
        st.caption("Each link reads as a sentence. Sequences are shown from the later side "
                   "(\"B followed A\"); they're stored once and read both ways.")
        view = proposed_links.assign(link=proposed_links.apply(link_sentence, axis=1))
        picked = selectable(view, "links", ["link", "why", "confidence", "origin"], id_col="id")
        if len(picked) == 1:
            d = picked.iloc[0]
            with st.container(border=True):
                st.markdown(f"**{d['link']}**")
                st.write(d["why"] or "—")
                st.caption(f"Stored as `{d['source_id']}` {d['type']} `{d['target_id']}` · "
                           f"{'causal' if d['is_causal'] else 'not causal'} · confidence {d['confidence'] or '—'}")
        ids = [int(i) for i in picked["id"]]
        c1, c2, _ = st.columns([1, 1, 4])
        if c1.button(f"Approve ({len(ids)})", disabled=not ids, type="primary", key="approve_links"):
            finish("Approve links", actions.approve_links(ids))

        @st.dialog("Reject links")
        def reject_links_dialog(ids):
            st.write(f"Delete {len(ids)} proposed link(s).")
            reason = st.text_input("Reason (recorded in the log)")
            if st.button("Reject", type="primary", disabled=not reason.strip()):
                finish("Reject links", actions.reject_links(ids, reason))

        if c2.button(f"Reject ({len(ids)})…", disabled=not ids, key="reject_links"):
            reject_links_dialog(ids)

# ── Fix any country tags ─────────────────────────────────────────────────────
with t_fix:
    st.caption('Replace an entity\'s country tags. Write codes separated by commas, primary first; '
               'add `/actor` for an actor, e.g. `US, JP/actor`. Unknown codes are refused.')
    everyone = q("SELECT entity_id, name, year, countries FROM v_country_review ORDER BY year")
    labels = {r.entity_id: f"{r.name} ({r.year})" for r in everyone.itertuples()}
    choice = st.selectbox("Entity", everyone["entity_id"].tolist(), index=None,
                          format_func=lambda i: labels[i], placeholder="Search by name…")
    if choice:
        current = q("SELECT group_concat(country || CASE role WHEN 'actor' THEN '/actor' ELSE '' END, ', ') AS spec, "
                    "max(CASE WHEN position = 0 THEN note END) AS note FROM "
                    "(SELECT * FROM entity_countries WHERE entity_id = ? ORDER BY position)", choice).iloc[0]
        with st.form("fix_tags"):
            spec = st.text_input("Countries", value=current["spec"] or "")
            note = st.text_input("Note (why these countries)", value=current["note"] or "")
            if st.form_submit_button("Save tags", type="primary"):
                finish(f"Country tags for {choice}", actions.set_country_tags(choice, spec, note or None))

# ── Decision log ─────────────────────────────────────────────────────────────
with t_log:
    st.caption("Every review decision, from the dashboard or the CLI (table `review_log`).")
    st.dataframe(q("SELECT at, action, entity_id, detail, via FROM review_log ORDER BY id DESC LIMIT 200"),
                 hide_index=True, width="stretch")
