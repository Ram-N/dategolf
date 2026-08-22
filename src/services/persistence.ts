import type { GameState, PlayerStats, PersistedSession } from '@/types'

const KEYS = {
  SESSION: 'dategolf_session',
  STATS: 'dategolf_stats',
} as const

// ── Session (today's game state) ──────────────────────────────────────────────
export function saveSession(state: GameState): void {
  const session: PersistedSession = { date: state.challengeDate, state }
  try {
    localStorage.setItem(KEYS.SESSION, JSON.stringify(session))
  } catch {
    // localStorage may be unavailable (private mode quota, etc.)
  }
}

export function loadSession(todayDate: string): GameState | null {
  try {
    const raw = localStorage.getItem(KEYS.SESSION)
    if (!raw) return null
    const session: PersistedSession = JSON.parse(raw)
    if (session.date !== todayDate) return null
    return session.state
  } catch {
    return null
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEYS.SESSION)
  } catch {}
}

// ── Player stats ──────────────────────────────────────────────────────────────
const DEFAULT_STATS: PlayerStats = {
  streak: 0,
  longestStreak: 0,
  bestScore: null,
  totalGames: 0,
  recentScores: [],
  lastPlayedDate: null,
}

export function loadStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(KEYS.STATS)
    if (!raw) return { ...DEFAULT_STATS }
    return { ...DEFAULT_STATS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_STATS }
  }
}

export function recordCompletion(state: GameState): PlayerStats {
  const stats = loadStats()
  const today = state.challengeDate

  // Streak logic: consecutive calendar days
  const yesterday = getYesterday(today)
  if (stats.lastPlayedDate === yesterday) {
    stats.streak += 1
  } else if (stats.lastPlayedDate === today) {
    // already played today — don't double-count
  } else {
    stats.streak = 1
  }

  stats.longestStreak = Math.max(stats.longestStreak, stats.streak)
  stats.lastPlayedDate = today
  stats.totalGames += 1
  stats.bestScore =
    stats.bestScore === null ? state.totalScore : Math.min(stats.bestScore, state.totalScore)
  stats.recentScores = [state.totalScore, ...stats.recentScores].slice(0, 10)

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
