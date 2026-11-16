import type { Event } from '@/types'
import type { Rng } from './games/random'

// "Surprise Me" (issue #2): a random event to start exploring from. Not a daily game, so it
// isn't seeded — the caller passes the rng (Math.random in the app, a seeded one in tests).

/** How many recent picks to avoid repeating. */
export const SURPRISE_MEMORY = 20

/**
 * A random event from `events` (already filtered by the caller). Prefers events that `hasStory`
 * (so "How did we get here?" / "What happened next?" have somewhere to go), and skips the recent
 * picks while anything else is left. Null when `events` is empty.
 */
export function pickSurprise(
  events: Event[],
  hasStory: (id: string) => boolean,
  rng: Rng,
  recent: string[] = [],
): Event | null {
  const seen = new Set(recent)
  const tiers = [
    events.filter((e) => !seen.has(e.id) && hasStory(e.id)),
    events.filter((e) => !seen.has(e.id)),
    events,
  ]
  const pool = tiers.find((t) => t.length > 0)
  return pool ? pool[Math.floor(rng() * pool.length)]! : null
}

/** The recent-picks list after picking `id`: newest last, capped at SURPRISE_MEMORY. */
export const rememberPick = (recent: string[], id: string): string[] =>
  [...recent.filter((r) => r !== id), id].slice(-SURPRISE_MEMORY)
