# DateRoll

## Product Concept & Initial Development Brief

**Working name:** DateRoll
**Product family:** DateGolf / DatePick  
**Status:** Concept and initial development brief

---

# 1. Overview

DateRoll is a third experience within the DateGolf / DatePick ecosystem.

The idea is to create a continuous, interactive timeline of human history, spanning approximately 3000 BC to the present.

Unlike traditional historical timelines, which typically focus on a particular period, civilization, or subject, DateRoll brings everything together into one continuous chronological experience.

Users can scroll horizontally through history, zoom in and out, explore different geographical regions and civilizations, filter by historical categories, and discover what was happening in different parts of the world at any given time.

The experience should serve two purposes:

1. An educational exploration tool that helps students develop a better understanding of history and chronology.
2. A foundation for additional chronological games that build on the existing DateGolf and DatePick concepts.

The underlying philosophy is simple:

**History is one continuous story. DateRoll lets students explore that story from different perspectives.**

# 2. Core Visualization: One Continuous Timeline

Imagine a timeline extending from approximately 3000 BC to 2026 AD.

Every individual historical event in the existing event database is represented as a marker on this timeline.

Historical entities and periods that span multiple years are represented as horizontal duration bars.

The timeline is not intended to display all events simultaneously. Instead, users interact with a viewport into the larger timeline.

The user can:
- Scroll left and right to move through history.
- Zoom in to see more detail.
- Zoom out to see broader historical periods.
- Select geographical regions and civilizations.
- Filter events by category.
- Show or hide individual lanes.
- Explore individual events and historical durations.

Think of Google Maps, but instead of geographical space, the user navigates through time.

## 2.1 The Viewport

The timeline should occupy a defined viewport rather than attempting to display the entire 5,000-year history at once.

The viewport determines how much history is currently visible.

Illustrative zoom levels:

| Zoom Level    | Approximate Visible Period |
| ------------- | -------------------------: |
| Very wide     |                2,000 years |
| Wide          |                  500 years |
| Default       |                  100 years |
| Closer        |                   50 years |
| Detailed      |                   10 years |
| Very detailed |             1 year or less |

These are illustrative ranges, not fixed requirements.

The user should be able to:
- Scroll horizontally using a scrollbar, trackpad, mouse, or touch gestures.
- Zoom in and out using intuitive controls.
- Navigate to a particular year or period.
- Maintain their current position while zooming.

The horizontal axis should represent actual chronological time.

One year should always occupy the same horizontal distance at a given zoom level. Avoid nonlinear time compression that could give students a misleading impression of the relative spacing between events.

## 2.2 Initial View

On first opening DateRoll, the user should see a relatively uncluttered historical overview.

Rather than displaying every event, initially show perhaps 10–20 major anchor events spanning the entire timeline.

Examples:

- 3000 BC – Early Egyptian civilization
- 2600 BC – Construction of the Great Pyramid of Giza
- 563 BC – Traditional birth date of Gautama Buddha
- 551 BC – Traditional birth date of Confucius
- 27 BC – Establishment of the Roman Empire
- 622 AD – Hijra
- 1206 – Establishment of the Delhi Sultanate
- 1453 – Fall of Constantinople
- 1492 – Columbus reaches the Americas
- 1776 – American Declaration of Independence
- 1789 – French Revolution
- 1914 – Beginning of World War I
- 1945 – End of World War II
- 1969 – Apollo 11 Moon landing
- 1989 – Fall of the Berlin Wall

These are illustrative examples. The final selection should be based on the existing event database.

As the user zooms in, additional events progressively become visible.

**Important principle: Zooming should reveal additional historical information, not simply enlarge existing markers.**

Event visibility should be determined by a combination of:
- Current zoom level.
- Event importance.
- Event density.
- Available screen space.

The objective is to avoid overwhelming users with hundreds of markers simultaneously.

# 3. Multiple Lanes

The timeline should be organized into horizontal lanes.

Each lane represents a geographical region, civilization, or historical grouping.

This is one of the most important aspects of the visualization.

## 3.1 Default Geographical Lanes

Possible initial lanes:

| Lane        | Coverage                                              |
| ----------- | ----------------------------------------------------- |
| South Asia  | Indian subcontinent and surrounding regions           |
| East Asia   | China, Japan, Korea                                   |
| Europe      | Ancient Greece, Roman Empire, European history        |
| Middle East | Mesopotamia, Persia, Ottoman Empire, etc.             |
| Africa      | Egypt and other African civilizations                 |
| Americas    | Maya, Aztec, Inca, United States, etc.                |
| Global      | Events affecting multiple regions or humanity broadly |

These should be treated as configurable defaults rather than rigid categories.

## 3.2 Dynamic Lanes

Users should be able to customize which lanes are visible.

For example, a user might initially see:

- South Asia
- East Asia
- Europe

They could then replace the broad Europe lane with more specific lanes:

- Ancient Greece
- Roman Empire
- Byzantine Empire

Similarly, South Asia could be expanded into:

- Indus Valley Civilization
- Maurya Empire
- Gupta Empire
- Mughal Empire

Users should be able to:
- Add lanes.
- Remove lanes.
- Expand a geographical lane into more specific civilizations.
- Reorder lanes.
- Collapse lanes.
- Restore the default arrangement.

The number of visible lanes should be manageable. The interface should not require users to display every civilization simultaneously.

## 3.3 Geography Versus Civilization

These are two different concepts and should remain separate in the data model.

Geographical regions are relatively stable.

Civilizations, dynasties, kingdoms, and empires emerge and disappear over time.

An event may belong to:
- One or more geographical regions.
- One or more civilizations.
- One or more historical groupings.

This distinction should be reflected in the database and filtering architecture.

## 3.4 Global Events

Some events affect multiple regions or humanity broadly.

Examples include:
- World Wars.
- Major pandemics.
- Industrial Revolution.
- Invention of the printing press.
- Moon landing.

These should have a Global classification.

Avoid artificially assigning such events to a single geographical lane.

# 4. Two Types of Historical Information

DateRoll should combine two fundamentally different types of historical information.

## 4.1 Individual Events

Events are things that happened at a particular point in time.

Examples:
- Fall of Constantinople.
- Birth of Buddha.
- French Revolution.
- Discovery of penicillin.
- Moon landing.

Represent these as markers on the timeline.

Clicking a marker should open an event information card containing:

- Event name.
- Date or date range.
- Description.
- Historical category.
- Geographical region.
- Associated civilization.
- Importance.
- Image, where available.

## 4.2 Historical Durations

Some historical entities exist over extended periods.

Examples:
- Roman Empire.
- Byzantine Empire.
- Gupta Empire.
- Delhi Sultanate.
- Mughal Empire.
- Ming Dynasty.
- Renaissance.

These should be represented as horizontal duration bars, similar to Gantt charts.

For example:

| Entity           |  Start |                     End |
| ---------------- | -----: | ----------------------: |
| Roman Republic   | 509 BC |                   27 BC |
| Roman Empire     |  27 BC | 476 AD (Western Empire) |
| Gupta Empire     | 320 AD |                  550 AD |
| Byzantine Empire | 330 AD |                 1453 AD |
| Delhi Sultanate  |   1206 |                    1526 |
| Mughal Empire    |   1526 |                    1857 |

These bars should be positioned chronologically within the appropriate lanes.

Clicking a duration bar should display:
- Name.
- Start and end dates.
- Description.
- Geographical region.
- Historical classification.
- Important associated events.

Where historical dates are approximate or disputed, the data model should support approximate dates and uncertainty.

For example, the beginning of a civilization may not have a universally agreed-upon year.

## 4.3 Events and Durations Should Coexist

The visualization should combine event markers and duration bars.

For example, while viewing 1500–1600, a user might see:

- Mughal Empire as a duration bar.
- Ottoman Empire as a duration bar.
- Ming Dynasty as a duration bar.
- Renaissance-related events as individual markers.
- Protestant Reformation as an event or duration, depending on the underlying data.

This allows students to understand both individual historical developments and the longer-running contexts in which they occurred.

# 5. Historical Categories and Filtering

Users should be able to filter events by historical category.

Possible categories:

| Category              | Examples                                                |
| --------------------- | ------------------------------------------------------- |
| Political             | Empires, kingdoms, independence                         |
| Military              | Battles, invasions, wars                                |
| Religion              | Founding of religions, religious movements              |
| Science               | Discoveries, scientific breakthroughs                   |
| Technology            | Inventions, industrial revolutions                      |
| Culture & Arts        | Literature, music, architecture                         |
| Exploration           | Voyages, discoveries, expeditions                       |
| Philosophy            | Philosophers, schools of thought                        |
| Economics             | Trade routes, economic developments                     |
| Society               | Social movements, reforms                               |
| Cities & Civilization | Founding of cities, emergence of civilizations          |
| People                | Births and deaths of historically important individuals |

Important considerations:

1. An event can belong to multiple categories.
2. Categories should be independently selectable.
3. Filtering should update the timeline dynamically.
4. Geographical filtering and category filtering should work together.

Examples:

- Show only scientific discoveries worldwide.
- Show only political events in India.
- Show religious developments in India and China.
- Show military history in Europe.
- Show technology developments between 1500 and 1900.

The goal is to allow students to construct their own historical perspective without requiring separate timelines or databases.

# 6. Zoom and Progressive Disclosure

Zooming is a central feature, not merely a navigation convenience.

At a wide zoom level, only major historical milestones should be visible.

As users zoom in, progressively more detailed events should appear.

For example:

**Wide view: 1000 BC – 1000 AD**

Only major civilizations and anchor events are visible.

**Closer view: 300 BC – 100 AD**

More detailed events relating to the Maurya Empire, Roman Republic, Han Dynasty, and other civilizations become visible.

**Detailed view: 300 BC – 250 BC**

Individual events, people, developments, and historical milestones become visible.

This should be driven by event importance and appropriate visibility thresholds.

Consider the following event visibility model:

| Importance    | Visibility                    |
| ------------- | ----------------------------- |
| 5 – Very high | Visible at wide zoom          |
| 4 – High      | Visible at medium zoom        |
| 3 – Moderate  | Visible at closer zoom        |
| 2 – Lower     | Visible at detailed zoom      |
| 1 – Minor     | Visible at very detailed zoom |

The actual scale can be adjusted to suit the existing database.

The same principle should apply to duration bars.

At wide zoom, major empires and civilizations should be visible. More specific historical periods can appear as users zoom in.

# 7. Additional Exploration Features

These features are not necessarily part of the first implementation, but the architecture should accommodate them.

## 7.1 What Was Happening Elsewhere?

A particularly valuable educational feature.

Suppose a student clicks on:

1206 – Establishment of the Delhi Sultanate.

The application could show what else was happening around the world during approximately the same period.

For example:
- What was happening in China?
- What was happening in Europe?
- Which major empires existed?
- What scientific or technological developments were taking place?

This teaches students to understand history in a global context.

The goal is not simply to show the history of India, but to understand India's place within world history.

## 7.2 Select a Period

Users should eventually be able to select a date range by dragging across the timeline.

For example, select 1526–1707.

The application could present a summary of:

- Major developments in India.
- Major developments in China.
- Major developments in Europe.
- Important scientific discoveries.
- Major political and military events.
- Empires and civilizations existing during that period.

This could become a useful educational summary of any selected historical period.

## 7.3 Historical Density

Consider a subtle histogram or density indicator showing how many events exist in different periods.

This could help users understand:
- Which periods have many recorded events.
- Which periods have fewer documented events.
- How the density of the existing event database changes over time.

This should be a secondary visualization and should not compete with the main timeline.

# 8. Gaming Possibilities

DateRoll should be designed as an exploration experience, but it also provides an excellent foundation for new chronological games.

The games should reuse the existing event and duration databases.

## Game 1: What's Missing?

Display three chronologically ordered events.

Hide the middle event.

Ask the player to identify the missing event.

Example:

- 1492 – Columbus reaches the Americas.
- ??? – Missing event.
- 1517 – Martin Luther initiates the Reformation.

Present multiple-choice answers.

Difficulty can be adjusted by varying:
- The chronological distance between events.
- The similarity of possible answers.
- The importance of the missing event.

## Game 2: What's Happening Elsewhere?

Display one major historical event.

Ask the player to identify what else was happening around the world during approximately the same period.

Example:

1206 – Establishment of the Delhi Sultanate.

Possible answers could include events from China, Europe, Africa, and the Middle East.

This tests historical context rather than simple date memorization.

## Game 3: Put Them in Order

Display three or more events from different geographical regions.

Ask the player to arrange them chronologically.

This builds directly on the DatePick concept.

The timeline itself could become the playing surface.

## Game 4: Find the Duration

Display a historical duration bar without its name.

Ask the player to identify the empire, dynasty, or civilization.

Alternatively, display the name and ask the player to estimate its start and end dates.

## Game 5: Which Came First?

Display two historical events.

Ask the player to identify which occurred first.

The difficulty can be adjusted by choosing events that happened very close together.

## Gaming Architecture

The games should be treated as separate experiences that consume the same historical data.

Avoid embedding game-specific historical knowledge into the timeline visualization.

The same events and durations should be reusable across all three DateGolf / DatePick / DateRoll experiences.

# 9. Underlying Data Architecture

An important existing advantage is that DateGolf / DatePick already use a shared event database.

There is also an existing durations database containing historical entities and their start/end dates.

**Do not create a separate historical database for DateRoll.**

The new experience should consume and visualize the existing data.

Before implementation, inspect the existing codebase and understand the actual database structures.

## 9.1 Event Database

The existing event database should remain the authoritative source for individual historical events.

Potential fields include:

- ID
- Event name
- Year/date
- Description
- Categories
- Geographical region
- Associated civilizations
- Importance
- Aliases
- Difficulty

The actual existing schema should be preserved wherever possible.

## 9.2 Durations Database

The existing durations database should remain the authoritative source for historical entities spanning multiple years.

Potential fields include:

- ID
- Entity name
- Start year
- End year
- Description
- Geographical region
- Civilization
- Historical category
- Importance

Again, inspect the actual existing schema before making changes.

## 9.3 Potential Schema Enhancements

DateRoll may require additional metadata.

Potential additions:

- Multiple geographical regions per event.
- Multiple associated civilizations.
- Event importance or visibility threshold.
- Approximate date indicator.
- Date uncertainty.
- Event type.
- Historical entity relationships.
- Duration classification.

These should be introduced only where necessary.

Avoid unnecessary duplication of information already present in the databases.

# 10. Proposed Interface Structure

The following is a conceptual layout, not a finalized visual design.

## Main Timeline Screen

**Top toolbar**
- DateRoll title.
- Search events.
- Jump to year.
- Zoom controls.
- Reset view.

**Filter panel**
- Geographical regions.
- Civilizations.
- Historical categories.
- Event importance.
- Show/hide durations.

**Main timeline viewport**
- Horizontal time axis.
- Multiple horizontal lanes.
- Event markers.
- Duration bars.
- Horizontal scrolling.
- Zooming.

**Event information panel**
- Opens when an event or duration is selected.
- Displays historical information.
- Provides links to related events.
- Allows navigation to the surrounding period.

The main timeline should receive the majority of the screen space.

Avoid making the filter panel or event details panel unnecessarily large.

## Interaction Principles

1. Scrolling should feel smooth and natural.
2. Zooming should preserve the user's approximate chronological focus.
3. Events should be easy to select.
4. Overlapping events should not become impossible to interact with.
5. Duration bars should remain visually distinguishable from individual events.
6. Filters should update the visualization without requiring a page reload.
7. The interface should work on desktop, tablet, and mobile, with appropriate interaction adaptations.

# 11. Technical and Development Considerations

Before implementing anything, inspect the existing DateGolf / DatePick application.

Understand:
- Current technology stack.
- Existing event database.
- Existing durations database.
- Existing date-handling conventions.
- Existing UI components.
- Current routing and application structure.
- Existing game architecture.

Do not assume the examples in this document represent the actual database schema.

## Visualization Requirements

The timeline implementation should support:

- A genuinely continuous chronological axis.
- Horizontal scrolling.
- Zooming.
- Multiple lanes.
- Individual event markers.
- Duration bars.
- Dynamic event visibility.
- Multiple simultaneous filters.
- Selection and information panels.

Pay particular attention to performance when rendering large numbers of events and duration bars.

Consider techniques such as:
- Rendering only visible events.
- Progressive loading or visibility filtering.
- Canvas or SVG rendering, depending on the requirements.
- Separating data retrieval from visualization.
- Efficiently handling zoom and scroll events.

The choice of visualization technology should be based on the existing application architecture.

Do not introduce a large new dependency without a good reason.

## Date Handling

Historical dates need special attention.

The system should correctly handle:
- BC/BCE dates.
- AD/CE dates.
- Negative years, if used internally.
- The absence of year zero in historical dating conventions.
- Approximate dates.
- Date ranges.
- Historical date uncertainty.

Do not assume that ordinary JavaScript Date objects are sufficient for the entire historical range.

A consistent internal chronological representation should be established.

# 12. Suggested Implementation Phases

The development should proceed incrementally.

## Phase 1: Inspect and Understand

- Inspect the existing application.
- Examine the event database.
- Examine the durations database.
- Identify any schema gaps.
- Understand existing date conventions.
- Propose the implementation architecture.

Do not modify the existing databases unnecessarily.

## Phase 2: Basic Timeline

Build a working timeline with:

- A horizontal chronological axis.
- A fixed viewport.
- Horizontal scrolling.
- Zooming.
- Event markers.
- Basic event information cards.

Use the existing event database.

Initially, display only major anchor events.

## Phase 3: Duration Bars

Integrate the existing durations database.

Display historical entities as horizontal bars.

Allow users to select a duration and view its details.

Ensure events and durations can coexist in the same timeline.

## Phase 4: Multiple Lanes

Introduce geographical lanes.

Allow users to:
- Show and hide lanes.
- Add and remove lanes.
- Reorder lanes.
- Expand geographical regions into civilizations.

## Phase 5: Filters and Progressive Detail

Introduce:
- Category filters.
- Geographical filters.
- Civilization filters.
- Importance-based visibility.
- Progressive event disclosure as users zoom in.

## Phase 6: Exploration Features

Introduce:
- What was happening elsewhere?
- Period selection.
- Related events.
- Historical summaries.
- Historical density visualization.

## Phase 7: Gaming

Explore the additional games described in Section 8.

These should reuse the existing historical data and the new timeline capabilities.

# 13. Design Philosophy

A few principles should guide the implementation.

**1. Chronology first.**

The horizontal positioning of events must accurately represent their chronological relationships.

**2. Progressive discovery.**

Do not overwhelm users with too much information. Let them discover history as they zoom in.

**3. Global perspective.**

Avoid presenting history as a collection of isolated national timelines. Help students understand what was happening across the world simultaneously.

**4. Reuse existing knowledge.**

DateGolf, DatePick, and DateRoll should share the same underlying historical data.

**5. Exploration over presentation.**

The student should be able to interact with history, change perspectives, and discover connections rather than simply read a static timeline.

**6. Keep the interface approachable.**

Although the underlying data and visualization may be sophisticated, the experience should be intuitive enough for a middle-school student to explore independently.

# 14. Initial Assignment to the Coding Agent

Start by examining the existing DateGolf / DatePick codebase and the two historical databases.

Do not immediately start implementing the entire feature.

First:

1. Understand the existing application architecture.
2. Inspect the event and duration schemas.
3. Identify how the existing dates are represented.
4. Determine what additional metadata, if any, is required.
5. Recommend an appropriate timeline rendering approach.
6. Propose a component-level architecture.
7. Identify potential technical challenges, particularly around BC dates, zooming, scrolling, and overlapping events.

Then propose a minimal working implementation for Phase 1 and Phase 2.

The first deliverable should be a functional prototype of DateRoll using the existing event database, with a continuous horizontal timeline, a scrollable viewport, zooming, and event markers.

Do not attempt to implement all the proposed games or exploration features in the first iteration.

The objective is to establish the core timeline experience correctly before building on it.
