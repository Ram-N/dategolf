import type { DailyChallenge } from '@/types'

// ── Seeded PRNG (mulberry32) ───────────────────────────────────────────────────
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
  // Convert "YYYY-MM-DD" to a deterministic integer seed
  const digits = dateStr.replace(/-/g, '')
  let hash = 0
  for (let i = 0; i < digits.length; i++) {
    hash = Math.imul(31, hash) + digits.charCodeAt(i)
    hash |= 0
  }
  return hash
}

// ── Era bands ─────────────────────────────────────────────────────────────────
interface EraBand {
  label: string
  min: number
  max: number
  weight: number
}

const ERA_BANDS: EraBand[] = [
  { label: 'ancient',     min: -2000, max:  499, weight: 0.05 },
  { label: 'medieval',    min:   500, max: 1499, weight: 0.10 },
  { label: 'early-modern', min: 1500, max: 1799, weight: 0.15 },
  { label: 'industrial',  min: 1800, max: 1899, weight: 0.15 },
  { label: 'early-20c',   min: 1900, max: 1949, weight: 0.20 },
  { label: 'late-20c',    min: 1950, max: 1999, weight: 0.25 },
  { label: 'modern',      min: 2000, max: 2024, weight: 0.10 },
]

function pickBand(rand: () => number): EraBand {
  const r = rand()
  let cumulative = 0
  for (const band of ERA_BANDS) {
    cumulative += band.weight
    if (r < cumulative) return band
  }
  return ERA_BANDS[ERA_BANDS.length - 1]!
}

function pickYearFromBand(band: EraBand, rand: () => number): number {
  return Math.round(band.min + rand() * (band.max - band.min))
}

// ── Quality filter ─────────────────────────────────────────────────────────────
function sameCentury(a: number, b: number): boolean {
  return Math.floor(a / 100) === Math.floor(b / 100)
}

function targetsPassQuality(years: number[]): boolean {
  // Reject if 3+ targets fall in the same century
  const centuryCounts = new Map<number, number>()
  for (const y of years) {
    const c = Math.floor(y / 100)
    centuryCounts.set(c, (centuryCounts.get(c) ?? 0) + 1)
    if ((centuryCounts.get(c) ?? 0) >= 3) return false
  }
  // Reject if any two targets are within 10 years of each other
  for (let i = 0; i < years.length; i++) {
    for (let j = i + 1; j < years.length; j++) {
      if (Math.abs((years[i] ?? 0) - (years[j] ?? 0)) < 10) return false
    }
  }
  return true
}

// ── Public API ─────────────────────────────────────────────────────────────────
export function generateDailyChallenge(dateStr: string): DailyChallenge {
  const seed = dateToSeed(dateStr)
  const rand = mulberry32(seed)

  let targetYears: number[] = []
  let attempts = 0
  let valid = false

  while (!valid) {
    if (attempts > 200) {
      // Fallback: spread years deterministically across 5 distinct bands
      targetYears = ERA_BANDS.slice(0, 5).map(b =>
        Math.round(b.min + 0.5 * (b.max - b.min)),
      )
      break
    }
    targetYears = []
    for (let i = 0; i < 5; i++) {
      const band = pickBand(rand)
      targetYears.push(pickYearFromBand(band, rand))
    }
    valid = targetsPassQuality(targetYears)
    attempts++
  }

  return {
    id: `challenge-${dateStr}`,
    date: dateStr,
    targetYears,
  }
}
