"""Coverage: where the data is dense or thin, over time and across lanes and categories."""

import pandas as pd
import plotly.express as px
import streamlit as st

from lib.db import LANE_LABEL, LANES, bin_label, bin_start, event_categories, events, spans

st.title("Coverage")
st.caption("This measures what the database contains, not how much history happened (doc 10 §6).")

size = st.segmented_control("Time bin", [50, 100, 250, 500], default=100,
                            format_func=lambda n: f"{n} years") or 100
ev = events().copy()
ev["bin"] = bin_start(ev["year"], size)
bins = list(range(int(ev["bin"].min()), int(ev["bin"].max()) + size, size))
labels = [bin_label(b, size) for b in bins]

# ── Heatmap: events per bin × lane ────────────────────────────────────────────
st.subheader("Events per period and lane")
grid = (ev.pivot_table(index="lane", columns="bin", values="entity_id", aggfunc="count", fill_value=0)
          .reindex(index=[l for l, _ in LANES], columns=bins, fill_value=0))
fig = px.imshow(grid.values, x=labels, y=[LANE_LABEL[l] for l in grid.index], aspect="auto",
                color_continuous_scale="Blues", labels=dict(x="Period", y="Lane", color="Events"))
fig.update_traces(text=[[str(v) if v else "" for v in row] for row in grid.values],
                  texttemplate="%{text}")  # numbers only where there are events
fig.update_layout(height=380, margin=dict(l=0, r=0, t=10, b=0))
st.plotly_chart(fig, width="stretch")

# ── Categories over time ──────────────────────────────────────────────────────
st.subheader("Categories over time")
primary_only = st.toggle("Primary category only", value=False,
                         help="Off: an event counts once for each of its categories.")
cats = event_categories()
if primary_only:
    cats = cats[cats["position"] == 0]
cats = cats.assign(bin=bin_start(cats["year"], size))
counts = cats.groupby(["bin", "category"]).size().reset_index(name="events")
counts["period"] = counts["bin"].map(lambda b: bin_label(b, size))
fig = px.bar(counts, x="period", y="events", color="category",
             category_orders={"period": labels})
fig.update_layout(height=420, margin=dict(l=0, r=0, t=10, b=0), legend_title_text="")
st.plotly_chart(fig, width="stretch")

# ── Distributions ─────────────────────────────────────────────────────────────
st.subheader("Distributions")
d1, d2, d3, d4 = st.columns(4)


def small_bar(col, series: pd.Series, title: str, order=None):
    data = series.value_counts().rename_axis(title).reset_index(name="count")
    if order is not None:
        data = data.set_index(title).reindex(order, fill_value=0).reset_index()
    fig = px.bar(data, x=title, y="count")
    fig.update_layout(height=260, margin=dict(l=0, r=0, t=30, b=0), title=title)
    col.plotly_chart(fig, width="stretch")


small_bar(d1, ev["importance"], "Importance", order=list(range(1, 10)))
small_bar(d2, ev["difficulty"], "Difficulty", order=["easy", "medium", "hard"])
small_bar(d3, ev["lane"].map(LANE_LABEL), "Lane", order=[label for _, label in LANES])
sp = spans()
small_bar(d4, pd.concat([pd.Series(["event"] * len(ev)), sp["kind"]]), "Kind")

# ── Thinnest periods ──────────────────────────────────────────────────────────
st.subheader("Thinnest periods")
st.caption("The best places to aim the next draft batch (Step 4).")
per_bin = ev.groupby("bin").size().reindex(bins, fill_value=0)
thin = (pd.DataFrame({"start": bins, "period": labels, "events": per_bin.values})
          .sort_values(["events", "start"]).head(12).drop(columns="start"))
st.dataframe(thin, hide_index=True, width="stretch")
