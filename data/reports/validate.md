# Validation report

| Severity | Check | Result |
|---|---|---:|
| error | SQLite integrity_check | pass |
| error | Foreign key violations | pass |
| error | Year 0 in an event | pass |
| error | Year 0 in a time span | pass |
| error | Time span starts after it ends | pass |
| error | Entity with no event or time-span facet | pass |
| error | Region label not in the regions table (add it there, with its lane) | pass |
| error | Event with no categories | pass |
| error | Period/empire with no categories | pass |
| error | Category row for a facet the entity doesn't have | pass |
| error | Milestone that is not an event | pass |
| error | DateLinks content for an entity that is not an event | pass |
| error | DateLinks group with no items | pass |
| error | Daily challenge date without exactly 5 years | pass |
| error | Empty event name or description | pass |
| error | Milestone or DateLinks content on a proposed (unexported) entity | pass |
| error | Significance on an era (eras have no card to show it) | pass |
| error | Significance with an unknown status or empty text | pass |
| warning | Event name contains a 4-digit year (gives the answer away) | pass |
| error | Link with an unknown status (use proposed or reviewed) | pass |
| error | Link stored as 'followed' (should be stored as the inverse 'preceded') | pass |
| error | Contradictory links (A→B and B→A of the same one-way type) | pass |
| error | Symmetric link not stored in id order | pass |
| warning | Link touches a proposed (unpublished) entity | pass |
| warning | Time spans with the same normalised name | pass |
| warning | Event names that differ only in case or spacing | pass |
| warning | Event with no aliases (search falls back to name only) | pass |
| warning | Imported entity with no import record (provenance lost) | pass |
| review | Event + time span share one ID (identity decision needed) | pass |
| review | Legacy CSV rows with no accepted match and no triage outcome | pass |
| review | Proposed events awaiting approval (not exported; manage.py approve <id>) | pass |
| review | CSV rows triaged as duplicate / not recommended (incl. date conflicts) | 39 |
| info | DateFlow-only events (excluded from DatePick and DateGolf) | 3 |
| warning | Approximate event with no range (set-event-date --display): students see "c." with nothing to explain it | pass |
| warning | Event with a range but not marked approximate (the range is then not exported) | pass |
| warning | Published event or span with no country tag | pass |
| info | Entities with an actor but no location (e.g. events on the Moon or Mars) | 2 |
| review | Links awaiting review (dashboard Review → Links, or approve-links / reject-links) | pass |
| review | Missing events and spans to decide (dashboard Review → Missing) | 59 |
| review | Shared ids flagged for a split (Step 3a; do the split with Claude) | pass |
| review | Country tags awaiting review (manage.py approve-countries) | pass |
| info | Region labels in use, with their DateFlow lane | 12 |
| warning | Description mentions a year near the answer (DatePick shows it before the guess) | pass |
| warning | Alias mentions a year near the answer (DateGolf search would reveal it) | pass |
| warning | No tagged country fits the event's region lane (fix the tags, add an actor, or accept it) | pass |
| info | Accepted region exceptions (region deliberately differs from location) | 3 |
| warning | Link runs backwards in time (cause or sequence after its target) | pass |
| warning | part_of link outside the target's years | pass |
| warning | began / ended link not at the start / end of its target | pass |
| info | Counts changed since the legacy import | 2 |

## Counts

- events: 443
- time_spans: 110
- eras: 5
- datelinks_keys: 26
- datelinks_groups: 83
- datelinks_items: 198
- milestones: 16
- daily_challenge_dates: 366
- csv_rows: 310
- significance_reviewed: 98
- significance_proposed: 0

## [review] CSV rows triaged as duplicate / not recommended (incl. date conflicts)

- `csv 3` — duplicate_of_existing → egyptian-pyramids-built — DATE CONFLICT: CSV says c. 3000 BC, the app says 2560 BCE (the span construction-great-pyramid is -2580..-2560).
- `csv 15` — duplicate_of_existing → birth-of-buddha — DATE CONFLICT: CSV says c. 576 BC, the app says 563 BCE. Row 20 gives a third date.
- `csv 20` — duplicate_of_existing → birth-of-buddha — DATE CONFLICT: CSV says 486 BC, row 15 says c. 576 BC, the app says 563 BCE. Scholarly estimates range from c. 563 to c. 480 BCE.
- `csv 5` — not_recommended — Reviewed 2026-11-06: no matching event and not added for now (minor, vague, or covered by another event's description). Could be added later at low importance (1-2).
- `csv 22` — not_recommended → platos-academy-founded — 'The period of Aristotle and Plato' is an era, not a datable event. Could become a time span.
- `csv 23` — not_recommended — Reviewed 2026-11-06: no matching event and not added for now (minor, vague, or covered by another event's description). Could be added later at low importance (1-2).
- `csv 25` — not_recommended — Reviewed 2026-11-06: no matching event and not added for now (minor, vague, or covered by another event's description). Could be added later at low importance (1-2).
- `csv 36` — not_recommended — Reviewed 2026-11-06: no matching event and not added for now (minor, vague, or covered by another event's description). Could be added later at low importance (1-2).
- `csv 47` — not_recommended — Reviewed 2026-11-06: no matching event and not added for now (minor, vague, or covered by another event's description). Could be added later at low importance (1-2).
- `csv 80` — not_recommended — Reviewed 2026-11-06: no matching event and not added for now (minor, vague, or covered by another event's description). Could be added later at low importance (1-2).
- `csv 93` — not_recommended — Reviewed 2026-11-06: no matching event and not added for now (minor, vague, or covered by another event's description). Could be added later at low importance (1-2).
- `csv 96` — not_recommended → gunpowder-invented — 'Roger Bacon invents gunpowder' conflicts with gunpowder-invented (c. 850, China). Bacon described a recipe c. 1267 but did not invent it.
- `csv 100` — not_recommended — Reviewed 2026-11-06: no matching event and not added for now (minor, vague, or covered by another event's description). Could be added later at low importance (1-2).
- `csv 101` — duplicate_of_existing → vijayanagara-empire-founded — Spelling variant (Vijayanagar). Missed by the matcher; worth adding 'Vijayanagar' as an alias.
- `csv 140` — not_recommended — Reviewed 2026-11-06: no matching event and not added for now (minor, vague, or covered by another event's description). Could be added later at low importance (1-2).
- `csv 141` — not_recommended — Reviewed 2026-11-06: no matching event and not added for now (minor, vague, or covered by another event's description). Could be added later at low importance (1-2).
- `csv 142` — not_recommended — Reviewed 2026-11-06: no matching event and not added for now (minor, vague, or covered by another event's description). Could be added later at low importance (1-2).
- `csv 147` — not_recommended — Reviewed 2026-11-06: no matching event and not added for now (minor, vague, or covered by another event's description). Could be added later at low importance (1-2).
- `csv 150` — not_recommended — Reviewed 2026-11-06: no matching event and not added for now (minor, vague, or covered by another event's description). Could be added later at low importance (1-2).
- `csv 164` — not_recommended — Reviewed 2026-11-06: no matching event and not added for now (minor, vague, or covered by another event's description). Could be added later at low importance (1-2).
- `csv 165` — not_recommended — Reviewed 2026-11-06: no matching event and not added for now (minor, vague, or covered by another event's description). Could be added later at low importance (1-2).
- `csv 171` — not_recommended — Reviewed 2026-11-06: no matching event and not added for now (minor, vague, or covered by another event's description). Could be added later at low importance (1-2).
- `csv 174` — not_recommended — Reviewed 2026-11-06: no matching event and not added for now (minor, vague, or covered by another event's description). Could be added later at low importance (1-2).
- `csv 175` — not_recommended — Draft discarded at review: obscure, and the 'first internal combustion engine' framing is disputed (Lenoir 1860 / Otto 1876 are better milestones).
- `csv 209` — duplicate_of_existing → construction-eiffel-tower — Covered by the time span construction-eiffel-tower (1887..1889).
- `csv 247` — not_recommended — 'Military Aid Pact between China and Pakistan, 1954' looks wrong: the 1954 pact was between the US and Pakistan. Check before using.
- `csv 251` — not_recommended — Reviewed 2026-11-06: no matching event and not added for now (minor, vague, or covered by another event's description). Could be added later at low importance (1-2).
- `csv 265` — not_recommended — Reviewed 2026-11-06: no matching event and not added for now (minor, vague, or covered by another event's description). Could be added later at low importance (1-2).
- `csv 268` — not_recommended — Reviewed 2026-11-06: no matching event and not added for now (minor, vague, or covered by another event's description). Could be added later at low importance (1-2).
- `csv 273` — not_recommended — Draft discarded at review: too minor for a world-history game.
- `csv 275` — not_recommended — Reviewed 2026-11-06: no matching event and not added for now (minor, vague, or covered by another event's description). Could be added later at low importance (1-2).
- `csv 278` — not_recommended — Reviewed 2026-11-06: no matching event and not added for now (minor, vague, or covered by another event's description). Could be added later at low importance (1-2).
- `csv 285` — not_recommended — Reviewed 2026-11-06: no matching event and not added for now (minor, vague, or covered by another event's description). Could be added later at low importance (1-2).
- `csv 286` — not_recommended — Security Council presidency rotates monthly; too minor for the game.
- `csv 288` — not_recommended — Draft discarded at review: minor episode; Gaddafi's story is better told through other events.
- `csv 289` — not_recommended — Reviewed 2026-11-06: no matching event and not added for now (minor, vague, or covered by another event's description). Could be added later at low importance (1-2).
- `csv 296` — not_recommended — Reviewed 2026-11-06: no matching event and not added for now (minor, vague, or covered by another event's description). Could be added later at low importance (1-2).
- `csv 298` — not_recommended — Reviewed 2026-11-06: no matching event and not added for now (minor, vague, or covered by another event's description). Could be added later at low importance (1-2).
- `csv 304` — not_recommended — Reviewed 2026-11-06: no matching event and not added for now (minor, vague, or covered by another event's description). Could be added later at low importance (1-2).

## [info] DateFlow-only events (excluded from DatePick and DateGolf)

- `birth-of-buddha` — -563 · Birth of Siddhartha Gautama — Birth date too disputed for a fair guess (CSV alone gives -576 and -486); user decision 2026-11-06.
- `battle-of-mahabharata` — -1000 · Battle of Kurukshetra — Dates differ by over 2,000 years (tradition 3102 BCE, scholars c. 1000 BCE); historicity debated. Precision batch 2026-11-09.
- `ironworking-spreads` — -670 · Ironworking Spreads Across the Old World — A process over seven centuries; no single year to guess. Precision batch 2026-11-09.

## [info] Entities with an actor but no location (e.g. events on the Moon or Mars)

- `moon-landing` — actors only
- `viking-1-mars` — actors only

## [review] Missing events and spans to decide (dashboard Review → Missing)

- `59` — event · Unification of Egypt (-3100) · wanted
- `58` — span · Olmec Civilization (-1200) · wanted
- `65` — event · Greek Alphabet Adapted from Phoenician (-800) · wanted
- `24` — span · Reign of Ashoka (-268) · wanted
- `31` — span · First Punic War (-264) · wanted
- `32` — span · Second Punic War (-218) · wanted
- `33` — span · Third Punic War (-149) · wanted
- `34` — event · Destruction of Carthage (-146) · wanted
- `55` — span · Kingdom of Aksum (100) · wanted
- `79` — span · Ghana Empire (300) · wanted
- `40` — event · Division of the Roman Empire (395) · wanted
- `41` — event · Visigoths Sack Rome (410) · wanted
- `78` — span · Srivijaya (650) · wanted
- `76` — span · Heian Period (794) · wanted
- `77` — span · Khmer Empire (802) · wanted
- `74` — span · Kievan Rus' (882) · wanted
- `70` — span · Fatimid Caliphate (909) · wanted
- `71` — span · Seljuk Empire (1037) · wanted
- `56` — span · Great Zimbabwe (1100) · wanted
- `69` — span · Ayyubid Sultanate (1171) · wanted
- `75` — span · Kamakura Shogunate (1185) · wanted
- `73` — span · Golden Horde (1242) · wanted
- `68` — span · Mamluk Sultanate (1250) · wanted
- `72` — span · Ilkhanate (1256) · wanted
- `67` — event · Mongols Sack Baghdad (1258) · wanted
- `66` — span · Yuan Dynasty (1271) · wanted
- `54` — event · Mansa Musa's Pilgrimage to Mecca (1324) · wanted
- `62` — span · Hundred Years' War (1337) · wanted
- `80` — span · Kingdom of Kongo (1390) · wanted
- `57` — span · Songhai Empire (1464) · wanted
- `53` — event · Fall of Tenochtitlan (1521) · wanted
- `25` — event · Battle of Sekigahara (1600) · wanted
- `26` — event · Tokugawa Ieyasu Becomes Shogun (1603) · wanted
- `61` — span · Thirty Years' War (1618) · wanted
- `28` — event · Qing Capture of Beijing (1644) · wanted
- `30` — event · Fall of the Ming Dynasty (1644) · wanted
- `63` — event · Intolerable Acts (1774) · wanted
- `51` — event · Battles of Lexington and Concord (1775) · wanted
- `38` — event · Execution of Louis XVI (1793) · wanted
- `39` — span · Reign of Terror (1793) · wanted
- `37` — event · Coup of 18 Brumaire (1799) · wanted
- `35` — span · War of the Third Coalition (1803) · wanted
- `36` — event · Napoleon Crowned Emperor (1804) · wanted
- `29` — event · Treaty of Nanking (1842) · wanted
- `27` — event · Commodore Perry Arrives in Japan (1853) · wanted
- `52` — event · Battle of Fort Sumter (1861) · wanted
- `18` — span · Indian Independence Movement (1885) · wanted
- `60` — event · Assassination of Archduke Franz Ferdinand (1914) · wanted
- `19` — event · Gandhi Returns to India (1915) · wanted
- `42` — event · Battle of the Somme (1916) · wanted
- `43` — event · United States Enters World War I (1917) · wanted
- `44` — event · Battle of Stalingrad (1942) · wanted
- `45` — event · Battle of Midway (1942) · wanted
- `46` — event · Germany Surrenders (V-E Day) (1945) · wanted
- `47` — span · Cold War (1947) · wanted
- `49` — event · Korean Armistice Agreement (1953) · wanted
- `64` — event · Voting Rights Act of 1965 (1965) · wanted
- `48` — event · Apollo-Soyuz Test Project (1975) · wanted
- `50` — event · Fall of Saigon (1975) · wanted

## [info] Region labels in use, with their DateFlow lane

- `Europe` — europe · 157 records
- `South Asia` — south-asia · 145 records
- `Americas` — americas · 64 records
- `East Asia` — east-asia · 58 records
- `Middle East` — middle-east · 45 records
- `Africa` — africa · 31 records
- `Global` — global · 29 records
- `Southeast Asia` — east-asia · 11 records
- `North America` — americas · 7 records
- `Oceania` — global · 4 records
- `South America` — americas · 1 records
- `Antarctica` — global · 1 records

## [info] Accepted region exceptions (region deliberately differs from location)

- `babur-ruler-of-ferghana` — Happened in Ferghana (Central Asia), but filed under South Asia: Babur's story is the Mughal one.
- `colonial-africa-berlin` — Held in Berlin, but filed under Africa: it is about the partition of Africa.
- `nato-founded` — Signed in Washington, but filed under Europe: a mainly European alliance.

## [info] Counts changed since the legacy import

- `events` — 343 at import -> 443 now
- `time_spans` — 98 at import -> 110 now
