import type { Event } from '@/types'
import type { Duration, RelationshipData } from '@/types/dateflow'

// Connections (Phase 8): every link of one event or span, read from its own side.
// A link is stored once: on its source it reads forwards ("is part of"), on its target
// it reads with the inverse label ("includes").

export interface Connection {
  otherId: string
  kind: 'event' | 'span'
  name: string
  year: number // the event's year, or the span's start
  endYear?: number // spans only
  approximate?: boolean
  why: string
}

export interface ConnectionGroup {
  relation: string // "is part of", "includes", "was ended by"…
  type: string
  forward: boolean // true when the entity is the link's source
  items: Connection[]
}

/** Card order: what it belongs to first, then how it began and ended, then the rest; "includes" (often long) last. */
const ORDER = ['part_of>', 'began>', 'ended>', 'began<', 'ended<', 'preceded<', 'preceded>']
const LAST = 'part_of<'

function rank(type: string, forward: boolean): number {
  const key = `${type}${forward ? '>' : '<'}`
  if (key === LAST) return 1000
  const i = ORDER.indexOf(key)
  return i === -1 ? ORDER.length : i
}

/**
 * Resolve a link end to something showable. A shared id (an event and a span, one subject)
 * shows as its span: "Napoleonic Wars, 1803–1815", not its event "Napoleonic Wars Begin".
 */
function resolve(id: string, events: Map<string, Event>, spans: Map<string, Duration>) {
  const s = spans.get(id)
  if (s) {
    return { kind: 'span' as const, name: s.name, year: s.startYear, endYear: s.endYear,
             ...(s.approximate ? { approximate: true } : {}) }
  }
  const e = events.get(id)
  if (e) return { kind: 'event' as const, name: e.name, year: e.year, ...(e.approximate ? { approximate: true } : {}) }
  return null
}

export function connectionsFor(
  id: string,
  data: RelationshipData,
  events: Event[],
  durations: Duration[],
): ConnectionGroup[] {
  const eventById = new Map(events.map((e) => [e.id, e]))
  const spanById = new Map(durations.map((d) => [d.id, d]))
  const groups = new Map<string, ConnectionGroup>()

  for (const link of data.links) {
    const forward = link.source === id
    if (!forward && link.target !== id) continue
    const type = data.types[link.type]
    if (!type) continue
    const otherId = forward ? link.target : link.source
    const other = resolve(otherId, eventById, spanById)
    if (!other) continue // hidden from this build (e.g. a filtered-out entity)
    const key = `${link.type}${forward ? '>' : '<'}`
    const group = groups.get(key) ?? { relation: forward ? type.label : type.inverse, type: link.type, forward, items: [] }
    group.items.push({ otherId, ...other, why: link.why })
    groups.set(key, group)
  }

  for (const g of groups.values()) g.items.sort((a, b) => a.year - b.year || a.name.localeCompare(b.name))
  return [...groups.values()].sort((a, b) => rank(a.type, a.forward) - rank(b.type, b.forward))
}

/** Every id directly connected to this one: for the timeline highlight. */
export function connectedIds(id: string, data: RelationshipData): Set<string> {
  const out = new Set<string>()
  for (const l of data.links) {
    if (l.source === id) out.add(l.target)
    else if (l.target === id) out.add(l.source)
  }
  return out
}
