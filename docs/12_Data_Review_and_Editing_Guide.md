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

### 4.6 The 25 shared event/duration IDs

These are IDs such as `french-revolution` that exist both as an event and as a time span.
- **If it's one subject** (the usual case), set `editorial_status` to `reviewed` in `entities`. That's done in DB Browser.
- **If they're really two different things**, ask Claude to split it. Splitting means moving the span to a new ID across several tables, and DateFlow may reference the ID.

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
uv run python tools/manage.py approve <id> [<id>…]    # publish drafts
uv run python tools/manage.py load-drafts <file>      # add a batch of new events as drafts
uv run python tools/manage.py reconcile-events        # refresh CSV match proposals
uv run python tools/manage.py coverage [--bin 250]    # where is the data thin?
DISPLAY=:0 sqlitebrowser data/dategolf.db &           # open DB Browser (prefix not needed once .bashrc is fixed)
```
