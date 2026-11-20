# Span date precision: the spans before 500 BCE (2026-11-19)

Proposed, not applied. Follows the event batch (`2026-11-09_date_precision.md`).

**Where things stand:** 11 of the 13 spans are already marked approximate, so the app shows "c." and dashed edges on them. The false precision left is in the years themselves: "c. 2686–2181 BCE" reads as if historians knew the year. Spans have no `date_display` field (events do), so a range or a dispute can't be stated on the card yet; see **Part 2**.

All year changes were dry-run on a copy of the db: `validate` passes, and no links, aids or daily challenges depend on these years.

## A. Round the years (4)

| Span | Now | Proposed | Why | Source |
|---|---|---|---|---|
| Old Kingdom of Egypt | c. 2686–2181 BCE | **c. 2700–2200 BCE** | 2686–2181 are reconstructions from king lists, uncertain by about 50 years or more; radiocarbon puts the start between 2691 and 2625 | Shaw, *Oxford History of Ancient Egypt* (2000); Bronk Ramsey et al., *Science* 328 (2010) |
| Akkadian Empire | c. 2334–2154 BCE | **c. 2350–2150 BCE** | The years come from the middle chronology; the short chronology puts everything 64 years later | Standard Mesopotamian chronologies; Hammurabi's event already says "middle chronology" |
| Shang Dynasty | c. 1600–1046 BCE | **c. 1600–1050 BCE** | The end is the Zhou conquest. 1046 is the Xia–Shang–Zhou Chronology Project's figure; estimates run from 1122 (traditional) to 1027 (*Bamboo Annals*) | Xia–Shang–Zhou Chronology Project (2000); Shaughnessy, *Cambridge History of Ancient China* (1999) |
| Zhou Dynasty | c. 1046–256 BCE | **c. 1050–256 BCE** | Same conquest date as the Shang end, so the two still meet. The end (Qin ends the Eastern Zhou) is fixed at 256 | As above |

## B. Keep as they are (9)

| Span | Years | Why it's fine |
|---|---|---|
| Indus Valley Civilization (Mature Phase) | c. 2600–1900 BCE | Already round; the conventional Harappan phase dates |
| Construction of the Great Pyramid of Giza | c. 2600–2560 BCE | Matches its ending event (range c. 2600–2560, set 2026-11-09) |
| New Kingdom of Egypt | c. 1550–1070 BCE | Already round; New Kingdom dates are firmer (within about 20 years) |
| Olmec Civilization | c. 1200–400 BCE | Already round |
| Axial Age | c. 800–200 BCE | Jaspers' own definition of the term |
| Life of the Buddha | c. 563–483 BCE | The traditional dates; the description already says many scholars put his death near 400 BCE. Part 2 would let the card say so too |
| Achaemenid Persian Empire | 550–330 BCE (exact) | Cyrus defeats Media in 550/549; Darius III dies in 330 |
| Roman Republic | 509–27 BCE (exact) | 509 is the traditional date, as on its "Established" event; 27 is Augustus |
| Ancient (era) | 3600–800 BCE | An editorial era boundary, not a historical claim; left out of this batch |

## Part 2 (separate "go"): give spans a `date_display`

Add an optional `date_display` to spans, as events already have, exported as `dateDisplay` and shown in the span card's approximate note ("historians give …"). The texts it would carry now:

| Span | `date_display` |
|---|---|
| Old Kingdom of Egypt | c. 2700–2200 BCE (often given as 2686–2181) |
| Akkadian Empire | c. 2334–2154 BCE in the middle chronology; 64 years later in the short |
| Shang Dynasty | c. 1600–1046 BCE; the Zhou conquest is dated 1122–1027 by different reckonings |
| Zhou Dynasty | c. 1046–256 BCE; the start is disputed (1122–1027), the end is fixed |
| Life of the Buddha | traditionally 563–483 BCE; many scholars c. 480–400 BCE |

**Apply (after a yes):** `manage.py set-span-years <id> <start> <end> --approximate` for section A, then `data:export`, `validate` and `data:compare`.
