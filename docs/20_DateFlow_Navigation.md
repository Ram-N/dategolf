# DateFlow Navigation: Where Every Control Goes

Status: **draft for Ram's review** (2026-11-25). No code until it's approved. Roadmap item: doc 18, 1b.
Terms follow the glossary (doc 21).

---

## 1. Why

The toolbar grew one button at a time: about 30 controls in one wrapping row (`DateFlowToolbar.vue`). Ram's notes from showing DateFlow to people (2026-11-24/25):

- **Everything jumps when the layout changes.** The axis buttons exist only in Constellation and the Lanes menu only in Lanes, so the row wraps differently each time.
- **The era chips are excellent but move around.** They need one fixed place.
- **The Lanes menu belongs on the far left, just above the lanes.**
- **All the filter controls in one place.** Journeys and Chains side by side, as dropdowns. Search on the left.
- **The History overview's box should show the years it covers.**

## 2. The rule

**A control's place never depends on the layout, an open panel or what's on screen.** Controls that only apply to one layout sit next to that layout, in a slot that always starts in the same spot. Controls are grouped by the question they answer.

| Band | Answers | Holds |
|---|---|---|
| 1. Header | *What can I do?* | Search, guided paths, games, settings, help |
| 2. Time | *When am I looking?* | Era chips, zoom, the years on screen, the History overview |
| 3. View | *How is it drawn, and what's shown?* | Layout, that layout's own controls, detail, filters |
| 4. Chart | | The timeline and its side panels |
| 5. Footer | *What do the marks mean?* | Legend (Focus), keys, hints |

## 3. Desktop (1440px and wider)

```
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│ DateFlow  [Search (Mughal) or a year (500 BC)  ][Go]   Journeys ▾  Chains ▾  Play through      │ 1
│           Time Machine  What happened?  Surprise Me                  ▶ Games  Display ▾  ?    │
├───────────────────────────────────────────────────────────────────────────────────────────────┤
│ [Ancient|Classical|Medieval|Early Modern|Modern|All]  [−][+]   1906 – 1932 · 26 years          │ 2
│ ALL HISTORY ▁▁ ▁ ▁▂▁ ▁▁▂▁▂▃▂▁▂▂▃▂▃▃▃▄▃▄▄▅▅▆▆▇▇█ [1906 ▐▌ 1932] █▇                              │
│              ╲_________________________________________________________╱  (zoom wedge)        │
├───────────────────────────────────────────────────────────────────────────────────────────────┤
│ [Timeline|Lanes|Constellation] (layout's own slot)       [Simple|Standard|Detailed] Filters ▾ │ 3
│                                                          Only Science · without Africa · Clear│
├───────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                               │ Journey / Chain /              │ 4
│                         the chart                             │ Search results /               │
│                                                               │ Time Machine panel             │
├───────────────────────────────────────────────────────────────────────────────────────────────┤
│ ● Politics ▲ Wars ◆ Science ✚ Exploration ★ Arts ⬢ Religion ■ Economy ▼ Society · keys · hints│ 5
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```
(The Header is one row on a wide screen; it's drawn on two lines here only to fit.)

**The layout's own slot** in Band 3:
- **Timeline:** empty.
- **Lanes:** `Lanes ▾` (which regions get a lane, and their order). Ram's note: far left, just above the lanes.
- **Constellation:** `[Geography | Human activity | Society | Empires & states]`.

The slot starts right after the layout switch, and the *What's shown* group is right-aligned. So when the slot changes, nothing else moves.

### Band 1: Header
- **Search** on the left (Ram). It still jumps when you type a year.
- **Guided paths**, grouped: **Journeys ▾ · Chains ▾** first and side by side (Ram), then Play through, Time Machine, What happened?, Surprise Me.
- **Right end:** ▶ Games, **Display ▾** (new: Colorful | Subtle and Light | Dark, both as visible pairs inside), and **?** (What's this?).

### Band 2: Time
- **Era chips**, then **− +**, then the **years on screen** ("1906 – 1932 · 26 years", moved from under the DateFlow title).
- The **History overview** below, full width, with **the years written on its box**: one at each edge, or one centred "350 – 600" when the box is narrow. They're styled like the box, not like axis labels, so they read as *this is your window* and not as a second axis.

### Band 3: View
- **Left:** the layout switch, then the layout's own slot (above).
- **Right, "What's shown":** Simple | Standard | Detailed, **Filters ▾ (n)**, and the **filter summary**. The summary moves up from the footer and also names the legend's Focus ("Only Science · without Africa · Clear"), so everything that hides or fades things reads in one place.

### Band 5: Footer
- The legend stays where a legend belongs. Clicking a family still sets **Focus**, which now also shows in Band 3's summary.
- The kind keys (Empire or state, Period, or "Bigger dot = more important"), the "n more in view" note and the gesture hints stay.
- The "Connections of … are ringed · Clear" bar stays just above the footer: it reports what's on screen rather than being a control.

## 4. Laptop (1024–1439px)

Band 1 keeps Journeys ▾, Chains ▾, Time Machine and What happened?. **Play through and Surprise Me move into More ▾**, which now has its own fixed spot in the row, instead of the "More" fold that reflows the toolbar today. Bands 2 and 3 fit as they are (Constellation's four axis buttons included). The years in Band 2 shorten to "1906 – 1932" if needed.

## 5. Phone (under 640px)

```
┌──────────────────────────────────┐
│ DateFlow  🔍  Journeys▾ Chains▾ ☰│ 1   ☰ = a sheet: Play through, Time Machine, What happened?,
├──────────────────────────────────┤         Surprise Me, Games, Display, ?
│ ‹Ancient Classical Medieval ...› │ 2   chips scroll sideways
│ [−][+]  1906 – 1932 · 26 yrs     │
│ ALL HISTORY ▁▂▃[▐▌]▆▇█           │
├──────────────────────────────────┤
│ [Timeline|Lanes|Const.]  View ▾  │ 3   View ▾ = a sheet: axes or lanes, detail, filters
├──────────────────────────────────┤
│            the chart             │ 4   side panels stay bottom sheets, as today
└──────────────────────────────────┘
```
🔍 opens the search box across the header.

## 6. Every control, old place → new place

| Control | Today | New |
|---|---|---|
| DateFlow title | Toolbar, left | Band 1, left |
| Years on screen ("1906 – 1932 · 26 years") | Under the title | Band 2, after − + (and on the overview's box) |
| Timeline / Lanes / Constellation | Toolbar | Band 3, left |
| Constellation axes | Toolbar, Constellation only (moves everything) | Band 3, layout's slot |
| Lanes menu | Toolbar, Lanes only (moves everything) | Band 3, layout's slot |
| Simple / Standard / Detailed | Toolbar (folded on phones) | Band 3, right |
| Filters ▾ | Toolbar (folded on phones) | Band 3, right |
| Filter summary ("Showing: …") | Footer | Band 3, right, under Filters |
| Focus (legend) | Footer legend | Footer legend; state also in Band 3's summary |
| Search + Go | Toolbar, middle | Band 1, left |
| Journeys ▾ | Toolbar | Band 1, guided paths |
| Chains ▾ | More fold | Band 1, beside Journeys |
| Play through | More fold | Band 1 (laptop: More ▾) |
| Time Machine | More fold | Band 1 |
| What happened? | More fold | Band 1 |
| Surprise Me | More fold | Band 1 (laptop: More ▾) |
| ▶ Games | More fold | Band 1, right |
| Colorful / Subtle | More fold | Band 1, Display ▾ |
| Light / dark | More fold | Band 1, Display ▾ |
| − + zoom | Toolbar | Band 2 |
| Era chips | Toolbar | Band 2, left |
| History overview | Under the toolbar | Band 2, with years on the box |
| ? (What's this?) | Toolbar | Band 1, right end |
| More ▾ | Toolbar, reflowing fold | Laptop only: fixed spot in Band 1 |
| Connections ringed · Clear | Above the footer | Unchanged |
| Copy link | In each panel | Unchanged |

## 7. Decisions for Ram

1. **Colours and theme in a Display ▾ menu**, or kept on the main row? *Recommendation:* the menu. They're set once, and the row is crowded.
2. **Years on screen in Band 2 as well as on the overview box?** *Recommendation:* yes. The box label is small, and the text also gives the length ("26 years").
3. **On a laptop, which guided paths fold into More ▾?** *Recommendation:* Play through and Surprise Me, keeping Journeys, Chains, Time Machine and What happened? visible.

## 8. Building it (after approval)

- Split `DateFlowToolbar.vue` into `DateFlowHeader.vue` (Band 1), `DateFlowTimeBar.vue` (Band 2's controls) and `DateFlowViewBar.vue` (Band 3). Reuse the existing pieces: `JourneysMenu`, `StoriesMenu` (Chains), `DateFlowFilters`, `DateFlowLanePicker`, `DENSITIES`, `TRACK_AXES`, the layout and colour lists, and the `.seg` / `.btn` styles.
- `DateFlowMinimap.vue`: draw the years on the box.
- `DateFlowView.vue`: mount the bands, and move the filter summary up from the footer.
- Keep every `data-help` key so help mode works. Reword the help texts that mention "More" or positions. Update doc 21 §3.
- The store and engine don't change: this is all layout. URLs don't change.
- **Checks:** lint, unit tests and build. A Playwright run at 1600, 1280 and 390px wide records every control's position, then switches through the three layouts and opens a journey, a chain and search results. It confirms nothing moved except inside the layout's slot. Help mode is checked on each band. Screenshots of all three widths go to Ram.
