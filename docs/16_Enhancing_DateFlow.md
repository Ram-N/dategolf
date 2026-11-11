I think Date Flow has the potential to become something quite special. And I would approach this as more than a historical timeline. I'd aim for an **interactive visual encyclopedia of human history**, where students discover history rather than simply read about it.

There are three dimensions I'd like us to think about:
1. The visualization technology and what it can do.
2. The information architecture: how we classify, connect, and represent historical knowledge.
3. The visual experience: color, animation, zooming, discovery, and those memorable "wow" moments.

Let's explore each.

# 1. The technology: Should you move beyond Vite?

First, an important distinction: Vite is a development/build tool. It isn't the visualization engine.

Your AI coding agent should be able to tell you which visualization technology you're currently using by inspecting `package.json` and the source code.

Here are the technologies worth considering:

| Technology | What it offers                                              | My assessment                                 |
| ---------- | ----------------------------------------------------------- | --------------------------------------------- |
| SVG        | Crisp points, lines, labels, interactive elements           | Excellent for moderate-sized timelines        |
| D3.js      | Scales, axes, zooming, transitions, data visualization      | Very relevant                                 |
| Canvas     | Efficient rendering of thousands of elements                | Worth considering                             |
| PixiJS     | GPU-accelerated 2D graphics, particles, effects             | Interesting for wow moments                   |
| Three.js   | 3D environments, spatial visualization, lighting, animation | Potentially exciting, but perhaps unnecessary |
| WebGL      | GPU-powered rendering                                       | Useful for very dense visualizations          |

My initial recommendation:

**Don't jump to Three.js just because you want something visually stunning.**

I would investigate a combination of:
- D3.js for time scales, zooming, positioning, and transitions.
- Canvas or PixiJS for rendering thousands of points and visual effects.
- SVG and HTML for labels, annotations, and event cards.

This gives you performance without sacrificing readability.

Three.js becomes interesting if you want to introduce an entirely different visual dimension.

For example, imagine the timeline becoming a landscape through which students travel. But I'd consider that a separate design decision, not a prerequisite.

# 2. The information architecture: Eight dimensions of history

This is where I think you have a tremendous opportunity.

Currently, you have events and periods. But history is multidimensional. An event can be political, geographical, technological, cultural, economic, and scientific simultaneously.

I would consider giving every event and historical period a common taxonomy.

Here is my proposed starting point.

| Category                | What it captures                                              | Examples                     |
| ----------------------- | ------------------------------------------------------------- | ---------------------------- |
| Politics & Governance   | Kings, rulers, governments, constitutions, political systems  | Ashoka, Roman Republic       |
| Wars & Conflicts        | Battles, invasions, revolutions, independence movements       | Battle of Waterloo           |
| Science & Technology    | Discoveries, inventions, scientific breakthroughs             | Printing press, Newton       |
| Arts & Culture          | Literature, music, architecture, painting, philosophy         | Renaissance, Shakespeare     |
| Religion & Philosophy   | Religious movements, thinkers, schools of thought             | Buddhism, Confucius          |
| Economy & Trade         | Trade routes, economic systems, industrialization, currencies | Silk Road                    |
| Society & People        | Social movements, demographic changes, influential people     | Abolition of slavery         |
| Geography & Environment | Climate, natural disasters, exploration, geographic changes   | Volcanic eruptions, Ice Ages |

I would also introduce two additional dimensions that aren't quite categories.

**Geographic context**
- Continent
- Region
- Country or territory
- City or location
- Geographic coordinates, where meaningful

**Historical relationships**
- Preceded by
- Caused by
- Influenced by
- Contemporary with
- Part of
- Led to

This distinction is important.

An event shouldn't be forced into just one category. The French Revolution, for example, could belong to Politics, Society, Economy, and Wars & Conflicts.

Likewise, the Industrial Revolution belongs to Science & Technology, Economy, and Society.

Think of these as tags, not mutually exclusive classifications.

## An interesting possibility: Color represents category

Imagine that your timeline uses a consistent color system.

For example:

| Category                | Suggested color |
| ----------------------- | --------------- |
| Politics                | Blue            |
| Wars                    | Red             |
| Science & Technology    | Purple          |
| Arts & Culture          | Orange          |
| Religion & Philosophy   | Teal            |
| Economy & Trade         | Green           |
| Society                 | Pink            |
| Geography & Environment | Brown           |

Now imagine switching between different visual modes.

- **All history:** Everything appears, with colors representing categories.
- **Political history:** Political events become prominent; everything else fades.
- **Scientific history:** Scientific discoveries and inventions stand out.
- **Cultural history:** Art, literature, music, and philosophy become prominent.

This could be much more powerful than simply hiding and showing categories.

One caution: color should not be the only encoding. Use shapes, symbols, or patterns as supplementary cues, particularly for accessibility.

# 3. The really interesting part: Wow moments

This is where I'd spend considerable design effort.

You already have zooming. But zooming should do more than enlarge the timeline.

It should reveal a progressively richer understanding of history.

I would think about four levels.

### Level 1: The big picture (5,000 years)

At the most zoomed-out level, students see:

- Major civilizations
- Major empires
- Major religious movements
- Major technological transitions
- Major historical periods

Think of this as looking at the entire river from an airplane.

### Level 2: Civilizations and their contemporaries

As you zoom in, more details appear.

Imagine looking at 500 BCE.

You might see:

- Achaemenid Persian Empire
- Maurya Empire (beginning later)
- Greek city-states
- Zhou Dynasty
- Confucius
- Buddha

The interesting thing here is that students begin seeing what was happening elsewhere in the world at the same time.

**This is one of the most educational features Date Flow could offer.**

History is usually taught sequentially, often country by country.

Your visualization could teach history simultaneously across civilizations.

### Level 3: Historical events and connections

Zoom further.

Now individual events become visible.

For example, clicking on Alexander the Great could reveal:

- His campaigns
- His contemporaries
- The Persian Empire
- The regions he conquered
- His successors
- The Hellenistic period

But here's an idea: show related events as visual connections.

A thin line could connect Alexander's campaigns to the emergence of successor kingdoms.

Another line could connect those kingdoms to subsequent historical developments.

Students could literally follow the threads of history.

### Level 4: The individual event

At the most detailed level, your existing event card appears.

I like your idea of having a front and back.

I'd consider these two sides:

**Front: The event**
- Name
- Date
- Location
- Short description
- Category
- Relevant image or illustration

**Back: Connections**
- What happened before?
- What happened afterward?
- Who were the important people?
- Which civilizations were involved?
- What were the consequences?
- What else was happening elsewhere?

I might actually use tabs rather than a physical card flip, particularly on mobile.

---

# 4. Color could become a much more powerful visual language

I think you're currently underutilizing color.

But I'd avoid simply making everything colorful.

Instead, give color a specific semantic meaning.

Here are three possible approaches.

**A. Category color**

As discussed earlier, color represents the nature of the event.

**B. Geographic color**

Color represents the geographic region.

For example:
- South Asia
- East Asia
- Europe
- Middle East
- Africa
- Americas

**C. Historical significance**

You could introduce a subtle intensity scale.

Major world-changing events get stronger visual prominence. Minor events remain subdued.

However, I'd be careful about defining historical significance objectively. It could be a curated editorial attribute rather than an automatically calculated score.

My preference: Make category color the default. Let students switch to geographic coloring as another visualization mode.

This gives them two different ways of looking at the same history.

# 5. Five additional ideas I'd seriously consider

These are features that could make Date Flow stand apart.

### A. The contemporaries feature

Select any year.

Show everything happening around the world during that year.

For example, select 1200 CE.

What was happening in:
- India?
- China?
- Europe?
- Africa?
- The Americas?

This is an excellent way to teach global history.

### B. The historical connections explorer

Select an event and show a network of connected events.

For example:

Printing Press → Wider availability of books → Spread of ideas → Reformation → Scientific Revolution.

The relationships need not all be simple cause-and-effect relationships. Some are influences or historical associations.

### C. The civilization comparison

Select two civilizations.

For example:
- Roman Empire
- Gupta Empire

Highlight their respective periods on the timeline.

Show their contemporaries, major achievements, political structures, and important events.

### D. The density visualization

You mentioned that the 18th, 19th, and 20th centuries are much denser.

Instead of treating that as a problem, make it a feature.

Imagine a subtle histogram underneath the timeline showing the number of recorded events per century.

Students could immediately see how historical documentation and the number of recorded events change over time.

You could also distinguish the density of recorded events from the actual pace of historical change. Those aren't necessarily the same thing.

### E. The historical journey game

This is potentially a very interesting educational feature.

Present a question:

"Find five events that happened during the lifetime of the Roman Empire."

Or:

"Find three major inventions that preceded the Industrial Revolution."

Students navigate the timeline to find the answers.

You could even introduce a missing-event challenge.

---

# 6. One architectural recommendation: Separate the data from the visualization

This is important as Date Flow grows.

I'd keep the underlying historical data model independent of how you render it.

Each event should have:
- Unique ID
- Title
- Start date
- End date (if applicable)
- Description
- Categories (multiple)
- Geographic references
- People involved
- Related civilizations
- Related events
- Historical significance
- Images and references

Periods and empires should use a similar structure, but with duration as a first-class attribute.

This means you can eventually build multiple experiences using the same data:

1. The giant timeline.
2. A historical connections graph.
3. A geographic map of historical events.
4. A civilization comparison tool.
5. A chronological quiz.

You don't have to build all five now. Just avoid designing the data model in a way that makes them difficult later.

---

# 7. What I would prioritize

If I were developing Date Flow, I'd prioritize these:

| Priority | Feature                             | Why                                                |
| -------- | ----------------------------------- | -------------------------------------------------- |
| 1        | Semantic zooming                    | Makes the timeline feel alive                      |
| 2        | Category-based colors               | Immediately improves visual comprehension          |
| 3        | Related events and connections      | Turns isolated facts into historical understanding |
| 4        | Contemporaries across civilizations | Creates genuine educational value                  |
| 5        | Rich event cards                    | Makes individual discoveries rewarding             |
| 6        | Historical journey challenges       | Makes it interactive learning                      |
| 7        | Alternative visualizations          | Opens up future possibilities                      |

**My biggest recommendation: Don't rush into changing the technical stack. First establish what visual experience you want. Then choose the technology that supports it.**

---

## One thing I'd like to do next

Rather than immediately write another large specification for your coding agent, I'd like to explore the visual experience with you.

I have three particularly interesting directions in mind:

1. **The living timeline:** The timeline itself becomes visually dynamic, with category colors, transitions, density, and progressively revealed information.
2. **The discovery experience:** Students explore history through connected events, civilizations, people, and geographical context.
3. **The immersive experience:** Zooming feels like traveling through 5,000 years, with dramatic transitions between historical eras.

I suspect the best Date Flow will combine all three.

But let's develop the ideas before committing to implementation.

=====

I love this direction. And I want to make one distinction before we begin:

**Date Flow should not merely show students what happened in history. It should help them develop an intuition for how history unfolded.**

A student should be able to look at the timeline and intuitively understand:
- Which civilizations coexisted?
- Which empires were expanding?
- Which ones were declining?
- What was happening in different parts of the world simultaneously?
- When did humanity experience major transformations?
- How did one period transition into another?

That's a much richer educational objective than presenting 5,000 years of chronological information.

Let's focus entirely on the **Living Timeline**.

# 1. The timeline should have a visual language

Currently, you have points and bars. I would give each element a richer visual identity.

Think of four different visual objects:

| Object                     | What it represents                      | Visual treatment           |
| -------------------------- | --------------------------------------- | -------------------------- |
| Events                     | Something happened at a particular time | Points or markers          |
| Historical periods         | An era or movement                      | Horizontal bands           |
| Empires and civilizations  | Entities that exist over a duration     | Gantt-style bars           |
| Historical transformations | Major transitions or turning points     | Special visual annotations |

The important thing is that these objects should not all have equal visual weight.

For example:

- The founding of the Mughal Empire: prominent event marker.
- The Battle of Panipat: smaller event marker.
- The Mughal Empire: long-duration bar.
- The decline and fragmentation of the Mughal Empire: a major transition marker.

A student should be able to recognize the broad historical story without having to read every annotation.

This brings us to your question about importance.

# 2. Historical importance: We need an editorial ranking system

I completely agree with you. We cannot pretend that every historical event deserves equal prominence.

The Battle of Panipat is important. But the establishment of Mughal rule in India, the consolidation of the empire, and its eventual fragmentation represent a much larger historical narrative.

I'd introduce a field called **Historical Significance**.

I suggest five levels.

| Level | Name           | Meaning                                                                 | Example                            |
| ----- | -------------- | ----------------------------------------------------------------------- | ---------------------------------- |
| 5     | World-changing | Fundamentally altered human history across civilizations or continents  | Agricultural Revolution            |
| 4     | Civilizational | Transformed a major civilization or region                              | Establishment of the Mughal Empire |
| 3     | Major          | Significant political, military, cultural, or technological development | Battle of Panipat                  |
| 2     | Regional       | Important within a country or region                                    | A regional dynasty's establishment |
| 1     | Contextual     | Useful for understanding the historical environment                     | A ruler's coronation               |

These are illustrative classifications, not immutable historical truths.

### But I would go one step further.

Importance should influence more than the size of a dot.

It should influence:

- Marker size.
- Label visibility.
- Brightness and saturation.
- Whether the event appears at wider zoom levels.
- Whether the event receives a special visual treatment.
- Whether the event is highlighted in introductory learning journeys.

For instance, at the 5,000-year view, perhaps only Levels 4 and 5 appear.

As students zoom in, Level 3 events emerge.

Zoom further, and Levels 1 and 2 become visible.

This is what I mean by progressive disclosure.

**The timeline itself teaches students what matters at different levels of historical resolution.**

One caveat: significance should be contextual as well as global. An event of enormous importance to Indian history shouldn't disappear simply because its worldwide impact was limited.

I'd therefore distinguish:
- Global significance.
- Regional significance.
- National or civilization-specific significance.

This could eventually become a three-dimensional importance model rather than one simplistic score.

# 3. Category colors: Make the timeline immediately understandable

I would make color a fundamental part of Date Flow.

My proposal is to establish eight permanent categories.

| Category                | Color family | Examples                                      |
| ----------------------- | ------------ | --------------------------------------------- |
| Politics & Governance   | Blue         | Kingdoms, dynasties, constitutions            |
| Wars & Conflicts        | Red          | Battles, invasions, revolutions               |
| Science & Technology    | Purple       | Inventions, discoveries                       |
| Arts & Culture          | Orange       | Literature, architecture, music               |
| Religion & Philosophy   | Teal         | Buddhism, Christianity, philosophical schools |
| Economy & Trade         | Green        | Trade routes, industrialization               |
| Society & People        | Pink         | Social movements, influential individuals     |
| Geography & Environment | Earth tones  | Climate, natural disasters, exploration       |

Why is this important?

Imagine a student zooming into the 16th century.

They immediately see:
- Blue markers representing political developments.
- Red markers representing conflicts.
- Green markers representing trade.
- Orange markers representing cultural developments.

Without reading a single description, they begin seeing patterns.

For example, they might notice that periods of intense political change also contain substantial military activity.

Or that trade routes connect distant civilizations during particular periods.

That is visual learning.

### An important refinement: Events can have multiple categories.

The Battle of Plassey could be:
- Wars & Conflicts
- Politics & Governance
- Economy & Trade

I would assign each event:
- One primary category.
- Zero or more secondary categories.

The primary category determines its default color.

The secondary categories become visible when students select the event or switch visualization modes.

Otherwise, eight simultaneous colors per event would become visual chaos.

# 4. The timeline should breathe

This is one of my favorite ideas.

Today, your timeline probably looks relatively static. Events and bars appear in their respective positions.

What if the timeline communicated historical activity through visual density?

Consider three periods:

- 3000 BCE–500 BCE
- 500 BCE–1500 CE
- 1500–2000 CE

The number of recorded historical developments increases substantially as we approach modern times.

I would experiment with a subtle density layer.

Imagine a narrow band underneath the timeline.

It represents the concentration of recorded events in each period.

When the student zooms in, the band becomes more detailed.

When they zoom out, it aggregates into broader historical patterns.

This could help students understand the changing volume of recorded history.

But there is another possibility.

### Historical activity versus historical documentation

These are not necessarily the same.

Ancient civilizations were certainly active, innovative, and complex. We simply have different amounts and kinds of surviving evidence.

You could eventually distinguish:
- Historical activity (editorially estimated).
- Surviving historical documentation.
- Events currently represented in Date Flow.

I wouldn't conflate these.

For the first version, I would simply show the density of events in your database.

# 5. Empires should visually communicate their life cycles

This is particularly important.

You currently represent empires using Gantt-style bars.

I think we can do much more with them.

Consider the Mughal Empire.

Rather than showing one uniform bar from 1526 to 1857, imagine representing its evolution.



The bar could have different visual characteristics across its lifespan:

| Period    | Visual representation                            |
| --------- | ------------------------------------------------ |
| 1526–1556 | Establishment                                    |
| 1556–1605 | Consolidation and expansion                      |
| 1605–1707 | Imperial zenith and continued expansion          |
| 1707–1750 | Fragmentation and declining central authority    |
| 1750–1857 | Progressive loss of sovereignty and eventual end |

The dates and phase boundaries would need careful historical curation.

Imagine a continuous bar with subtle transitions between these phases.

A student would immediately see that an empire isn't simply something that exists for 300 years.

It has a life cycle.

**This could become one of the defining characteristics of Date Flow.**

And it needn't be restricted to empires. Apply the same idea to:
- Civilizations.
- Dynasties.
- Religious movements.
- Political systems.
- Economic eras.
- Scientific movements.

One caution: not every civilization has a neat beginning, golden age, decline, and end. The phases should be appropriate to the entity.

# 6. Semantic zooming: Make zooming an educational experience

This is probably the most important feature of the Living Timeline.

I would define five zoom levels.

| Zoom level   | What the student sees                                                    |
| ------------ | ------------------------------------------------------------------------ |
| 1. Global    | Major civilizations, world-changing events, broad historical periods     |
| 2. Regional  | Major kingdoms, empires, religious movements, technological developments |
| 3. Detailed  | Significant events, rulers, battles, inventions, cultural developments   |
| 4. Granular  | Individual events, people, locations, relationships                      |
| 5. Deep dive | Rich descriptions, images, context, historical consequences              |

But there's a twist.

**The transition between zoom levels should feel like discovering something, not simply enlarging something.**

For example:

At the global level, you see the Roman Empire as a long bar.

Zoom in.

The bar becomes more detailed. You begin seeing:
- Roman Republic.
- Rise of Augustus.
- Pax Romana.
- Crisis of the Third Century.
- Division of the Empire.
- Fall of the Western Roman Empire.

Zoom further.

Individual emperors, battles, political reforms, and inventions appear.

The student feels like they're uncovering layers of history.

I would also avoid abruptly hiding and showing hundreds of objects. Elements should transition gracefully, with labels appearing according to available space.

# 7. Introduce historical milestones as visual landmarks

I want to propose something slightly different.

Certain events should become recognizable landmarks on the timeline.

Think of them as historical anchors.

Examples:

- Invention of writing.
- Construction of the Great Pyramid.
- Birth of major world religions.
- Fall of the Roman Empire.
- Mongol expansion.
- Printing press.
- American and French Revolutions.
- Industrial Revolution.
- World Wars.
- Moon landing.

These could have special marker treatments.

Not necessarily bigger and brighter than everything else, but visually distinctive.

Why?

Because students need reference points.

When looking at the timeline, they should develop an internal sense of historical distance.

For example:

"Wait, the printing press appeared roughly 150 years before Columbus reached the Americas."

That is a historical insight that becomes intuitive when the events are physically close on the timeline.

---

# 8. My favorite idea: The timeline should reveal historical patterns

This is where I think we can make Date Flow genuinely educational.

Imagine a student looking at 500 BCE.

They see several things happening around the same time:

- Greek philosophical developments.
- Buddha's teachings.
- Confucius.
- Persian imperial expansion.
- Developments in Indian political thought.

The timeline could subtly highlight these as a cluster of major developments.

Not because they caused one another, but because they illustrate the remarkable intellectual and political activity occurring across different parts of the world.

Another example:

Look at the late 18th century.

You see:
- American Revolution.
- French Revolution.
- Industrial Revolution.
- Major political and economic transformations.

The student begins recognizing that history often contains periods of concentrated transformation.

I'd introduce an optional layer called **Historical Currents**.

This would be a curated grouping of developments that collectively represent a larger transformation.

Examples:

- The Axial Age.
- The Age of Exploration.
- The Scientific Revolution.
- The Enlightenment.
- The Industrial Revolution.
- Decolonization.

These are not necessarily single events or empires. They are broader historical phenomena.

Visually, they could appear as translucent bands or background regions spanning the relevant period.

They would help students understand history at a higher level of abstraction.

---

# 9. Putting it all together: What I envision

Here is my proposed Living Timeline architecture.

| Feature                        | Purpose                               | Priority  |
| ------------------------------ | ------------------------------------- | --------- |
| Historical significance levels | Communicate relative importance       | Essential |
| Eight-category taxonomy        | Give events a consistent identity     | Essential |
| Category-based colors          | Make patterns visually apparent       | Essential |
| Progressive disclosure         | Reveal information as students zoom   | Essential |
| Empire life cycles             | Communicate evolution over time       | High      |
| Historical density layer       | Show concentration of recorded events | High      |
| Historical milestones          | Establish reference points            | High      |
| Historical Currents            | Show larger transformations           | High      |
| Smooth semantic transitions    | Make navigation feel alive            | Essential |

## 10. Before we move on, I want to discuss three design decisions

I don't want to rush into a specification yet. There are three choices that could fundamentally shape the experience.

**Question 1: Should the timeline have a dominant category color or a geographic color?**

My preference is category coloring by default, with an option to switch to geographic coloring.

**Question 2: Should historical importance determine what appears at different zoom levels?**

I strongly favor this. The broadest view should tell the story of humanity without overwhelming students with thousands of annotations.

**Question 3: Should empires and civilizations have internal phases?**

I strongly favor this too. A 300-year empire shouldn't look like a uniform rectangle. Its expansion, golden age, fragmentation, and decline are part of the story.

My suggestion is that we settle these three decisions and then explore the **Discovery Experience**.

One final thought: I would resist the temptation to make Date Flow look like a conventional history textbook converted into software.

The real opportunity is to create something where a student spends 30 minutes exploring history and emerges with a mental model of how the world evolved. That's a much more ambitious and interesting goal.

====

I think the Discovery Experience is potentially even more important than the Living Timeline.

Here's why.

The Living Timeline helps students understand the chronological structure of history. The Discovery Experience helps them understand the relationships within history.

Those are two different learning experiences.

A student might know that the Mughal Empire existed between 1526 and 1857. But that's just a fact.

A student who understands:
- What existed in India before the Mughals?
- Where did the Mughals come from?
- What was happening in Persia and Central Asia?
- How did the Mughal Empire interact with the Deccan kingdoms?
- What was happening in Europe and China at the same time?
- How did Mughal decline influence the emergence of British colonial rule?

...has developed a much richer understanding.

**I want Date Flow to help students move from knowing historical facts to understanding historical relationships.**

Let's brainstorm this systematically.

# 1. What exactly is the Discovery Experience?

I envision it as a collection of interconnected ways to explore history.

The student should be able to start anywhere:

- An event.
- A person.
- An empire.
- A civilization.
- A country.
- A historical period.
- An invention.
- A religion.
- A philosophical movement.

And then progressively discover related things.

Think of it as an exploration layer sitting on top of your existing timeline.

The timeline remains the central organizing structure. Discovery gives students different ways to navigate and understand the information.

I'd organize the experience around six capabilities.

# 2. Capability One: Historical Connections

This is probably the most important.

Every event should have connections to other events.

But I want to distinguish between different kinds of connections.

Simply showing a list of related events isn't enough.

We should capture the nature of the relationship.

Consider the invention of the printing press.



Possible connections:

| Event A                    | Relationship                   | Event B                             |
| -------------------------- | ------------------------------ | ----------------------------------- |
| Gutenberg's printing press | Enabled wider dissemination of | Printed books                       |
| Printed books              | Helped accelerate              | Spread of Renaissance ideas         |
| Printing press             | Facilitated dissemination of   | Reformation writings                |
| Reformation                | Contributed to                 | Religious transformations in Europe |

Notice the difference between:
- Caused.
- Enabled.
- Influenced.
- Accelerated.
- Contributed to.

These distinctions matter.

I would create a controlled relationship vocabulary.

### Proposed relationship taxonomy

| Relationship      | Meaning                                        |
| ----------------- | ---------------------------------------------- |
| Caused            | Direct causal relationship                     |
| Contributed to    | One of several contributing factors            |
| Enabled           | Made something possible                        |
| Influenced        | Intellectual, cultural, or political influence |
| Triggered         | Initiated a development                        |
| Preceded          | Chronological predecessor                      |
| Followed          | Chronological successor                        |
| Part of           | Belongs to a larger movement or development    |
| Contemporary with | Happened during the same period                |
| Opposed           | Conflict or ideological opposition             |
| Interacted with   | Direct interaction between entities            |
| Evolved into      | Developed into a subsequent entity             |

I'd be particularly careful about distinguishing chronological succession from causation.

Two events happening one after another doesn't mean one caused the other.

### How should this appear?

Imagine clicking on an event card.

You currently have the event description.

I'd add a section called:

**Explore Connections**

It could show:

- What led to this?
- What happened because of this?
- Who influenced it?
- What was happening elsewhere?
- What was it part of?

Each connection is clickable.

Clicking takes you to the connected event, opens its details, and highlights its position on the timeline.

This creates an almost endless exploration experience.

A student could start with the French Revolution and eventually discover the Enlightenment, American Revolution, Industrial Revolution, and the transformation of European political systems.

---

# 3. Capability Two: The Contemporaries Explorer

This is a feature I particularly like for Date Flow.

Students often learn history in geographic silos.

Indian history is taught separately from Chinese history, which is taught separately from European history.

But history happened simultaneously.

Imagine selecting 1200 CE.

The application presents a global snapshot.



The student sees:

| Region       | What was happening around 1200 CE           |
| ------------ | ------------------------------------------- |
| South Asia   | Delhi Sultanate emerging                    |
| East Asia    | Song Dynasty                                |
| Central Asia | Mongol expansion beginning                  |
| Europe       | Medieval kingdoms                           |
| Middle East  | Ayyubid Sultanate                           |
| Africa       | Mali Empire emerging                        |
| Americas     | Major Maya and other Mesoamerican societies |

These examples would need precise date validation in the actual application.

But imagine the experience.

A student selects a year using a slider.

The timeline freezes at that year.

A panel appears showing the world's historical landscape.

They can explore:
- Political entities.
- Major rulers.
- Wars.
- Trade networks.
- Religious developments.
- Scientific and cultural achievements.

**This is essentially a time machine that lets students inspect the world at any particular moment.**

An especially interesting extension:

Let students compare two dates.

For example:
- 1200 CE.
- 1500 CE.

Show how the geopolitical landscape changed.

Which empires disappeared? Which emerged? Which civilizations continued?

This is an excellent learning experience.

---

# 4. Capability Three: The Historical Journey

This is where I would introduce guided exploration.

Sometimes students don't know what they want to explore.

Instead of presenting them with a blank timeline, give them curated journeys.

Think of them as interactive historical narratives.

Some examples:

### Journey A: The Rise and Fall of Empires

1. Persian Empire.
2. Macedonian Empire.
3. Roman Empire.
4. Byzantine Empire.
5. Mongol Empire.
6. Mughal Empire.
7. British Empire.

The student follows the timeline, examining the rise, expansion, and decline of each.

### Journey B: The History of Ideas

1. Ancient Greek philosophy.
2. Buddhism and Jainism.
3. Confucianism.
4. Islamic Golden Age.
5. European Renaissance.
6. Scientific Revolution.
7. Enlightenment.

### Journey C: How the Modern World Emerged

1. Age of Exploration.
2. Colonial expansion.
3. Scientific Revolution.
4. Industrial Revolution.
5. American Revolution.
6. French Revolution.
7. World Wars.
8. Decolonization.
9. Globalization.

Each journey would have:
- A narrative introduction.
- A sequence of important events.
- Suggested stopping points.
- Questions to think about.
- Connections to other historical developments.

The key is that students should not merely watch a presentation.

They should navigate the actual Date Flow timeline as part of the journey.

This is where your existing visualization becomes the foundation for something much more powerful.

---

# 5. Capability Four: The People and Civilizations Explorer

I would introduce two new ways of navigating history.

### A. People Explorer

Students can search for a person and explore their historical context.

For example, select Akbar.

Show:

- His lifetime.
- His reign.
- His contemporaries.
- His family and successors.
- Important events during his lifetime.
- The Mughal Empire during his reign.
- His cultural, political, and military contributions.
- People who influenced him.

His lifespan could be highlighted directly on the timeline.

Imagine selecting two people:

Akbar and Elizabeth I.

Their lifespans overlap.

What was happening in their respective parts of the world?

This is a fascinating way of establishing historical context.

### B. Civilization Explorer

Select a civilization or empire.

For example, the Roman Empire.

Show:

- Its chronological lifespan.
- Major rulers.
- Important events.
- Geographic extent over time.
- Wars and conflicts.
- Economic developments.
- Cultural achievements.
- Successor states.
- Relationships with neighboring civilizations.

An especially interesting feature would be to show multiple civilizations together.

For example:

Roman Empire vs Han Dynasty.

When did they coexist?

Did they interact directly?

What were their similarities and differences?

What was happening along the Silk Road?

This is the kind of comparison that encourages deeper historical thinking.

---

# 6. Capability Five: The Geographic Discovery Experience

This is a natural extension of your timeline.

You already have geographical filters for India, Asia, Southeast Asia, and so on.

But filtering is different from exploration.

Imagine a student selecting the Silk Road.



The application could reveal:
- Its geographical extent.
- Important trading cities.
- Major civilizations along the route.
- Goods being traded.
- Religions and ideas that traveled along it.
- Historical periods when particular routes flourished.

Click on Samarkand.

Now the student discovers:
- Its historical importance.
- The empires that controlled it.
- Important events.
- Its role in trade and cultural exchange.

Click on another city.

Continue exploring.

The geographic and chronological dimensions reinforce each other.

I'd eventually like Date Flow to have a synchronized map and timeline.

Selecting a region on the map filters the timeline.

Selecting an event on the timeline highlights its geographical location.

This could be extraordinarily useful.

---

# 7. Capability Six: Ask Historical Questions

Here's an idea that could distinguish Date Flow from conventional history applications.

Instead of making students navigate exclusively through predefined categories, allow them to ask questions.

For example:

- What was happening in India when the Roman Empire was at its height?
- Which major empires existed simultaneously?
- What inventions transformed transportation?
- Which historical events contributed to the decline of the Ottoman Empire?
- What happened in the 100 years before the French Revolution?
- Which major civilizations existed around 500 BCE?

The application would identify relevant events and highlight them on the timeline.

This could eventually be powered by an AI assistant.

But I would make one architectural decision early:

**The AI should query the structured historical database rather than invent historical relationships from scratch.**

It can explain, synthesize, and guide exploration, but historical facts and curated connections should have identifiable sources.

---

# 8. The Discovery Experience needs a common data architecture

Now let's move from features to architecture.

I think this is where we need to be disciplined.

Your current data model probably has events and periods.

We should expand the conceptual model to include several types of entities.

| Entity              | Examples                      |
| ------------------- | ----------------------------- |
| Event               | Battle of Plassey             |
| Person              | Akbar                         |
| Empire              | Mughal Empire                 |
| Civilization        | Ancient Egyptian civilization |
| Dynasty             | Ming Dynasty                  |
| Country/Territory   | France                        |
| Place               | Samarkand                     |
| Historical Movement | Enlightenment                 |
| Concept/Idea        | Democracy                     |
| Invention           | Printing Press                |
| Trade Network       | Silk Road                     |

These entities should have relationships.

For example:

Akbar:
- Person.
- Ruler of Mughal Empire.
- Contemporary of Elizabeth I.
- Son of Humayun.
- Father of Jahangir.
- Associated with Din-i Ilahi.

Mughal Empire:
- Founded by Babur.
- Expanded under Akbar.
- Reached its greatest territorial extent under Aurangzeb.
- Experienced fragmentation after Aurangzeb.
- Ended in 1857.

Silk Road:
- Trade network.
- Connected multiple civilizations.
- Facilitated cultural exchange.
- Existed across different historical periods and routes.

Notice something important.

**The same entity can participate in several different exploration experiences without duplicating the underlying information.**

That's what we want.

## A proposed relationship structure

Every relationship should contain:

- Source entity.
- Relationship type.
- Target entity.
- Start and end dates, if applicable.
- Short explanation.
- Evidence/source references.
- Confidence or editorial review status.

For example:

| Source        | Relationship              | Target            |
| ------------- | ------------------------- | ----------------- |
| Babur         | Founded                   | Mughal Empire     |
| Akbar         | Expanded and consolidated | Mughal Empire     |
| Aurangzeb     | Ruled                     | Mughal Empire     |
| Mughal Empire | Contemporary with         | Safavid Empire    |
| Mughal Empire | Interacted with           | Deccan Sultanates |

This relationship model will support almost everything we've discussed.

---

# 9. How I would architect the Discovery Experience

I would organize the application into five exploration modes.

These don't necessarily need to be five separate pages. They can be different views or panels within the same application.

| Mode                            | Starting point           | Primary experience                    |
| ------------------------------- | ------------------------ | ------------------------------------- |
| Timeline Explorer               | A date or event          | Navigate chronologically              |
| Connections Explorer            | An event or entity       | Follow historical relationships       |
| Contemporaries Explorer         | A year                   | See what was happening globally       |
| People & Civilizations Explorer | A person or civilization | Explore historical lives and entities |
| Geography Explorer              | A place or region        | Discover history geographically       |

Historical Journeys can sit above these as guided learning experiences.

And the AI question interface can eventually operate across all five.

One design principle: Don't force students to leave the timeline every time they want to explore something.

The timeline should remain the home base.

For example:

1. Student clicks Akbar.
2. Event/entity card appears.
3. Student clicks "Contemporaries."
4. The timeline highlights Elizabeth I, Shakespeare, and other relevant contemporaries.
5. Student clicks "Explore Connections."
6. The interface reveals related people, events, and civilizations.
7. Student follows a connection to the Safavid Empire.

The student is navigating one connected historical universe.

---

# 10. How to build this without overengineering

I would build this in stages.

| Phase | Deliverable                               | Importance   |
| ----- | ----------------------------------------- | ------------ |
| 1     | Common entity and relationship model      | Foundational |
| 2     | Related events and historical connections | Very high    |
| 3     | Contemporaries explorer                   | Very high    |
| 4     | People and civilizations explorer         | High         |
| 5     | Geographic discovery                      | High         |
| 6     | Curated historical journeys               | High         |
| 7     | AI-powered historical questions           | Later        |

I would not start by building all these interfaces.

Start by expanding the underlying data model.

Otherwise, you will end up building six interfaces that each have their own interpretation of historical information.

That would be difficult to maintain.

---

# 11. Some additional ideas worth keeping on the radar

A few possibilities that I don't want to lose:

**The What If Explorer**

Students explore alternative historical scenarios.

What if the Spanish Armada had succeeded? What if the printing press had never been invented?

This would be explicitly speculative, clearly distinguished from documented history.

**The Historical Distance Explorer**

Select two events and ask how far apart they were in time.

For example:
- Construction of the Great Pyramid.
- Birth of Cleopatra.

The answer might surprise students because they often mentally compress ancient history.

**The Then and Now Explorer**

Select an ancient city and compare its historical importance with its modern identity.

Rome, Alexandria, Istanbul, Delhi, Beijing, Samarkand.

**The Overlap Explorer**

Select two empires and see how long they coexisted.

For example, the Roman and Han empires.

This is an incredibly simple but powerful way to understand global history.

---

# 12. My recommendations: What makes the cut?

If I had to choose the five most important Discovery features, they would be:

1. **Historical Connections:** Follow cause, influence, consequence, and other relationships.
2. **Contemporaries Explorer:** See what was happening around the world at a selected date.
3. **People & Civilizations Explorer:** Explore history through people and long-lived entities.
4. **Geographic Discovery:** Connect places, maps, trade routes, and historical events.
5. **Historical Journeys:** Guided explorations that tell larger stories.

The AI question interface can become the connective tissue across these experiences.

---

## 13. Let's make three important decisions before specifying this

I have three questions for you.

**Question 1: Should Discovery be a separate experience or embedded into the existing timeline?**

My preference: Embedded. The timeline is the home base, and discovery tools appear as overlays, panels, or alternative views.

**Question 2: Should we build an explicit network of historical relationships?**

My strong preference: Absolutely. This is probably the most important data-model enhancement. It turns Date Flow from a collection of historical facts into a knowledge graph.

**Question 3: How much AI do you envision?**

I'd distinguish two things:
- AI as a conversational guide that answers questions and suggests explorations.
- AI as a research assistant that helps populate, validate, and enrich the historical database.

I think both are valuable, but they should be separate capabilities.

My overall vision is this:

**A student enters Date Flow knowing very little about a particular historical period. Thirty minutes later, they have explored its people, empires, geography, contemporaries, causes, consequences, and connections to other parts of the world.**

And they have done it themselves, driven by curiosity.

That's the experience I'd like us to build.

====

# Immersive Experience (Future Phase)

Yes, let's move to the **Immersive Experience**. And your question is a good one: it overlaps with Discovery, but I would treat it as a distinct dimension.

Here's how I see the three experiences:

| Experience           | The central question          | What the student gains                                              |
| -------------------- | ----------------------------- | ------------------------------------------------------------------- |
| Living Timeline      | When did things happen?       | A mental model of history across time                               |
| Discovery            | How are things connected?     | An understanding of relationships, influences, and cause and effect |
| Immersive Experience | What was it like to be there? | A sense of place, scale, atmosphere, and human experience           |

Discovery helps students understand the structure of history. Immersion helps them experience it.

## 1. Step inside a historical moment

Imagine a student exploring the Mughal Empire on the timeline. They click on the construction of the Taj Mahal.

Instead of just reading an event card, they can choose to step into that period.

They might see:
- An artistic reconstruction of Agra around 1650.
- The Taj Mahal under construction.
- The architecture, clothing, tools, and materials of the period.
- The Yamuna River and surrounding landscape.
- What ordinary life might have looked like in the city.

The student could explore the scene and click on objects to learn more.

This need not be a fully interactive 3D world. Even a carefully designed 2D panoramic scene with hotspots could be compelling.

## 2. Explore historical places

This is perhaps the most natural immersive experience.

Imagine exploring:
- Ancient Rome.
- The city of Baghdad during the Islamic Golden Age.
- Nalanda University.
- Machu Picchu.
- The ancient city of Alexandria.
- Constantinople before its fall.

The experience could combine historical reconstructions, maps, photographs of present-day ruins, archaeological evidence, and explanatory annotations.

One particularly interesting feature would be a **Then and Now** toggle: switch between a reconstruction of a place in its historical period and its present-day appearance.

## 3. Experience history through the eyes of people

This could be especially powerful for students.

Rather than presenting history exclusively through kings, empires, and battles, let students explore the experiences of different people.

For example, during the Industrial Revolution:
- A factory worker.
- A factory owner.
- A child working in a mill.
- A merchant.
- An inventor.

Or during the Mughal period:
- A farmer.
- A soldier.
- A trader.
- An artisan.
- A court official.

The student could follow a short, historically grounded narrative about a day in that person's life.

An important distinction: these would be reconstructed experiences, not actual historical diaries. We should clearly distinguish documented evidence from informed historical interpretation.

## 4. Experience historical events

Some events deserve more than a description and a date.

Imagine exploring:
- The signing of the Declaration of Independence.
- The storming of the Bastille.
- The first moon landing.
- The construction of the Great Wall.
- The opening of the first railway.
- The fall of Constantinople.

A student might see a sequence of scenes, understand the geography, meet the principal participants, and explore what led up to the event and what followed.

This could connect directly back to the Discovery experience.

## 5. Hear the past

We shouldn't think of immersion as exclusively visual.

Sound could add another dimension:
- Music from different historical periods.
- Instruments and their evolution.
- Languages and scripts.
- Sounds of ancient marketplaces, ports, workshops, and cities.
- Speeches and historically significant recordings where available.

Imagine exploring a historical city and hearing the sounds of its marketplace, with an explanation of what the different sounds represent.

## 6. Make it interactive: a student becomes an explorer

Eventually, students could be given small challenges:

- You are a merchant traveling along the Silk Road. Which cities would you visit?
- You are an explorer arriving in an unfamiliar port. What do you notice?
- You are an architect in the Mughal court. What materials and techniques are available?
- You are navigating a trade route. What geographic obstacles do you encounter?

These could become educational simulations, where students make decisions and see historically plausible consequences.

I would be careful not to turn this into a historical video game. The objective is to develop historical understanding, not simply entertain.

---

## My recommendation: Think of immersion as a layer, not a separate application

A student should be able to move naturally between all three experiences.

For example:

1. On the **Living Timeline**, the student discovers the construction of the Taj Mahal.
2. In **Discovery**, the student explores Shah Jahan, the Mughal Empire, contemporary civilizations, and the historical connections.
3. In **Immersive Experience**, the student steps into seventeenth-century Agra and explores the monument and its surroundings.

All three should share the same historical data and context.

## One important question before we go further

I see two quite different directions for immersion:

**A. Historical visualization:** Beautiful reconstructions, panoramic scenes, maps, architecture, artifacts, sounds, and interactive hotspots. The student explores and learns.

**B. Historical simulation:** The student takes on a role, makes decisions, navigates situations, and experiences historically plausible scenarios.

I suspect we eventually want both, but they are very different in scope and educational purpose.

====

Absolutely. I actually think that's the right development strategy.

Let's formally park **Immersive Experience** as a future phase. We don't need to abandon any of those ideas; we'll preserve them for when the foundation is ready.

For now, let's concentrate on two pillars:

### 1. Living Timeline
Build a rich, visually intuitive historical timeline that helps students understand:
- Chronology and historical scale.
- The coexistence of civilizations and empires.
- Historical periods and transformations.
- The rise, expansion, and decline of political entities.
- Major developments across different parts of the world.

### 2. Discovery Experience
Build the exploration capabilities that help students understand:
- Connections between historical events.
- Cause, influence, and consequences.
- What was happening simultaneously in different regions.
- People, civilizations, empires, and their relationships.
- Historical journeys and patterns across time.
- Eventually, natural-language questions answered using the historical database.

### 3. Immersive Experience — Parked for Later

We'll retain the ideas around historical reconstructions, images, panoramic scenes, audio, and simulations.

Your point about curated imagery is important. Even before building an immersive environment, we should eventually establish a reliable image collection with:
- Wikimedia Commons and other open-content sources.
- Clear licensing and attribution information.
- Historical relevance and editorial review.
- Links to the events, people, places, and civilizations in our database.

That image collection could become useful to the first two experiences as well. We don't need to wait for immersive development to start adding images to event cards.

**One architectural principle I'd like us to preserve:** Build the historical data foundation so that all three experiences can eventually use it. We should not have to redesign the database when we introduce immersion.

So, for now, our scope is clear: **make the timeline intelligent, make history discoverable, and make the underlying historical knowledge rich and reliable.**

I suggest we next move from brainstorming the experience to examining the existing timeline and identifying what needs to evolve.

---

# Assessment (2026-11-10): built, not built, and fit

*Added by Claude after reading the brainstorm above, which is unchanged. It compares the vision with what exists (doc 09 for DateFlow phases, doc 14 for the product overview) and proposes an order of work. The phases are carried into doc 14's roadmap.*

### How well it fits our direction: very well

The document's main ideas are things we already chose, often in the same words:
- **A knowledge graph of typed relationships.** Its relationship taxonomy is almost exactly our 12 types. We added `began` and `ended` during your review.
- **"Distinguish chronological succession from causation."** That's built into Stories (a grey "then", never a cause).
- **"AI should query the structured database rather than invent relationships"**, plus sources and review status. That's our accuracy-first rule, the review queues and the sources table.
- **"Separate the data from the visualization."** We have SQLite → JSON → a pure TypeScript engine.
- **"Don't rush into changing the technical stack."** Vue + SVG + our own time scale handle ~530 items well. Canvas or Pixi only matter at thousands of items.
- **Immersion parked; Living Timeline and Discovery first.** That matches the roadmap.

**Two points where we should adapt the document rather than follow it:**
1. **Eight category colours.** Today's 3 colourblind-safe hues are deliberate (`src/engine/dateflow/categoryGroups.ts`). Eight hues on small dots can't be told apart, and the document itself warns that colour shouldn't be the only encoding. **Recommendation:** keep the 3 hues, add **8 category families shown as shapes or icons**, and add a **"focus" mode** (one family vivid, the rest faded, *not hidden*). That's exactly the document's "Political history: everything else fades".
2. **AI questions ("What was happening in India when Rome peaked?").** A live AI needs a backend, which breaks the "no backend" rule. **Recommendation:** answer the common questions with structured tools first (the Time Machine, Overlap and Distance explorers below), and park AI Q&A until a backend is decided.

### What's built vs. not

#### Living Timeline

| Doc 16 idea | Status | What exists / what's missing |
|---|---|---|
| Significance levels drive size, labels and zoom | ✅ mostly | Importance 1–9 sets marker size, bold labels (7+) and the zoom threshold (`importanceThreshold`). **Missing:** regional vs. global significance (a regional event can vanish at world zoom) |
| Category taxonomy, primary + secondary | ✅ | 14 categories; the first is primary. The document's 8 families are just a grouping of them |
| Category colours | ⚠️ partial | 3 safe hues. **Missing:** 8 families (as shapes), focus mode, colour-by-region toggle |
| Density layer | ✅ | Minimap histogram (Phase 6) and the dashboard Coverage heatmap |
| Milestones as landmarks | ✅ | 16 milestone lines with labels; could get a more distinctive marker |
| Semantic zoom / progressive disclosure | ✅ partial | Importance thresholds by zoom. **Missing:** spans revealing their sub-spans as you zoom in (Roman Empire → Republic, Pax Romana… via `part_of`), and smooth fade-ins |
| Empire life cycles (rise, zenith, decline) | ❌ | Planned in doc 10 (`entity_phases`) but not built. Needs curated data |
| Historical Currents (Axial Age, Enlightenment…) | ⚠️ partial | Some exist as period spans (Scientific Revolution, Industrial Revolution, Age of Exploration, Islamic Golden Age). **Missing:** a "currents" layer (translucent background bands), and spans for the Axial Age, Enlightenment and Decolonization |
| Transformation markers (e.g. Mughal fragmentation) | ❌ | Would come with life cycles |
| Card front and back | ✅ | The flip card. **Missing:** images; tabs on mobile |

#### Discovery

| Doc 16 idea | Status | What exists / what's missing |
|---|---|---|
| Historical connections, typed vocabulary, clickable | ✅✅ | Phase 8 Connections; Phase 9 Stories, threads, playback, `?story=` links. 225 reviewed links |
| Printing press → … → Scientific Revolution chains | ✅ | Stories walk them. They get longer as the gap list is drafted |
| Contemporaries ("what was happening at the same time") | ⚠️ partial | "Meanwhile around the world" (±50 years), "Empires in [year]", "What happened?" for a range. **Missing:** the **Time Machine**: pick a year and see a world snapshot by region; compare two years (what appeared, ended, continued) |
| Overlap explorer (Rome vs. Han) | ❌ (cheap) | Spans exist; it needs a two-span compare view |
| Historical distance explorer | ❌ (cheap, a "wow") | Two events → the years between them, plus a surprising comparison |
| Historical journeys (curated) | ⚠️ partial | Stories plus 8 auto-featured stories. **Missing:** curated journeys with an intro, chosen stops and questions ("Rise and Fall of Empires") |
| People explorer (Akbar's life, contemporaries) | ❌ | No person entities. Lifespans and reigns can be spans (like "Life of the Buddha" or the drafted "Reign of Akbar") |
| Civilization explorer | ⚠️ partial | A span card with Connections and Stories. **Missing:** a dedicated view (rulers, phases, successors) |
| Geographic discovery and a synced map | ⚠️ data only | 674 country tags and the dashboard Map (admin only). **Missing:** a map in DateFlow; places, cities, trade routes |
| AI questions | ❌ (parked) | Needs a backend (see above). AI as a *research assistant* is already done: doc 15 drafting |
| "Find five events during the Roman Empire" game | ❌ | Six games exist (What's Missing? covers the missing-event idea) |

#### Data model

| Doc 16 idea | Status |
|---|---|
| Entities and typed relationships | ✅ `entities` + facets + `relationships` (with confidence and review) |
| Multiple categories, sources and references | ✅ categories, sources (58 reviewed, 460 drafted) |
| People, places, trade networks, movements as entity types | ❌ people and places; movements fit as period spans |
| Images (Wikimedia, licensing) | ❌. It would mirror the `sources` pattern |
| Significance: global, regional and national | ⚠️ global only (one importance score) |

#### Immersive: parked, as the document itself says.

### Proposed phases (for doc 14), in recommended order

The order puts the most "wow" first, using data we already have. Data-heavy work comes once the drafting pipeline (doc 15) is feeding it.

| Phase | What | Data needed | Size |
|---|---|---|---|
| **10: Contemporaries** | **Time Machine:** a year slider freezes the timeline and opens a world snapshot by region (active empires and periods via `activeDuring`, nearby events via `meanwhile`/`summarizePeriod`). **Compare two years** (appeared / ended / continued). **Overlap explorer** (two spans). **Distance explorer** (two events, with a "surprising distance" line). | None new | Medium |
| **11: Living Timeline polish** | 8 category families as marker shapes plus a legend; **focus mode** (fade, don't hide); **colour by region** toggle; milestones as distinct landmarks; **spans reveal their sub-spans when zoomed** (via `part_of`); smooth label fades; a **Historical Currents** background layer | A "current" flag on some spans; a few new spans (Axial Age, Enlightenment, Decolonization) via the gap list | Medium |
| **12: Empire life cycles** | An `entity_phases` table (`tools/`), drafted through doc 15 with phases, then a review queue. Bars render phase segments; transition markers for major turns. Start with ~10 major empires | Curated phases with sources (accuracy-sensitive: not every empire has neat phases) | Large |
| **13: People** | Person entities with lifespan and reign spans; a person card; "Contemporaries of Akbar"; lifespan overlap (Akbar and Elizabeth I) | People drafted through doc 15 | Large |
| **14: Journeys and a game** | Curated journeys (title, intro, stops, questions) played in the Story panel; a "Find events during X" game | Journey scripts, drafted and reviewed | Medium |
| **Later** | Images (a media table, Wikimedia licensing); a DateFlow map view; regional significance; AI Q&A (needs a backend decision); Immersive | — | — |
