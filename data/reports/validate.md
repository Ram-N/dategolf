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
| info | DateFlow-only events (excluded from DatePick and DateGolf) | 1 |
| warning | Published event or span with no country tag | pass |
| info | Entities with an actor but no location (e.g. events on the Moon or Mars) | 2 |
| review | Links awaiting review (dashboard Review → Links, or approve-links / reject-links) | 85 |
| review | Shared ids flagged for a split (Step 3a; do the split with Claude) | pass |
| review | Country tags awaiting review (manage.py approve-countries) | pass |
| info | Region labels in use, with their DateFlow lane | 12 |
| warning | Description mentions a year near the answer (DatePick shows it before the guess) | pass |
| warning | Alias mentions a year near the answer (DateGolf search would reveal it) | pass |
| warning | No tagged country fits the event's region lane (fix the tags, add an actor, or accept it) | pass |
| info | Accepted region exceptions (region deliberately differs from location) | 3 |
| warning | Link runs backwards in time (cause or sequence after its target) | pass |
| warning | part_of link outside the target's years | pass |
| warning | ended link not at the end of what it ended | pass |
| info | Counts changed since the legacy import | 1 |

## Counts

- events: 434
- time_spans: 98
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

## [info] Entities with an actor but no location (e.g. events on the Moon or Mars)

- `moon-landing` — actors only
- `viking-1-mars` — actors only

## [review] Links awaiting review (dashboard Review → Links, or approve-links / reject-links)

- `21` — battle-of-zama part_of punic-wars — The battle that ends the Second Punic War.
- `28` — lee-surrenders-appomattox part_of american-civil-war — The surrender that effectively ends the war.
- `31` — american-war-independence-ends part_of american-revolution — The treaty that ends the revolutionary war.
- `32` — battle-of-trafalgar part_of napoleonic-wars — The naval battle that ends Napoleon's hopes of invading Britain.
- `33` — napoleon-defeat-waterloo part_of napoleonic-wars — Napoleon's final defeat, which ends the wars.
- `36` — chinese-communist-revolution part_of chinese-civil-war — The Communist victory that ends the civil war.
- `39` — d-day-normandy part_of world-war-2 — The Allied landings in Normandy.
- `40` — battle-of-britain part_of world-war-2 — The air war over Britain.
- `41` — germany-invades-soviet-union part_of world-war-2 — Operation Barbarossa opens the Eastern Front.
- `42` — japanese-pearl-harbor part_of world-war-2 — Japan's attack that brings the US into the war.
- `43` — atomic-bomb-hiroshima part_of world-war-2 — The atomic bombing in the war's final weeks.
- `44` — japan-world-war-two-defeat part_of world-war-2 — Japan's surrender ends the war in the Pacific.
- `45` — first-triumvirate part_of fall-of-roman-republic — The Pompey-Crassus-Caesar alliance that undermined republican rule.
- `46` — caesar-crosses-rubicon part_of fall-of-roman-republic — Caesar's move that starts the civil war.
- `47` — julius-caesar-assassination part_of fall-of-roman-republic — The assassination meant to save the republic, which hastened its end.
- `48` — second-triumvirate part_of fall-of-roman-republic — The triumvirs' rule in the republic's last years.
- `49` — augustus-first-emperor part_of fall-of-roman-republic — Augustus's rule, which ends the republic.
- `52` — fall-of-roman-republic part_of roman-republic — The republic's final century.
- `53` — pax-romana-period part_of roman-empire — The empire's two centuries of relative peace.
- `54` — fall-western-roman-empire part_of roman-empire — The western empire's decline and fall.
- `55` — christianity-roman-empire part_of roman-empire — The Edict of Milan, an imperial act.
- `56` — constantinople-founded part_of roman-empire — Constantine founds the empire's new capital.
- `57` — hadrians-wall part_of roman-empire — An imperial frontier project.
- `58` — attila-hun-invasions part_of fall-western-roman-empire — The Hun invasions that weakened the western empire.
- `60` — fall-of-constantinople part_of byzantine-empire — The fall of Constantinople ends the Byzantine Empire.
- `61` — fall-of-constantinople part_of ottoman-empire — The Ottoman conquest of Constantinople.
- `62` — ottoman-empire-falls part_of ottoman-empire — The end of the Ottoman Empire.
- `65` — ashoka-becomes-emperor part_of maurya-empire — Ashoka becomes the Mauryan emperor.
- `66` — ashoka-converts-to-buddhism part_of maurya-empire — The Mauryan emperor's conversion after Kalinga.
- `68` — chandragupta-ii-vikramaditya part_of gupta-empire — The accession of the Gupta emperor Chandragupta II.
- `69` — chola-rajaraja-peak part_of chola-empire — Rajaraja I's reign, the empire's height.
- `71` — razia-sultana-accession part_of delhi-sultanate — A sultan's accession.
- `72` — alauddin-khalji-accession part_of delhi-sultanate — A sultan's accession.
- `73` — muhammad-bin-tughlaq-accession part_of delhi-sultanate — A sultan's accession.
- `74` — firuz-shah-tughlaq-accession part_of delhi-sultanate — A sultan's accession.
- `75` — first-battle-of-panipat part_of delhi-sultanate — Babur's victory, which ends the sultanate.
- `79` — humayun-succeeds-babur part_of mughal-empire — The second Mughal emperor's accession.
- `80` — humayun-defeated-kanauj part_of mughal-empire — Humayun's defeat and exile, a break in Mughal rule.
- `81` — humayun-recaptures-delhi part_of mughal-empire — The restoration of Mughal rule.
- `82` — second-battle-of-panipat part_of mughal-empire — The victory that secures Akbar's throne.
- `83` — mughal-akbar-administration part_of mughal-empire — Akbar's administrative system.
- `84` — battle-of-haldighati part_of mughal-empire — Akbar's campaign against Mewar.
- `85` — akbar-din-i-ilahi part_of mughal-empire — Akbar's religious initiative.
- `86` — death-of-akbar part_of mughal-empire — Akbar's death and Jahangir's succession.
- `87` — jahangir-marries-nur-jahan part_of mughal-empire — The marriage that makes Nur Jahan a power at court.
- `88` — death-of-jahangir part_of mughal-empire — Jahangir's death and Shah Jahan's succession.
- `90` — aurangzeb-becomes-emperor part_of mughal-empire — Aurangzeb's accession.
- `91` — mughal-empire-zenith-aurangzeb part_of mughal-empire — The empire at its largest, at Aurangzeb's death.
- `93` — death-of-shivaji part_of maratha-empire — The founder's death.
- `94` — third-battle-of-panipat part_of maratha-empire — The Maratha defeat at Panipat.
- `95` — partition-of-bengal part_of british-raj — An act of the Raj's administration.
- `98` — gandhi-salt-march part_of indian-independence-movement — The civil disobedience campaign against the salt tax.
- `99` — quit-india-movement part_of indian-independence-movement — The movement's last great campaign.
- `100` — silk-road-opens part_of han-dynasty — Opened by the Han envoy Zhang Qian's missions.
- `106` — zheng-he-voyages part_of ming-dynasty — The Ming treasure-fleet voyages.
- `107` — fall-of-qing-dynasty part_of qing-dynasty — The end of the Qing.
- `109` — mongol-empire-peak part_of mongol-conquests — The empire at its height, after the conquest of Song China.
- `110` — japan-meiji-constitution part_of meiji-restoration — The Meiji Constitution.
- `113` — moors-invade-spain part_of umayyad-caliphate — The Umayyad conquest of Iberia.
- `115` — renaissance-begins-florence part_of italian-renaissance — The Renaissance's beginnings in Florence.
- `116` — renaissance-da-vinci part_of italian-renaissance — Leonardo, a defining figure of the Italian Renaissance.
- `117` — renaissance-michelangelo part_of italian-renaissance — The Sistine Chapel ceiling.
- `119` — galileo-telescope part_of scientific-revolution — Galileo's telescope observations.
- `120` — kepler-laws-planetary-motion part_of scientific-revolution — Kepler's laws of planetary motion.
- `121` — galileo-inquisition part_of scientific-revolution — Galileo's trial over heliocentrism.
- `122` — newton-laws-of-motion part_of scientific-revolution — Newton's Principia, the revolution's culmination.
- `124` — steam-engine-watt part_of industrial-revolution — Watt's improved steam engine.
- `125` — first-steam-railway part_of industrial-revolution — The first public steam railway.
- `126` — french-revolution-storming-bastille part_of french-revolution — The storming of the Bastille.
- `127` — french-revolution-declaration part_of french-revolution — The Declaration of the Rights of Man.
- `128` — abolition-slavery-france part_of french-revolution — Abolition by the revolutionary National Convention.
- `129` — aztec-empire-peak part_of aztec-empire — The empire at its height.
- `130` — spanish-conquest-mexico part_of aztec-empire — The Spanish conquest that ends the empire.
- `131` — conquest-of-peru-inca part_of inca-empire — The Spanish conquest that ends the empire.
- `132` — colonial-africa-berlin part_of scramble-for-africa — The conference that set rules for partitioning Africa.
- `133` — partition-of-africa-colonial part_of scramble-for-africa — Leopold's Congo Free State, a product of the scramble.
- `135` — collapse-apartheid-negotiations part_of apartheid-end — The first democratic election.
- `136` — independence-south-africa part_of apartheid-end — Mandela becomes president.
- `137` — us-civil-rights-march-selma part_of civil-rights-movement — The Selma to Montgomery marches.
- `138` — martin-luther-king-speech part_of civil-rights-movement — The March on Washington.
- `139` — civil-rights-act-us part_of civil-rights-movement — The movement's legislative victory.
- `141` — space-race-yuri-gagarin part_of space-race — The first human in space.
- `142` — moon-landing part_of space-race — The Moon landing, the race's culmination.
- `144` — gorbachev-becomes-leader part_of soviet-union — Gorbachev becomes the Soviet leader.
- `145` — dissolution-soviet-union part_of soviet-union — The end of the Soviet Union.

## [info] Region labels in use, with their DateFlow lane

- `Europe` — europe · 157 records
- `South Asia` — south-asia · 125 records
- `Americas` — americas · 64 records
- `East Asia` — east-asia · 58 records
- `Middle East` — middle-east · 45 records
- `Africa` — africa · 30 records
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
