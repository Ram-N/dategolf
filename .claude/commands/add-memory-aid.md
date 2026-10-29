---
description: Add date-LINKS memory aids for an event to src/data/datelinks.json
argument-hint: <event name, e.g. "2003 Columbia shuttle disaster">
---

## Add date-LINKS memory aids

Event: $ARGUMENTS

Follow `docs/06_datelinks_authoring_guide.md` exactly — it is the source of truth for schema, group labels, tone, and length. Read it first.

### Steps

1. **Find the event** in `src/data/events.json` by searching `name`, `aliases`, and `description` for the key words in the argument. Use the event's `year` from the file, not the year the user typed.
   - One clear match → use its `id` verbatim.
   - Several plausible matches → list them and ask which one.
   - No match → stop and say so. Do not add entries for events that aren't in `events.json`, and do not edit `events.json`.
2. **Check `src/data/datelinks.json`** for an existing entry with that `id`. If one exists, show it and ask whether to add to it or replace it.
3. **Research** the event and anchors. Use WebSearch to confirm any date you are not certain of — wrong dates are worse than no aid.
4. **Draft the entry**: Look Back → Year of [YEAR] → Look Ahead → (Event Timeline only if the event has real phases). 2–3 items per group; skip any group without a strong anchor. Prefer anchors a student already knows, with concrete arithmetic ("add 20 years → …").
5. **Insert** the entry as a new key at the end of `datelinks.json` (keep 2-space indentation, valid JSON).
6. **Validate**: `python3 -c "import json; json.load(open('src/data/datelinks.json'))"`.
7. **Report** a short summary of the anchors used, then offer to commit as `docs(datelinks): add date-LINKS for <id>`.
