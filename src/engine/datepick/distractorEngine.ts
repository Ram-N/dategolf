import type { Event } from '@/types'

export interface DistractorResult {
  choices: number[] // 4 years including the correct one
  correctIndex: number
}

/**
 * Pure TS — zero Vue/Pinia deps.
 * Given an event, all events, and a seeded RNG, produces 3 distractor years
 * and returns all 4 choices shuffled with the correct year's index.
 */
export function generateDistractors(
  event: Event,
  allEvents: Event[],
  rng: () => number,
): DistractorResult {
  // Exclude the event itself and duplicates of its year
  const candidates = allEvents.filter(
    (e) => e.id !== event.id && e.year !== event.year,
  )

  // Score by proximity — prefer close years for challenge
  const scored = candidates
    .map((e) => ({ year: e.year, distance: Math.abs(e.year - event.year) }))
    .sort((a, b) => a.distance - b.distance)

  // Deduplicate years in scored list
  const seen = new Set<number>()
  const deduped: { year: number; distance: number }[] = []
  for (const s of scored) {
    if (!seen.has(s.year)) {
      seen.add(s.year)
      deduped.push(s)
    }
  }

  // Split into "close" (within 200 years) and "far" buckets
  const close = deduped.filter((s) => s.distance <= 200)
  const far = deduped.filter((s) => s.distance > 200)

  // Prefer 2–3 from close, fill remainder from far
  const distractorYears: number[] = []

  // Shuffle close bucket using rng for determinism
  const closeShuffled = fisherYatesShuffle(close, rng)
  const farShuffled = fisherYatesShuffle(far, rng)

  // Pick up to 3 close, then fill from far
  for (const c of closeShuffled) {
    if (distractorYears.length >= 3) break
    distractorYears.push(c.year)
  }
  for (const f of farShuffled) {
    if (distractorYears.length >= 3) break
    distractorYears.push(f.year)
  }

  // Edge case: still not enough — add synthetic years offset from event year
  const offsets = [10, -10, 25, -25, 50, -50, 100, -100]
  for (const offset of offsets) {
    if (distractorYears.length >= 3) break
    const synth = event.year + offset
    if (!distractorYears.includes(synth)) {
      distractorYears.push(synth)
    }
  }

  // Build final choices: [correct, d1, d2, d3] then shuffle
  const allChoices = [event.year, ...distractorYears.slice(0, 3)]
  const shuffled = fisherYatesShuffle(allChoices, rng)
  const correctIndex = shuffled.indexOf(event.year)

  return { choices: shuffled, correctIndex }
}

function fisherYatesShuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}
