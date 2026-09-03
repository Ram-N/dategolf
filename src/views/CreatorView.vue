<template>
  <div class="min-h-screen bg-zinc-950 text-white">

    <!-- PIN Gate -->
    <div v-if="!unlocked" class="flex flex-col items-center justify-center min-h-screen px-6">
      <div class="w-full max-w-xs">
        <p class="text-xs uppercase tracking-widest text-zinc-600 text-center mb-2">DatePick</p>
        <h1 class="text-2xl font-black text-center mb-8">Creator Dashboard</h1>
        <input
          v-model="pin"
          type="password"
          placeholder="PIN"
          class="w-full px-4 py-3 rounded-xl bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-zinc-500 text-center text-lg tracking-widest mb-3"
          @keydown.enter="checkPin"
          autofocus
        />
        <p v-if="pinError" class="text-red-400 text-xs text-center mb-3">Incorrect PIN</p>
        <button
          class="w-full py-3 rounded-xl bg-white text-black font-bold hover:bg-zinc-200 active:scale-95 transition-all"
          @click="checkPin"
        >
          Unlock
        </button>
      </div>
    </div>

    <!-- Dashboard -->
    <div v-else class="max-w-3xl mx-auto px-4 py-6">

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <p class="text-xs text-zinc-600 uppercase tracking-widest">Creator</p>
          <h1 class="text-lg font-black">DatePick Puzzle Preview</h1>
        </div>
        <button @click="lock" class="text-xs text-zinc-700 hover:text-zinc-400 transition-colors">
          Lock ↩
        </button>
      </div>

      <!-- Week navigation -->
      <div class="flex items-center gap-2 mb-6">
        <button
          @click="prevWeek"
          class="px-3 py-2 rounded-lg bg-zinc-800 text-sm hover:bg-zinc-700 transition-colors shrink-0"
        >←</button>
        <div class="flex gap-1 flex-1 overflow-x-auto">
          <button
            v-for="d in weekDates"
            :key="d.str"
            @click="selectedDate = d.str"
            class="flex-1 min-w-[72px] py-2 rounded-lg text-xs font-medium transition-colors"
            :class="selectedDate === d.str
              ? 'bg-white text-black'
              : d.str === todayStr
                ? 'bg-zinc-700 text-white hover:bg-zinc-600'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'"
          >
            <div class="font-bold">{{ d.dow }}</div>
            <div class="opacity-60 mt-0.5">{{ d.mmdd }}</div>
          </button>
        </div>
        <button
          @click="nextWeek"
          class="px-3 py-2 rounded-lg bg-zinc-800 text-sm hover:bg-zinc-700 transition-colors shrink-0"
        >→</button>
      </div>

      <!-- Selected date questions -->
      <div v-if="challenge">
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs text-zinc-500 uppercase tracking-widest">
            {{ selectedDate }}{{ selectedDate === todayStr ? ' · Today' : '' }}
          </span>
          <span class="text-xs text-zinc-600">{{ challenge.questions.length }} questions</span>
        </div>

        <div class="space-y-2">
          <div
            v-for="(q, i) in challenge.questions"
            :key="q.eventId"
            class="bg-zinc-900 rounded-xl p-4 border border-zinc-800"
          >
            <div class="flex items-start gap-3">
              <!-- Question number -->
              <span class="text-xs text-zinc-600 font-mono w-5 shrink-0 pt-0.5">{{ i + 1 }}</span>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap mb-1">
                  <span class="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                    {{ eraBandLabel(q.eventYear) }}
                  </span>
                  <span class="text-xs text-zinc-600">{{ q.region }}</span>
                </div>
                <div class="font-semibold text-white text-sm">{{ q.eventName }}</div>

                <!-- Choices row -->
                <div class="flex flex-wrap gap-1.5 mt-2">
                  <span
                    v-for="(choice, ci) in q.choices"
                    :key="ci"
                    class="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold"
                    :class="ci === q.correctIndex
                      ? 'bg-green-900/60 text-green-300 border border-green-800'
                      : 'bg-zinc-800 text-zinc-500'"
                  >
                    {{ formatYear(choice) }}{{ ci === q.correctIndex ? ' ✓' : '' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Era summary footer -->
        <div class="mt-6 p-4 bg-zinc-900 rounded-xl border border-zinc-800">
          <p class="text-xs text-zinc-600 uppercase tracking-widest mb-3">Era Distribution</p>
          <div class="grid grid-cols-3 gap-2">
            <div
              v-for="band in eraSummary"
              :key="band.label"
              class="text-center"
            >
              <div class="text-lg font-bold" :class="band.count > 0 ? 'text-white' : 'text-zinc-700'">
                {{ band.count }}
              </div>
              <div class="text-xs text-zinc-600">{{ band.label }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Memory Aid Coverage -->
      <div class="mt-10">
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs text-zinc-600 uppercase tracking-widest">Memory Aid Coverage</p>
          <span class="text-xs text-zinc-500">{{ coveredCount }} / {{ allEvents.length }} events</span>
        </div>

        <!-- Summary row -->
        <div class="grid grid-cols-4 gap-2 mb-4">
          <div class="bg-zinc-900 rounded-lg px-3 py-2 text-center border border-zinc-800">
            <div class="text-base font-bold text-white">{{ coverageSummary.back }}</div>
            <div class="text-xs text-zinc-500 mt-0.5">Look Back</div>
          </div>
          <div class="bg-zinc-900 rounded-lg px-3 py-2 text-center border border-zinc-800">
            <div class="text-base font-bold text-white">{{ coverageSummary.yearOf }}</div>
            <div class="text-xs text-zinc-500 mt-0.5">Year Of</div>
          </div>
          <div class="bg-zinc-900 rounded-lg px-3 py-2 text-center border border-zinc-800">
            <div class="text-base font-bold text-white">{{ coverageSummary.ahead }}</div>
            <div class="text-xs text-zinc-500 mt-0.5">Look Ahead</div>
          </div>
          <div class="bg-zinc-900 rounded-lg px-3 py-2 text-center border border-zinc-800">
            <div class="text-base font-bold text-white">{{ coverageSummary.timeline }}</div>
            <div class="text-xs text-zinc-500 mt-0.5">Timeline</div>
          </div>
        </div>

        <!-- Filter toggle -->
        <div class="flex gap-1 mb-3">
          <button
            v-for="opt in (['all', 'covered', 'uncovered'] as const)"
            :key="opt"
            @click="coverageFilter = opt"
            class="px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize"
            :class="coverageFilter === opt
              ? 'bg-white text-black'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'"
          >
            {{ opt }}
            <span class="ml-1 opacity-60">
              {{ opt === 'all' ? allEvents.length : opt === 'covered' ? coveredCount : allEvents.length - coveredCount }}
            </span>
          </button>
        </div>

        <div class="overflow-x-auto rounded-xl border border-zinc-800">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-zinc-800 text-zinc-500 uppercase tracking-widest">
                <th class="text-left px-3 py-2 font-medium">Event</th>
                <th class="text-right px-3 py-2 font-medium w-16">Year</th>
                <th class="text-center px-2 py-2 font-medium w-12">Back</th>
                <th class="text-center px-2 py-2 font-medium w-10">Yr</th>
                <th class="text-center px-2 py-2 font-medium w-14">Ahead</th>
                <th class="text-center px-2 py-2 font-medium w-10">TL</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in filteredCoverage"
                :key="row.id"
                class="border-b border-zinc-900 last:border-0"
                :class="row.hasAny ? '' : 'bg-zinc-900/40'"
              >
                <td class="px-3 py-1.5 text-zinc-300">{{ row.name }}</td>
                <td class="px-3 py-1.5 text-right font-mono text-zinc-500">{{ formatYear(row.year) }}</td>
                <td class="px-2 py-1.5 text-center">
                  <span v-if="row.hasBack" class="text-green-400">✓</span>
                  <span v-else class="text-zinc-700">·</span>
                </td>
                <td class="px-2 py-1.5 text-center">
                  <span v-if="row.hasYearOf" class="text-green-400">✓</span>
                  <span v-else class="text-zinc-700">·</span>
                </td>
                <td class="px-2 py-1.5 text-center">
                  <span v-if="row.hasAhead" class="text-green-400">✓</span>
                  <span v-else class="text-zinc-700">·</span>
                </td>
                <td class="px-2 py-1.5 text-center">
                  <span v-if="row.hasTimeline" class="text-green-400">✓</span>
                  <span v-else class="text-zinc-700">·</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { generateDatePickChallenge } from '@/engine/datepick/challengeGenerator'
import type { Event } from '@/types'
import type { DatePickChallenge } from '@/types/datepick'

// ── PIN gate ──────────────────────────────────────────────────────────────────
// Set VITE_CREATOR_PIN in .env.local to override the default.
const CORRECT_PIN = import.meta.env.VITE_CREATOR_PIN ?? '1066'
const SESSION_KEY = 'dp_creator_unlocked'

const pin = ref('')
const pinError = ref(false)
const unlocked = ref(false)

function checkPin() {
  if (pin.value === CORRECT_PIN) {
    unlocked.value = true
    pinError.value = false
    sessionStorage.setItem(SESSION_KEY, '1')
    pin.value = ''
  } else {
    pinError.value = true
  }
}

function lock() {
  sessionStorage.removeItem(SESSION_KEY)
  unlocked.value = false
}

// ── Dates ─────────────────────────────────────────────────────────────────────
function isoToday(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

const todayStr = isoToday()
const weekOffset = ref(0)
const selectedDate = ref(todayStr)

const weekDates = computed(() => {
  const start = addDays(todayStr, weekOffset.value * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const str = addDays(start, i)
    const d = new Date(str + 'T12:00:00')
    return {
      str,
      dow: d.toLocaleDateString('en-US', { weekday: 'short' }),
      mmdd: str.slice(5),
    }
  })
})

function prevWeek() {
  weekOffset.value--
  selectedDate.value = addDays(todayStr, weekOffset.value * 7)
}

function nextWeek() {
  weekOffset.value++
  selectedDate.value = addDays(todayStr, weekOffset.value * 7)
}

// ── Events + challenge generation ─────────────────────────────────────────────
const allEvents = ref<Event[]>([])

const datelinks = ref<Record<string, { groups: { label: string; items: string[] }[] }>>({})

onMounted(async () => {
  unlocked.value = sessionStorage.getItem(SESSION_KEY) === '1'
  const [evMod, dlMod] = await Promise.all([
    import('@/data/events.json'),
    import('@/data/datelinks.json'),
  ])
  allEvents.value = evMod.default as Event[]
  datelinks.value = dlMod.default as typeof datelinks.value
})

const challenge = computed<DatePickChallenge | null>(() => {
  if (allEvents.value.length === 0) return null
  return generateDatePickChallenge(selectedDate.value, allEvents.value)
})

// ── Era bands ─────────────────────────────────────────────────────────────────
const ERA_BANDS = [
  { label: 'Ancient', min: -3000, max: 499 },
  { label: 'Medieval', min: 500, max: 1499 },
  { label: 'Early Modern', min: 1500, max: 1799 },
  { label: '1800s', min: 1800, max: 1899 },
  { label: '1900–49', min: 1900, max: 1949 },
  { label: '1950+', min: 1950, max: 2024 },
]

function eraBandLabel(year: number): string {
  return ERA_BANDS.find((b) => year >= b.min && year <= b.max)?.label ?? 'Other'
}

const eraSummary = computed(() => {
  if (!challenge.value) return []
  return ERA_BANDS.map((band) => ({
    label: band.label,
    count: challenge.value!.questions.filter(
      (q) => q.eventYear >= band.min && q.eventYear <= band.max,
    ).length,
  }))
})

function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : String(year)
}

// ── Memory aid coverage ────────────────────────────────────────────────────────
const eventCoverage = computed(() => {
  return allEvents.value
    .map((e) => {
      const entry = datelinks.value[e.id]
      const groups = entry?.groups ?? []
      const labels = groups.map((g) => g.label)
      const hasBack = labels.includes('Look Back')
      const hasYearOf = labels.some((l) => l.startsWith('Year of'))
      const hasAhead = labels.includes('Look Ahead')
      const hasTimeline = labels.includes('Event Timeline')
      return {
        id: e.id,
        name: e.name,
        year: e.year,
        hasBack,
        hasYearOf,
        hasAhead,
        hasTimeline,
        hasAny: hasBack || hasYearOf || hasAhead || hasTimeline,
      }
    })
    .sort((a, b) => {
      // uncovered first, then partially covered, then fully covered
      const scoreA = (a.hasBack ? 1 : 0) + (a.hasYearOf ? 1 : 0) + (a.hasAhead ? 1 : 0) + (a.hasTimeline ? 1 : 0)
      const scoreB = (b.hasBack ? 1 : 0) + (b.hasYearOf ? 1 : 0) + (b.hasAhead ? 1 : 0) + (b.hasTimeline ? 1 : 0)
      return scoreA - scoreB
    })
})

const coveredCount = computed(() => eventCoverage.value.filter((r) => r.hasAny).length)

const coverageFilter = ref<'all' | 'covered' | 'uncovered'>('all')

const filteredCoverage = computed(() => {
  if (coverageFilter.value === 'covered') return eventCoverage.value.filter((r) => r.hasAny)
  if (coverageFilter.value === 'uncovered') return eventCoverage.value.filter((r) => !r.hasAny)
  return eventCoverage.value
})

const coverageSummary = computed(() => ({
  back: eventCoverage.value.filter((r) => r.hasBack).length,
  yearOf: eventCoverage.value.filter((r) => r.hasYearOf).length,
  ahead: eventCoverage.value.filter((r) => r.hasAhead).length,
  timeline: eventCoverage.value.filter((r) => r.hasTimeline).length,
}))
</script>
