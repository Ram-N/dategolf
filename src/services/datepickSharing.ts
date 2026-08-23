import type { DatePickGameState } from '@/types/datepick'

export function buildShareText(state: DatePickGameState): string {
  const score = state.answers.filter((a) => a.isCorrect).length
  const total = state.questions.length
  const icons = state.answers.map((a) => (a.isCorrect ? '✅' : '❌')).join(' ')
  const date = state.challengeDate

  return [`DatePick ${date}`, `${score} / ${total}`, icons, 'dategolf.app/datepick'].join('\n')
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

  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'error'
  }
}
