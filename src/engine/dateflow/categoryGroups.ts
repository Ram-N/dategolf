// Category families (Phase 11, doc 16 §3). Eight families, each with its own marker
// shape in every colour mode, so colour is never the only cue. Colours live in
// dateflow-theme.css as --df-f-<id>: Colorful gives each family a hue; Subtle folds
// them onto the three colourblind-safe group hues (Politics & War / Science &
// Discovery / Culture & Society).

export type Family = 'politics' | 'war' | 'science' | 'arts' | 'belief' | 'economy' | 'society' | 'earth'
export type Shape = 'circle' | 'triangle' | 'diamond' | 'star' | 'hexagon' | 'square' | 'down' | 'cross'

export const FAMILIES: { id: Family; label: string; shape: Shape }[] = [
  { id: 'politics', label: 'Politics & Governance', shape: 'circle' },
  { id: 'war', label: 'Wars & Conflicts', shape: 'triangle' },
  { id: 'science', label: 'Science & Technology', shape: 'diamond' },
  { id: 'earth', label: 'Exploration & Environment', shape: 'cross' },
  { id: 'arts', label: 'Arts & Culture', shape: 'star' },
  { id: 'belief', label: 'Religion & Philosophy', shape: 'hexagon' },
  { id: 'economy', label: 'Economy & Trade', shape: 'square' },
  { id: 'society', label: 'Society & People', shape: 'down' },
]

export const FAMILY_BY_CATEGORY: Readonly<Record<string, Family>> = {
  Politics: 'politics',
  War: 'war',
  Science: 'science',
  Technology: 'science',
  Medicine: 'science',
  Arts: 'arts',
  Culture: 'arts',
  Sports: 'arts',
  Religion: 'belief',
  Philosophy: 'belief',
  Economy: 'economy',
  Social: 'society',
  Exploration: 'earth',
  Disasters: 'earth',
}

const SHAPE_OF = new Map(FAMILIES.map((f) => [f.id, f.shape]))

/** An event's family comes from its primary category; anything unknown counts as Society. */
export function familyFor(categories: string[]): Family {
  return FAMILY_BY_CATEGORY[categories[0] ?? ''] ?? 'society'
}

export function shapeOf(family: Family): Shape {
  return SHAPE_OF.get(family) ?? 'circle'
}

const r2 = (n: number) => Math.round(n * 100) / 100

function polygon(cx: number, cy: number, pts: [number, number][]): string {
  return 'M' + pts.map(([x, y]) => `${r2(cx + x)},${r2(cy + y)}`).join('L') + 'Z'
}

function ring(n: number, radius: number, start: number): [number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const a = start + (i * 2 * Math.PI) / n
    return [radius * Math.cos(a), radius * Math.sin(a)]
  })
}

/**
 * SVG path for a marker of `shape` centred on (cx, cy). `r` is the radius a circle
 * would have; every shape is scaled to about the same area, so none looks more important.
 */
export function shapePath(shape: Shape, cx: number, cy: number, r: number): string {
  const up = -Math.PI / 2
  switch (shape) {
    case 'circle':
      return `M${r2(cx - r)},${r2(cy)}a${r2(r)},${r2(r)} 0 1,0 ${r2(2 * r)},0a${r2(r)},${r2(r)} 0 1,0 ${r2(-2 * r)},0Z`
    case 'square': {
      const h = r * 0.886 // half-side for equal area: √π / 2
      return polygon(cx, cy, [[-h, -h], [h, -h], [h, h], [-h, h]])
    }
    case 'diamond': {
      const d = r * 1.253 // √(π/2)
      return polygon(cx, cy, [[0, -d], [d, 0], [0, d], [-d, 0]])
    }
    case 'triangle':
      return polygon(cx, cy + r * 0.2, ring(3, r * 1.555, up)) // nudged down so it sits centred by eye
    case 'down':
      return polygon(cx, cy - r * 0.2, ring(3, r * 1.555, -up))
    case 'hexagon':
      return polygon(cx, cy, ring(6, r * 1.1, up))
    case 'star': {
      const outer = r * 1.45
      const pts = ring(10, 1, up).map(([x, y], i): [number, number] => {
        const k = i % 2 === 0 ? outer : outer * 0.5
        return [x * k, y * k]
      })
      return polygon(cx, cy, pts)
    }
    case 'cross': {
      const a = r * 1.1
      const b = r * 0.4
      return polygon(cx, cy, [
        [-b, -a], [b, -a], [b, -b], [a, -b], [a, b], [b, b],
        [b, a], [-b, a], [-b, b], [-a, b], [-a, -b], [-b, -b],
      ])
    }
  }
}
