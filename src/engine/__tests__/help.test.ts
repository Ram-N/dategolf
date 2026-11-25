import { describe, expect, it } from 'vitest'
import { HELP, helpKeyFor, isHelpKey } from '../dateflow/help'

// Every data-help key written in a component must have an entry (dynamic keys are listed by hand)
const sources = import.meta.glob(['/src/components/**/*.vue', '/src/views/*.vue'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>
const DYNAMIC = ['layout-timeline', 'layout-lanes', 'layout-constellation', 'state', 'period', 'person',
  'search-results', 'play-through']

describe('help', () => {
  it('has an entry for every data-help key in the app', () => {
    const used = new Set(DYNAMIC)
    for (const src of Object.values(sources)) for (const m of src.matchAll(/\sdata-help="([a-z-]+)"/g)) used.add(m[1]!)
    expect(used.size).toBeGreaterThan(30)
    expect([...used].filter((k) => !isHelpKey(k))).toEqual([])
  })

  it('points "see also" only at entries that exist, never at itself', () => {
    const bad = Object.entries(HELP).flatMap(([key, entry]) =>
      ((entry as { see?: string[] }).see ?? []).filter((s) => !isHelpKey(s) || s === key).map((s) => `${key} → ${s}`),
    )
    expect(bad).toEqual([])
  })

  it('falls back to DateFlow for untagged elements', () => {
    expect(helpKeyFor(null)).toBe('dateflow')
    expect(helpKeyFor('no-such-key')).toBe('dateflow')
    expect(helpKeyFor('lane')).toBe('lane')
  })
})
