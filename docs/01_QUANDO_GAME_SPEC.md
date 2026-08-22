# Quando Historical Golf — Game & Product Specification

## 1. Overview

Quando Historical Golf is a daily history game for students. It combines historical knowledge, estimation, discovery, and golf-style scoring.

The central question is:

> Given a year, can you choose a historical event that happened as close as possible to that year?

The player is **not shown the dates of the events while playing**.

A daily challenge consists of **five holes**. Each hole presents a target year. The player searches a historical event database and chooses one event. The score for that hole is the absolute difference between the target year and the event's actual year.

**Lower is better. A perfect answer scores 0.**

Example:

- Target year: 1900
- Player chooses: End of World War II
- Actual year: 1945
- Penalty: 45

If the player instead chose the San Francisco earthquake:

- Actual year: 1906
- Penalty: 6

The game should feel like golf rather than a conventional quiz: a close answer is a good shot, and the goal is to finish the five holes with the lowest possible total score.

---

## 2. Educational Philosophy

Every question should teach something, even when the player does not score well.

After every guess, Quando should reveal:

1. The player's selected event.
2. The event's actual year.
3. The player's distance/penalty.
4. One or two alternative events that were available and would have produced a better score.

For example:

> Target: 1900  
> Your answer: End of World War II — 1945  
> Penalty: 45 years
>
> You could have done better:
>
> San Francisco earthquake — 1906 — 6 years away  
> Wright brothers first flight — 1903 — 3 years away

The alternatives should include good candidates on either side of the target when available. An event from 1895 is just as good as one from 1905 because scoring uses **absolute distance**.

This educational reveal is one of the defining features of the product.

---

## 3. Daily Challenge

The primary product experience is a **Daily Challenge**.

Every day, all players receive the same five target years.

The challenge should be deterministic by date so that students can compare results with classmates.

A daily challenge might look like:

1. 1900
2. 1947
3. 1789
4. 1969
5. 1200

The exact targets should be generated from a deterministic seed or stored as an explicit daily challenge.

The distribution of possible years should span roughly **2000 BC to the present**, while being weighted toward more recent history.

The challenge should not simply generate five completely arbitrary years. It should produce interesting, playable targets and avoid pathological combinations.

---

## 4. Historical Event Database

The initial database is expected to contain roughly **250–500 events**.

This should remain static data rather than a database-backed system.

A JSON file, or a small collection of JSON files, is sufficient.

The player should never see an event's year while choosing an answer.

Events should have a canonical single year for scoring.

Duration-based historical phenomena can be represented by a specific milestone:

- End of World War II → 1945
- Start of World War II → 1939

Rather than representing a duration in the scoring engine.

The data can contain additional metadata such as:

- id
- name
- year
- categories
- region
- aliases
- description
- difficulty
- importance

Only the fields appropriate to the current UI should be exposed to the player.

---

## 5. Event Selection

The complete event database is available for every hole.

Because showing 500 events at once is unwieldy, the primary interaction is search.

The student can begin typing an event name, person, place, or keyword and receive fuzzy-search results.

Examples:

- `world` → World War I, World War II, etc.
- `christ` → relevant events involving Christ/Christian history
- `august` → Augustus-related events
- `rich` → matching events

Search should support aliases and alternate names where useful.

### Browse and Category Discovery

Search should not be the only way to discover events.

Provide category/region filters such as:

- All
- India
- Asia
- Europe
- Americas
- World
- Africa
- Science
- Politics
- War
- Culture
- Arts
- Technology

These are discovery aids only. They must not reveal dates.

A student can narrow 500 events to a smaller set, then search or browse alphabetically.

A browse mode should also be available for students who do not know what to type.

---

## 6. Events Can Only Be Used Once Per Round

Once a player selects an event, that event is unavailable for the remaining holes in the same five-hole challenge.

This is an intentional game mechanic.

It prevents players from repeatedly using the same historical anchor and adds strategy:

> "I know this event is around 1945, but should I save it for a later target?"

The game engine must enforce this rule, not merely the UI.

---

## 7. Hole Experience

Each hole should be visually simple.

A typical screen:

**HOLE 2 OF 5**

# 1900

> Which historical event happened closest to this year?

Then:

**Find an event**

`Search events...`

Category filters and/or browse options appear below.

The player selects an event and confirms.

The interface should be optimized for a phone held in one hand.

---

## 8. Scoring

For each hole:

`penalty = absolute(targetYear - eventYear)`

Examples:

- 1900 vs 1900 → 0
- 1900 vs 1906 → 6
- 1900 vs 1895 → 5
- 1900 vs 1945 → 45

The round score is:

`totalScore = sum(all five hole penalties)`

Lower is always better.

The UI should communicate the player's cumulative score throughout the round.

A configurable par/benchmark may be used for visual feedback, but the underlying score must remain the exact total number of years away.

---

## 9. Score Visualization

The game should have a simple golf metaphor.

The player should always know:

- current hole
- current penalty
- cumulative score
- holes completed
- holes remaining

Use a restrained three-state color system for score status:

- Green — comfortably good
- Orange — getting close to the benchmark
- Red — significantly above the benchmark

Do not make the colors the only indication of meaning; text and numbers must remain clear and accessible.

---

## 10. Hole Reveal

The reveal is a major part of the experience.

After a selection, show:

### Your Answer

Event name and actual year.

### Your Distance

A large number such as:

**45 years**

### Better Choices

One or two unused events that were available and would have scored better.

The game should ideally find the closest alternatives in both directions.

The reveal should feel informative and satisfying rather than punitive.

---

## 11. Final Score

After five holes, show a strong summary screen.

Example:

# DAILY SCORE

## 73

Five holes · 73 years total

Then show the five hole scores.

The player should be able to:

- review the five answers
- see the total
- see their best score if locally stored
- see a streak if implemented
- share the result

---

## 12. Social Sharing

Sharing should be spoiler-free.

A shared result could look like:

> QUANDO — Daily Challenge  
> 5 holes  
> Score: 73  
> 6 / 4 / 21 / 2 / 40  
> Can you beat me?

The shared result should not reveal the target years or correct answers.

The recipient should be able to open the daily challenge and play it themselves.

Accounts are not required for the initial version.

---

## 13. Product Personality

Quando should feel:

- intelligent
- playful
- educational
- fast
- slightly competitive
- visually clean
- modern
- appropriate for students
- easy enough to understand in seconds

It should not feel like:

- a school test
- a traditional trivia app
- a dense historical database
- a complicated strategy game

The key emotional loop is:

**Guess → Reveal → Learn → Improve → Next hole**
