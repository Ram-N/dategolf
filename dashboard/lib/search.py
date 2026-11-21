"""Search for dashboard tables: every query word must appear somewhere in the row (any column,
including ones the table doesn't show, such as ids and descriptions). Case and accents are ignored."""

import unicodedata

import pandas as pd
import streamlit as st


def fold(text: str) -> str:
    """'Bạch Đằng' → 'bach dang': lower case, accents removed."""
    text = unicodedata.normalize("NFKD", str(text)).replace("đ", "d").replace("Đ", "D")
    return "".join(c for c in text if not unicodedata.combining(c)).casefold()


def filter_rows(df: pd.DataFrame, query: str) -> pd.DataFrame:
    words = fold(query).split()
    if not words or df.empty:
        return df
    text = df.fillna("").astype(str).agg(" ".join, axis=1).map(fold)
    return df[text.map(lambda row: all(w in row for w in words))]


def search_box(df: pd.DataFrame, key: str, placeholder: str = "Search: words in any column (name, id, year, notes…)"):
    """A search field above a table; returns the matching rows and says how many matched."""
    query = st.text_input("Search", key=f"search-{key}", placeholder=placeholder, label_visibility="collapsed")
    found = filter_rows(df, query)
    if query.strip():
        st.caption(f"{len(found)} of {len(df)} rows match “{query.strip()}”")
    return found
