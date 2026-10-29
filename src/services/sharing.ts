import type { GameState } from '@/types'
import { penaltyTier, TIER_EMOJI } from '@/utils/penaltyTier'

export const PLAY_URL = 'https://dategolf.genwise.in/dategolf'

export function buildShareText(state: GameState): string {
  const holes = state.holeResults.map(r => TIER_EMOJI[penaltyTier(r.penalty)]).join(' ')
  const scores = state.holeResults.map(r => `+${r.penalty}`).join(' / ')

  return [
    `⛳ DateGolf ${state.challengeDate}`,
    `My score: ${state.totalScore} (lower is better)`,
    holes,
    scores,
    '',
    `Can you beat me? Play today's challenge:`,
    PLAY_URL,
  ].join('\n')
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Clipboard API needs a secure context (e.g. fails over http on a LAN IP)
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

export async function copyResult(state: GameState): Promise<boolean> {
  return copyText(buildShareText(state))
}

export async function shareResult(state: GameState): Promise<'shared' | 'copied' | 'error'> {
  const text = buildShareText(state)

  // Try Web Share API first (mobile-friendly)
  if (navigator.share) {
    try {
      await navigator.share({ text })
      return 'shared'
    } catch {
      // User cancelled or error — fall through to clipboard
    }
  }

  return (await copyText(text)) ? 'copied' : 'error'
}
