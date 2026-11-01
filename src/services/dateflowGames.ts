import { copyText } from '@/services/sharing'
import type { GameId } from '@/engine/dateflow/games/rounds'

// DateFlow games: today's daily scores (no streaks yet) and share text.

const scoreKey = (game: GameId, date: string) => `dateflow:daily:${game}:${date}`

export function loadDailyScore(game: GameId, date: string): number | null {
  try {
    const raw = localStorage.getItem(scoreKey(game, date))
    return raw === null ? null : Number(raw)
  } catch {
    return null
  }
}

/** Keeps the first completed attempt of the day. */
export function saveDailyScore(game: GameId, date: string, score: number) {
  try {
    if (localStorage.getItem(scoreKey(game, date)) === null) localStorage.setItem(scoreKey(game, date), String(score))
  } catch {
    // storage unavailable — score just won't show on the hub
  }
}

export function buildGameShareText(title: string, label: string, results: boolean[], url: string): string {
  const score = results.filter(Boolean).length
  return [
    `🌊 DateFlow · ${title} · ${label}`,
    `${results.map((r) => (r ? '✅' : '❌')).join('')}  ${score}/${results.length}`,
    url,
  ].join('\n')
}

export async function shareGameResult(text: string): Promise<'shared' | 'copied' | 'error'> {
  if (navigator.share) {
    try {
      await navigator.share({ text })
      return 'shared'
    } catch {
      // cancelled or unsupported — fall through to clipboard
    }
  }
  return (await copyText(text)) ? 'copied' : 'error'
}
