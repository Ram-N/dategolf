# Gap list: drafting tasks to paste

How to run a batch (doc 15, Part A):

1. `uv run python tools/manage.py ai-reference`: writes `data/drafts/ai_prompt.txt` (the prompt) and `data/drafts/ai_reference.md` (with the gap list and its numbers).
2. In the AI: paste `ai_prompt.txt` as the system prompt (or first message), **attach** `ai_reference.md`, then paste the batch's task below.
3. Save the reply as `data/drafts/incoming/<date>_<ai>_gaps_b<N>.json` and tell Claude. Claude checks it, fixes it, and loads the drafts and links as proposed.
4. Review on the dashboard: **Event drafts**, **Span drafts**, **Links**, **Country tags**, **Sources**. (A draft's "Why it matters" is approved with it.) Tell Claude when done; Claude exports and commits.

Run the batches one at a time, and rerun step 1 before each (the gap list and ids change).

Done: all batches published 2026-11-13. The gap list is complete (89 drafted, 1 dismissed).

## Batch 1: South Asia (20)

```
Draft gap items 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 20, 21, 22, 23 from the reference,
each with "fills_missing", a "significance", and links (at least one each; succession chains
use "preceded" between neighbours only, reigns "began"/"ended" with accessions and deaths).
Notes:
- Item 17: the name must not contain a year (e.g. "Crown Takes Over the Government of India").
- Items 11 to 15 are the five Delhi Sultanate dynasties: link each as part_of "delhi-sultanate",
  and link the existing sultans' accession events to their dynasty.
- Item 3 (Reign of Akbar): link the existing mughal-akbar-administration, battle-of-haldighati
  and akbar-din-i-ilahi as part_of it.
```

## Batch 2: the ancient and medieval world (20)

```
Draft gap items 59, 58, 65, 31, 32, 33, 34, 55, 79, 40, 41, 78, 76, 77, 74, 70, 71, 56, 69, 75 from the
reference, each with "fills_missing", a "significance", and at least one link.
Notes:
- Items 31 to 34: the three Punic Wars are part_of the existing span "punic-wars"; Zama (existing
  "battle-of-zama") ended the Second; the Destruction of Carthage ended the Third and "punic-wars".
- Item 74 (Kievan Rus'): the existing event "kievan-rus-founded" began it.
- Many of these are Africa, Southeast Asia and early Americas: dates are often uncertain; mark them
  approximate with a true range, and give regional significance.
```

## Batch 3: 1240s to 1800 (20)

```
Draft gap items 73, 68, 72, 67, 66, 54, 62, 80, 57, 53, 25, 26, 61, 28, 30, 63, 51, 38, 39, 37 from the
reference, each with "fills_missing", a "significance", and at least one link.
Notes:
- Items 61 and 62 are spans for wars whose start already exists as an event
  ("thirty-years-war", "hundred-years-war"). Use the ids "thirty-years-war-period" and
  "hundred-years-war-period", and link the existing events to them with "began".
  The existing "signing-of-treaty-westphalia" ended the Thirty Years' War.
- Items 28 and 30 are two different events of 1644: Li Zicheng's rebels take Beijing and the last
  Ming emperor dies (30), then the Qing enter Beijing (28). Draft both; don't merge them.
- Item 67 (Mongols Sack Baghdad) ended the existing "abbasid-caliphate".
```

## Batch 4: 1800 to 1975 (19)

```
Draft gap items 35, 36, 29, 27, 52, 60, 42, 43, 44, 45, 46, 47, 49, 64, 48, 50, 18, 19, 24 from the
reference, each with "fills_missing", a "significance", and at least one link.
Notes:
- Item 64: the name must not contain a year (e.g. "Voting Rights Act Signed").
- Item 60 (Franz Ferdinand) triggered the existing "world-war-one" event.
- Item 47 (Cold War): the existing "cold-war-begins" began it and "dissolution-soviet-union" ended it.
- Item 18 is the whole independence movement; the existing "indian-independence-movement" span
  (the Gandhian era) is part_of it.
```

Batch 4, part 2 (10). Send it after part 1 is loaded (the prompt allows 20 items per reply). These were added
2026-11-13 so that four batch 2 spans get the links they lack:

```
Draft gap items 81, 82, 83, 84, 85, 86, 87, 88, 89, 90 from the reference, each with "fills_missing", a "significance",
and at least one link.
Notes:
- Item 81 (Ezana's conversion, c. 330s): part_of the existing "kingdom-of-aksum".
- Item 82 (Chola raids on Srivijaya): part_of the existing "chola-empire"; it weakened "srivijaya"
  (contributed_to its decline only if your source says so; otherwise just link it to both spans).
- Item 83 (Angkor Wat, begun c. 1113-1150 under Suryavarman II): part_of the existing "khmer-empire".
- Item 84 (Ayutthaya sacks Angkor): ended the existing "khmer-empire".
- Item 85 (Mongols sack Kyiv): ended the existing "kievan-rus" and is part_of "mongol-conquests".
- Item 86 (Mutapa Empire): link it to the existing "great-zimbabwe" (Mutapa rose as Great Zimbabwe declined).
- Items 89 and 90 are the two theatres of the Second World War, each part_of the existing "world-war-2":
  89 European Theatre (1939-1945): "germany-surrenders-ve-day" ended it; "battle-of-britain",
     "germany-invades-soviet-union", "battle-of-stalingrad" and "d-day-normandy" are part_of it.
  90 Pacific War (1941-1945): "japanese-pearl-harbor" began it; "japan-world-war-two-defeat" ended it;
     "battle-of-midway" and "atomic-bomb-hiroshima" are part_of it.
  Don't link the two theatres to each other with "preceded": they ran side by side.
- Items 87 and 88 are part_of the existing "kingdom-of-kongo". Item 87 (Diogo Cao reaches the Congo
  River) preceded item 88 (Afonso I's accession).
```

Item 6 (Death of Aurangzeb) is left out: the event exists now (renamed 2026-11-11), so it should be dismissed.
