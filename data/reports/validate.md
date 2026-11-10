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
| review | Links awaiting review (dashboard Review → Links, or approve-links / reject-links) | 33 |
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

- events: 434
- time_spans: 99
- eras: 5
- datelinks_keys: 26
- datelinks_groups: 83
- datelinks_items: 198
- milestones: 16
- daily_challenge_dates: 366
- csv_rows: 310

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

## [review] Links awaiting review (dashboard Review → Links, or approve-links / reject-links)

- `165` — meiji-restoration-japan ended tokugawa-shogunate — The restoration of imperial rule overthrew the shogunate and ended the last shogun's rule.
- `166` — qutb-ud-din-aibak-delhi preceded razia-sultana-accession — Delhi's sultans in turn: Razia was the daughter of Iltutmish, Aibak's son-in-law, who took the throne soon after Aibak's death.
- `167` — razia-sultana-accession preceded alauddin-khalji-accession — Delhi's sultans in turn: the Khalji dynasty replaced the Mamluk line.
- `168` — alauddin-khalji-accession preceded muhammad-bin-tughlaq-accession — Delhi's sultans in turn: the Tughlaqs followed the Khaljis.
- `169` — muhammad-bin-tughlaq-accession preceded firuz-shah-tughlaq-accession — Firuz Shah succeeded his cousin Muhammad bin Tughlaq.
- `170` — firuz-shah-tughlaq-accession preceded timur-sacks-delhi — After Firuz Shah's death the Tughlaqs weakened, and Timur sacked Delhi.
- `171` — babur-ruler-of-ferghana preceded babur-founds-mughal-empire — Babur's path: from ruler of Ferghana in Central Asia to founder of the Mughal Empire.
- `172` — babur-founds-mughal-empire preceded humayun-succeeds-babur — Mughal succession: Humayun succeeded his father Babur.
- `173` — humayun-succeeds-babur preceded humayun-defeated-kanauj — Humayun's reign: Sher Shah Suri defeated him and drove him into exile.
- `174` — humayun-defeated-kanauj preceded humayun-recaptures-delhi — Humayun's reign: fifteen years after his exile he retook Delhi.
- `175` — humayun-recaptures-delhi preceded second-battle-of-panipat — Humayun died months after retaking Delhi; the young Akbar's army then won at Panipat.
- `176` — second-battle-of-panipat preceded death-of-akbar — Akbar's reign, from the victory that secured his throne to his death.
- `177` — death-of-akbar preceded death-of-jahangir — Mughal succession: Jahangir reigned from Akbar's death to his own.
- `178` — death-of-jahangir preceded aurangzeb-becomes-emperor — Mughal succession: Shah Jahan reigned between them, until Aurangzeb seized the throne.
- `179` — aurangzeb-becomes-emperor preceded mughal-empire-zenith-aurangzeb — Aurangzeb's reign, which took the empire to its greatest extent by his death.
- `180` — mughal-empire-zenith-aurangzeb preceded nadir-shah-sacks-delhi — After Aurangzeb the empire declined, and Nadir Shah sacked Delhi.
- `181` — birth-of-shivaji preceded shivaji-crowned-chhatrapati — Shivaji's life: his coronation founded the Maratha kingdom.
- `182` — shivaji-crowned-chhatrapati preceded death-of-shivaji — Shivaji's life: he died six years after his coronation.
- `183` — guru-nanak-born preceded martyrdom-of-guru-arjan — The Sikh Gurus: Guru Arjan was the fifth Guru in the line founded by Guru Nanak.
- `184` — martyrdom-of-guru-arjan preceded execution-of-guru-tegh-bahadur — The Sikh Gurus: Guru Tegh Bahadur was the ninth Guru.
- `185` — execution-of-guru-tegh-bahadur preceded death-of-guru-gobind-singh — The Sikh Gurus: Guru Gobind Singh, the tenth and last human Guru, succeeded his father Tegh Bahadur.
- `186` — battle-of-plassey preceded battle-of-buxar — The East India Company's rise in Bengal: Plassey, then Buxar.
- `187` — battle-of-buxar preceded east-india-company-bengal — After Buxar, the Treaty of Allahabad gave the Company the right to collect Bengal's revenue.
- `188` — second-anglo-mysore-war preceded tipu-sultan-killed — The Anglo-Mysore Wars: they ended with Tipu Sultan's death at Seringapatam.
- `189` — world-war-one preceded first-world-war-ends — The First World War, from its outbreak to the armistice.
- `190` — first-world-war-ends preceded treaty-of-versailles — The armistice stopped the fighting; the treaty set the peace terms with Germany.
- `191` — hitler-rise-chancellor preceded world-war-two — Six years after Hitler took power, Germany's invasion of Poland began the Second World War.
- `192` — world-war-two preceded japanese-pearl-harbor — The Second World War: Pearl Harbor brought the United States into the war.
- `193` — japanese-pearl-harbor preceded d-day-normandy — The Second World War: the Allied invasion of western Europe.
- `194` — d-day-normandy preceded atomic-bomb-hiroshima — The Second World War's final year: Germany surrendered in May, and Hiroshima was bombed in August.
- `195` — atomic-bomb-hiroshima preceded japan-world-war-two-defeat — Japan surrendered days after the bombings of Hiroshima and Nagasaki.
- `196` — sputnik-launch preceded space-race-yuri-gagarin — The Space Race: the first satellite, then the first human in space.
- `197` — space-race-yuri-gagarin preceded moon-landing — The Space Race: from the first human in orbit to the first humans on the Moon.

## [info] Region labels in use, with their DateFlow lane

- `Europe` — europe · 157 records
- `South Asia` — south-asia · 125 records
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

- `events` — 343 at import -> 434 now
- `time_spans` — 98 at import -> 99 now
