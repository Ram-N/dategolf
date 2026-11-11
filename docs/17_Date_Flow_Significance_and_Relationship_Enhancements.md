# Date Flow: Historical Significance and Relationship Explanations

> **Status: built 2026-11-11.** Decisions made while building it:
> - **Relationship `explanation` = the existing link `why`** (`relationships.description`). All 225 links already had one, with `confidence`. No schema change; doc 15 now asks for the mechanism.
> - **Significance lives in `entity_significance`** (one row per event or span, `proposed` → `reviewed`), not in a plain column. It's interpretive prose, so only reviewed text is exported; editing a reviewed text makes it proposed again. A new draft's text is approved with its draft.
> - **UI:** a "Why it matters" block on event and span cards (after any guess, so years are allowed). Story threads show their "why" on hover and pick their stop on click; the Story panel stays the accessible, touch-friendly version.
> - **Not done (out of scope):** per-link sources, a `context` field, global vs regional significance levels.
> - Roadmap and counts: doc 14. Drafting rules: doc 15. Review: Dashboard → Review → Significance.

## Purpose

This document specifies two enhancements to Date Flow:

1.  **Historical significance:** Explain why an event or historical span
    matters.
2.  **Relationship explanations:** Explain why two events or entities
    are connected.

The goal is to make the timeline a stronger learning experience while
keeping the implementation focused and compatible with the existing
application.

------------------------------------------------------------------------

## 1. Historical significance: "Why does this matter?"

### Problem

An event card may explain what happened without explaining why the event
is historically important. For example, an entry about Akbar's ascension
to the Mughal throne tells students when he became emperor. A
significance explanation can connect that moment to his subsequent
reforms, expansion, religious policies, and the development of a durable
imperial structure.

The same applies to spans. A card describing the Mughal Empire should
explain its historical importance, not just its dates and boundaries.

### Data change

Add an optional `significance` field to both event and span records.

  Field            Question answered
  ---------------- ----------------------------------
  `description`    What happened?
  `significance`   Why does it matter historically?

A separate `context` field may be useful later, but it is not part of
this initial enhancement.

### Content guidance

Significance text should:

-   Explain consequences, influence, or broader historical importance.
-   Be concise and accessible to the intended student audience.
-   Add insight rather than repeat the description.
-   Avoid presenting complex historical developments as the result of
    one event alone.
-   Include regional or civilization-specific significance where
    appropriate, rather than assuming all significance is global.
-   Work for both individual events and long-running entities or
    periods.

For example, the significance of the Chernobyl disaster could explain
how it exposed weaknesses in Soviet governance and crisis response,
damaged public trust, and contributed to pressure for openness and
reform. It should not claim that Chernobyl alone caused the collapse of
the Soviet Union.

### Keep significance separate from importance

Do not conflate explanatory prose with an existing `importance` score.

-   **Importance** is structured metadata that may control display
    prominence, filtering, or progressive disclosure.
-   **Significance** is explanatory text that helps students understand
    why an item matters.

Preserve existing importance values and behavior.

### UI behavior

Add a clearly labeled **"Why it matters"** section to event and span
detail cards when significance is available.

-   Keep existing descriptions and card content intact.
-   Do not display an empty section when significance is missing.
-   Make the section visually distinct from the factual description.
-   Apply the same behavior to events and spans.

------------------------------------------------------------------------

## 2. Relationship explanations: "Why are these connected?"

### Problem

A relationship type or arrow may identify a connection without
explaining it. A link from the Chernobyl disaster to the collapse of the
Soviet Union becomes more useful when students can understand the
historical mechanism: Chernobyl exposed governance and institutional
weaknesses, undermined public trust, and contributed to pressure for
transparency and reform.

### Data change

Add an optional `explanation` field to relationship records (also called
edges or links). The explanation belongs to the relationship itself, not
to either endpoint entity.

Conceptually, a relationship contains:

  Field                 Purpose
  --------------------- --------------------------------------------------------
  `source_entity_id`    Entity at the start of the relationship
  `target_entity_id`    Entity at the end of the relationship
  `relationship_type`   Semantic type of connection
  `explanation`         Why this relationship exists
  `confidence`          Optional confidence or review indicator
  `sources`             References supporting the relationship and explanation

These names are illustrative. Reuse the application's existing field
names and structures wherever they already serve these purposes; do not
rename fields unnecessarily.

### Content guidance

Each explanation should:

-   State the nature of the connection in plain language.
-   Explain the historical mechanism or evidence behind the connection.
-   Be concise enough for a tooltip, ideally one or two sentences.
-   Distinguish direct causation from contributing factors, influence,
    chronology, or structural relationships.
-   Acknowledge uncertainty or historical debate when relevant.
-   Avoid inventing causal links simply because two events are close in
    time.

Example:

> The Chernobyl disaster exposed serious weaknesses in Soviet crisis
> management and information control. It damaged public trust and
> contributed to demands for greater openness and reform, adding to the
> pressures facing the Soviet system.

This describes Chernobyl as a contributing factor, not the sole cause of
the Soviet Union's collapse.

### Preserve semantic precision

Do not treat every relationship as causal. Relationship types should
retain distinct meanings:

-   `preceded` --- one event happened before another; this does not
    imply causation.
-   `part of` --- an entity belongs to a larger period, movement, or
    structure.
-   `influenced` --- one entity had an intellectual, cultural,
    political, or other influence on another.
-   `contributed to` --- one entity was a factor in a later development,
    among potentially many factors.
-   `caused` --- a stronger assertion of direct causation; use
    carefully.
-   `enabled` --- one development made another possible or easier.
-   `triggered` --- one event directly set a process or response in
    motion.

Reuse the existing relationship vocabulary where possible. Extend it
only when there is a clear need.

### UI behavior: progressive disclosure

Use a simple two-level interaction:

1.  **Hover over a relationship line or arrow:** Show a short tooltip
    with the relationship type and explanation.
2.  **Click the relationship:** Open an expanded relationship detail
    view or card.

The expanded view can include:

-   Source and target entities.
-   Relationship type.
-   Full explanation.
-   Supporting sources, when available.
-   Confidence or review information, when available.

On touch devices, where hover is unavailable, tapping the relationship
should expose the explanation. Make the interaction accessible;
explanations must not be available only through hover.

Do not make the initial implementation depend on a sophisticated graph
interface. If the current visualization library makes edge hover or
click difficult, implement the best interaction supported by the
existing UI and keep the data model ready for richer interaction later.

------------------------------------------------------------------------

## 3. Data and migration considerations

These changes should be additive and backward-compatible.

-   Existing events, spans, and relationships must continue to render
    when new fields are absent.
-   Treat `significance` and relationship `explanation` as optional
    initially.
-   Do not fabricate content to fill missing fields.
-   Preserve existing descriptions, importance values, relationship
    types, IDs, and source data.
-   If SQLite is the source of truth, add the fields to the appropriate
    entity and relationship tables.
-   Update import/export so the new fields survive round trips between
    SQLite and the frontend data format.
-   Update validation and data-quality checks to recognize the fields
    without requiring them for every legacy record.
-   Keep provenance and source references associated with the claims
    they support. Relationship explanations may express historical
    interpretations and should be traceable to sources where possible.

Do not turn these enhancements into a broad data-model redesign. Reuse
the existing entity and relationship architecture.

------------------------------------------------------------------------

## 4. Suggested implementation sequence

### Step 1 --- Inspect the existing model and UI

Identify:

-   How event and span records are represented.
-   How event and span detail cards are rendered.
-   How relationships are stored and displayed.
-   Whether relationship records already have notes, descriptions,
    confidence, or source fields.
-   How SQLite data is exported to the frontend.

Reuse existing structures wherever practical.

### Step 2 --- Implement historical significance

-   Add optional `significance` to event and span records.
-   Update the data pipeline and frontend types or schemas.
-   Display "Why it matters" when the field is populated.
-   Verify that legacy records without significance continue to work.

### Step 3 --- Implement relationship explanations

-   Add optional `explanation` to relationship records.
-   Preserve relationship type semantics.
-   Display the explanation on hover where supported.
-   Add a click/tap detail view if the existing UI can support it
    without disproportionate effort.
-   Verify that relationships without explanations continue to work.

### Step 4 --- Add validation and examples

Add or update checks for:

-   Empty or whitespace-only significance and explanation values.
-   References to nonexistent entities.
-   Missing or invalid relationship types.
-   Invalid source references, where sources are represented
    structurally.
-   Relationship explanations that are not attached to a valid
    relationship.

Use a few reviewed examples to test the feature:

-   Akbar's ascension to the Mughal throne --- event significance.
-   The Mughal Empire --- span significance.
-   Chernobyl disaster → collapse of the Soviet Union --- relationship
    explanation that describes a contributing influence rather than sole
    causation.

These examples are illustrative. Confirm the application's existing
records and IDs before modifying data.

------------------------------------------------------------------------

## 5. Acceptance criteria

### Historical significance

-   [ ] Events can store an optional `significance` value.
-   [ ] Spans can store an optional `significance` value.
-   [ ] Event and span cards display "Why it matters" when significance
    exists.
-   [ ] Cards remain clean when significance is absent.
-   [ ] Existing descriptions and importance behavior are unchanged.

### Relationship explanations

-   [ ] Relationships can store an optional `explanation` value.
-   [ ] The explanation is associated with the correct relationship, not
    merely with an endpoint entity.
-   [ ] Hovering over a relationship displays its type and short
    explanation where hover is supported.
-   [ ] Clicking or tapping a relationship can expose the fuller
    explanation where supported.
-   [ ] Touch users have a usable alternative to hover.
-   [ ] Relationships without explanations continue to work.
-   [ ] Relationship wording does not confuse chronology, influence, and
    causation.

### Data integrity

-   [ ] Existing data is preserved.
-   [ ] New fields survive the SQLite-to-frontend export process.
-   [ ] Missing optional fields do not break rendering.
-   [ ] No explanations are invented merely to populate the new fields.
-   [ ] Relevant sources and confidence metadata are preserved or
    supported by the data model.

------------------------------------------------------------------------

## 6. Out of scope for this iteration

Keep this work focused on the data model, data pipeline, and user-facing
presentation.

Do not expand the implementation into:

-   Automatically generating significance or relationship explanations
    with AI.
-   A full source-citation or historiography system.
-   A comprehensive rewrite of the knowledge graph.
-   New importance-scoring algorithms.
-   A general-purpose AI question-answering interface.

These may be valuable future capabilities, but should remain separate
follow-on work.

**Guiding principle:** Date Flow should help students understand not
only what happened, but why it mattered and how it connects to other
developments in history.


======

## Two enchancements - the original doc

 I think they address two different but complementary questions that Date Flow should answer:

1. **Why does this event matter?**
2. **Why are these two events connected?**

I would treat them as two distinct features in the data model.

## 1. Add a "Why It Matters" field to events and spans

Currently, the event card tells us what happened. It should also explain its historical significance.

For example:

**Event: Akbar ascends to the Mughal throne (1556)**

- **What happened:** Akbar became emperor following the death of his father, Humayun.
- **Why it matters:** Akbar transformed the Mughal Empire into one of the most powerful and influential states in South Asian history. His administrative reforms, military expansion, and policies of religious accommodation helped establish a durable imperial structure.

I would distinguish three pieces of information:

| Field          | Purpose                                      |
| -------------- | -------------------------------------------- |
| `description`  | What happened?                               |
| `significance` | Why does it matter historically?             |
| `context`      | What should I know to understand this event? |

**My recommendation:** Start with `significance` as a new field. Don't make the schema unnecessarily complicated. You can introduce `context` later if you find a real need for it.

One important point: significance is contextual. An event might be enormously important to Indian history but less consequential globally. Eventually, you might want global, regional, and national significance, but don't need to implement that immediately.

Also, this should apply to spans. For example, why does the Mughal Empire matter? What did it contribute, and what changed because of it?

## 2. Explain the relationships between events

I think this is potentially an even more powerful feature.

You already have typed relationships such as:

- Caused
- Influenced
- Contributed to
- Enabled
- Part of
- Preceded
- Contemporary with

But the relationship label alone doesn't explain the historical reasoning.

For example:

**Chernobyl disaster → Contributed to → Soviet Union's collapse**

Hovering over the connecting edge could display:

> The Chernobyl disaster exposed serious weaknesses in Soviet governance, including secrecy, bureaucratic dysfunction, and poor crisis management. The government's handling of the disaster undermined public trust and contributed to growing demands for transparency and reform. It was one factor among several that weakened the Soviet system.

I would introduce a field on the relationship itself:

| Field               | Purpose                                        |
| ------------------- | ---------------------------------------------- |
| `relationship_type` | Caused, influenced, part of, etc.              |
| `explanation`       | Why do we believe this relationship exists?    |
| `confidence`        | How firmly established is this interpretation? |
| `sources`           | What historical sources support it?            |

### A few implementation possibilities

**Option A — Simple tooltip**

Hover over an edge and display the explanation. Best for short explanations.

**Option B — Expandable relationship card**

Click the edge to display a small card with the relationship type, explanation, and sources. Better for longer explanations.

**Option C — Progressive disclosure (my preference)**

- Hover: show a one- or two-sentence explanation.
- Click: open a detailed relationship card.
- The card can include sources and related events.

This keeps the timeline uncluttered while allowing deeper exploration.

## 3. One important distinction

I would be careful not to imply that every relationship represents causation.

For example:

- A happened before B — chronological relationship.
- A was part of B — structural relationship.
- A influenced B — historical influence.
- A contributed to B — partial causation.
- A caused B — stronger causal assertion.

The explanation should make clear whether we're describing a direct cause, a contributing factor, or an interpretation debated by historians.

This is particularly important for students. We don't want Date Flow to teach simplistic cause-and-effect history.

## My overall recommendation

Implement these as two separate additions:

| Enhancement              | Where it belongs  | New field      |
| ------------------------ | ----------------- | -------------- |
| Why does this matter?    | Event/span entity | `significance` |
| Why are these connected? | Relationship/edge | `explanation`  |

Both should eventually support source attribution and confidence/review metadata.

**One additional idea:** These two features could become the foundation of a much richer learning experience. A student clicks an event, learns what happened and why it matters, then follows its connections to understand how history unfolded.

That is a meaningful step beyond simply displaying events on a timeline.


===

## Sample of Good Explanation for Connections


Here is a quick breakdown of how each connection functions:

* **Mongol Conquests enabled Marco Polo Travels to China:** The *Pax Mongolica* unified Eurasia under one empire, creating safe trade routes (the Silk Road) for European travelers like Polo.
* **Huns Arrive in Europe contributed to Fall of the Western Roman Empire:**  . Hunnic pressure pushed Germanic tribes like the Goths across Roman borders, triggering mass migrations and destabilizing the empire.
* **Vasco da Gama Opens Sea Route to India enabled Portuguese Arrive in Japan:**  Da Gama established the Indian Ocean maritime network, which Portuguese traders subsequently expanded east to Malacca and China, eventually reaching Japan.
* **Cuban Revolution contributed to Cuban Missile Crisis:**  . Fidel Castro overthrew Batista, aligned Cuba with the Soviet Union, and sought Soviet protection, leading directly to the deployment of nuclear missiles.
* **Yom Kippur War triggered Oil Crisis of the Middle East:**  . OPEC members declared an oil embargo against nations supporting Israel during the war, causing severe global economic fallout.
* **Iranian Revolution contributed to Iran-Iraq War Begins:**   Saddam Hussein viewed post-revolution Iran as vulnerable due to military purges, leading him to launch an invasion.
* **Assassination of President Kennedy contributed to US Civil Rights Act:**   President Lyndon B. Johnson used public grief and Kennedy's memory to build political momentum for passing the legislation.
* **Soviet-Afghan War contributed to Dissolution of the Soviet Union:**   The long, costly war drained economic resources, demoralized the military, and damaged the regime's legitimacy.
* **Berlin Wall Falls contributed to Dissolution of the Soviet Union:**   The fall of the wall symbolized the loss of Soviet control over Eastern Europe and accelerated political collapses across the bloc.
* **Chernobyl Nuclear Disaster contributed to Dissolution of the Soviet Union:**   The disaster strained Soviet finances, exposed systemic bureaucratic dysfunction, and galvanized opposition movement openness (*glasnost*).
* **World Wide Web Invented enabled Amazon Founded:**   The open architecture of the web created the foundation for e-commerce platforms to operate.
* **World Wide Web Invented enabled Google Founded:**   Google was created specifically to index and search the rapidly expanding network of web pages.
* **September Eleventh Attacks triggered War on Terror:**   The 9/11 attacks directly prompted the U.S. government to launch military campaigns and global counterterrorism strategies.