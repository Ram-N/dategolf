import type { GameState } from '@/types'

const SCORE_ICONS = ['🟩', '🟨', '🟥'] // good / warning / danger

function holeIcon(penalty: number): string {
  if (penalty <= 5) return '🟩'
  if (penalty <= 50) return '🟨'
  return '🟥'
}

export function buildShareText(state: GameState): string {
  const holes = state.holeResults.map(r => holeIcon(r.penalty)).join(' ')
  const scores = state.holeResults.map(r => r.penalty).join(' / ')
  const date = state.challengeDate

  return [
    `DateGolf ${date}`,
    `Score: ${state.totalScore}`,
    holes,
    scores,
    'https://dategolf.app',
  ].join('\n')
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

  // Clipboard fallback
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'error'
  }
}
