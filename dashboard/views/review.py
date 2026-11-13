"""Review: every decision waiting on a human. Each button calls a tools/ function (doc 13 §4.2)."""

import hashlib

import pandas as pd
import streamlit as st

from lib import actions
from lib.db import has_sources, has_table, link_sentence, q, source_links, starts_span

st.header("Review", divider=False)


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


TABLE_H = 388  # about 10 rows: with the buttons above, a whole queue fits on one screen


def selectable(df, key, columns=None, id_col="entity_id", column_config=None):
    """A table with tickable rows; returns the selected rows as a DataFrame.

    Streamlit remembers a selection by row *position*. After an action the rows change
    (decided items leave, flagged ones move), so a remembered position could point at the
    wrong item. Keying the widget on the exact list of ids resets the ticks whenever it changes.
    """
    ids = "|".join(df[id_col].astype(str))
    widget_key = f"{key}-{hashlib.sha1(ids.encode()).hexdigest()[:10]}"
    shown = df[columns] if columns else df
    event = st.dataframe(shown, hide_index=True, width="stretch", height=min(TABLE_H, 38 + 35 * len(df)),
                         key=widget_key, column_config=column_config, on_select="rerun", selection_mode="multi-row")
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
def when_text(r) -> str:
    """'c. 264–241 BCE', '1556', '?': signed years made readable."""
    if pd.isna(r["year"]):
        return "?"
    fmt = lambda y: f"{-int(y)} BCE" if y < 0 else str(int(y))
    c = "c. " if r["approximate"] == 1 else ""
    if pd.isna(r["end_year"]):
        return c + fmt(r["year"])
    if r["year"] < 0 and r["end_year"] < 0:
        return f"{c}{-int(r['year'])}–{-int(r['end_year'])} BCE"
    return f"{c}{fmt(r['year'])}–{fmt(r['end_year'])}"


missing_items = q("""SELECT id, status, kind, year, end_year, approximate, name, region, why, found_while,
                            related_ids, entity_id, note
    FROM missing_entities ORDER BY status = 'wanted' DESC, coalesce(year, 9999)""") if has_table("missing_entities") \
    else q("SELECT NULL AS id, NULL AS status WHERE 0")
if not missing_items.empty:
    missing_items["when"] = missing_items.apply(when_text, axis=1)
n_missing = int(missing_items["status"].isin(["open", "wanted"]).sum())
proposed_sources = (q("SELECT * FROM v_source_review WHERE status = 'proposed'") if has_sources()
                    else q("SELECT NULL AS entity_id WHERE 0"))
has_why = has_table("entity_significance")
proposed_why = (q("SELECT * FROM v_significance_review WHERE status = 'proposed'") if has_why
                else q("SELECT NULL AS entity_id WHERE 0"))

TAB_LABELS = [
    f"Event drafts ({len(drafts)})", f"Country tags ({len(tags)})", f"Identity, Step 3a ({len(shared)})",
    f"Links ({len(proposed_links)})", f"Sources ({len(proposed_sources)})",
    f"Significance ({len(proposed_why)})", f"Missing ({n_missing})",
    "Fix any country tags", "Decision log"]
# Stay on the same tab after an action. The counts in the labels change, so remember the name without them,
# and key the widget on the labels (a changed label is a new widget, opened on the remembered tab).
tab_name = lambda label: label.split(" (")[0]
tabs_key = "review_tabs_" + hashlib.sha1("|".join(TAB_LABELS).encode()).hexdigest()[:8]
# The default is fixed when this widget is first made: changing it on a later run would reset the tab.
remembered = st.session_state.setdefault(
    tabs_key + ":default", next((l for l in TAB_LABELS if tab_name(l) == st.session_state.get("review_tab")), None))
t_drafts, t_tags, t_identity, t_links, t_sources, t_why, t_missing, t_fix, t_log = st.tabs(
    TAB_LABELS, default=remembered, key=tabs_key, on_change="rerun")
if st.session_state.get(tabs_key):
    st.session_state["review_tab"] = tab_name(st.session_state[tabs_key])

# ── Event drafts ─────────────────────────────────────────────────────────────
with t_drafts:
    if drafts.empty:
        st.success("No event drafts waiting. New batches arrive with `load-drafts`.")
    else:
        bar = st.container()  # buttons go above the table (filled once the selection is known)
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
                if (wiki := source_links(d["entity_id"])):
                    st.markdown(wiki)
                why = proposed_why.loc[proposed_why["entity_id"] == d["entity_id"], "significance"]
                if not why.empty:
                    st.markdown(f"**Why it matters** (approved with the draft): {why.iloc[0]}")
        ids = picked["entity_id"].tolist()
        c1, c2, _ = bar.columns([1, 1, 4])
        if c1.button(f"Approve ({len(ids)})", key="approve_drafts", disabled=not ids, type="primary"):
            finish("Approve drafts", actions.approve_drafts(ids))

        @st.dialog("Reject drafts")
        def reject_dialog(ids):
            st.write(f"Delete {len(ids)} draft(s): " + ", ".join(f"`{i}`" for i in ids))
            reason = st.text_input("Reason (recorded in the log)")
            if st.button("Reject", key="confirm_reject_drafts", type="primary", disabled=not reason.strip()):
                finish("Reject drafts", actions.reject_drafts(ids, reason))

        if c2.button(f"Reject ({len(ids)})…", key="reject_drafts", disabled=not ids):
            reject_dialog(ids)

# ── Country tags ─────────────────────────────────────────────────────────────
with t_tags:
    if tags.empty:
        st.success("No country tags waiting. Use **Fix any country tags** to change a reviewed one.")
    else:
        bar = st.container()
        picked = selectable(tags, "tags", ["year", "name", "region", "countries", "confidence", "note"])
        ids = picked["entity_id"].tolist()
        c1, c2, _ = bar.columns([1, 2, 3])
        if c1.button(f"Approve ({len(ids)})", key="approve_tags", disabled=not ids, type="primary"):
            finish("Approve country tags", actions.approve_country_tags(ids))
        n_high = int((tags["confidence"] == "high").sum())
        if c2.button(f"Approve all high-confidence ({n_high})", key="approve_tags_high", disabled=not n_high):
            finish("Approve high-confidence tags", actions.approve_country_tags([], high=True))

# ── Identity (Step 3a) ───────────────────────────────────────────────────────
with t_identity:
    if shared.empty:
        st.success("Every shared event/span id has been decided.")
    else:
        bar = st.container()
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
        c1, c2, c3, c4, c5 = bar.columns([1, 1, 1, 1, 2])
        if c1.button(f"One subject ({len(ids)})", key="identity_one", disabled=not ids, type="primary",
                     help="Each id is both an event (the key moment) and a span (the whole period). "
                          "One subject is the usual answer (doc 11, Step 3a)."):
            finish("Identity: one subject", actions.decide_identity(ids, "one"))

        @st.dialog("Flag for a split")
        def split_dialog(ids):
            st.write("These ids will be flagged `needs_split`. The split itself (a new span id) "
                     "is done with Claude: " + ", ".join(f"`{i}`" for i in ids))
            if st.button("Flag for a split", key="confirm_split", type="primary"):
                finish("Identity: flagged for split", actions.decide_identity(ids, "split"))

        @st.dialog("All one subject")
        def all_one_dialog(ids):
            st.write(f"Mark all {len(ids)} undecided ids as **one subject**?")
            if st.button("Confirm all", key="confirm_all_one", type="primary"):
                finish("Identity: one subject (all)", actions.decide_identity(ids, "one"))

        @st.dialog("Keep the event only")
        def drop_span_dialog(ids):
            st.write("The **span** (and its span categories) will be deleted; the **event** stays. "
                     "DateFlow will no longer show these as bars: " + ", ".join(f"`{i}`" for i in ids))
            if st.button("Delete the spans", key="confirm_drop_span", type="primary"):
                finish("Identity: span dropped", actions.decide_identity(ids, "drop-span"))

        if c2.button(f"Needs a split ({len(ids)})…", key="identity_split", disabled=not ids):
            split_dialog(ids)
        if c3.button(f"Keep event only ({len(ids)})…", key="identity_keep_event", disabled=not ids):
            drop_span_dialog(ids)
        @st.dialog("Keep the span only")
        def drop_event_dialog(ids):
            st.write("The **event** (with its aliases and event categories) will be deleted; the **span** stays. "
                     "DatePick and DateGolf will no longer use it: " + ", ".join(f"`{i}`" for i in ids))
            st.caption("Refused for milestones or events with DateLinks content, which hang off the event.")
            if st.button("Delete the events", key="confirm_drop_event", type="primary"):
                finish("Identity: event dropped", actions.decide_identity(ids, "drop-event"))

        if c4.button(f"Keep span only ({len(ids)})…", key="identity_keep_span", disabled=not ids):
            drop_event_dialog(ids)
        if c5.button(f"All undecided are one subject ({len(undecided)})…", key="identity_all_one", disabled=not undecided):
            all_one_dialog(undecided)

# ── Links ────────────────────────────────────────────────────────────────────
with t_links:
    if proposed_links.empty:
        st.success("No links waiting. New batches arrive with `load-links` (doc 11, 3b).")
    else:
        view = proposed_links.assign(link=proposed_links.apply(link_sentence, axis=1),
                                     starts=proposed_links.apply(starts_span, axis=1))
        n_starts = int(view["starts"].sum())
        # Buttons on the left: the table's hover toolbar appears at its top-right and would cover them.
        c1, c2, f1 = st.columns([1, 1, 4], vertical_alignment="center")
        show = f1.radio("Show", ["All", f"Event starts the span ({n_starts})", "The rest"], horizontal=True,
                        label_visibility="collapsed",
                        help="Each link reads as a sentence; sequences show from the later side (\"B followed A\"). "
                             "'Starts the span': the event is in the span's first year. Tick the header box to "
                             "select all shown.")
        if show != "All":
            view = view[view["starts"] == show.startswith("Event starts")]
        picked = selectable(view, "links", ["link", "why", "confidence", "origin"], id_col="id")
        if len(picked) == 1:
            d = picked.iloc[0]
            with st.container(border=True):
                st.markdown(f"**{d['link']}** — {d['why'] or '—'}")
                st.caption(f"Stored as `{d['source_id']}` {d['type']} `{d['target_id']}` · "
                           f"{'causal' if d['is_causal'] else 'not causal'} · confidence {d['confidence'] or '—'}")
        ids = [int(i) for i in picked["id"]]
        if c1.button(f"Approve ({len(ids)})", disabled=not ids, type="primary", key="approve_links", width="stretch"):
            finish("Approve links", actions.approve_links(ids))

        @st.dialog("Reject links")
        def reject_links_dialog(ids):
            st.write(f"Delete {len(ids)} proposed link(s).")
            reason = st.text_input("Reason (recorded in the log)")
            if st.button("Reject", key="confirm_reject_links", type="primary", disabled=not reason.strip()):
                finish("Reject links", actions.reject_links(ids, reason))

        if c2.button(f"Reject ({len(ids)})…", disabled=not ids, key="reject_links", width="stretch"):
            reject_links_dialog(ids)

# ── Sources ──────────────────────────────────────────────────────────────────
with t_sources:
    if proposed_sources.empty:
        st.success("No sources waiting. New batches arrive with `load-sources` (doc 11, Step 5).")
    else:
        exact = proposed_sources[(proposed_sources["origin"] == "title_match") & (proposed_sources["confidence"] == "high")]
        bar = st.container()
        picked = selectable(proposed_sources, "sources",
                            ["year", "name", "title", "url", "origin", "confidence", "note"],
                            column_config={"url": st.column_config.LinkColumn("article", display_text="open")})
        if len(picked) == 1:
            d = picked.iloc[0]
            with st.container(border=True):
                st.markdown(f"**{d['name']}** ({d['year']}) → 📖 [{d['title']}]({d['url']})")
                st.caption(f"`{d['entity_id']}` · {d['origin']} · confidence {d['confidence'] or '—'}")
        ids = list(dict.fromkeys(picked["entity_id"]))
        c1, c2, c3, _ = bar.columns([1, 1, 2, 2])
        if c1.button(f"Approve ({len(ids)})", disabled=not ids, type="primary", key="approve_sources"):
            finish("Approve sources", actions.approve_sources(ids))

        @st.dialog("Reject sources")
        def reject_sources_dialog(ids):
            st.write(f"Remove the proposed source from {len(ids)} entity(s). They'll show as unsourced again.")
            reason = st.text_input("Reason (recorded in the log)")
            if st.button("Reject", key="confirm_reject_sources", type="primary", disabled=not reason.strip()):
                finish("Reject sources", actions.reject_sources(ids, reason))

        if c2.button(f"Reject ({len(ids)})…", disabled=not ids, key="reject_sources"):
            reject_sources_dialog(ids)
        if c3.button(f"Approve all exact name matches ({len(exact)})", key="approve_exact_sources", disabled=exact.empty,
                     help="Is this the article about this event or span? Exact name matches are listed last: "
                          "skim them, then approve in bulk. Open a link to check."):
            finish("Approve exact name matches", actions.approve_sources([], True))

# ── Significance ("Why it matters", doc 17) ───────────────────────────────────
with t_why:
    if not has_why:
        st.info("The db has no significance table yet: **Update schema** on the Overview page.")
    elif proposed_why.empty:
        st.success("No significance texts waiting. Batches arrive with `load-drafts` or `load-significance`.")
    else:
        bar = st.container()
        picked = selectable(proposed_why, "why", ["year", "name", "significance", "origin", "note", "entity_status"],
                            column_config={"entity_status": st.column_config.TextColumn(
                                "item", help="'proposed' = a draft: its text is also approved with the draft")})
        if len(picked) == 1:
            d = picked.iloc[0]
            with st.container(border=True):
                st.markdown(f"**{d['name']}** ({d['year']})")
                st.caption("What happened (the description)")
                st.write(d["description"])
                st.caption("Why it matters (to review): consequences, not a retelling; no sole causes")
                st.write(d["significance"])
                if d["note"]:
                    st.warning(f"Review note: {d['note']}")
                if (wiki := source_links(d["entity_id"])):
                    st.markdown(wiki)
        ids = picked["entity_id"].tolist()
        c1, c2, _ = bar.columns([1, 1, 4])
        if c1.button(f"Approve ({len(ids)})", disabled=not ids, type="primary", key="approve_why"):
            finish("Approve significance", actions.approve_significance(ids))

        @st.dialog("Reject significance")
        def reject_why_dialog(ids):
            st.write(f"Delete the proposed text of {len(ids)} item(s). The items themselves stay.")
            reason = st.text_input("Reason (recorded in the log)")
            if st.button("Reject", key="confirm_reject_why", type="primary", disabled=not reason.strip()):
                finish("Reject significance", actions.reject_significance(ids, reason))

        if c2.button(f"Reject ({len(ids)})…", disabled=not ids, key="reject_why"):
            reject_why_dialog(ids)

    if has_why:
        with st.expander("Write or replace an item's significance"):
            st.caption("Saved as proposed, so it shows in the queue above until approved. "
                       "Replacing a reviewed text takes it out of the games until the new one is approved.")
            items = q("SELECT e.entity_id, e.name, e.year, x.text FROM events e "
                      "LEFT JOIN entity_significance x ON x.entity_id = e.entity_id UNION ALL "
                      "SELECT s.entity_id, s.name, s.start_year, x.text FROM time_spans s "
                      "LEFT JOIN entity_significance x ON x.entity_id = s.entity_id "
                      "WHERE s.kind <> 'era' AND s.entity_id NOT IN (SELECT entity_id FROM events) ORDER BY 3")
            labels = {r.entity_id: f"{r.name} ({r.year})" for r in items.itertuples()}
            choice = st.selectbox("Event or span", items["entity_id"].tolist(), index=None,
                                  format_func=lambda i: labels[i], placeholder="Search by name…", key="why_pick")
            if choice:
                current = items.loc[items["entity_id"] == choice, "text"].iloc[0]
                with st.form("set_why"):
                    text = st.text_area("Why it matters", value=current if isinstance(current, str) else "")
                    note = st.text_input("Note for the reviewer (optional)")
                    if st.form_submit_button("Save as proposed", type="primary", disabled=False):
                        finish(f"Significance for {choice}", actions.set_significance(choice, text, note or None))

# ── Missing events and spans ─────────────────────────────────────────────────
with t_missing:
    if missing_items.empty:
        st.success("Nothing on the list. Claude adds gaps it notices with `load-missing`.")
    else:
        c1, c2, c3, f1 = st.columns([1, 1, 1, 3], vertical_alignment="center")
        view_as = f1.radio("Show", ["To decide", "Wanted", "Done"], horizontal=True, label_visibility="collapsed",
                           help="Gaps noticed during other work. **Want** = ask Claude to draft it (it then "
                                "arrives in Event drafts); **Dismiss** = not worth adding, with a reason.")
        shown = {"To decide": missing_items["status"] == "open", "Wanted": missing_items["status"] == "wanted",
                 "Done": missing_items["status"].isin(["drafted", "dismissed"])}[view_as]
        picked = selectable(missing_items[shown], "missing",
                            ["kind", "when", "name", "region", "why", "note"], id_col="id")
        if len(picked) == 1:
            d = picked.iloc[0]
            with st.container(border=True):
                st.markdown(f"**{d['name']}** ({d['kind']}, {d['when']}) — {d['why']}")
                st.caption(f"Would link to: {d['related_ids'] or '—'} · found while {d['found_while'] or '—'}"
                           + (f" · drafted as `{d['entity_id']}`" if d["entity_id"] else ""))
        ids = [int(i) for i in picked["id"]]
        if c1.button(f"Want ({len(ids)})", disabled=not ids, type="primary", key="want_missing", width="stretch"):
            finish("Marked wanted", actions.set_missing_status(ids, "wanted"))

        @st.dialog("Dismiss")
        def dismiss_missing_dialog(ids):
            st.write(f"Take {len(ids)} item(s) off the list.")
            reason = st.text_input("Reason (recorded)")
            if st.button("Dismiss", key="confirm_dismiss_missing", type="primary", disabled=not reason.strip()):
                finish("Dismissed", actions.set_missing_status(ids, "dismissed", reason))

        if c2.button(f"Dismiss ({len(ids)})…", disabled=not ids, key="dismiss_missing", width="stretch"):
            dismiss_missing_dialog(ids)
        if c3.button(f"Back to open ({len(ids)})", disabled=not ids, key="reopen_missing", width="stretch"):
            finish("Reopened", actions.set_missing_status(ids, "open"))

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
