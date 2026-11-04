# Validation report

| Severity | Check | Result |
|---|---|---:|
| error | SQLite integrity_check | pass |
| error | Foreign key violations | pass |
| error | Year 0 in an event | pass |
| error | Year 0 in a time span | pass |
| error | Time span starts after it ends | pass |
| error | Entity with no event or time-span facet | pass |
| error | Event with no categories | pass |
| error | Period/empire with no categories | pass |
| error | Category row for a facet the entity doesn't have | pass |
| error | Milestone that is not an event | pass |
| error | DateLinks content for an entity that is not an event | pass |
| error | DateLinks group with no items | pass |
| error | Daily challenge date without exactly 5 years | pass |
| error | Empty event name or description | pass |
| error | Milestone or DateLinks content on a proposed (unexported) entity | pass |
| warning | Event name contains a 4-digit year (gives the answer away) | 1 |
| warning | Alias contains a 4-digit year (search would reveal the answer) | 66 |
| warning | Time spans with the same normalised name | pass |
| warning | Event names that differ only in case or spacing | pass |
| warning | Event with no aliases (search falls back to name only) | pass |
| warning | Imported entity with no import record (provenance lost) | pass |
| review | Event + time span share one ID (identity decision needed) | 25 |
| review | Legacy CSV rows with no accepted match and no triage outcome | 1 |
| review | Proposed events awaiting approval (not exported; manage.py approve <id>) | 68 |
| review | CSV rows triaged as duplicate / not recommended (incl. date conflicts) | 9 |
| review | Legacy region labels (no reviewed hierarchy yet) | 12 |
| review | Legacy categories with no mapping to the planned taxonomy | 12 |
| info | Counts changed since the legacy import | 1 |

## Counts

- events: 411
- time_spans: 98
- eras: 5
- datelinks_keys: 26
- datelinks_groups: 83
- datelinks_items: 198
- milestones: 16
- daily_challenge_dates: 366
- csv_rows: 310

## [warning] Event name contains a 4-digit year (gives the answer away)

- `revolutions-of-1848` — Revolutions of 1848 Sweep Europe

## [warning] Alias contains a 4-digit year (search would reveal the answer)

- `great-schism` — papal schism 1054
- `battle-of-bannockburn` — Stirling Castle 1314
- `timur-sacks-delhi` — 1398 India
- `columbus-reaches-americas` — Columbus 1492
- `first-battle-of-panipat` — Panipat 1526
- `second-battle-of-panipat` — Panipat 1556
- `east-india-company-founded` — 1600 charter
- `pilgrims-land-plymouth` — 1620 America
- `english-restoration` — 1660 England
- `great-plague-london` — London plague 1665
- `great-fire-london` — London fire 1666
- `great-fire-london` — 1666 fire city
- `glorious-revolution` — Bill of Rights 1689
- `act-of-union-1707` — British union 1707
- `american-declaration` — Philadelphia 1776
- `great-reform-act` — Reform Act 1832
- `queen-victoria-accession` — 1837 Britain
- `revolutions-of-1848` — 1848 revolutions
- `revolutions-of-1848` — nationalist uprisings 1848
- `crimean-war` — 1853 war Russia Britain
- `indian-rebellion-1857` — 1857 uprising
- `first-oil-well` — oil discovery 1859
- `emancipation-proclamation` — 1863 freedom
- `lincoln-assassination` — Good Friday 1865
- `krakatoa-erupts` — volcanic eruption 1883
- `krakatoa-erupts` — tsunami 1883
- `x-rays-discovered` — radiation discovery 1895
- `x-rays-discovered` — 1895 physics Nobel
- `russo-japanese-war` — 1904 Manchuria war
- `russo-japanese-war` — Japanese victory 1905
- `fall-of-qing-dynasty` — Chinese Revolution 1911
- `fall-of-qing-dynasty` — 2000 years of empire ends
- `turkish-republic-founded` — Lausanne Treaty 1923
- `great-depression` — stock market crash 1929
- `death-of-stalin` — Stalin death March 1953
- `everest-first-ascent` — Everest summit 1953
- `jfk-assassination` — Dallas 1963
- `jfk-assassination` — November 22 1963
- `indo-pak-1965-war` — India Pakistan 1965
- `six-day-war` — Arab-Israeli War 1967
- `six-day-war` — 1967 Middle East war
- `bangladesh-liberation-war` — Indo-Pakistan war 1971
- `oil-crisis-1973` — 1973 energy crisis
- `viking-1-mars` — Mars landing 1976
- `thatcher-becomes-pm` — Conservative revolution 1979
- `thatcher-becomes-pm` — UK election 1979
- `iran-iraq-war` — 1980 Persian Gulf
- `falklands-war` — 1982 South Atlantic
- `india-wins-cricket-world-cup` — Lords 1983
- `ethiopian-famine` — Africa famine 1984
- `gorbachev-becomes-leader` — Cold War thaw 1985
- `economic-liberalization-india` — 1991 crisis reforms
- `wto-founded` — 1995 globalization
- `dolly-sheep-cloned` — cloning breakthrough 1996
- `taliban-capture-kabul` — Kabul falls 1996
- `hong-kong-handover` — Hong Kong 1997
- `hong-kong-handover` — handover ceremony July 1997
- `gujarat-earthquake` — India earthquake 2001
- `indian-ocean-tsunami-india` — 2004 tsunami India
- `global-financial-crisis` — 2008 recession
- `global-financial-crisis` — Wall Street crash 2008
- `nirbhaya-case-protests` — December 2012 protests
- `modi-elected-pm` — BJP landslide 2014
- `demonetization-india` — 500 1000 rupee notes banned
- `chandrayaan-3-lunar-landing` — Vikram lander 2023
- `chandrayaan-3-lunar-landing` — Pragyan rover 2023

## [review] Event + time span share one ID (identity decision needed)

- `punic-wars` — event
- `pax-romana` — event
- `islamic-golden-age` — event
- `gutenberg-printing-press` — event
- `protestant-reformation` — event
- `english-civil-war` — event
- `glorious-revolution` — event
- `american-revolution` — event
- `french-revolution` — event
- `haitian-revolution` — event
- `napoleonic-wars` — event
- `latin-american-independence` — event
- `american-civil-war` — event
- `russo-japanese-war` — event
- `russian-revolution` — event
- `chinese-civil-war` — event
- `great-depression` — event
- `spanish-civil-war` — event
- `manhattan-project` — event
- `indian-independence` — event
- `korean-war` — event
- `vietnam-war` — event
- `human-genome-project` — event
- `arab-spring` — event
- `covid-19-pandemic` — event

## [review] Legacy CSV rows with no accepted match and no triage outcome

- `events_master.csv` — 234 rows (manage.py reconcile-events proposes)

## [review] Proposed events awaiting approval (not exported; manage.py approve <id>)

- `david-captures-jerusalem` — -995 · King David Captures Jerusalem — Traditional date; usually given as c. 1000 BCE and the historicity is debated.
- `battle-of-zama` — -202 · Battle of Zama — Related: punic-wars (event and span).
- `second-triumvirate` — -43 · Second Triumvirate Formed — Related: first-triumvirate.
- `jin-reunifies-china` — 280 · Jin Dynasty Reunifies China — CSV claims this 'creates the political shape of modern China'; omitted as overstated.
- `huns-arrive-in-europe` — 375 · Huns Arrive in Europe — 375 is the conventional date. Related: attila-hun-invasions (450).
- `chandragupta-ii-vikramaditya` — 380 · Chandragupta II Vikramaditya Takes the Throne — Accession dates vary (c. 375-380). Related: gupta-empire.
- `benedictine-order-founded` — 529 · Founding of the Benedictine Order — c. 529. CSV details mention his earlier monasteries at Subiaco.
- `death-of-muhammad` — 632 · Death of the Prophet Muhammad — CSV also says 'Beginning of Hijri Era', but that begins in 622 (existing hijra), so it is omitted. Related: islamic-caliphate-expands (632).
- `mahmud-of-ghazni-accession` — 998 · Mahmud of Ghazni Takes Power — Related: mahmud-ghazni-somnath (1026).
- `tower-of-london-begun` — 1078 · Construction of the Tower of London Begins — 1078 is the usual start date.
- `university-of-paris-founded` — 1150 · University of Paris Emerges — c. 1150; the royal charter dates from 1200. Related: university-of-bologna-founded.
- `qutb-ud-din-aibak-delhi` — 1206 · Qutb ud-Din Aibak Founds the Delhi Sultanate — Same start year as span delhi-sultanate (1206-1526): candidate for the event/span identity decision.
- `muhammad-bin-tughlaq-accession` — 1325 · Muhammad bin Tughlaq Becomes Sultan — CSV row 1327 (capital moved to Daulatabad) is a likely related row.
- `babur-ruler-of-ferghana` — 1494 · Babur Becomes Ruler of Ferghana — Region uncertain: Ferghana is in Central Asia, which has no legacy label; South Asia was chosen because of his Mughal story. Related: babur-founds-mughal-empire.
- `first-portable-watches` — 1509 · First Portable Watches — Henlein's work is usually dated c. 1505-1510 and the attribution is debated.
- `humayun-recaptures-delhi` — 1555 · Humayun Recaptures Delhi — Related: humayun-defeated-kanauj (1540), second-battle-of-panipat (1556).
- `death-of-jahangir` — 1627 · Death of Jahangir — Split from a CSV row that bundles two events (see birth-of-shivaji).
- `birth-of-shivaji` — 1627 · Birth of Shivaji — CHECK THE YEAR before approving. The CSV says 1627, but most sources now give 1630 (Maharashtra officially uses 19 Feb 1630). Split from a bundled CSV row. Related: shivaji-crowned-chhatrapati (1674).
- `battle-of-buxar` — 1764 · Battle of Buxar — Related: battle-of-plassey (1757), east-india-company-bengal.
- `second-anglo-mysore-war` — 1780 · Second Anglo-Mysore War Begins — Related: tipu-sultan-killed (1799).
- `robert-street-engine-patent` — 1794 · Robert Street Patents an Internal Combustion Engine — The CSV calls this 'Invention of the Internal Combustion Engine', which is disputed. The draft is narrowed to the specific patent the CSV details describe.
- `lewis-and-clark-expedition` — 1804 · Lewis and Clark Expedition — Two CSV rows: 178 says 1803 (Lewis set out down the Ohio) and 179 says 1804 (the expedition left the St. Louis area in May 1804). Used 1804.
- `death-of-napoleon` — 1821 · Death of Napoleon — Related: napoleon-defeat-waterloo (1815).
- `edison-light-bulb` — 1879 · Edison Demonstrates the Light Bulb — Joseph Swan developed a similar lamp in parallel in England.
- `benz-motorwagen` — 1885 · Benz Builds the First Practical Automobile — Built 1885, patented January 1886.
- `integrated-circuit-invented` — 1959 · Silicon Integrated Circuit Invented — Kilby 1958 (germanium), Noyce 1959 (silicon).
- `france-first-nuclear-test` — 1960 · France Tests Its First Atomic Bomb — Region chosen by the actor (France); the test site is in Algeria (Africa).
- `formation-of-malaysia` — 1963 · Federation of Malaysia Formed — Region: Southeast Asia, filed under East Asia per existing convention (Vietnam War, Khmer Rouge).
- `singapore-independence` — 1965 · Singapore Becomes Independent — Region: Southeast Asia, filed under East Asia per existing convention.
- `khmer-rouge-overthrown` — 1979 · Khmer Rouge Driven from Phnom Penh — CSV says 'Cambodian rebels grab power'; the rebels came to power through a Vietnamese invasion. Related: khmer-rouge-cambodia (1975).
- `us-invasion-of-grenada` — 1983 · United States Invades Grenada — The CSV row also mentions the US withdrawal from UNESCO (announced 1983, effective 1984), which is not drafted.
- `spitak-earthquake` — 1988 · Spitak Earthquake in Armenia — The CSV says nearly 100,000 were killed; most estimates are 25,000-50,000, so the draft gives no figure. Region uncertain (Caucasus); Europe chosen, as for other Soviet events.
- `zia-ul-haq-killed` — 1988 · Zia-ul-Haq Killed in Plane Crash — The CSV row bundles four 1988 items; only this one is drafted. The others are WHO's no-smoking day, the French president's re-election and an earthquake in Bihar.
- `india-rejects-ctbt` — 1996 · India Refuses to Sign the Test Ban Treaty — Related: pokhran-nuclear-tests.
- `kofi-annan-secretary-general` — 1996 · Kofi Annan Chosen as UN Secretary-General — Appointed December 1996; took office January 1997.
- `suharto-resigns` — 1998 · Suharto Resigns — Split from a bundled CSV row (see clinton-impeached). Region: Southeast Asia, filed under East Asia per existing convention.
- `clinton-impeached` — 1998 · Bill Clinton Impeached — The CSV says 'faces impeachment'; the House vote came in December 1998. The same row mentions Pakistan's Ghauri missile test, which is not drafted.
- `ptolemaic-dynasty-founded` — -305 · Ptolemy I Becomes Pharaoh of Egypt
- `caesar-invades-britain` — -55 · Julius Caesar Invades Britain
- `mihira-bhoja-kannauj` — 836 · Mihira Bhoja Becomes King of Kannauj
- `razia-sultana-accession` — 1236 · Razia Sultana Takes the Throne of Delhi
- `alauddin-khalji-accession` — 1296 · Alauddin Khalji Becomes Sultan of Delhi
- `firuz-shah-tughlaq-accession` — 1351 · Firuz Shah Tughlaq Becomes Sultan
- `humayun-succeeds-babur` — 1530 · Humayun Succeeds Babur
- `death-of-akbar` — 1605 · Death of Akbar
- `martyrdom-of-guru-arjan` — 1606 · Execution of Guru Arjan
- `jahangir-marries-nur-jahan` — 1611 · Jahangir Marries Nur Jahan
- `execution-of-guru-tegh-bahadur` — 1675 · Execution of Guru Tegh Bahadur
- `battle-of-blenheim` — 1704 · Battle of Blenheim
- `death-of-guru-gobind-singh` — 1708 · Death of Guru Gobind Singh
- `nadir-shah-sacks-delhi` — 1739 · Nadir Shah Sacks Delhi
- `indian-removal-act` — 1830 · Indian Removal Act
- `alaska-purchase` — 1867 · United States Buys Alaska
- `stanley-finds-livingstone` — 1871 · Stanley Finds Livingstone
- `battle-of-little-bighorn` — 1876 · Battle of the Little Bighorn
- `spanish-american-war` — 1898 · Spanish–American War
- `eisenhower-elected` — 1952 · Eisenhower Elected US President
- `partial-test-ban-treaty` — 1963 · Partial Nuclear Test Ban Treaty Signed
- `cosmic-microwave-background` — 1964 · Cosmic Microwave Background Discovered
- `death-of-churchill` — 1965 · Death of Winston Churchill
- `jimmy-carter-elected` — 1976 · Jimmy Carter Elected US President
- `seychelles-independence` — 1976 · Seychelles Gains Independence
- `bhutto-executed` — 1979 · Zulfikar Ali Bhutto Executed
- `us-bombing-of-libya` — 1986 · United States Bombs Libya
- `palestinian-declaration-of-independence` — 1988 · Palestinian Declaration of Independence
- `namibia-independence-process` — 1989 · UN Transition to Namibian Independence Begins
- `sheikh-hasina-first-term` — 1996 · Sheikh Hasina Becomes Prime Minister
- `kosovo-war-ends` — 1999 · Yugoslavia Accepts Kosovo Peace Plan

## [review] CSV rows triaged as duplicate / not recommended (incl. date conflicts)

- `csv 3` — duplicate_of_existing → egyptian-pyramids-built — DATE CONFLICT: CSV says c. 3000 BC, the app says 2560 BCE (the span construction-great-pyramid is -2580..-2560).
- `csv 15` — duplicate_of_existing → birth-of-buddha — DATE CONFLICT: CSV says c. 576 BC, the app says 563 BCE. Row 20 gives a third date.
- `csv 20` — duplicate_of_existing → birth-of-buddha — DATE CONFLICT: CSV says 486 BC, row 15 says c. 576 BC, the app says 563 BCE. Scholarly estimates range from c. 563 to c. 480 BCE.
- `csv 22` — not_recommended → platos-academy-founded — 'The period of Aristotle and Plato' is an era, not a datable event. Could become a time span.
- `csv 96` — not_recommended → gunpowder-invented — 'Roger Bacon invents gunpowder' conflicts with gunpowder-invented (c. 850, China). Bacon described a recipe c. 1267 but did not invent it.
- `csv 101` — duplicate_of_existing → vijayanagara-empire-founded — Spelling variant (Vijayanagar). Missed by the matcher; worth adding 'Vijayanagar' as an alias.
- `csv 209` — duplicate_of_existing → construction-eiffel-tower — Covered by the time span construction-eiffel-tower (1887..1889).
- `csv 247` — not_recommended — 'Military Aid Pact between China and Pakistan, 1954' looks wrong: the 1954 pact was between the US and Pakistan. Check before using.
- `csv 286` — not_recommended — Security Council presidency rotates monthly; too minor for the game.

## [review] Legacy region labels (no reviewed hierarchy yet)

- `North America` — 7 records
- `East Asia` — 64 records
- `Americas` — 58 records
- `Middle East` — 42 records
- `Oceania` — 4 records
- `Africa` — 33 records
- `World` — 3 records
- `Global` — 25 records
- `Southeast Asia` — 2 records
- `Europe` — 157 records
- `South Asia` — 113 records
- `South America` — 1 records

## [review] Legacy categories with no mapping to the planned taxonomy

- `Arts` — 
- `Culture` — 
- `Disasters` — 
- `Exploration` — 
- `Medicine` — 
- `Politics` — 
- `Religion` — 
- `Science` — 
- `Social` — 
- `Sports` — 
- `Technology` — 
- `War` — 

## [info] Counts changed since the legacy import

- `events` — 343 at import -> 411 now
