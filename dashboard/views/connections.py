"""Connections: every link of one event or span, read from its point of view."""

import pandas as pd
import streamlit as st

from lib.db import forward_label, q

st.title("Connections")
st.caption("Links are stored once and read from either end: on Kilby's chip it says *preceded*, "
           "on Noyce's it says *followed*. Proposed links are marked ⏳ until reviewed.")

links = q("SELECT * FROM v_link_review")
if links.empty:
    st.info("No links yet. They arrive in batches (doc 11, Step 3b).")
    st.stop()

# ── Overview of the graph so far ─────────────────────────────────────────────
c1, c2, c3 = st.columns(3)
c1.metric("Links", len(links))
c2.metric("Reviewed", int((links["status"] == "reviewed").sum()))
c3.metric("Causal", int(links["is_causal"].sum()))

ends = pd.concat([
    links[["source_id", "source_name", "source_year"]].set_axis(["id", "name", "year"], axis=1),
    links[["target_id", "target_name", "target_year"]].set_axis(["id", "name", "year"], axis=1)])
degree = ends.groupby(["id", "name", "year"]).size().reset_index(name="links").sort_values(["links", "year"],
                                                                                           ascending=[False, True])

# ── Pick an entity ───────────────────────────────────────────────────────────
everyone = q("""SELECT e.entity_id AS id, e.name, e.year FROM events e
                UNION SELECT s.entity_id, s.name, s.start_year FROM time_spans s
                WHERE s.entity_id NOT IN (SELECT entity_id FROM events) AND s.kind <> 'era'
                ORDER BY 3""")
labels = {r.id: f"{r.name} ({r.year})" for r in everyone.itertuples()}
linked_first = degree["id"].tolist() + [i for i in everyone["id"] if i not in set(degree["id"])]
choice = st.selectbox("Event or span", linked_first, format_func=lambda i: labels.get(i, i),
                      help="Linked entities are listed first.")

mine = links[(links["source_id"] == choice) | (links["target_id"] == choice)]
if mine.empty:
    st.caption("No links yet for this one.")
else:
    rows = []
    for _, r in mine.iterrows():
        if r["source_id"] == choice:  # read forwards
            verb, other, other_id, year = forward_label(r["type"]), r["target_name"], r["target_id"], r["target_year"]
        else:  # read from the target: the inverse label
            verb, other, other_id, year = r["inverse_label"], r["source_name"], r["source_id"], r["source_year"]
        rows.append({"": "⏳" if r["status"] == "proposed" else "", "relation": verb,
                     "other": f"{other} ({year})", "why": r["why"], "other id": other_id})
    table = pd.DataFrame(rows).sort_values(["relation", "other"])
    st.markdown(f"**{labels.get(choice, choice)}**")
    st.dataframe(table, hide_index=True, width="stretch")

with st.expander("Most connected so far"):
    st.dataframe(degree.head(25), hide_index=True, width="stretch")
