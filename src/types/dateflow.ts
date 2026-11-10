// ── Duration ──────────────────────────────────────────────────────────────────
// Something that lasted: an empire/dynasty, or a period (war, movement, era).
// Source: src/data/durations.json (validate with scripts/validate-durations.cjs).
export interface Duration {
  id: string
  name: string
  startYear: number // BCE years are negative, like Event.year
  endYear: number
  description: string
  categories: string[]
  region: string
  importance: number // 1–9, same scale as events
  kind: 'empire' | 'period'
  approximate?: boolean // start/end are traditional or disputed dates
}

// ── Relationships ─────────────────────────────────────────────────────────────
// Reviewed links between events and spans. Source: src/data/relationships.json
// (generated from the db; validate with scripts/validate-relationships.cjs).
export interface RelationshipType {
  label: string // read from the source: "is part of"
  inverse: string // read from the target: "includes"
  causal: boolean
  story: 'cause' | 'sequence' | 'frame' | 'context' // how stories (Phase 9) use it; a sequence is never a cause
}

export interface Relationship {
  source: string
  type: string
  target: string
  why: string
  confidence?: 'high' | 'medium' | 'low' // medium/low = debated, shown dashed
}

export interface RelationshipData {
  types: Record<string, RelationshipType>
  links: Relationship[]
}
