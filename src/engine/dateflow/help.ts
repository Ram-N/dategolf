// "What's this?" help mode (doc 18, 5b): with help on, a click on anything tagged `data-help="<key>"`
// shows that key's entry instead of doing the usual thing. Written for students, from the glossary
// (doc 21); keep the two in step when a term changes.

export interface HelpEntry {
  title: string
  text: string
  /** Something to try, in a line of its own. */
  tip?: string
  /** Other help keys (checked by a test). */
  see?: string[]
}

export const HELP = {
  dateflow: {
    title: 'DateFlow',
    text: 'A map of time: from the first writing to today, left to right. Events, empires, periods and people all sit where they belong in time, so you can see what came before, after and at the same time.',
    tip: 'In help mode, click anything to learn what it is. Press Esc, or ? again, to leave.',
    see: ['layout-timeline', 'event', 'zoom'],
  },
  'layout-timeline': {
    title: 'Timeline layout',
    text: 'One road through history: every event from every region on a single line, with empires, periods and people as bars underneath. Best for the big story of a stretch of time.',
    tip: 'Busy places can crowd out quieter ones. Try Lanes to give each region its own row.',
    see: ['layout-lanes', 'layout-constellation', 'state'],
  },
  'layout-lanes': {
    title: 'Lanes layout',
    text: 'A lane for each region, side by side, each with its own events and bars. Use it to compare what was happening in different places at the same time.',
    tip: 'Choose which regions get a lane, and their order, in the Lanes menu.',
    see: ['region', 'lanes-menu', 'layout-timeline'],
  },
  'layout-constellation': {
    title: 'Constellation layout',
    text: 'Every event a star: each dot is one event, placed at its year and sorted into tracks. Bigger dots are more important events; the shape and colour say what kind of event it is.',
    tip: 'Hover a dot for its name, click it to read about it.',
    see: ['track', 'axis', 'family'],
  },
  lane: {
    title: 'A lane',
    text: "One region's row in the Lanes layout: that region's events above and below its line, and its empires, periods and people as bars.",
    see: ['region', 'lanes-menu'],
  },
  region: {
    title: 'Regions',
    text: 'Where something happened. DateFlow uses seven: South Asia, East Asia, Europe, Middle East, Africa, Americas and Global (for things that touched many places). Smaller areas sit in the nearest one: Southeast Asia with East Asia, Central Asia with the Middle East, Oceania with Global.',
    tip: 'Switch a region off in Filters to hide it everywhere.',
    see: ['filters', 'layout-lanes'],
  },
  track: {
    title: 'A track',
    text: "One row of the Constellation. What the tracks mean depends on the axis you pick: regions, kinds of event, parts of society, or empires and states.",
    tip: "Click a track's name to switch it off, and again to switch it back on.",
    see: ['axis', 'layout-constellation'],
  },
  axis: {
    title: 'Sorting the Constellation',
    text: "Choose what the tracks mean. Geography: a track per region. Human activity: a track per family of events, matching the legend's shapes. Society: trade, science, belief, the arts and more (politics and war start switched off). Empires & states: a row per empire or state, across its lifetime.",
    see: ['track', 'family', 'state'],
  },
  event: {
    title: 'An event',
    text: 'Something that happened at one point in time: a battle, an invention, a coronation. The shape and colour of its marker show its family. "c." before a year means the date is approximate: historians know it only roughly.',
    tip: 'Click it to read why it matters, how it connects to other events, and what was happening elsewhere.',
    see: ['family', 'event-card'],
  },
  dot: {
    title: 'A star (event)',
    text: 'Each dot in the Constellation is one event. Bigger dots are more important events; the shape and colour show its family.',
    tip: 'Hover for its name and year, click to open it.',
    see: ['event', 'family', 'track'],
  },
  quiet: {
    title: 'A small marker',
    text: 'An event that Detailed shows but that had no room for its name at this zoom.',
    tip: 'Hover for its name, click to open it, or zoom in to make room for the label.',
    see: ['density', 'zoom'],
  },
  'hidden-dot': {
    title: 'Events waiting to appear',
    text: 'Faint dots on the line are events too small to show at this zoom. The footer says how many are in view.',
    tip: 'Zoom in (scroll, pinch, or +) and they appear with their names.',
    see: ['zoom', 'density'],
  },
  state: {
    title: 'An empire or state',
    text: 'A solid bar from the year a state began to the year it ended: empires, kingdoms, dynasties, republics, city-states. Some empires are shaded by phase: lightest as they begin and end, strongest at their height.',
    tip: 'Click a bar to read its story. Empires, periods and lives are all "spans": things with a start and an end.',
    see: ['period', 'person', 'span-card'],
  },
  period: {
    title: 'A period',
    text: "Something that lasted but wasn't a state: a war, a movement, an age of culture like the Renaissance. Drawn dashed, to tell it apart from empires and states.",
    tip: 'Click a bar to read about it. Empires, periods and lives are all "spans": things with a start and an end.',
    see: ['state', 'current'],
  },
  person: {
    title: 'A life',
    text: "A person's life, from birth to death, in the People row.",
    tip: 'Click it to see who else was alive at the same time.',
    see: ['state', 'period'],
  },
  milestone: {
    title: 'A milestone',
    text: 'One of 16 turning points in world history, like the first writing, the printing press or the Moon landing. Its dashed line runs through every row, so you can see what came before and after it everywhere.',
    tip: 'Hover the line or its tag for the event, click to read about it.',
    see: ['era', 'event'],
  },
  era: {
    title: 'An era',
    text: 'One of five big slices of history: Ancient (to 800 BCE), Classical (800 BCE to 500 CE), Medieval (500–1500), Early Modern (1500–1800) and Modern (since 1800). Historians draw these borders in different places; they are a guide, not hard lines.',
    tip: 'Click an era button to show exactly its years; All shows everything.',
    see: ['milestone', 'zoom'],
  },
  current: {
    title: 'A historical current',
    text: 'A long movement, like the Renaissance or the Industrial Revolution, drawn as a soft band behind the timeline. A dashed edge means its start or end is approximate.',
    tip: 'Click its name to read about it.',
    see: ['period'],
  },
  family: {
    title: 'Families of events',
    text: 'Every event belongs to a family, shown by its shape and colour: Politics & Governance, Wars & Conflicts, Science & Technology, Exploration & Environment, Arts & Culture, Religion & Philosophy, Economy & Trade, Society & People.',
    tip: 'Click a family in the legend to focus on it: the rest fade. Esc or Show all brings everything back.',
    see: ['colours', 'filters'],
  },
  density: {
    title: 'How much to show',
    text: 'Simple: only the bigger events, without bars or milestone lines. Standard: the usual timeline. Detailed: more events at every zoom, with a small marker for each one that has no room for a label.',
    see: ['quiet', 'zoom', 'filters'],
  },
  filters: {
    title: 'Filters',
    text: 'Pick categories to see only those events (none picked shows them all), and switch regions off to hide them in every layout.',
    tip: 'The footer shows what is filtered; Clear brings everything back.',
    see: ['region', 'play-through'],
  },
  'lanes-menu': {
    title: 'The Lanes menu',
    text: 'Choose which regions get a lane in the Lanes layout, and move them up or down. Four at a time leaves room for labels. A region switched off in Filters shows as "off" here.',
    see: ['layout-lanes', 'region'],
  },
  search: {
    title: 'Search',
    text: 'Type a name (an event, empire or person, like "Mughal" or "Gutenberg") to ring every match on the timeline and list them in time order. Type a year (like "500 BC") to jump there instead.',
    see: ['search-results', 'zoom'],
  },
  'search-results': {
    title: 'Search results',
    text: 'The matches in time order. Step through them with ‹ ›, or press ▶ Play to move through them on their own. Overview shows them all at once.',
    see: ['search', 'play-through'],
  },
  'play-through': {
    title: 'Play through',
    text: 'Steps through every event your filters let through, one at a time, like a slideshow of history.',
    tip: 'Set the filters first: pick Science, say, to play through a history of science.',
    see: ['filters', 'search-results'],
  },
  zoom: {
    title: 'Moving around',
    text: 'Zoom in to see more events and their names; zoom out for the big picture. Scroll or pinch on the timeline, or use − and +. Drag to move along; the ← → keys work too.',
    see: ['view-range', 'minimap', 'era'],
  },
  'view-range': {
    title: 'The years on screen',
    text: 'The years you are looking at now, and how many years that is.',
    see: ['zoom', 'minimap'],
  },
  minimap: {
    title: 'The history overview',
    text: 'All of history at a glance. Each little bar shows how many events DateFlow has in that stretch of time; the box is what is on screen, and the shaded wedge shows it opening out into the timeline below.',
    tip: 'Click anywhere on it to jump there, or drag the box.',
    see: ['zoom', 'view-range'],
  },
  journeys: {
    title: 'Journeys',
    text: 'Guided paths through a big theme, like the rise and fall of empires or the history of ideas, stop by stop, with the timeline moving as you go. The menu remembers where you stopped.',
    see: ['stories', 'layout-timeline'],
  },
  stories: {
    title: 'Stories',
    text: 'Follow causes and consequences: from one event back through what led to it (How did we get here?) or forward to what came next. Threads on the timeline show each connection.',
    tip: 'A thin grey "then" means one thing came after another, not that it caused it.',
    see: ['story-thread', 'journeys'],
  },
  'story-thread': {
    title: 'A story thread',
    text: "An arrow from one event in a story to the next. Its colour and style say how they're connected; the key is in the story panel.",
    tip: 'Hover or click it to read the connection.',
    see: ['stories'],
  },
  'time-machine': {
    title: 'Time Machine',
    text: 'See the whole world in one year; compare two years (what was gone, new or still there); see how long two empires or periods existed together; or how far apart two events were.',
    see: ['what-happened', 'state'],
  },
  surprise: {
    title: 'Surprise Me',
    text: 'Opens a random event from what is on show and frames it on the timeline: a good way to find something new.',
    see: ['event', 'stories'],
  },
  'what-happened': {
    title: 'What happened?',
    text: 'Sums up the years on screen: the empires and states, the periods, and the top events around the world.',
    tip: 'Hold Shift and drag across the timeline to sum up any stretch of years.',
    see: ['time-machine', 'zoom'],
  },
  games: {
    title: 'Games',
    text: "Six quick quizzes using DateFlow's events: Which Came First?, Put Them in Order, What's Missing?, What's Happening Elsewhere?, Find the Duration, and Cause & Effect.",
  },
  colours: {
    title: 'Colours',
    text: 'Pick Colorful or Subtle. Colorful gives each family its own colour; Subtle uses three colours that are easier to tell apart for colour-blind eyes. The shapes stay the same in both.',
    see: ['family', 'theme'],
  },
  theme: {
    title: 'Light or dark',
    text: 'Switch the page between light and dark.',
    see: ['colours'],
  },
  more: {
    title: 'More',
    text: "Holds the tools that don't fit on a smaller screen: Time Machine, Surprise Me, Play through, Stories, What happened?, Games and the colour settings.",
  },
  'event-card': {
    title: "An event's card",
    text: 'When and where it happened, why it matters, how it connects to other events, and what was happening elsewhere at the same time (Meanwhile).',
    tip: 'Show connections rings the connected events on the timeline.',
    see: ['connections', 'stories'],
  },
  'span-card': {
    title: 'The card for an empire, period or life',
    text: 'Its years and its story. Some empires also show their life cycle, phase by phase, from foundation to end.',
    tip: 'Compare with opens the Time Machine to set it beside another empire or period.',
    see: ['state', 'time-machine'],
  },
  connections: {
    title: 'Connections',
    text: 'The events connected to the one you chose are ringed on the timeline, and the rest fade.',
    tip: 'Clear, or Esc, removes the rings.',
    see: ['event-card', 'stories'],
  },
} satisfies Record<string, HelpEntry>

export type HelpKey = keyof typeof HELP

export const isHelpKey = (key: string | null | undefined): key is HelpKey => !!key && key in HELP

/** The help entry for an element: its own key or its nearest tagged ancestor's, else DateFlow's. */
export function helpKeyFor(tagged: string | null | undefined): HelpKey {
  return isHelpKey(tagged) ? tagged : 'dateflow'
}
