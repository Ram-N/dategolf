"""Map: events and spans per present-day country, with an era slider."""

import plotly.express as px
import streamlit as st

from lib.db import country_tags

st.title("Map")
st.caption("Counts events and spans by their country tags (`entity_countries`). "
           "Location = where it happened; actor = whose story it is.")

tags = country_tags()
lo, hi = int(tags["start_year"].min()), int(tags["end_year"].max())

f1, f2, f3 = st.columns([3, 1, 1])
years = f1.slider("Years", lo, hi, (lo, hi), help="Spans count if they overlap the range.")
kinds = f2.segmented_control("Show", ["event", "span"], default=["event", "span"], selection_mode="multi") or []
with_actors = f3.toggle("Include actors", value=False)
all_cats = sorted({c for cs in tags["categories"].dropna() for c in cs.split(", ")})
pick_cats = st.multiselect("Categories (any of)", all_cats, placeholder="All categories")

view = tags[(tags["end_year"] >= years[0]) & (tags["start_year"] <= years[1]) & tags["kind"].isin(kinds)]
if not with_actors:
    view = view[view["role"] == "location"]
if pick_cats:
    view = view[view["categories"].fillna("").map(lambda cs: any(c in cs.split(", ") for c in pick_cats))]

worldwide = view[view["country"] == "ZZ"]
mapped = view[view["iso3"].notna()]
per_country = (mapped.groupby(["iso3", "country", "country_name"])["entity_id"].nunique()
                     .reset_index(name="entities"))

st.metric("Entities shown", view["entity_id"].nunique(),
          help=f"{worldwide['entity_id'].nunique()} worldwide (ZZ) entities aren't drawn on the map.")
fig = px.choropleth(per_country, locations="iso3", locationmode="ISO-3", color="entities",
                    hover_name="country_name", color_continuous_scale="Blues",
                    labels={"entities": "Events + spans"})
fig.update_geos(showcountries=True, countrycolor="#bbb", showcoastlines=False, showframe=False,
                projection_type="natural earth", projection_rotation=dict(lon=0), fitbounds=False)
fig.update_layout(height=520, margin=dict(l=0, r=0, t=0, b=0))
st.plotly_chart(fig, width="stretch")

# ── Drill down ───────────────────────────────────────────────────────────────
st.subheader("Look at one country")
ranked = per_country.sort_values("entities", ascending=False)
options = ranked["country"].tolist() + (["ZZ"] if len(worldwide) else [])
names = dict(zip(ranked["country"], ranked["country_name"])) | {"ZZ": "Worldwide (ZZ)"}
choice = st.selectbox("Country", options, format_func=lambda c: f"{names[c]} ({c})") if options else None
if choice:
    rows = (view[view["country"] == choice]
              .sort_values("start_year")[["start_year", "name", "kind", "role", "categories", "entity_id"]]
              .rename(columns={"start_year": "year"}))
    st.dataframe(rows, hide_index=True, width="stretch")
