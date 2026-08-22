# Quando Historical Golf — Historical Event Data, Difficulty & Daily Challenge Design

## 1. Purpose

The quality of Quando depends heavily on the quality of its historical event database.

The database is not simply a list of famous historical facts.

It must be designed as a **game asset**:

- broad enough to support many target years
- familiar enough that students can discover and recognize events
- varied geographically and thematically
- precise enough to have a defensible canonical year
- interesting enough that choosing between events requires historical intuition

Initial target: **250–500 events**.

The system should make it easy to grow beyond 500 later.

---

## 2. Recommended Event Schema

Each event should have a stable ID.

Example:

```json
{
  "id": "india-independence",
  "name": "Indian independence",
  "year": 1947,
  "categories": ["India", "Politics", "World"],
  "region": "India",
  "aliases": ["Indian independence from Britain", "independence of India"],
  "description": "India became independent from British rule.",
  "difficulty": "easy",
  "importance": 5
}
```

The exact schema can evolve, but the following concepts are recommended.

### Required

- `id`
- `name`
- `year`

### Strongly recommended

- `categories`
- `region`
- `aliases`
- `description`
- `difficulty`
- `importance`

---

## 3. Canonical Year

Every playable event should have one canonical scoring year.

The player sees only the event name during selection.

The year is revealed after the guess.

Duration-based historical events should be converted into specific milestones.

Examples:

- End of World War II → 1945
- Start of World War II → 1939
- Moon landing → 1969
- Fall of the Berlin Wall → 1989

Avoid using a range as the scoring value.

If both ends of an event are useful educationally, create two distinct events.

---

## 4. Event Selection Criteria

A strong event should satisfy most of these:

1. It has a reasonably clear canonical year.
2. It is historically significant.
3. A student could plausibly know or estimate its period.
4. It contributes something different from other events.
5. It is searchable by a recognizable name.
6. It helps create interesting near-miss choices.
7. It adds geographic or thematic diversity.

Avoid filling the database with hundreds of nearly identical events.

For example, ten obscure battles from the same country are less valuable than a diverse set covering politics, science, culture, war, technology, and social change.

---

## 5. Geographic Balance

The game is intended for students in India, so Indian history should have substantial representation.

However, Quando is a world-history game.

The database should contain meaningful representation from:

- India
- South Asia
- East Asia
- Middle East
- Africa
- Europe
- North America
- Latin America
- Oceania
- global events

Do not make "world history" synonymous with Western history.

A reasonable first target might be approximately:

- 20–25% India/South Asia
- 40–50% rest of Asia + Europe + Americas
- 15–20% Africa/Middle East/Latin America/Oceania
- remaining events selected for global significance

These are starting targets, not hard rules.

---

## 6. Topical Balance

Use multiple categories.

Potential categories:

- Politics
- War
- Science
- Technology
- Medicine
- Exploration
- Religion
- Philosophy
- Literature
- Arts
- Music
- Architecture
- Business
- Social movements
- Disasters
- Sports
- Culture
- Education

The database should contain enough cross-category variety that a student cannot succeed by knowing only wars and political events.

---

## 7. Difficulty

Difficulty should describe how likely a general student is to recognize the event and roughly place it in history.

### Easy

Very widely known.

Examples might include:

- Indian independence
- World War II
- Moon landing
- French Revolution
- American independence

### Medium

Widely taught or culturally recognizable, but not necessarily known precisely.

### Difficult

Significant historical events that require stronger historical knowledge.

Difficulty should **not** mean "the year is hard to remember."

It should describe the player's likely familiarity with the event.

---

## 8. Importance

Importance is different from difficulty.

Importance answers:

> How important is this event to world history?

Use a simple numeric scale, for example:

- 5 = foundational/global significance
- 4 = major historical significance
- 3 = significant
- 2 = useful supporting event
- 1 = niche but worthwhile

Importance can be used to improve the database and challenge generation, but it should not directly determine the player's score.

---

## 9. Why Importance Matters

Importance can help prevent a daily challenge from becoming filled with obscure events.

For example, a challenge generator can favor events with importance 4–5 while occasionally introducing lower-importance events.

Importance can also be used for future game modes:

- beginner mode → mostly importance 4–5
- standard mode → broad mix
- expert mode → more difficult/lower-importance events

Do not expose importance to the player initially.

---

## 10. Avoid Date Leakage

The event name must not give away the answer.

Avoid names like:

- "1947 Indian Independence"
- "20th Century Indian Independence"
- "World War II, 1939–1945"

Prefer:

- "Indian independence"
- "End of World War II"

Descriptions containing dates should not be shown before the guess.

Aliases used for search are fine, but the UI should not display hidden chronological information.

---

## 11. Build the Dataset Around Historical Anchors

The database should contain events that act as useful mental anchors.

For example, a student may know:

- French Revolution ≈ late 1700s
- Indian independence ≈ mid-1900s
- Moon landing ≈ late 1900s
- Fall of Rome ≈ ancient
- Printing press ≈ 1400s

These anchors allow students to make intelligent estimates.

A good dataset therefore supports **historical triangulation**, not just memorization.

---

## 12. Coverage Across Time

The event distribution should cover:

- ancient history
- classical history
- medieval history
- early modern history
- industrial era
- 20th century
- 21st century

But recent history should be more densely represented.

The game should not produce mostly ancient targets simply because the mathematical range is larger.

---

## 13. Event Database Quality Checks

Before accepting an event:

- Is the year defensible?
- Is the event name unambiguous?
- Is it searchable?
- Does it duplicate another event?
- Does it add geographic diversity?
- Does it add topical diversity?
- Is its difficulty appropriate?
- Is its importance appropriate?
- Does its name accidentally reveal its date?

Run automated validation for:

- duplicate IDs
- duplicate canonical names
- missing years
- invalid years
- empty categories
- empty names
- malformed aliases
- suspicious date-bearing names

---

## 14. Daily Challenge Design

The daily challenge should consist of five target years.

The challenge should be deterministic.

For a given date:

```text
same date
    ↓
same seed
    ↓
same five target years
```

Everyone therefore plays the same challenge.

---

## 15. Target-Year Generation

Do not choose five uniformly random years between 2000 BC and today.

That would make the game dominated by ancient history.

Use weighted historical bands.

Possible conceptual starting distribution:

- Ancient: 5%
- Medieval: 10%
- 1500–1799: 15%
- 1800–1899: 15%
- 1900–1949: 20%
- 1950–1999: 25%
- 2000–present: 10%

These percentages are starting points for tuning, not requirements.

The final distribution should be tested through simulated challenges.

---

## 16. Challenge Quality Rules

A generated five-hole challenge should be rejected and regenerated if it is poor.

Potential rules:

- avoid five target years within a very narrow range
- avoid five extremely obscure historical periods
- avoid repetitive target years
- avoid an excessive concentration in one century
- ensure some chronological variety
- occasionally include an unusual/interesting target
- avoid making every hole trivially solvable by the same obvious anchor

The challenge generator should have a scoring function so its quality can be evaluated.

---

## 17. Daily Challenge and Event Reuse

The used-event rule applies within one player's five-hole round.

An event can be used once per round.

It can absolutely appear as an option in future daily challenges.

The challenge generator does not need to remove events globally.

---

## 18. Finding Better Alternatives

For every selected event:

```text
distance = abs(targetYear - eventYear)
```

Compute this for every other available event.

Sort ascending.

Return the two closest unused alternatives.

For example:

```text
target = 1900

event A = 1945 → 45
event B = 1895 → 5
event C = 1903 → 3
event D = 1906 → 6
```

The best alternatives are:

1. 1903 → 3
2. 1895 → 5

If the player's own choice is already the best possible event, say so.

---

## 19. Near-Miss Education

Do not only show the mathematically optimal event.

The reveal should preferably show one or two events that make the historical neighborhood interesting.

For example, if the target is 1900, it may be educational to show:

- 1895
- 1903

rather than two events both clustered on one side.

The final selection logic can combine mathematical closeness with educational value.

The engine should keep these concerns separate:

1. exact score
2. candidate ranking
3. educational presentation

---

## 20. Future Dataset Growth

The initial release should support 250–500 events without a database.

Design the schema and loader so that adding another JSON file is easy.

Possible future organization:

```text
data/
  events-india.json
  events-world.json
  events-science.json
  events-culture.json
```

The application can combine them at build time or runtime.

Do not prematurely split the files if a single well-organized JSON file is simpler.

---

## 21. Content Creation Workflow

A practical content pipeline:

1. Start with the existing 250 events.
2. Normalize names and dates.
3. Assign categories and regions.
4. Assign difficulty.
5. Assign importance.
6. Add aliases.
7. Remove duplicates.
8. Identify chronological gaps.
9. Add high-value events to fill those gaps.
10. Test simulated daily challenges.
11. Review challenges manually.
12. Expand toward 500 events.

The goal is not simply "more events."

The goal is **better historical gameplay**.
