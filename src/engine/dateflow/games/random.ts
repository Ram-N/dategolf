// Seeded randomness for DateFlow games. Daily rounds are seeded from the date string
// (plus game id) only — same date, same round for everyone.

/** mulberry32 — same generator DateGolf and DatePick use. */
export function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seedFrom(text: string): number {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = Math.imul(31, hash) + text.charCodeAt(i)
    hash |= 0
  }
  return hash
}

export type Rng = () => number

export const pickOne = <T>(items: T[], rng: Rng): T => items[Math.floor(rng() * items.length)]!

export function shuffle<T>(items: T[], rng: Rng): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

/** Up to n distinct items, in random order. */
export const sample = <T>(items: T[], n: number, rng: Rng): T[] => shuffle(items, rng).slice(0, n)
