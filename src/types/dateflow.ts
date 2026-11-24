// ── Span ──────────────────────────────────────────────────────────────────
// Something that lasted: a state (empire, kingdom, dynasty, republic…) or a period (war, movement, life).
// Source: src/data/durations.json (validate with scripts/validate-durations.cjs).
export interface Span {
  id: string
  name: string
  startYear: number // BCE years are negative, like Event.year
  endYear: number
  description: string
  significance?: string // "Why it matters" (reviewed); absent until one is written
  categories: string[]
  region: string
  importance: number // 1–9, same scale as events
  kind: 'state' | 'period'
  approximate?: boolean // start/end are traditional or disputed dates
  dateDisplay?: string // historians' dates or the dispute, e.g. "traditionally 563–483 BCE; many scholars c. 480–400 BCE"
  current?: boolean // a Historical Current: drawn as a background band (step 3d)
  phases?: Phase[] // life-cycle phases (Phase 12): contiguous, covering startYear–endYear
  person?: boolean // a person's life, birth to death (Phase 13): drawn in the People row
  role?: string // a person's role, e.g. "Mughal emperor"
}

// A life-cycle phase of an empire or period. The kind is neutral and drives the colour; the title says
// what happened (never a verdict like "golden age" or "decline").
export type PhaseKind = 'foundation' | 'expansion' | 'consolidation' | 'height' | 'transformation' | 'contraction' | 'end'
export interface Phase {
  kind: PhaseKind
  title: string
  start: number
  end: number
  description: string
  approximate?: boolean
  dateDisplay?: string
  startEvent?: string // the milestone event that opens it
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
