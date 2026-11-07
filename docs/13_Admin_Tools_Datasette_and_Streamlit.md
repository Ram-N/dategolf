# Admin Tools: Datasette and a Streamlit Dashboard

**Started:** 2026-11-07 · **Plan step:** doc 11, Step 2c · **Data rules:** doc 12

**Why:** DB Browser is a general table editor, but the work on this database is a **workflow**: propose, review, approve, export. Its limits kept getting in the way:
- adding one event means editing 4 tables
- the review views are read-only, so reading, editing and approving happen in three different places
- "Write Changes", F5 and `database is locked` keep tripping things up
- it has no charts or map

Step 3 (reviewing 50–100 links) would make all of this worse. Two tools replace DB Browser for everyday use. DB Browser stays installed for rare power edits.

---

## 1. Principles

1. **Datasette looks; Streamlit changes.** Datasette is read-only, with no write plugins and no write queries. Every change goes through Streamlit.
2. **Streamlit calls the existing tools** (`tools/*.py`: `approve`, `validate`, `export`, the loaders) rather than re-implementing their logic. There's one copy of the rules, so validation can't be bypassed.
3. **The game is untouched.** SQLite stays the source of truth, and the game still reads only the generated JSON (doc 10 §4). These are local admin tools, not part of the shipped app.
4. **Local only. Never deploy either tool**, since anyone who could reach them could read or change the data.
5. **Separate dependencies.** `dashboard/` has its own `uv` project (Datasette, Streamlit, pandas, plotly). `tools/` stays stdlib-only.
6. **Build in phases, and stop when it's enough** (the "keep it simple" rule in CLAUDE.md).

## 2. Layout and commands

```
dashboard/
  pyproject.toml     uv project: datasette + plugins (Streamlit added in v1)
  uv.lock            pinned versions (committed)
  metadata.yml       Datasette: titles, table/column descriptions, facets, canned queries
  app.py             Streamlit entry point (st.navigation)
  views/             one file per page: overview, coverage, map
  lib/db.py          read-only queries (cached; refresh when the db file changes)
  lib/actions.py     the only writes: wrappers around tools/ (validate, export, backup)
  smoke_test.py      headless AppTest check of every page
```

```bash
npm run data:browse      # Datasette  → http://localhost:8001  (read-only browsing + SQL)
npm run data:dashboard   # Streamlit  → http://localhost:8501  (overview, coverage, map; reviews from v2)
npm run data:dashboard:test  # headless smoke test of every page
```

Both open in your normal Windows browser; from WSL, `localhost` is forwarded automatically.

---

## 3. Datasette (step 1, ✅ built 2026-11-07)

**What it is:** a tool by Simon Willison (co-creator of Django) that turns any SQLite file into a browsable website with faceted filtering, full-text search, ad-hoc SQL and a JSON API, with no code needed. It has a large plugin ecosystem.

**Version:** 0.65.x, the current stable release; 1.0 is in alpha. In 0.65, everything is configured in **`metadata.yml`**.

### What's configured in `dashboard/metadata.yml`

- **Plain-English descriptions for every table and its key columns.** Datasette becomes *living documentation* of the data model.
- **Hidden internal tables:** `import_records` (raw migration payloads), `category_mappings` (unused) and `meta`. They're still reachable through SQL.
- **Default facets and sort orders.** For example, `events` opens sorted by year with facets for region, difficulty and importance, and `entity_countries` has facets for country, role and status.
- **Label columns,** so links show names instead of IDs where possible (`events.name`, `time_spans.name`, `countries.name`).
- **Canned queries:** named, saved SQL pages, some with parameters.

| Query | Shows |
|---|---|
| `event_card` | Everything about one event: categories, aliases, countries with roles, provenance, source CSV row |
| `search_events` | Find events by words in the name, aliases or description |
| `events_in_country` | Every event and span tagged with a country (by ISO code), with its role |
| `coverage_century_lane` | Events per century per DateFlow lane (chart it with the Vega plugin) |
| `category_balance` | Category counts per century |
| `thin_centuries` | The centuries with the fewest events: where to aim the next draft batch |
| `shared_ids_3a` | The 25 IDs that are both an event and a span (Step 3a) |
| `review_queue` | Everything waiting on a human: proposed drafts, proposed country tags, identity reviews |

### Learning notes

- **Facets** are the fastest way to explore: click a value to filter, and facets combine.
- **Every page has a JSON version:** add `.json` to the URL (e.g. `/dategolf/events.json?region=Africa`). That's useful for scripts.
- **Write SQL in the box on the database page** (`/dategolf`). If a query proves useful, make it a canned query in `metadata.yml`.
- **`datasette-vega`** adds a "Show charting options" panel under any query result: pick x/y columns for a bar or line chart.
- **The docs** are at docs.datasette.io (0.65). Simon's blog and TIL site have many worked examples.

---

## 4. Streamlit dashboard (planned)

| Phase | Contents | Writes? |
|---|---|---|
| **v1: Overview and insight** | Health (validation errors and warnings), an "export needed" indicator, the last backup date, with **Export / Validate / Backup** buttons. **Coverage:** a century × region heatmap, categories over time, the importance and difficulty mix. **Map:** a choropleth of events per country, with an era slider (country tags, role = location). | Only via the buttons, which run the existing tools |
| **v2: Review queues** | One screen per queue with **Approve / Edit / Reject**: proposed drafts, proposed country tags, the 25 shared IDs (**Step 3a is its first use**), and later the links | Yes, through the tools' approve functions |
| **v3: Editor** | **One form to add or edit an event** across all 4 tables (events, aliases, categories, countries), validated *before* saving. This fixes the "4 tables per event" problem. | Yes, through new functions in `tools/` |
| **v4: Links (with Step 3b/3c)** | A link-review screen (source → type → target, with names, years and descriptions side by side), a network view, and a chain explorer ("what led to WWII?") | Yes |

### 4.1 v1 detailed plan (planned 2026-11-07; ✅ built 2026-11-07)

**Built as planned, with these notes:**
- Pages live in `dashboard/views/`, not `pages/`. Streamlit treats a `pages/` folder specially, and `st.navigation` replaces that.
- `countries` now has both `code` (ISO-2, the key) and `iso3` (ISO-3 for maps). All 100 countries have one; `ZZ` has none. The country loader keeps `iso3` when re-loading.
- **Map:** centred on longitude 0, natural-earth projection.
- **Coverage heatmap:** numbers appear only in non-empty cells.
- Streamlit's "Deploy" button is hidden (`--client.toolbarMode minimal`), since this tool must never be deployed.
- `npm run data:dashboard:test` runs the headless smoke test: all pages render, and 'Validate now' works.

**Goal:** a read-mostly dashboard that shows the health of the data at a glance, plus where coverage is thin, both as charts and on a world map. The only writes are three buttons, and each one calls an existing tool function.

**Files:**
```
dashboard/
  app.py            entry point: page config + st.navigation (one page per tab)
  lib/db.py         read-only queries → pandas DataFrames, cached and refreshed when the db file changes
  lib/actions.py    thin wrappers that call the tools: validate.run(), exporter.run(), manage.backup()
  pages/overview.py
  pages/coverage.py
  pages/map.py
  smoke_test.py     headless check with Streamlit's AppTest: every page renders without errors
```
Run it with `npm run data:dashboard` → `streamlit run dashboard/app.py --server.address localhost --server.port 8501 --server.headless true`. It binds to localhost only, and headless mode stops it trying to open a browser inside WSL.

**Page 1, Overview:**
- **Counts:** events, spans, eras, countries in use, country tags, links, and how many items each review queue holds.
- **Health:** errors, warnings and review items from validation, each expandable to its rows. It reads `data/reports/validate.json`, and "Validate now" refreshes it.
- **Export needed?** It compares `exporter.render_all()` against the committed JSON files, the same check `compare-export` does. A red badge plus "Export now" appears when they differ.
- **Last backup:** the date of the newest file in `data/backup/`. "Back up now" runs `manage.backup()`, and the badge turns amber after 35 days.
- **Uncommitted changes:** `git status` on `data/`, `src/data/` and `public/data/`, so you know when to commit.
- **Buttons: Validate now, Export now, Back up now.** Each shows the tool's own output, and a locked database (DB Browser holding unwritten changes) produces a friendly message, not a crash.

**Page 2, Coverage:**
- **A heatmap of events per time bin × DateFlow lane.** The bin size can be 50, 100, 250 or 500 years, defaulting to a century. This shows Step 4's gaps at a glance.
- **Categories over time:** stacked bars, with the option to show all categories or the primary category only.
- **Distributions:** importance (1–9), difficulty, regions, and the event-versus-span mix.
- **Thinnest bins:** a table, matching Datasette's `thin_centuries`.

**Page 3, Map:**
- **A world choropleth of events per country**, from `entity_countries`. By default it counts `role = location`, with a toggle to include actors. `ZZ` (worldwide) is listed separately rather than drawn.
- **Filters:** a year-range slider (an era preview of DateFlow's future map mode), category, and events or spans.
- **Pick a country** to see its events and spans in a table below the map.
- **Needs ISO-3 codes:** Plotly's world map uses 3-letter codes. Add an `iso3` column to `countries` (e.g. IN → IND), with values for all 100 countries, so the database stays the single source. This is reusable for the game's future map, too.

**Not in v1:** any editing, the review queues (v2), the event editor (v3), and links (v4).

**Dependencies** (added to `dashboard/pyproject.toml`): `streamlit`, `pandas`, `plotly`.

**Done when:**
- all three pages render with real data, and `smoke_test.py` passes
- the three buttons work, including the friendly locked-db message
- the map shows the 100 countries
- it's documented in docs 12 and 13

### 4.2 v2 detailed plan: review queues (planned 2026-11-07; ✅ built 2026-11-07)

**Built as planned.** It adds a **Review** page with tabs for event drafts, country tags, identity (3a), *Fix any country tags* and the *Decision log*; the latest decisions also appear on the Overview.
- **New tool functions:** `drafts.approve` and `drafts.reject`, `countries.set_tags`, `identity.decide` (in `tools/identity.py`). Matching CLI commands: `approve`, `reject`, `set-countries`, `identity --one|--split`.
- **Tests:** `npm run data:test` runs 12 tool tests. `npm run data:dashboard:test` checks that all 4 pages render, Validate works and a review decision works. Both run on a **temporary copy** of the database (`DATEGOLF_DB`), and reports also go to the copy's folder.
- **Verified in the browser,** against a throwaway copy: the "All undecided are one subject" dialog decided all 25 ids, and each decision was logged with `via = dashboard`. The real database was untouched.

**Goal:** one **Review** page where every decision waiting on a human can be made: select items, read the context, and click **Approve**, **Reject** or **Decide**. No terminal and no DB Browser needed. Step 3a is its first real use.

**The rule still holds:** every action is a **function in `tools/`**. The page calls it, and so does a matching `manage.py` command, so the dashboard and the command line stay identical.

#### The queues (tabs on the Review page, each labelled with its count)

| Tab | Items today | Shows for each item | Actions |
|---|---|---|---|
| **Event drafts** | 0 (more with every batch) | Name, year, region, categories, aliases, description, review note, source CSV text | **Approve** · **Reject** (with a reason) |
| **Country tags** | 0 | Entity, its countries with roles, confidence, note | **Approve** · **Approve all high-confidence** · **Fix tags** (type e.g. `IN, PK/actor`; checked before saving) |
| **Identity (3a)** | **25** | The event and the span side by side: names, years, descriptions | **One subject** (the recommended default) · **Needs a split** (flags it; the split itself is done with Claude, since it renames a span id) |
| *Links (v4)* | — | *Added with Step 3b* | — |

Each tab has a **table with selectable rows** (pick one or many), a **detail card** for a single selection, and **action buttons** that apply to every selected row. Destructive actions (Reject, Needs a split) ask for confirmation in a dialog. After any action, the page refreshes, and a note reminds you to **Export** (Overview) when the game JSON is affected.

#### New and changed tool functions

| Function | Does | CLI |
|---|---|---|
| `drafts.approve(ids)` | Moved out of `manage.py` into a reusable function. Sets the status to `reviewed`. | `approve` (unchanged) |
| `drafts.reject(ids, reason)` | Deletes the draft (everything linked to it goes too). If it came from a CSV row, records "rejected at review: reason" in `legacy_csv_triage`, so the row stays closed. | `reject <id>... --reason` |
| `countries.set_tags(id, spec, note)` | Replaces an entity's tags from a spec like `IN, PK/actor`, checking that every code exists | `set-countries <id> "<spec>"` |
| `identity.decide(ids, decision)` | `one` → status `reviewed`; `split` → status `needs_split` (listed in validation for follow-up) | `identity <id>... --one \| --split` |

#### A small audit trail: `review_log`

A new table, `review_log(at, action, entity_id, detail)`, written by every function above, whether called from the dashboard or the command line. This is the first part of doc 10 §4.7's `change_log`, so review decisions are traceable ("who rejected this draft, when, and why?"). The Overview page shows the latest entries.

#### Testing

- **A test database:** `tools/common.py` reads `DATEGOLF_DB` if it's set, so tests run against a **temporary copy** of the database, never the real one.
- **Tool tests** (`tools/test_review.py`, stdlib `unittest`): approve, reject (including the CSV triage note), set_tags (a bad code is refused), decide, and log rows written.
- **The smoke test is extended:** the Review page renders, and on the test copy, one approve and one identity decision go through.

#### Not in v2

- Editing an event's fields (v3, the editor).
- Actually splitting an identity (flag only; done with Claude).
- Link review (v4, with Step 3b).

**Done when:** all three tabs work; the tool functions are tested against a copy of the database; the CLI commands match the dashboard; `review_log` records every decision; and the docs are updated (12, 13).

### Risks and how they're handled

- **Two ways to write.** Only Streamlit writes, and only through `tools/`.
- **Lock clashes.** Datasette only reads. Make Streamlit the main editor, and close DB Browser while using it.
- **Maintenance.** Its dependencies live in `dashboard/` only. If the dashboard is ever abandoned, the data tools still work.
- **Scope creep.** Ship each phase, use it, and only then decide on the next one.
