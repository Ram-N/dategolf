import type { DatePickGameState } from '@/types/datepick'
import { copyText } from '@/services/sharing'

export const PLAY_URL = 'https://datepick.genwise.in/datepick'

export function buildShareText(state: DatePickGameState): string {
  const score = state.answers.filter((a) => a.isCorrect).length
  const total = state.questions.length
  const icons = state.answers.map((a) => (a.isCorrect ? '✅' : '❌')).join(' ')

  return [
    `📅 DatePick ${state.challengeDate}`,
    `My score: ${score} / ${total}`,
    icons,
    '',
    `Can you beat me? Play today's challenge:`,
    PLAY_URL,
  ].join('\n')
}

export async function copyResult(state: DatePickGameState): Promise<boolean> {
  return copyText(buildShareText(state))
}

export async function shareResult(
  state: DatePickGameState,
): Promise<'shared' | 'copied' | 'error'> {
  const text = buildShareText(state)

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
