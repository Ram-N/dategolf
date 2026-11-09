# Date-precision batch: the 20 events before 500 BCE (2026-11-09)

Pre-sorted for review. Nothing is applied yet. Reply "go", or override any row.

**What "approximate" does today:** DatePick keeps wrong answers more than 10 years from the year. Nothing else yet: event cards don't show "c.", and the range (`date_display`) is stored but not exported. Part 2 below would make both visible.

## A. Mark approximate, with the true range (9)

| Event | Year (unchanged) | Range to store | Why |
|---|---|---|---|
| Invention of the Wheel | 3500 BCE | c. 4000–3500 BCE | Earliest wheels (Mesopotamia, Central Europe) cluster in the mid-4th millennium; no single year |
| Invention of Sumerian Writing | 3200 BCE | c. 3400–3100 BCE | Proto-cuneiform at Uruk develops over centuries |
| First Cities Founded in Mesopotamia | 3000 BCE | c. 4000–3000 BCE | Uruk grows into a city during the Uruk period (c. 4000–3100) |
| Indus Valley Civilization Begins | 2600 BCE | c. 2600 BCE | The conventional start of the mature Harappan phase |
| Code of Hammurabi Established | 1754 BCE | c. 1755–1750 BCE | Depends on which Mesopotamian chronology is used (middle chronology given) |
| Fall of Troy | 1200 BCE | c. 1250–1180 BCE | Legendary. The archaeological destruction of Troy VIIa is c. 1180 |
| King David Captures Jerusalem | 1000 BCE | c. 1000 BCE (biblical tradition) | Not independently dated |
| Babylonian Conquest of Jerusalem | 588 BCE | 588–586 BCE | Siege 588, fall 587/586. **Year kept at 588**: its DateLinks aids count to 588 (722 + 134, 605 + 17, 597 + 9) |
| Birth of Siddhartha Gautama | 563 BCE | c. 563 or c. 480 BCE (disputed) | Already DateFlow-only; this records why |

## B. Change the year (1)

| Event | Now | Proposed | Why |
|---|---|---|---|
| Phoenician Alphabet Invented | 1600 BCE | **c. 1050 BCE**, range c. 1100–1050 BCE | 1600 BCE is the *Proto-Canaanite* (Proto-Sinaitic) script. The Phoenician alphabet the description talks about ("22 consonant letters") dates from c. 1050 BCE. No DateLinks, milestones or daily challenges use it. It moves about 550 years on the timeline. |

## C. DateFlow only, plus approximate (2)

These stay on the DateFlow timeline but leave DatePick and DateGolf, as the Buddha's birth did (no fair single year to guess):

| Event | Year | Range | Why |
|---|---|---|---|
| Battle of Kurukshetra | 1000 BCE | traditionally 3102 BCE; scholars c. 1000 BCE | Dates differ by over 2,000 years, and some scholars doubt it's historical at all |
| Ironworking Spreads Across the Old World | 670 BCE | c. 1200–500 BCE | A process over seven centuries: the year 670 is arbitrary |

## D. Keep exact (7)

| Event | Year | Why it's fine |
|---|---|---|
| Thales Predicts a Solar Eclipse | 585 BCE | Astronomically fixed: 28 May 585 BCE |
| Ancient Olympic Games Established | 776 BCE | The fixed traditional date of the first Olympiad (the Greeks' own dating system) |
| Founding of Rome | 753 BCE | The fixed traditional date (the Romans counted years from it); the description says "according to Roman tradition" |
| Birth of Confucius | 551 BCE | The traditional date, given almost everywhere |
| Cyrus the Great Founds the Persian Empire | 550 BCE | Defeat of Media, 550/549: within a year |
| Roman Republic Established | 509 BCE | The traditional date, used everywhere |
| Athenian Democracy Established | 508 BCE | Cleisthenes' reforms, 508/507: within a year |

*(Great Pyramid of Giza Completed: already done, c. 2560 BCE.)*

## Part 2: make "approximate" visible (a small game change, separate "go")

1. **Show "c."** on event cards and in DatePick and DateFlow (e.g. "c. 3500 BCE"), and export `date_display` as `dateDisplay` so the card can show the range.
2. **Scale DatePick's gap with age.** "More than 10 years away" is meaningless for 3500 BCE, where a wrong answer of 3480 is as defensible as the right one. Proposal: 10 years after 1 CE, 25 years for 1000 BCE to 1 CE, 100 years before 1000 BCE.

## Also found (not in this batch)

- **Span "Indian Independence Movement" starts in 1920.** The movement goes back to the 1880s (the Indian National Congress was founded in 1885) or to 1857. 1920 is really the start of Gandhi's mass phase. Change it to 1885, or rename the span?
- **Spans before 500 BCE** (Old Kingdom, Indus Mature Phase, Shang, etc.) have the same false precision. A follow-up batch could cover them.

## How it's applied (after "go")

- **A and B:** `manage.py set-event-date <id> [--year] --approximate --display "..."`
- **C:** a small new `dateflow-only <id> --reason` command, logged like the others
- **Then:** export, validate and commit. The game JSON changes for the approximate flags and the Phoenician year.
