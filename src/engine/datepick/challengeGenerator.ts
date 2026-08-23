import type { Event } from '@/types'
import type { DatePickChallenge, DatePickQuestion } from '@/types/datepick'
import { generateDistractors } from './distractorEngine'

// ── Seeded PRNG (mulberry32) — copied here to avoid modifying working engine ──
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function dateToSeed(dateStr: string): number {
  // Different salt from DateGolf to keep challenges independent
  const digits = 'datepick:' + dateStr
  let hash = 0
  for (let i = 0; i < digits.length; i++) {
    hash = Math.imul(31, hash) + digits.charCodeAt(i)
    hash |= 0
  }
  return hash
}

// ── Era bands — each has a count of how many questions to pull from it ────────
interface EraBand {
  label: string
  min: number
  max: number
  count: number
}

const ERA_BANDS: EraBand[] = [
  { label: 'ancient', min: -3000, max: 499, count: 1 },
  { label: 'medieval', min: 500, max: 1499, count: 1 },
  { label: 'earlyModern', min: 1500, max: 1799, count: 2 },
  { label: 'modern1800', min: 1800, max: 1899, count: 1 },
  { label: 'modern1900', min: 1900, max: 1949, count: 2 },
  { label: 'modern1950', min: 1950, max: 2024, count: 1 },
]
// Total: 8 questions

/**
 * Weighted random selection from a pool of events.
 * Weight = event.importance (1–5).
 */
function weightedSample(events: Event[], rng: () => number): Event {
  const totalWeight = events.reduce((s, e) => s + e.importance, 0)
  let r = rng() * totalWeight
  for (const e of events) {
    r -= e.importance
    if (r <= 0) return e
  }
  return events[events.length - 1]!
}

/**
 * Generate a deterministic 8-question DatePick challenge for a given date.
 * Pure TS — zero Vue/Pinia deps.
 */
export function generateDatePickChallenge(dateStr: string, allEvents: Event[]): DatePickChallenge {
  const seed = dateToSeed(dateStr)
  const rng = mulberry32(seed)

  const usedIds = new Set<string>()
  const questions: DatePickQuestion[] = []

  for (const band of ERA_BANDS) {
    const bandEvents = allEvents.filter((e) => e.year >= band.min && e.year <= band.max)

    for (let q = 0; q < band.count; q++) {
      // Filter out already-used events
      const available = bandEvents.filter((e) => !usedIds.has(e.id))

      let event: Event
      if (available.length === 0) {
        // Fallback: reuse from band if pool exhausted
        if (bandEvents.length === 0) continue
        event = bandEvents[Math.floor(rng() * bandEvents.length)]!
      } else {
        event = weightedSample(available, rng)
      }

      usedIds.add(event.id)

      const { choices, correctIndex } = generateDistractors(event, allEvents, rng)

      questions.push({
        eventId: event.id,
        eventName: event.name,
        eventYear: event.year,
        description: event.description,
        categories: event.categories,
        region: event.region,
        choices,
        correctIndex,
      })
    }
  }

  // Shuffle so questions aren't always presented in chronological era order
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[questions[i], questions[j]] = [questions[j]!, questions[i]!]
  }

  return {
    id: `datepick-${dateStr}`,
    date: dateStr,
    questions,
  }
}
