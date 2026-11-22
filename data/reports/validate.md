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
| warning | DateLinks 'Year of' label doesn't match the event's year (rename-memory-aid-group) | pass |
| warning | Link touches a proposed (unpublished) entity | 26 |
| warning | Time spans with the same normalised name | pass |
| warning | Event names that differ only in case or spacing | pass |
| warning | Event with no aliases (search falls back to name only) | pass |
| warning | Imported entity with no import record (provenance lost) | pass |
| review | Event + time span share one ID (identity decision needed) | pass |
| review | Legacy CSV rows with no accepted match and no triage outcome | pass |
| review | Proposed events awaiting approval (not exported; manage.py approve <id>) | pass |
| review | CSV rows triaged as duplicate / not recommended (incl. date conflicts) | 39 |
| info | DateFlow-only events (excluded from DatePick and DateGolf) | 7 |
| warning | Approximate event with no range (set-event-date --display): students see "c." with nothing to explain it | pass |
| warning | Event with a range but not marked approximate (the range is then not exported) | pass |
| warning | Span with a date note but not marked approximate (the note is then not exported) | pass |
| warning | Published event or span with no country tag | pass |
| info | Entities with an actor but no location (e.g. events on the Moon or Mars) | 3 |
| review | Links awaiting review (dashboard Review → Links, or approve-links / reject-links) | 26 |
| warning | A span is part_of a person's life (a reign is its own span; only events go inside a life) | pass |
| review | Life-cycle phases awaiting approval (not exported; dashboard Review → Life cycles) | pass |
| warning | Life-cycle phases no longer cover their span (its years changed): fix with remove-phases + load-phases | pass |
| review | Memory aids awaiting approval (not exported; dashboard Review → Memory aids) | pass |
| review | Missing events and spans to decide (dashboard Review → Missing) | 2 |
| review | Shared ids flagged for a split (Step 3a; do the split with Claude) | pass |
| review | Country tags awaiting review (manage.py approve-countries) | 10 |
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
| info | Counts changed since the legacy import | 5 |

## Counts

- events: 522
- time_spans: 167
- eras: 5
- datelinks_keys: 28
- datelinks_groups: 91
- datelinks_items: 218
- milestones: 16
- daily_challenge_dates: 366
- csv_rows: 310
- significance_reviewed: 224
- significance_proposed: 10

## [warning] Link touches a proposed (unpublished) entity

- `501` — akbar-becomes-mughal-emperor part_of akbar
- `503` — akbar-din-i-ilahi part_of akbar
- `486` — alexander-conquests part_of alexander-the-great
- `488` — alexander-founds-alexandria part_of alexander-the-great
- `490` — ashoka-becomes-emperor part_of ashoka
- `492` — ashoka-converts-to-buddhism part_of ashoka
- `487` — battle-of-gaugamela part_of alexander-the-great
- `500` — birth-of-akbar began akbar
- `485` — birth-of-confucius began confucius
- `493` — birth-of-muhammad began muhammad
- `506` — curie-radioactivity part_of marie-curie
- `504` — death-of-akbar ended akbar
- `489` — death-of-alexander ended alexander-the-great
- `499` — death-of-elizabeth-i ended elizabeth-i
- `496` — death-of-muhammad ended muhammad
- `494` — founding-of-islam part_of muhammad
- `507` — gandhi-born began mahatma-gandhi
- `508` — gandhi-returns-to-india part_of mahatma-gandhi
- `509` — gandhi-salt-march part_of mahatma-gandhi
- `497` — genghis-khan-unifies-mongols part_of genghis-khan
- `495` — hijra part_of muhammad
- `491` — kalinga-war part_of ashoka
- `510` — mahatma-gandhi-assassinated ended mahatma-gandhi
- `502` — mughal-akbar-administration part_of akbar
- `505` — newton-laws-of-motion part_of isaac-newton
- `498` — spanish-armada-defeated part_of elizabeth-i

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
- `rigveda-composed` — -1400 · Rigveda Composed — Composed over centuries (c. 1500–1200 BCE); no single year to guess
- `lapita-voyagers-settle-remote-oceania` — -1000 · Lapita Voyagers Settle Remote Oceania — A process over two or three centuries (c. 1100–800 BCE)
- `stonehenge-sarsen-circle-raised` — -2500 · Stonehenge's Sarsen Circle Raised — Sarsen phase c. 2600–2400 BCE; no single year
- `polynesians-reach-rapa-nui` — 1200 · Polynesians Reach Rapa Nui — Radiocarbon range c. 1150–1250; no single year

## [info] Entities with an actor but no location (e.g. events on the Moon or Mars)

- `apollo-soyuz-test-project` — actors only
- `moon-landing` — actors only
- `viking-1-mars` — actors only

## [review] Links awaiting review (dashboard Review → Links, or approve-links / reject-links)

- `485` — birth-of-confucius began confucius — Confucius's birth, by the traditional date.
- `486` — alexander-conquests part_of alexander-the-great — Alexander's campaign against Persia filled the last eleven years of his life.
- `487` — battle-of-gaugamela part_of alexander-the-great — Alexander's decisive victory over Darius III of Persia.
- `488` — alexander-founds-alexandria part_of alexander-the-great — Alexander founded the city during his campaign in Egypt.
- `489` — death-of-alexander ended alexander-the-great — Alexander died in Babylon at thirty-two.
- `490` — ashoka-becomes-emperor part_of ashoka — His accession as the third Mauryan emperor.
- `491` — kalinga-war part_of ashoka — The war whose bloodshed, by his own edict, turned Ashoka to Buddhist ethics.
- `492` — ashoka-converts-to-buddhism part_of ashoka — Ashoka's turn to Buddhism after the Kalinga war.
- `493` — birth-of-muhammad began muhammad — Muhammad's birth in Mecca, by the traditional date.
- `494` — founding-of-islam part_of muhammad — Muslim tradition dates Muhammad's first revelation to this year.
- `495` — hijra part_of muhammad — Muhammad's migration from Mecca to Medina.
- `496` — death-of-muhammad ended muhammad — Muhammad died in Medina.
- `497` — genghis-khan-unifies-mongols part_of genghis-khan — Temüjin was proclaimed Genghis Khan after uniting the Mongol tribes.
- `498` — spanish-armada-defeated part_of elizabeth-i — The Armada was sent against Elizabeth's England.
- `499` — death-of-elizabeth-i ended elizabeth-i — Elizabeth died without an heir.
- `500` — birth-of-akbar began akbar — Akbar's birth at Umerkot, while his father Humayun was in flight.
- `501` — akbar-becomes-mughal-emperor part_of akbar — Akbar became emperor at thirteen.
- `502` — mughal-akbar-administration part_of akbar — One of Akbar's main reforms.
- `503` — akbar-din-i-ilahi part_of akbar — Akbar's own religious movement, late in his reign.
- `504` — death-of-akbar ended akbar — Akbar's death in Agra.
- `505` — newton-laws-of-motion part_of isaac-newton — Newton's best-known work.
- `506` — curie-radioactivity part_of marie-curie — Marie and Pierre Curie's discovery of two new elements.
- `507` — gandhi-born began mahatma-gandhi — Gandhi's birth at Porbandar.
- `508` — gandhi-returns-to-india part_of mahatma-gandhi — Gandhi came home from South Africa to join India's national movement.
- `509` — gandhi-salt-march part_of mahatma-gandhi — Gandhi's best-known act of nonviolent protest.
- `510` — mahatma-gandhi-assassinated ended mahatma-gandhi — Gandhi was shot in Delhi by a Hindu nationalist.

## [review] Missing events and spans to decide (dashboard Review → Missing)

- `149` — event · Egyptian–Hittite Peace Treaty (-1259) · wanted
- `148` — event · Fall of Nineveh (-612) · wanted

## [review] Country tags awaiting review (manage.py approve-countries)

- `akbar` — high
- `alexander-the-great` — high
- `ashoka` — high
- `confucius` — high
- `elizabeth-i` — high
- `genghis-khan` — high
- `isaac-newton` — high
- `mahatma-gandhi` — high
- `marie-curie` — high
- `muhammad` — high

## [info] Region labels in use, with their DateFlow lane

- `Europe` — europe · 193 records
- `South Asia` — south-asia · 152 records
- `East Asia` — east-asia · 74 records
- `Americas` — americas · 69 records
- `Middle East` — middle-east · 61 records
- `Africa` — africa · 56 records
- `Global` — global · 35 records
- `Southeast Asia` — east-asia · 21 records
- `North America` — americas · 13 records
- `Oceania` — global · 10 records
- `South America` — americas · 4 records
- `Antarctica` — global · 1 records

## [info] Accepted region exceptions (region deliberately differs from location)

- `babur-ruler-of-ferghana` — Happened in Ferghana (Central Asia), but filed under South Asia: Babur's story is the Mughal one.
- `colonial-africa-berlin` — Held in Berlin, but filed under Africa: it is about the partition of Africa.
- `nato-founded` — Signed in Washington, but filed under Europe: a mainly European alliance.

## [info] Counts changed since the legacy import

- `events` — 343 at import -> 522 now
- `time_spans` — 98 at import -> 167 now
- `datelinks_keys` — 26 at import -> 28 now
- `datelinks_groups` — 83 at import -> 91 now
- `datelinks_items` — 198 at import -> 218 now
