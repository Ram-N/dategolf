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
| review | Proposed events awaiting approval (not exported; manage.py approve <id>) | pass |
| review | CSV rows triaged as duplicate / not recommended (incl. date conflicts) | 12 |
| review | Legacy region labels (no reviewed hierarchy yet) | 12 |
| review | Legacy categories with no mapping to the planned taxonomy | 12 |
| warning | Description mentions a year near the answer (DatePick shows it before the guess) | 18 |
| info | Counts changed since the legacy import | 1 |

## Counts

- events: 409
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

## [review] CSV rows triaged as duplicate / not recommended (incl. date conflicts)

- `csv 3` — duplicate_of_existing → egyptian-pyramids-built — DATE CONFLICT: CSV says c. 3000 BC, the app says 2560 BCE (the span construction-great-pyramid is -2580..-2560).
- `csv 15` — duplicate_of_existing → birth-of-buddha — DATE CONFLICT: CSV says c. 576 BC, the app says 563 BCE. Row 20 gives a third date.
- `csv 20` — duplicate_of_existing → birth-of-buddha — DATE CONFLICT: CSV says 486 BC, row 15 says c. 576 BC, the app says 563 BCE. Scholarly estimates range from c. 563 to c. 480 BCE.
- `csv 22` — not_recommended → platos-academy-founded — 'The period of Aristotle and Plato' is an era, not a datable event. Could become a time span.
- `csv 96` — not_recommended → gunpowder-invented — 'Roger Bacon invents gunpowder' conflicts with gunpowder-invented (c. 850, China). Bacon described a recipe c. 1267 but did not invent it.
- `csv 101` — duplicate_of_existing → vijayanagara-empire-founded — Spelling variant (Vijayanagar). Missed by the matcher; worth adding 'Vijayanagar' as an alias.
- `csv 175` — not_recommended — Draft discarded at review: obscure, and the 'first internal combustion engine' framing is disputed (Lenoir 1860 / Otto 1876 are better milestones).
- `csv 209` — duplicate_of_existing → construction-eiffel-tower — Covered by the time span construction-eiffel-tower (1887..1889).
- `csv 247` — not_recommended — 'Military Aid Pact between China and Pakistan, 1954' looks wrong: the 1954 pact was between the US and Pakistan. Check before using.
- `csv 273` — not_recommended — Draft discarded at review: too minor for a world-history game.
- `csv 286` — not_recommended — Security Council presidency rotates monthly; too minor for the game.
- `csv 288` — not_recommended — Draft discarded at review: minor episode; Gaddafi's story is better told through other events.

## [review] Legacy region labels (no reviewed hierarchy yet)

- `North America` — 7 records
- `East Asia` — 64 records
- `Americas` — 59 records
- `Middle East` — 42 records
- `Oceania` — 4 records
- `Africa` — 31 records
- `World` — 3 records
- `Global` — 25 records
- `Southeast Asia` — 2 records
- `Europe` — 156 records
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

## [warning] Description mentions a year near the answer (DatePick shows it before the guess)

- `invention-of-the-wheel` — answer -3500; description mentions 3500
- `hadrians-wall` — answer 122; description mentions 117
- `battle-of-bannockburn` — answer 1314; description mentions 1328
- `thirty-years-war` — answer 1618; description mentions 1648
- `execution-of-charles-i` — answer 1649; description mentions 1660
- `abolition-slavery-britain` — answer 1807; description mentions 1833
- `revolutions-of-1848` — answer 1848; description mentions 1848
- `emancipation-proclamation` — answer 1863; description mentions 1863, 1865
- `suffragette-emmeline-pankhurst` — answer 1903; description mentions 1918
- `russo-japanese-war` — answer 1904; description mentions 1905
- `bolshevik-civil-war` — answer 1918; description mentions 1922
- `death-of-stalin` — answer 1953; description mentions 1956
- `french-colonial-algeria` — answer 1954; description mentions 1962
- `death-of-mao` — answer 1976; description mentions 1949
- `gorbachev-becomes-leader` — answer 1985; description mentions 1989, 1991
- `berlin-wall-falls` — answer 1989; description mentions 1961
- `mandela-freed` — answer 1990; description mentions 1994
- `taliban-capture-kabul` — answer 1996; description mentions 2001

## [info] Counts changed since the legacy import

- `events` — 343 at import -> 409 now
