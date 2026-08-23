import type { DatePickGameState, DatePickStats } from '@/types/datepick'

const KEYS = {
  SESSION: 'datepick_session',
  STATS: 'datepick_stats',
} as const

interface PersistedDatePickSession {
  date: string
  state: DatePickGameState
}

// ── Session ────────────────────────────────────────────────────────────────────

export function saveSession(state: DatePickGameState): void {
  const session: PersistedDatePickSession = { date: state.challengeDate, state }
  try {
    localStorage.setItem(KEYS.SESSION, JSON.stringify(session))
  } catch {
    // localStorage may be unavailable (private mode, quota, etc.)
  }
}

export function loadSession(todayDate: string): DatePickGameState | null {
  try {
    const raw = localStorage.getItem(KEYS.SESSION)
    if (!raw) return null
    const session: PersistedDatePickSession = JSON.parse(raw)
    if (session.date !== todayDate) return null
    return session.state
  } catch {
    return null
  }
}

// ── Stats ──────────────────────────────────────────────────────────────────────

const DEFAULT_STATS: DatePickStats = {
  streak: 0,
  bestScore: null,
  totalGames: 0,
  lastPlayedDate: null,
}

export function loadStats(): DatePickStats {
  try {
    const raw = localStorage.getItem(KEYS.STATS)
    if (!raw) return { ...DEFAULT_STATS }
    return { ...DEFAULT_STATS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_STATS }
  }
}

export function recordCompletion(state: DatePickGameState): DatePickStats {
  const stats = loadStats()
  const today = state.challengeDate
  const score = state.answers.filter((a) => a.isCorrect).length

  // Streak logic: consecutive calendar days
  const yesterday = getYesterday(today)
  if (stats.lastPlayedDate === yesterday) {
    stats.streak += 1
  } else if (stats.lastPlayedDate === today) {
    // already played today — don't double-count
  } else {
    stats.streak = 1
  }

  stats.lastPlayedDate = today
  stats.totalGames += 1
  stats.bestScore = stats.bestScore === null ? score : Math.max(stats.bestScore, score)

  try {
    localStorage.setItem(KEYS.STATS, JSON.stringify(stats))
  } catch {}

  return stats
}

function getYesterday(dateStr: string): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}
