# Quando Historical Golf — Technical Rewrite & Implementation Plan

## 1. Rewrite Strategy

Do not port the existing application line-by-line.

The existing application is an important reference for understanding the original rules and behavior, but it was built as a basic HTML/JavaScript/DOM application and should not dictate the new architecture.

Treat this as a **clean rewrite that preserves the game concept and validated rules**.

Before implementation, inspect the existing application and document:

- existing event data
- scoring behavior
- target generation
- UI behavior
- special cases
- bugs or accidental behavior that should not be preserved

Do not make architectural decisions based solely on how the old DOM implementation happens to work.

---

## 2. Recommended Stack

### Frontend

- Vue 3
- Vite
- TypeScript
- Tailwind CSS
- Vue Composition API

Use TypeScript even though the original project used JavaScript. The event model and game state are structured enough that type safety will be valuable.

### Deployment

- Vercel
- Static/client-side application initially

### Data

- Static JSON
- No database for the initial release

500 historical events is a tiny dataset. Client-side loading and fuzzy searching should be more than adequate.

### Persistence

Use browser local storage initially for:

- today's completion state
- answers
- scores
- previous scores
- streak
- best score

Do not introduce authentication or a backend unless a later product requirement requires it.

---

## 3. Separation of Concerns

The most important architectural principle is:

**The game engine must not depend on Vue or the DOM.**

Recommended structure:

```text
src/
  components/
  views/
  composables/
  engine/
  data/
  services/
  types/
  utils/
```

Conceptually:

```text
Historical Data
      |
      v
Game Engine <---- Daily Challenge Generator
      |
      v
Vue UI
      |
      v
Local Persistence / Sharing
```

The engine should be testable without rendering a browser component.

---

## 4. Game Engine Responsibilities

Create a clean game-engine module responsible for:

- creating a game
- generating/loading the daily challenge
- tracking the current hole
- tracking used events
- validating event selection
- calculating hole penalties
- calculating cumulative score
- finding better alternatives
- determining score status
- determining whether the game is complete

Core calculation:

```text
penalty = Math.abs(targetYear - event.year)
```

Do not put this calculation into a Vue component.

---

## 5. Game State

A possible game state:

```text
GameState
  challengeId
  challengeDate
  targetYears[]
  currentHole
  selectedEvents[]
  holeResults[]
  totalScore
  completed
```

A hole result should contain enough information to reconstruct the reveal screen without recalculating historical facts.

For example:

```text
HoleResult
  targetYear
  eventId
  eventYear
  penalty
  betterAlternatives[]
```

---

## 6. Event Model

Use a stable ID for every event.

Suggested shape:

```text
Event
  id
  name
  year
  categories[]
  region[]
  aliases[]
  description
  difficulty
  importance
```

Not every field needs to be shown in the game.

The event year is hidden during selection and revealed after the guess.

The event database should be treated as content, not application logic.

---

## 7. Search

Use client-side fuzzy search.

The search system should search:

- canonical name
- aliases
- possibly keywords

but should **never search or expose the year as a player-facing result**.

Search should be fast enough to feel instantaneous.

Consider a lightweight established fuzzy-search library rather than implementing a sophisticated fuzzy algorithm from scratch.

The result ordering should favor:

1. exact prefix matches
2. close textual matches
3. canonical name matches
4. aliases

---

## 8. Category Discovery

Categories should be metadata attached to events.

The UI can filter by category/region before searching.

Example:

```text
India
Europe
Asia
World
Science
Politics
War
Arts
Culture
Technology
```

Category filtering must never leak chronological information.

Avoid labels such as:

- Ancient India
- Medieval Europe
- 20th Century
- Modern Science

unless the product deliberately wants to give chronological hints.

The first version should keep categories primarily geographic or topical.

---

## 9. Better-Alternative Algorithm

After the player chooses an event, calculate the distance for every other **unused** event:

```text
distance = Math.abs(targetYear - event.year)
```

Exclude the selected event.

Sort ascending by distance.

Return the best one or two alternatives.

Ideally, the UI should show strong candidates from both sides of the target when the data supports it.

For example, if target = 1900:

- 1895 → 5
- 1903 → 3
- 1906 → 6

The best candidates are:

1. 1903 → 3
2. 1895 → 5

If the player's own choice is already the best possible event, show an appropriate positive message instead of saying they could have done better.

---

## 10. Used Event Enforcement

The engine must maintain a set of used event IDs.

When a player selects an event:

1. Validate that it exists.
2. Validate that it has not already been used.
3. Record the event.
4. Calculate the result.
5. Mark it unavailable for future holes.

Do not rely only on disabled buttons in the UI.

---

## 11. Daily Challenge Generation

All players should receive the same challenge for a given date.

Prefer a deterministic seeded generator over generating random targets independently in each browser.

Conceptually:

```text
seed = date
targets = deterministicRandom(seed)
```

The generator should:

- generate five target years
- respect the historical range
- weight targets toward recent history
- avoid excessive clustering
- produce interesting historical targets
- be deterministic

An alternative is a static `daily-challenges.json` file. Either approach is acceptable.

The architecture should allow the source of challenges to change without changing the game engine.

---

## 12. Historical Range

The game should support dates approximately from:

**2000 BC through the present**

Internally, use a consistent numeric representation.

For example:

- 2000 BC → -2000
- 500 BC → -500
- 1 AD → 1
- 1900 → 1900

Be careful around the transition between BCE and CE. The initial product can avoid claiming astronomical-year precision if it is not needed.

The historical data should use a documented convention consistently.

---

## 13. Year Distribution

A completely uniform random year across 2000 BC–2026 would produce an uninteresting game dominated by ancient dates.

Use a weighted distribution.

Possible conceptual bands:

- Ancient: low probability
- Medieval: moderate probability
- Early modern: moderate probability
- 1800–present: high probability

The exact distribution should be configurable rather than hard-coded throughout the application.

This lets the game be tuned after observing actual play.

---

## 14. Mobile-First UI

Design for phones first.

Do not build a desktop interface and then make it responsive.

The primary target should be a modern phone viewport around 390 × 844.

Important principles:

- large touch targets
- minimal typing
- large target year
- clear current-hole indicator
- one-handed operation where practical
- bottom-sheet or full-screen event browser when useful
- readable typography
- no tiny desktop controls
- fast transitions
- accessible contrast

The game should feel like a phone game even though it is initially a web application.

---

## 15. Suggested Vue Component Structure

```text
App
 └── DailyChallengeView
      ├── GameHeader
      ├── HoleProgress
      ├── TargetYear
      ├── EventFinder
      │    ├── EventSearchInput
      │    ├── CategoryFilters
      │    ├── BrowseEvents
      │    └── EventResults
      ├── SelectedEvent
      ├── AnswerReveal
      │    ├── ScoreReveal
      │    ├── TimelineDistance
      │    └── BetterAlternatives
      └── FinalScoreView
           ├── ScoreSummary
           ├── HoleResults
           └── ShareScore
```

These are suggestions, not rigid requirements. The agent should optimize the structure based on the actual implementation.

---

## 16. Local Persistence

Store completed challenges locally.

A player reopening the application on the same day should see the state of their current challenge rather than being given a new game.

Persist:

- challenge ID/date
- selected events
- hole results
- total score
- completion state

Optionally persist:

- streak
- best score
- recent scores

Do not require an account for this.

---

## 17. Sharing

Generate a spoiler-free share representation.

Example:

```text
QUANDO
Daily Challenge
Score: 73
6 / 4 / 21 / 2 / 40
```

Use the Web Share API where supported and provide clipboard fallback.

Do not expose answers or target years in the shared text.

---

# Implementation Phases

## Phase 0 — Reconnaissance

Before coding:

- inspect the old application
- inspect all historical event data
- identify existing rules
- identify existing scoring behavior
- identify existing edge cases
- document discrepancies between intended and actual behavior

Deliverable: `LEGACY_BEHAVIOR.md`

Do not rewrite anything yet.

---

## Phase 1 — Project Foundation

Create the new Vue/Vite/TypeScript project.

Set up:

- Tailwind
- linting
- formatting
- testing
- basic project structure
- Vercel-ready build

Deliverable: empty application that builds and deploys.

---

## Phase 2 — Data Model

Create the clean event JSON schema.

Import/clean the old events.

Add stable IDs.

Validate:

- unique IDs
- valid years
- nonempty names
- valid categories
- no accidental date leakage in player-facing names

Deliverable: validated event dataset.

---

## Phase 3 — Game Engine

Implement the game engine without Vue dependencies.

Implement:

- challenge creation
- target generation
- event selection
- used-event enforcement
- scoring
- alternatives
- cumulative score
- completion

Write unit tests for every rule.

Deliverable: tested game engine.

---

## Phase 4 — Basic Game UI

Build:

- daily challenge screen
- target year
- event search
- event selection
- five-hole navigation
- score display

Do not over-polish yet.

Deliverable: complete playable game.

---

## Phase 5 — Discovery UX

Improve event discovery with:

- fuzzy search
- aliases
- category filters
- browse mode
- alphabetical browsing
- recently used/available state

Deliverable: event selection feels fast even with 500 events.

---

## Phase 6 — Educational Reveal

Build the reveal experience.

Show:

- selected event
- actual year
- penalty
- cumulative score
- better alternatives
- before/after timeline visualization where useful

This phase should receive significant UX attention.

---

## Phase 7 — Daily Challenge System

Implement deterministic daily challenges.

Add:

- challenge date
- challenge ID
- seeded generation
- historical weighting
- repeatable challenge

Verify that two different browsers receive the same challenge for the same date.

---

## Phase 8 — Persistence and Results

Implement local persistence.

Add:

- resume today's challenge
- completed challenge
- final results
- history
- streak
- personal best

---

## Phase 9 — Sharing

Implement:

- share button
- Web Share API
- clipboard fallback
- spoiler-free score format

---

## Phase 10 — Polish

Focus on:

- mobile UX
- accessibility
- typography
- animations
- transitions
- loading behavior
- empty states
- error handling
- keyboard support
- performance

---

## Phase 11 — Production

Deploy to Vercel.

Test:

- iPhone Safari
- Android Chrome
- desktop Chrome
- desktop Safari
- slow mobile connection
- repeated daily challenge access
- local persistence
- sharing

Do not add unnecessary backend infrastructure.

---

## Important Non-Goals

Do not add these during the initial rewrite unless explicitly requested:

- user accounts
- social network/friends system
- database
- server-side scoring
- complex authentication
- native mobile application
- elaborate animations
- leaderboards requiring a backend
- CMS for event editing

Keep the first version fast, static, deterministic, and maintainable.

The architecture should leave room for these later.
