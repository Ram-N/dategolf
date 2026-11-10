import type { Event } from '@/types'
import type { Duration, RelationshipData } from '@/types/dateflow'
import { resolve } from './connections'
import { laneFor, type LaneId } from './lanes'

// Stories (Phase 9): follow the links back ("How did we get here?") or forward ("What happened next?").
// Every story edge points earlier → later:
//   cause / sequence:  source → target          (Versailles contributed to the rise of Nazism)
//   began:             starter → span            (World War Two Begins began World War II)
//   ended:             span → ender              (World War II was ended by Japan's surrender)
// Accuracy: a sequence ("then…") is never presented as a cause, and debated links say so.

export type Direction = 'back' | 'forward'
export type Role = 'cause' | 'sequence' | 'frame'

export interface StoryNode {
  id: string
  kind: 'event' | 'span'
  name: string
  year: number // event year or span start
  endYear?: number
  approximate?: boolean
  region: string
  lane: LaneId
  depth: number // steps from the root (0 = the root)
}

export interface StoryEdge {
  from: string // earlier
  to: string // later
  type: string
  role: Role
  label: string // reads from `from` to `to`: "contributed to", "then", "began", "was ended by"
  why: string
  debated: boolean // medium or low confidence
  crossesRegion: boolean // the two ends sit in different DateFlow lanes
}

export interface Story {
  rootId: string
  direction: Direction
  nodes: StoryNode[] // chronological
  edges: StoryEdge[]
  backdrops: StoryNode[] // spans that hold several steps (World War II behind the WWII chain)
  truncated: boolean
  start: number
  end: number
}

export interface StoryOptions {
  direction?: Direction
  depth?: number
  max?: number
}

const ROLE_RANK: Record<Role, number> = { cause: 0, frame: 1, sequence: 2 }

/** Story edges (earlier → later) from the exported links; one per pair, a cause beating a sequence. */
function storyEdges(data: RelationshipData, lanes: Map<string, LaneId>): StoryEdge[] {
  const byPair = new Map<string, StoryEdge>()
  for (const l of data.links) {
    const t = data.types[l.type]
    if (!t || t.story === 'context') continue
    const [from, to, label] =
      l.type === 'ended' ? [l.target, l.source, t.inverse] : [l.source, l.target, t.story === 'sequence' ? 'then' : t.label]
    const role: Role = t.story === 'cause' ? 'cause' : t.story === 'sequence' ? 'sequence' : 'frame'
    const edge: StoryEdge = {
      from, to, type: l.type, role, label, why: l.why,
      debated: l.confidence === 'medium' || l.confidence === 'low',
      crossesRegion: !!lanes.get(from) && !!lanes.get(to) && lanes.get(from) !== lanes.get(to),
    }
    const key = `${from}>${to}`
    const kept = byPair.get(key)
    if (!kept || ROLE_RANK[role] < ROLE_RANK[kept.role]) byPair.set(key, edge)
  }
  return [...byPair.values()]
}

// Built once per data set: the edges and lookups every story uses.
interface Index {
  eventById: Map<string, Event>
  spanById: Map<string, Duration>
  edges: StoryEdge[]
  into: Map<string, StoryEdge[]>
  outOf: Map<string, StoryEdge[]>
  partOf: Map<string, string[]> // entity → spans it's part of
}
const indexes = new WeakMap<RelationshipData, { events: Event[]; durations: Duration[]; index: Index }>()

function indexFor(data: RelationshipData, events: Event[], durations: Duration[]): Index {
  const cached = indexes.get(data)
  if (cached && cached.events === events && cached.durations === durations) return cached.index
  const eventById = new Map(events.map((e) => [e.id, e]))
  const spanById = new Map(durations.map((d) => [d.id, d]))
  const lanes = new Map<string, LaneId>()
  for (const e of events) lanes.set(e.id, laneFor(e.region))
  for (const d of durations) lanes.set(d.id, laneFor(d.region)) // a shared id reads as its span
  const edges = storyEdges(data, lanes).filter((e) => lanes.has(e.from) && lanes.has(e.to))
  const into = new Map<string, StoryEdge[]>()
  const outOf = new Map<string, StoryEdge[]>()
  for (const e of edges) {
    into.set(e.to, [...(into.get(e.to) ?? []), e])
    outOf.set(e.from, [...(outOf.get(e.from) ?? []), e])
  }
  const partOf = new Map<string, string[]>()
  for (const l of data.links) {
    if (l.type === 'part_of') partOf.set(l.source, [...(partOf.get(l.source) ?? []), l.target])
  }
  const index = { eventById, spanById, edges, into, outOf, partOf }
  indexes.set(data, { events, durations, index })
  return index
}

export function buildStory(
  rootId: string,
  data: RelationshipData,
  events: Event[],
  durations: Duration[],
  { direction = 'back', depth = 4, max = 30 }: StoryOptions = {},
): Story | null {
  const ix = indexFor(data, events, durations)
  const node = (id: string, d: number): StoryNode | null => {
    const r = resolve(id, ix.eventById, ix.spanById)
    return r ? { id, ...r, lane: laneFor(r.region), depth: d } : null
  }
  const root = node(rootId, 0)
  if (!root) return null

  const nodes = new Map<string, StoryNode>([[rootId, root]])
  const used: StoryEdge[] = []
  let frontier = [rootId]
  let truncated = false
  for (let d = 1; d <= depth && frontier.length; d++) {
    const next: string[] = []
    for (const id of frontier) {
      const steps = direction === 'back' ? (ix.into.get(id) ?? []) : (ix.outOf.get(id) ?? [])
      for (const e of steps) {
        const otherId = direction === 'back' ? e.from : e.to
        if (!nodes.has(otherId)) {
          if (nodes.size >= max) {
            truncated = true
            continue
          }
          const n = node(otherId, d)
          if (!n) continue
          nodes.set(otherId, n)
          next.push(otherId)
        }
        used.push(e)
      }
    }
    frontier = next
  }
  // Steps beyond the depth limit: there's more to tell.
  if (frontier.some((id) => ((direction === 'back' ? ix.into : ix.outOf).get(id) ?? []).length)) truncated = true

  // Edges between any two story nodes (a step may have several causes inside the story).
  const edges = [...new Set(used)]
  for (const e of ix.edges) {
    if (nodes.has(e.from) && nodes.has(e.to) && !edges.includes(e)) edges.push(e)
  }

  // Backdrops: spans that two or more steps are part of, or that hold the root.
  const counts = new Map<string, number>()
  for (const id of nodes.keys()) for (const s of ix.partOf.get(id) ?? []) counts.set(s, (counts.get(s) ?? 0) + 1)
  const backdrops = [...counts]
    .filter(([s, n]) => !nodes.has(s) && (n >= 2 || (ix.partOf.get(rootId) ?? []).includes(s)))
    .map(([s]) => node(s, -1))
    .filter((n): n is StoryNode => !!n && n.kind === 'span')

  const ordered = chronological([...nodes.values()], edges)
  const ends = ordered.flatMap((n) => [n.year, n.endYear ?? n.year])
  return {
    rootId, direction, nodes: ordered, edges, backdrops, truncated,
    start: Math.min(...ends), end: Math.max(...ends),
  }
}

/** By year; within a year, a cause comes before its effect. */
function chronological(nodes: StoryNode[], edges: StoryEdge[]): StoryNode[] {
  const before = new Set(edges.map((e) => `${e.from}>${e.to}`))
  return [...nodes].sort((a, b) => a.year - b.year || (before.has(`${a.id}>${b.id}`) ? -1 : before.has(`${b.id}>${a.id}`) ? 1 : 0))
}

/**
 * Where a thread leaves its earlier end: an event at its year; a span at its start, or at its end
 * when the later end comes after it ("World War II was ended by Japan's surrender" leaves from 1945).
 */
export function joinFrom(a: StoryNode, b: StoryNode): number {
  if (a.endYear === undefined) return a.year
  return b.year >= a.endYear ? a.endYear : a.year
}

/** Where it arrives: an event at its year; a span at the point nearest the thread's start. */
export function joinTo(b: StoryNode, a: StoryNode): number {
  return b.endYear === undefined ? b.year : Math.min(Math.max(joinFrom(a, b), b.year), b.endYear)
}

/**
 * The years worth showing: where the threads join, and the events. A long span (the Soviet Union,
 * 1922–1991) only counts where its threads touch it, so its four 1985–1991 causes aren't squashed.
 */
export function frameYears(story: Story, onlyInto?: string): [number, number] {
  const byId = new Map(story.nodes.map((n) => [n.id, n]))
  const years: number[] = []
  for (const e of story.edges) {
    if (onlyInto && e.to !== onlyInto) continue
    const a = byId.get(e.from)
    const b = byId.get(e.to)
    if (a && b) years.push(joinFrom(a, b), joinTo(b, a))
  }
  const focus = onlyInto ? byId.get(onlyInto) : null
  if (focus) years.push(focus.year)
  if (!onlyInto) for (const n of story.nodes) if (n.kind === 'event') years.push(n.year)
  return years.length ? [Math.min(...years), Math.max(...years)] : [story.start, story.end]
}

/** Each stop with the story edges that lead into it (several = a fan of causes). */
export function storyStops(story: Story): { node: StoryNode; incoming: StoryEdge[] }[] {
  return story.nodes.map((node) => ({
    node,
    incoming: story.edges
      .filter((e) => e.to === node.id)
      .sort((a, b) => ROLE_RANK[a.role] - ROLE_RANK[b.role]),
  }))
}

/** Years from a to b. There's no year 0: 44 BCE (-44) to 14 CE is 57 years. */
export function yearGap(a: number, b: number): number {
  return b - a - (a < 0 && b > 0 ? 1 : 0)
}

/** "the same year", "a year later", "6 years later", "about 300 years later" (approximate dates). */
export function gapText(a: number, b: number, approximate = false): string {
  const n = Math.abs(yearGap(a, b))
  if (n === 0) return approximate ? 'around the same time' : 'the same year'
  const about = approximate ? 'about ' : ''
  return n === 1 ? `${about}a year later` : `${about}${n.toLocaleString()} years later`
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** A short paragraph from the story's own links, never claiming more than they do. */
export function narrate(story: Story, maxSentences = 6): string {
  const byId = new Map(story.nodes.map((n) => [n.id, n]))
  const sentences: string[] = []
  for (const { node, incoming } of storyStops(story)) {
    // Framing edges ("World War Two Begins began World War II") stay in the panel but would repeat here.
    const causes = incoming.filter((x) => x.role === 'cause')
    if (causes.length) {
      // A fan of causes reads as one sentence per kind: "A, B and C contributed to D."
      const byLabel = new Map<string, StoryEdge[]>()
      for (const c of causes) byLabel.set(c.label, [...(byLabel.get(c.label) ?? []), c])
      for (const [label, group] of byLabel) {
        const names = group.map((c) => byId.get(c.from)!.name)
        const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]
        const debated = group.some((c) => c.debated) ? (group.length > 1 ? ' (some debated)' : ' (debated)') : ''
        sentences.push(`${list} ${label} ${node.name}${debated}.`)
      }
      continue
    }
    const e = incoming.find((x) => x.role === 'sequence')
    if (!e) continue
    const from = byId.get(e.from)!
    sentences.push(`${capitalise(gapText(from.year, node.year, !!(from.approximate || node.approximate)))}: ${node.name}.`)
  }
  const extra = sentences.length - maxSentences
  return sentences.slice(0, maxSentences).join(' ') + (extra > 0 ? ` …and ${extra} more step${extra === 1 ? '' : 's'}.` : '')
}

/** How many stops a story would have behind and ahead of an entity (for the card buttons). */
export function storyCounts(id: string, data: RelationshipData, events: Event[], durations: Duration[]) {
  const size = (direction: Direction) => (buildStory(id, data, events, durations, { direction })?.nodes.length ?? 1) - 1
  return { back: size('back'), forward: size('forward') }
}

export interface FeaturedStory {
  rootId: string
  name: string // the root's name; the UI says "The story behind …"
  steps: number
  start: number
  end: number
  regions: number
}

/** The richest stories to offer in the Stories menu: deep, cross-regional and not repeating each other. */
export function featuredStories(data: RelationshipData, events: Event[], durations: Duration[], n = 8): FeaturedStory[] {
  const ix = indexFor(data, events, durations)
  const candidates = [...ix.into.keys()]
    .map((id) => buildStory(id, data, events, durations, { direction: 'back', depth: 6 }))
    .filter((s): s is Story => !!s && s.nodes.length >= 4)
    .map((s) => {
      const regions = new Set(s.nodes.map((x) => x.lane)).size
      const causes = s.edges.filter((e) => e.role === 'cause').length
      return { s, regions, score: s.nodes.length + 2 * regions + 1.5 * causes }
    })
    .sort((a, b) => b.score - a.score)
  const chosen: typeof candidates = []
  for (const c of candidates) {
    // Two stories that share a third of their steps (or 3+) tell the same story: keep the richer one.
    const ids = new Set(c.s.nodes.map((x) => x.id))
    const overlaps = chosen.some((k) => {
      const shared = k.s.nodes.filter((x) => ids.has(x.id)).length
      return shared >= 3 || shared > ids.size / 3
    })
    if (!overlaps) chosen.push(c)
    if (chosen.length >= n) break
  }
  return chosen.map(({ s, regions }) => ({
    rootId: s.rootId,
    name: s.nodes.find((x) => x.id === s.rootId)!.name,
    steps: s.nodes.length,
    start: s.start,
    end: s.end,
    regions,
  }))
}
