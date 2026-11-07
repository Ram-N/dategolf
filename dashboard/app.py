"""DateGolf admin dashboard (local only). Run: npm run data:dashboard. See docs/13."""

import streamlit as st

st.set_page_config(page_title="DateGolf admin", page_icon="🗺️", layout="wide")

page = st.navigation([
    st.Page("views/overview.py", title="Overview", icon="🏠", default=True),
    st.Page("views/coverage.py", title="Coverage", icon="📊"),
    st.Page("views/map.py", title="Map", icon="🗺️"),
])

with st.sidebar:
    st.caption("Read-only, apart from the Overview buttons, which run the data tools (`tools/`).")
    st.markdown("[Browse in Datasette ↗](http://localhost:8001) (`npm run data:browse`)")

page.run()
