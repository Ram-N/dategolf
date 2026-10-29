// Per-hole rating shared by the header (dots + penalty bar) and the share text
export type PenaltyTier = 'good' | 'ok' | 'bad'

export function penaltyTier(penalty: number): PenaltyTier {
  if (penalty <= 20) return 'good'
  if (penalty <= 75) return 'ok'
  return 'bad'
}

export const TIER_COLORS: Record<PenaltyTier, string> = {
  good: '#22c55e', // green-500
  ok: '#f59e0b',   // amber-400
  bad: '#ef4444',  // red-500
}

// Tailwind text color for a penalty number
export function penaltyTextClass(penalty: number): string {
  return TIER_TEXT_CLASS[penaltyTier(penalty)]
}

const TIER_TEXT_CLASS: Record<PenaltyTier, string> = {
  good: 'text-green-400',
  ok: 'text-yellow-400',
  bad: 'text-red-400',
}

export const TIER_EMOJI: Record<PenaltyTier, string> = {
  good: '🟩',
  ok: '🟨',
  bad: '🟥',
}
