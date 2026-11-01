// Marker colour groups. Scattered dots stay colourblind-safe with at most three
// hues (all-pairs check), so the event categories fold into three groups + Other.
// Order is fixed: it maps to palette slots 1–3 (--df-power / --df-knowledge / --df-culture).

export type CategoryGroup = 'power' | 'knowledge' | 'culture' | 'other'

export const CATEGORY_GROUPS: { id: CategoryGroup; label: string }[] = [
  { id: 'power', label: 'Politics & War' },
  { id: 'knowledge', label: 'Science & Discovery' },
  { id: 'culture', label: 'Culture & Society' },
  { id: 'other', label: 'Other' },
]

const BY_CATEGORY: Record<string, CategoryGroup> = {
  Politics: 'power',
  War: 'power',
  Science: 'knowledge',
  Technology: 'knowledge',
  Medicine: 'knowledge',
  Exploration: 'knowledge',
  Culture: 'culture',
  Religion: 'culture',
  Arts: 'culture',
  Social: 'culture',
  Sports: 'culture',
}

/** An event's group comes from its first (primary) category. */
export function groupFor(categories: string[]): CategoryGroup {
  return BY_CATEGORY[categories[0] ?? ''] ?? 'other'
}
