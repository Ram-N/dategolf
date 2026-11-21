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
| warning | Span with a date note but not marked approximate (the note is then not exported) | pass |
| warning | Published event or span with no country tag | pass |
| info | Entities with an actor but no location (e.g. events on the Moon or Mars) | 3 |
| review | Links awaiting review (dashboard Review → Links, or approve-links / reject-links) | pass |
| review | Missing events and spans to decide (dashboard Review → Missing) | 51 |
| review | Shared ids flagged for a split (Step 3a; do the split with Claude) | pass |
| review | Country tags awaiting review (manage.py approve-countries) | pass |
| info | Region labels in use, with their DateFlow lane | 12 |
| warning | Description mentions a year near the answer (DatePick shows it before the guess) | pass |
| warning | Alias mentions a year near the answer (DateGolf search would reveal it) | pass |
| warning | No tagged country fits the event's region lane (fix the tags, add an actor, or accept it) | pass |
| info | Accepted region exceptions (region deliberately differs from location) | 3 |
| warning | 'preceded' link between spans that overlap by over 25 years (a succession the bars contradict) | pass |
| warning | 'preceded' link that skips a step (A→C while A→B→…→C exists): remove it | pass |
| warning | Link runs backwards in time (cause or sequence after its target) | pass |
| warning | part_of link outside the target's years | pass |
| warning | began / ended link not at the start / end of its target | pass |
| info | Counts changed since the legacy import | 2 |

## Counts

- events: 484
- time_spans: 144
- eras: 5
- datelinks_keys: 26
- datelinks_groups: 83
- datelinks_items: 198
- milestones: 16
- daily_challenge_dates: 366
- csv_rows: 310
- significance_reviewed: 173
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

- `apollo-soyuz-test-project` — actors only
- `moon-landing` — actors only
- `viking-1-mars` — actors only

## [review] Missing events and spans to decide (dashboard Review → Missing)

- `97` — span · Norte Chico Civilization (-3000) · open
- `98` — event · Caral Becomes a Monumental City (-2600) · open
- `137` — event · Stonehenge's Sarsen Circle Raised (-2500) · open
- `138` — event · Ur-Nammu Issues the Earliest Surviving Law Code (-2100) · open
- `139` — event · Palace of Knossos Built (-1900) · open
- `115` — span · Nok Culture (-1500) · open
- `110` — event · Hatshepsut Becomes Pharaoh (-1479) · open
- `140` — event · Rigveda Composed (-1400) · open
- `111` — event · Akhenaten Introduces the Worship of the Aten (-1350) · open
- `112` — event · Battle of Kadesh (-1274) · open
- `141` — event · Oracle-Bone Writing Appears in Shang China (-1250) · open
- `142` — span · Late Bronze Age Collapse (-1200) · open
- `116` — span · Bantu Expansion (-1000) · open
- `132` — event · Lapita Voyagers Settle Remote Oceania (-1000) · open
- `143` — span · Neo-Assyrian Empire (-911) · open
- `99` — span · Chavín Culture (-900) · open
- `113` — event · Carthage Founded (-814) · open
- `114` — event · Kushite King Piye Conquers Egypt (-728) · open
- `117` — event · Library of Alexandria Founded (-285) · open
- `100` — span · Teotihuacan (-100) · open
- `123` — event · Trung Sisters Lead a Revolt Against Han Rule (40) · open
- `124` — span · Funan (50) · open
- `144` — event · Buddhism Reaches Han China (65) · open
- `104` — span · Moche Culture (100) · open
- `101` — event · Teotihuacan's Pyramid of the Sun Built (200) · open
- `145` — span · Three Kingdoms of China (220) · open
- `146` — event · Queen Himiko Sends an Envoy to Wei China (239) · open
- `147` — span · Kofun Period (250) · open
- `102` — event · Siyaj K'ak' Arrives at Tikal (378) · open
- `103` — event · Pakal the Great Becomes Ruler of Palenque (615) · open
- `118` — event · Arabs Conquer Egypt (641) · open
- `125` — event · Earliest Srivijaya Inscription Carved (682) · open
- `126` — event · Borobudur Completed (825) · open
- `105` — span · Chaco Canyon Culture (850) · open
- `127` — event · Battle of Bach Dang Ends Chinese Rule in Vietnam (938) · open
- `122` — span · Swahili Coast Trading Cities (1000) · open
- `128` — event · Anawrahta Founds the Pagan Empire (1044) · open
- `106` — event · Cahokia Grows into a City (1050) · open
- `133` — event · Polynesians Settle Hawaii (1100) · open
- `134` — event · Nan Madol Built on Pohnpei (1180) · open
- `119` — event · Lalibela's Rock-Hewn Churches Carved (1200) · open
- `135` — event · Polynesians Reach Rapa Nui (1200) · open
- `120` — event · Sundiata Keita Wins the Battle of Kirina (1235) · open
- `136` — event · Polynesian Voyagers Settle New Zealand (1280) · open
- `129` — event · Majapahit Founded (1293) · open
- `107` — event · Tenochtitlan Founded (1325) · open
- `130` — event · Kingdom of Ayutthaya Founded (1351) · open
- `121` — event · Ibn Battuta Visits the Mali Empire (1352) · open
- `131` — event · Malacca Sultanate Founded (1400) · open
- `108` — event · Pachacuti Begins the Inca Expansion (1438) · open
- `109` — event · Machu Picchu Built (1450) · open

## [info] Region labels in use, with their DateFlow lane

- `Europe` — europe · 181 records
- `South Asia` — south-asia · 148 records
- `East Asia` — east-asia · 68 records
- `Americas` — americas · 65 records
- `Middle East` — middle-east · 51 records
- `Africa` — africa · 44 records
- `Global` — global · 35 records
- `Southeast Asia` — east-asia · 17 records
- `North America` — americas · 12 records
- `Oceania` — global · 5 records
- `South America` — americas · 1 records
- `Antarctica` — global · 1 records

## [info] Accepted region exceptions (region deliberately differs from location)

- `babur-ruler-of-ferghana` — Happened in Ferghana (Central Asia), but filed under South Asia: Babur's story is the Mughal one.
- `colonial-africa-berlin` — Held in Berlin, but filed under Africa: it is about the partition of Africa.
- `nato-founded` — Signed in Washington, but filed under Europe: a mainly European alliance.

## [info] Counts changed since the legacy import

- `events` — 343 at import -> 484 now
- `time_spans` — 98 at import -> 144 now
