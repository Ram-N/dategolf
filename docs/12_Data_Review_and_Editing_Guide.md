# Data Review & Editing Guide

**For:** working with `data/dategolf.db` day to day · **Companion to:** `11_DateFlow_Data_Migration_Status.md`

---

## 1. The mental model

```
   YOU edit here                      the game reads here
┌──────────────────┐   uv export   ┌───────────────────────────┐
│ data/dategolf.db │ ────────────▶ │ src/data/*.json           │
│ (DB Browser)     │               │ public/data/daily_*.json  │
└──────────────────┘               └───────────────────────────┘
        ▲
        │ uv commands also read/write the db
        │ (approve, load-drafts, reconcile, validate)
```

- **The database is the truth.** The JSON files are its *output*. Never edit the JSON by hand, because the next export overwrites it.
- **The game never sees the database.** A change in DB Browser does nothing to the game until you run an export.

---

> **Easiest now:** most reviews (drafts, country tags, Step 3a identities) can be done on the dashboard's **Review** page (`npm run data:dashboard`, doc 13). Every decision is logged in `review_log`. The table below still applies for anything else.

## 2. DB Browser or `uv`?

The short rule: **DB Browser is for content, `uv` is for actions.**

| I want to… | Use | How |
|---|---|---|
| Fix a name, year, description or alias | **DB Browser** | Edit the cell in `events` / `event_aliases`, then Write Changes |
| Change an event's categories | **DB Browser** | `entity_categories` table |
| Approve one draft | **Either** | DB Browser: set `entities.editorial_status` to `reviewed`, or run `uv … approve <id>` |
| Approve several drafts at once | **`uv`** | `uv … approve id1 id2 id3` |
| Reject (delete) a draft | **DB Browser** | Delete its row in `entities` (everything linked is removed too) |
| Accept or reject a CSV match | **DB Browser** | `legacy_csv_crosswalk.decision` |
| Add one or more new events | **`uv`** (recommended) | Write a small JSON batch, then `load-drafts` (§4.4) |
| **Make my edits show up in the game** | **`uv`** | `npm run data:export`. **Always do this after editing.** |
| Check I didn't break anything | **`uv`** | `npm run data:validate` |
| See where the data is thin | **`uv`** | `uv run python tools/manage.py coverage` |
| Refresh CSV match proposals after big changes | **`uv`** | `uv … reconcile-events` (your decisions are kept) |
| Undo db changes I haven't committed | **git** | `git checkout -- data/dategolf.db` (restores the last commit) |

`npm run data:export`, `data:validate` and `data:compare` are shortcuts for the matching `uv run python tools/manage.py …` commands, so either form does the same thing.

### The one rule about using both together

> **Click *Write Changes* (Ctrl+S) in DB Browser before running any `uv` command, and press F5 in DB Browser after running one.**

Here's why:
- `uv` can't see changes you haven't written yet, so an export would leave them out.
- While DB Browser holds unwritten changes, commands that *write* (such as `approve`) fail with `database is locked`.
- Pressing F5 makes DB Browser show what `uv` just changed.

---

## 3. Where things live

| Table / view | What it is | Edit it? |
|---|---|---|
| `entities` | One row per ID; holds `editorial_status` | ✅ status only |
| `events` | Name, year, region, description, difficulty, importance | ✅ |
| `event_aliases` | Search aliases (one row each, ordered by `position`) | ✅ |
| `entity_categories` | Categories (`position` 0 = primary; `facet` = event or span) | ✅ |
| `time_spans` | Periods, empires, eras (durations.json + eras.json) | ✅ |
| `learning_content_groups` / `_items` | DateLinks | ✅ |
| `milestone_designations` | The 16 milestone events | ✅ |
| `dateflow_only_events` | Events shown **only in DateFlow**, excluded from DatePick and DateGolf (date too disputed to guess) | ✅ add or delete rows |
| `legacy_csv_crosswalk` | CSV ↔ event match proposals | ✅ `decision`, `note` |
| `v_proposed_events` | **Drafts to review**: read-only view | 👀 read only |
| `v_csv_crosswalk_review` | **CSV matches side by side**: read-only view | 👀 read only |
| `legacy_csv_rows`, `import_records`, `meta` | The original source data | ❌ never |

### `editorial_status` values

| Value | Meaning | In the game? |
|---|---|---|
| `imported` | Came from the original JSON | ✅ |
| `reviewed` | You approved it | ✅ |
| `needs_review_identity` | One of the 25 shared event/duration IDs (§4.6) | ✅ |
| `proposed` | A draft that isn't approved yet | ❌ **never exported** |

### Allowed values (the db rejects anything else)

- **categories:** Arts, Culture, Disasters, Economy, Exploration, Medicine, Philosophy, Politics, Religion, Science, Social, Sports, Technology, War. The first one is the *primary*, which sets the DateFlow colour. To add a new category, insert it into `categories` and map it to a colour group in `src/engine/dateflow/categoryGroups.ts`.
- **region:** must be a label in the `regions` table: South Asia, East Asia, Southeast Asia, Europe, Middle East, Africa, Americas, North America, South America, Global, Oceania or Antarctica. To add one, insert `(label, lane)` into `regions` and export; DateFlow picks up the lane automatically.
- **difficulty:** `easy` · `medium` · `hard`
- **importance:** 1–9. DateFlow bolds 7 and above; DatePick picks questions in proportion to importance. Use 1–2 for minor events.
- **is_approximate:** set it to 1 for "c." dates. DatePick then keeps wrong answers more than 10 years away.
- **year:** a signed integer (`-44` = 44 BCE). **There is no year 0.**
- **name:** must be unique and must not contain a year (it would give the answer away). The same goes for aliases.

---

## 4. Workflows

### 4.1 Review the 68 drafts (the main job right now)

1. In DB Browser go to **Browse Data**, choose the table **`v_proposed_events`**, and press F5 if it isn't listed.
2. Flagged drafts come first: read the `review_note` column. For each draft, compare `name` and `description` with the original `csv_text`.
3. Then decide what to do with it:
   - **Good as is:** run `uv run python tools/manage.py approve <entity_id>`, or set `editorial_status` to `reviewed` in `entities`.
   - **Needs a fix:** edit it in `events` (and `event_aliases` / `entity_categories` if needed), then approve it.
   - **Don't want it:** delete its row in `entities`.
4. Write Changes, then `npm run data:export`.

**Look at these first:**
- `birth-of-shivaji`: the CSV says 1627, but most sources say 1630.
- Any draft whose note starts with "CSV says…": the draft deliberately differs from the CSV.

**Tip:** you can approve a batch you've checked in one go, e.g. `uv … approve battle-of-zama second-triumvirate death-of-akbar`.

### 4.2 Review the CSV match proposals

1. Open the view **`v_csv_crosswalk_review`** to *read* each CSV row next to the event it may match.
2. Open the table **`legacy_csv_crosswalk`** to *decide*. Set `decision` to `accepted` (same event) or `rejected` (a different event), and use `note` for anything worth remembering.
3. Start with `tier = exact_match`, `rank = 1` (114 pairs), which usually take a glance each.
4. Write Changes. No export is needed, because the crosswalk doesn't affect the game.

**Bulk shortcut**, once you've skimmed and agree with the exact matches. Run it in the **Execute SQL** tab, then Write Changes:
```sql
UPDATE legacy_csv_crosswalk SET decision = 'accepted'
WHERE tier = 'exact_match' AND rank = 1 AND decision IS NULL;
```

The `likely` and `possible` tiers are often *related* events rather than the same one (Lee's surrender → American Civil War). Reject those as matches. They're good candidates for relationships later.

### 4.3 Fix an existing event (e.g. a date conflict)

1. Open `events`, filter `entity_id`, and edit the cell. For example, the Great Pyramid is `egyptian-pyramids-built`.
2. Write Changes, then `npm run data:export`, then `npm run data:validate`.

`updated_at` in `entities` is stamped automatically, so you can always see what was changed.

### 4.4 Add new events (use a batch, not the GUI)

Adding one event by hand means inserting rows in 4 tables in the right order. A batch file is easier:

1. Create `data/drafts/2026-11-xx_my_batch.json`:
   ```json
   {
     "origin": "manual",
     "events": [
       {"id": "battle-of-talikota", "name": "Battle of Talikota", "year": 1565,
        "categories": ["War"], "region": "South Asia",
        "aliases": ["fall of Vijayanagara", "Deccan sultanates alliance"],
        "description": "Two or three sentences in present tense.",
        "difficulty": "hard", "importance": 4}
     ]
   }
   ```
2. Run `uv run python tools/manage.py load-drafts data/drafts/2026-11-xx_my_batch.json`. The events arrive as `proposed`.
3. Check them in `v_proposed_events`, run `approve`, then `npm run data:export`.

If anything in the batch is invalid, **nothing** is loaded. The error names the kind of problem but not which event caused it:
- `FOREIGN KEY constraint failed` usually means a category that isn't in the list (§3).
- `UNIQUE constraint failed` means a duplicate ID or name.
- `CHECK constraint failed` means year 0 or a bad difficulty.

### 4.5 Remove an event

Delete its row in **`entities`**. Its event row, aliases, categories and draft notes are removed too. DB Browser's *Foreign keys* setting must be on: it's in Edit → Preferences → Database, and it's on by default. Then export.

If the event is one of the 16 milestones or has DateLinks content, those are deleted with it, so check first.

### 4.5b Keep an event out of DatePick and DateGolf (DateFlow only)

Some events have dates that are too disputed to be a fair guess, like the birth of the Buddha. Two ways to handle them:
- **Keep the event, but only in DateFlow.** Add a row to `dateflow_only_events` (`entity_id`, plus a `reason`), then export. The exporter writes `"dateflowOnly": true`, and DatePick and DateGolf skip it (`src/engine/eventPool.ts`). Delete the row to undo.
- **Make it a time span instead.** A period with an approximate start and end, like `life-of-the-buddha`, lives in `time_spans`. Only DateFlow reads spans.

### 4.5c Country tags

Every event and span is tagged with the **present-day** country (or countries) where it happened, in `entity_countries`. They aren't exported yet; this is groundwork for a map.
- **`ZZ`** means *worldwide, no single country* (pandemics, world wars as a whole).
- **Each tag has a `role`:** `location` (where it physically happened, the default; a map plots these) or `actor` (whose action or story it is, when that country isn't the location). Examples: Pearl Harbor → US location, JP actor; Columbus → BS location, ES actor; the Moon landing → US actor only. In the review view, actors show as "(actor)". In a tag file, write `ES/actor`.
- **The event's `region` is about *whose story it is*;** country tags are about *where* it happened (or who acted). When they deliberately differ (Babur's Ferghana, filed under South Asia), add a row to `accepted_region_exceptions` with a reason, and validation stops warning about it.
- **To review:** open the view `v_country_review`. Low-confidence and unreviewed tags come first, with a note explaining each.
- **To fix a tag:** edit `entity_countries` (one row per country; `position` 0 is the primary).
- **To approve:** `uv run python tools/manage.py approve-countries --high` approves every high-confidence entity, or pass entity ids to approve specific ones.
- **To add a country:** insert it into `countries` (code, name, region, optional `alt_region` for countries that straddle two regions, like Egypt).
- **To re-draft tags:** edit the tag file and `load-countries` it again. Reviewed tags are never overwritten.
- **Which countries to tag, the "defining moments" rule (decided 2026-11-07):** tag the countries where the defining moments happened (key battles, sieges, capitals and foundings), usually 3–8, with the primary first. Don't list a span's full territorial extent; that belongs to the future map. Example: Alexander's conquests → GR, TR, LB, EG, IQ, IR, AF, PK, IN.
- **Disputed territory policy (decided 2026-11-06): list all parties.** Jerusalem → Israel and Palestine; Bethlehem → Palestine; Crimea → Ukraine (the UN-recognised position); Kosovo → Serbia and Kosovo (`XK`); Falklands → Falkland Islands and Argentina. Follow the same rule for new tags.
- **Validation warns** when none of an entity's countries fits its region lane (e.g. Pearl Harbor: Hawaii, filed under East Asia).

### 4.6 Step 3a: decide the 25 shared event/span IDs (step by step)

**What you're deciding:** 25 IDs exist both as an **event** (the key moment, e.g. *Napoleonic Wars Begin*, 1803) and as a **span** (the whole period, e.g. *Napoleonic Wars*, 1803–1815). For each one, decide:
- **One subject** (the usual answer): the event is simply the key moment of its own span. The status becomes `reviewed`.
- **Needs a split:** they're really two different things. The status becomes `needs_split`, and the split itself, which gives the span a new ID, is done with Claude afterwards.
- **Keep event only:** the span adds nothing, so it's **deleted** (with its span categories) and only the event remains. Example: Gutenberg, kept as the 1440 event. DateFlow stops showing it as a bar, so **this one does change the game: export afterwards.**
- **Keep span only:** a single year undersells it or is falsely precise, so the **event** is **deleted** (with its aliases and event categories) and only the span remains. Example: the Vietnam War, kept as the 1955–1975 span rather than "1965". DatePick and DateGolf stop using it, so **export afterwards**. It's refused for DateFlow milestones and for events with DateLinks content, because those hang off the event.

The reasoning is in doc 11, Step 3a. **Identity decisions don't change the game:** both statuses still export, so no export is needed afterwards.

#### Step 1: Rehearse on a copy (optional, about 5 minutes)

Try the whole flow on a throwaway copy first, so nothing real changes:

```bash
cd ~/projects/EduGames/DateGolf
mkdir -p /tmp/dg-rehearsal && cp data/dategolf.db /tmp/dg-rehearsal/
DATEGOLF_DB=/tmp/dg-rehearsal/dategolf.db uv run --project dashboard streamlit run dashboard/app.py \
  --server.address localhost --server.port 8502 --server.headless true
```

Open **http://localhost:8502** and follow Step 3 below. Everything you click changes only the copy. Stop with **Ctrl+C**, and delete `/tmp/dg-rehearsal` when you're done.

(The Overview's "Game JSON" and "Git" boxes still look at the real files, so they may show differences during a rehearsal. That's expected.)

#### Step 2: Start the dashboard for real

1. If DB Browser is open, **close it** (or click Write Changes / Revert Changes), so the database isn't locked.
2. Optionally take a backup first: `npm run data:backup`.
3. Start the dashboard with `npm run data:dashboard`, and open **http://localhost:8501**.
4. On **Overview**, check that "Waiting on you" shows **Identity (Step 3a) 25**.

#### Step 3: Review and decide

1. Go to **✅ Review** → the **Identity, Step 3a (25)** tab.
2. **Spot-check a few:** tick **one** row to see the event and the span side by side, each with its description. Ask yourself: is the event just a moment *within* this span? These are worth a look:
   - `indian-independence`: the event marks the **end** (1947); the span is the movement (1920–1947)
   - `human-genome-project`: the event marks the **completion** (2003)
   - `islamic-golden-age`: the event is 786; the span starts at 750
3. **If any should be split:** tick it, click **Needs a split…**, and confirm. It moves to the bottom of the list, marked `needs_split`.
   **If the span should go:** tick it, click **Keep event only…**, and confirm.
   **If the event should go:** tick it, click **Keep span only…**, and confirm.
4. **For the rest:** click **All undecided are one subject (N)…**, then **Confirm all**. Or tick specific rows and click **One subject**.
5. A green "done" message appears. Expand **Tool output** to see one ✓ line per ID.

**From the terminal instead:**
```bash
uv run python tools/manage.py identity punic-wars pax-romana --one    # one subject
uv run python tools/manage.py identity korean-war --split             # flag for a split
uv run python tools/manage.py identity gutenberg-printing-press --drop-span   # keep the event only
uv run python tools/manage.py identity vietnam-war --drop-event               # keep the span only
```

#### Step 4: Check the result

| Check | Where | Expect |
|---|---|---|
| The queue is empty | Overview → "Waiting on you" | **Identity (Step 3a) 0**; "Flagged for split" shows any you flagged |
| Every decision was logged | Review → **Decision log** tab (or Overview → Recent review decisions) | One `identity-one` or `identity-split` row per ID, `via = dashboard` |
| Validation agrees | Overview → **Validate now** | 0 errors; the "Event + time span share one ID" review item is gone; flagged ones appear under "Shared ids flagged for a split" |
| Statuses | Datasette (`npm run data:browse`) → canned query **Step 3a, the shared ids** | `editorial_status` is `reviewed` (or `needs_split`) for all 25 |
| The game is unchanged | `npm run data:compare` | "Export matches." |

#### Step 5: Commit

```bash
git add data && git commit -m "data: decide Step 3a shared ids" && git push
```

(Or ask Claude to commit.) If you flagged any for a split, tell Claude which ones, and the splits are done as a separate change.

#### Undo

- **Before committing:** `git checkout -- data/dategolf.db` restores the database to the last commit.
- **Change your mind on one ID** (before or after committing): run the opposite command, e.g. `uv run python tools/manage.py identity korean-war --one`. The log keeps both decisions.

### 4.6b Links between events (Step 3b)

A **link** reads as a sentence: *source → type → target*, plus a one-line "why". For example, *"Partition of Bengal **triggered** the Swadeshi Movement"*. It's **stored once and read from both ends**: Kilby's chip *preceded* Noyce's, and Noyce's *followed* Kilby's. The types, their definitions and their inverse readings are in `relationship_types` (doc 11, 3b-tooling).
- **Batches** are JSON files loaded with `load-links`. They're **all-or-nothing**: an unknown id or type, a self-link, a missing "why", a duplicate (however it's written) or a contradiction rejects the whole batch, with reasons. You may write `followed`; it's stored as the inverse `preceded`.
- **Review** on the dashboard (**Review → Links**: each link as a sentence, with Approve / Reject), or with `approve-links` / `reject-links`. Every decision is logged.
- **Explore** with the dashboard **Connections** page: pick any event or span to see all its links from its point of view.
- **Validation** flags backwards causes ("1950 triggered 1905"), `part_of` links outside the target's years, and links to unpublished entities.

### 4.6c Reviewing a link batch, step by step (e.g. the 142 `part_of` links)

#### What you're deciding

For each proposed link: **is this sentence true, and is it the right *kind* of link?** For `part_of`, the test is: *"Is the event an episode of this span's own story?"* That means a battle in its war; a reign, act or achievement of its state or era; or its founding or its end.

- ✅ *Battle of Zama is part of the Punic Wars.* ✅ *Razia Sultana's accession is part of the Delhi Sultanate.*
- ❌ *Vesuvius erupting is part of the Roman Empire* (same place and time, not its story). These were already left out of batch 1.
- ❌ A **cause** written as `part_of`: *Qin unification is part of the Great Wall's construction* should be "Qin unification **enabled** it" (batch 3).

**Links don't change the game yet** (they aren't exported until Step 3c), so no export is needed after reviewing.

#### Step 1: Open the queue

1. Close DB Browser, or click Write Changes there.
2. Run `npm run data:dashboard` (restart it if it's already running), then open **http://localhost:8501**.
3. Go to **✅ Review** → the **Links (142)** tab.

#### Step 2: Read and decide

1. **Click one row** to see its card: the sentence, its one-line "why", how it's stored, and its confidence.
2. **Start with the 9 medium-confidence links.** These are the real judgement calls:
   - **Inventions as part of a dynasty's era:** paper → Han, woodblock printing → Tang, movable type and the compass → Song. Is an achievement *under* a dynasty part of it?
   - **Endings as part of what they end:** Indian independence → British Raj, Meiji → Tokugawa shogunate, Mao's death → Cultural Revolution.
   - **Charlemagne's coronation → Holy Roman Empire:** historians debate whether the empire starts there or in 962.
   - **Taj Mahal construction → Mughal Empire.**
3. **Reject what's wrong:** tick it, click **Reject…**, and give a short reason (it's logged). If it's really a different link type, add a note in the reason, e.g. "should be enabled", and Claude can redraft it.
4. **Approve the rest:** tick them (the header checkbox selects everything still listed), then click **Approve**.

**From the terminal instead:**
```bash
uv run python tools/manage.py approve-links 12 13 14               # link ids are shown in Datasette / the db
uv run python tools/manage.py reject-links 15 --reason "should be enabled, not part_of"
```

#### Step 3: Check the result

| Check | Where | Expect |
|---|---|---|
| The queue is empty | Review → **Links (0)** | "No links waiting" |
| The graph reads well from both ends | **🔗 Connections** → pick e.g. *Mughal Empire* | "includes" lists its accessions and battles; on *Battle of Zama*, "is part of" Punic Wars |
| Every decision was logged | Review → **Decision log** | `approve-link` / `reject-link` rows, `via = dashboard` |
| Validation agrees | Overview → **Validate now** | 0 errors; no "Links awaiting review" |

#### Step 4: Commit

```bash
git add data && git commit -m "data: review part_of link batch" && git push
```
(Or ask Claude.) Then tell Claude to draft the next batch.

#### Undo

- **Before committing:** `git checkout -- data/dategolf.db` restores the database to the last commit.
- **A rejected link was actually right:** ask Claude to re-add it in a small batch (rejected links are deleted, but their reason stays in the log).

### 4.6d Reviewing sources (Step 5)

Each event and span gets a Wikipedia article, so drafted content can be checked. The CSV's own URLs are already in as `reviewed`. Everything else arrives as a batch of **proposed** sources.

1. **Load** (once): `uv run python tools/manage.py load-sources data/drafts/sources_batch1.json`. It's all-or-nothing: one bad entry rejects the whole batch.
2. **Open** the dashboard, **Review → Sources**. The rows you need to think about come first: medium-confidence picks, then the other picks, then name redirects. Exact name matches come last.
3. **Decide:**
   - Click **open** to check an article.
   - Tick rows, then **Approve** or **Reject…**. Rejecting needs a reason, and the entity goes back to unsourced.
   - **Approve all exact name matches** does the 128 easy ones at once.
   - The question is simply: *is this the article about this event?* A broad article (the person, the empire) is fine when no event article exists.
4. **Fix a wrong one:** reject it, add `"<id>": "Right title"` to `data/drafts/sources_batch1_picks.json`, then re-run:

   ```bash
   manage.py suggest-sources --picks data/drafts/sources_batch1_picks.json --out data/drafts/sources_fix.json
   manage.py load-sources data/drafts/sources_fix.json
   ```

   Only entities with no source end up in a new file. The tool checks every title on Wikipedia (whether it exists, where it redirects, whether it's a disambiguation page).
5. **CLI equivalents:** `approve-sources <ids>`, `approve-sources --title-matches`, and `reject-sources <ids> --reason "..."`.

Sources aren't exported to the game yet, so `compare-export` is unaffected. **New drafts** can carry `"source": "https://en.wikipedia.org/wiki/..."` in `load-drafts`. That source is approved or removed together with its draft.

### 4.7 Preview in the game

```bash
npm run dev     # → http://localhost:5173  (Creator page: /creator)
```

Export first. The dev server picks up the new JSON automatically.

---

## 5. End-of-session checklist

```bash
# 1. In DB Browser: Write Changes (Ctrl+S)
npm run data:validate    # must say "0 error check(s) failed"
npm run data:export      # updates the game JSON + data/dategolf.sql
npm run dev              # optional: eyeball the change
git add data src public && git commit -m "data: <what you reviewed>" && git push
```

If you forget step 1, the export silently leaves out your latest edits. Commit the `.db`, the `.sql` and the JSON **together**.

---

## 5b. Monthly backup

```bash
npm run data:backup     # → data/backup/dategolf_YYYY-MM-DD_HHMMSS.db
```

- Click **Write Changes** in DB Browser first. The backup copies only written changes, and it's safe to run while DB Browser is open.
- Each backup is integrity-checked before the command reports success.
- Backups are **local only**: `data/backup/` is gitignored, and nothing is copied elsewhere. Git history is the other fallback.
- Old backups are never deleted automatically. Remove them by hand if the folder grows.

**To restore from a backup:** close DB Browser, then
```bash
cp data/backup/dategolf_<date>_<time>.db data/dategolf.db
npm run data:validate && npm run data:export
```

## 6. When something goes wrong

| Symptom | Cause | Fix |
|---|---|---|
| `database is locked` | DB Browser has unwritten changes | Write Changes (or Revert Changes), then rerun |
| My edit isn't in the game | Not exported, or not written | Write Changes, then `npm run data:export` |
| An approved draft isn't in the game | Still `proposed`, or not exported | Check `entities.editorial_status`, then export |
| DB Browser doesn't show a new view or table | Its cached schema is stale | F5, or close and reopen the database |
| `FOREIGN KEY constraint failed` | e.g. a category that isn't in the list, or a row whose entity doesn't exist | Use an allowed value (§3) |
| `CHECK constraint failed` | Year 0, an invalid difficulty, or a span ending before it starts | Fix the value |
| I want to undo today's edits | — | `git checkout -- data src public` (restores the last commit) |
| The `.db` file is damaged | — | Rebuild it from the text dump: `mv data/dategolf.db /tmp/broken.db && uv run python -c "import sqlite3; sqlite3.connect('data/dategolf.db').executescript(open('data/dategolf.sql', encoding='utf-8').read())"`, then `npm run data:compare` |
| Validation reports 67 errors from `validate-events.cjs` | A conflict that predates the migration (importance scale 2–9 vs 1–5) | Known issue; see doc 11 §5 |

---

## 7. Quick reference

```bash
npm run data:export                                   # db → game JSON (after every edit session)
npm run data:validate                                 # integrity checks → data/reports/validate.md
npm run data:compare                                  # prove the export matches committed JSON
npm run data:backup                                   # monthly snapshot → data/backup/ (local, not in git)
npm run data:browse                                   # Datasette → http://localhost:8001 (read-only browsing + SQL; doc 13)
npm run data:dashboard                                # Streamlit → http://localhost:8501 (overview, review, coverage, map; doc 13)
uv run python tools/manage.py reject <id>... --reason "…"     # delete proposed drafts (logged)
uv run python tools/manage.py set-countries <id> "IN, PK/actor" # replace an entity's country tags (logged)
uv run python tools/manage.py identity <id>... --one | --split # Step 3a decisions (logged)
uv run python tools/manage.py load-links <file>              # load a batch of links as proposed (all-or-nothing)
uv run python tools/manage.py approve-links <id>...         # or: dashboard Review → Links
uv run python tools/manage.py reject-links <id>... --reason "…"
uv run python tools/manage.py suggest-part-of               # writes part_of candidates to data/drafts/ (loads nothing)
npm run data:test                                     # tests for the review and link tools (on temporary db copies)
uv run python tools/manage.py approve <id> [<id>…]    # publish drafts
uv run python tools/manage.py load-drafts <file>      # add a batch of new events as drafts
uv run python tools/manage.py reconcile-events        # refresh CSV match proposals
uv run python tools/manage.py coverage [--bin 250]    # where is the data thin?
DISPLAY=:0 sqlitebrowser data/dategolf.db &           # open DB Browser (prefix not needed once .bashrc is fixed)
```
