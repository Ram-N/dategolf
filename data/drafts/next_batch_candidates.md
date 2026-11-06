# Next draft batch: candidate events

These came out of the CSV match review on 2026-11-06. Each one is an `events_master.csv` row that describes an event the game **doesn't have yet**. Its proposed matches were rejected with an `ADD CANDIDATE` note in `legacy_csv_crosswalk`. Validation keeps these 29 rows open until the events exist.

**Workflow:** draft the events as `data/drafts/<date>_csv_add_candidates.json` with `csv_event_id` set, then `load-drafts`, review in `v_proposed_events`, `approve`, and export (doc 12 §4.4).

## High value: fills real gaps

| Event | Year | CSV rows | Notes |
|---|---:|---|---|
| Chandragupta Maurya Founds the Maurya Empire | c. −322 | 32, 35 | CSV says −324 and −313 (Jain tradition). Only the *span* `maurya-empire` exists today. |
| Alexander Invades India (Battle of the Hydaspes) | −326 | 29, 30, 31 | CSV rows 29 and 30 say −327 for the invasion. |
| Arab Conquest of Sindh | 712 | 72 | Muhammad bin Qasim |
| Second Battle of Tarain | 1192 | 89 | Muhammad of Ghor defeats Prithviraj Chauhan |
| Kepler's Laws of Planetary Motion | 1609 | 135 | *Astronomia nova*. The matcher wrongly paired it with Galileo. |
| Aurangzeb Becomes Mughal Emperor | 1658 | 145 | CSV says 1659 (formal coronation). Decide which year to use. |
| Third Battle of Panipat | 1761 | 162 | Panipat I and II already exist |
| Great Bengal Famine | 1770 | 166 | |
| Lee Surrenders at Appomattox | 1865 | 198, 199 | The end of the Civil War is missing |
| Amundsen Reaches the South Pole | 1911 | 218 | |
| League of Nations Founded | 1920 | 226 | |
| Discovery of Pluto | 1930 | 230 | |
| Germany Invades the Soviet Union | 1941 | 235 | Row 235 is also linked to Pearl Harbor |
| Yom Kippur War | 1973 | 269 | |
| Camp David Accords | 1978 | 276 | |
| Gulf War | 1991 | 297 | CSV says Iraq invaded Kuwait (1990); the war was 1991 |

## Medium

| Event | Year | CSV rows | Notes |
|---|---:|---|---|
| Bandung Conference | 1955 | 248 | |
| Dalai Lama Flees to India | 1959 | 252 | The same CSV row gives Sputnik a wrong year (1957) |
| Indonesian Independence | 1945 or 1949 | 241 | Proclaimed in 1945, recognised by the Dutch in 1949 (CSV). **Year decision needed.** |
| Ceylon and Burma Gain Independence | 1948 | 240 | Maybe two separate events |
| Assassination of Sheikh Mujibur Rahman | 1975 | 270 | |
| Death of Shivaji | 1680 | 153 | |
| Death of the Buddha | c. −483 | 21 | The date is disputed (c. 483 vs c. 400 BCE); mark it approximate |

## Low

| Event | Year | CSV rows |
|---|---:|---|
| JFK Elected President | 1960 | 256 |
| Reagan Elected President | 1980 | 281 |
| George H. W. Bush Elected President | 1988 | 293 |

## Also possible at low importance (1–2)

The user prefers keeping minor events at low importance over dropping them. **27 more CSV rows** were triaged `not_recommended` with the note *"Could be added later at low importance"*. Examples are the Battle of Issus, Pharsalus, the First and Third Mysore Wars, the Tashkent Agreement and the death of Shah Jahan. To list them:

```sql
SELECT r.event_id, r.year_num, r.event FROM legacy_csv_triage t
JOIN legacy_csv_rows r ON r.event_id = t.csv_event_id
WHERE t.note LIKE '%low importance%' ORDER BY r.year_num;
```
