<template>
  <div class="dateflow min-h-[calc(100dvh-40px)]" :data-theme="store.theme">
    <div v-if="game" class="max-w-2xl mx-auto px-4 py-5">
      <!-- Header -->
      <div class="flex items-center justify-between gap-3">
        <RouterLink to="/dateflow/play" class="text-xs font-semibold secondary hover:underline">← All games</RouterLink>
        <span class="text-xs secondary">{{ practice ? 'Practice round' : `Daily · ${today}` }}</span>
      </div>
      <h1 class="text-2xl font-black tracking-tight mt-2">{{ game.title }}</h1>
      <div class="flex items-center gap-3 mt-2" aria-label="Progress">
        <div class="flex gap-1.5">
          <span
            v-for="k in ROUND_LENGTH"
            :key="k"
            class="pip"
            :class="k - 1 < results.length ? (results[k - 1] ? 'right' : 'wrong') : k - 1 === index && phase !== 'done' ? 'current' : ''"
          />
        </div>
        <span class="text-xs secondary tabular-nums">{{ score }} / {{ ROUND_LENGTH }}</span>
      </div>

      <div v-if="!questions.length" class="py-16 text-center text-sm secondary">Loading…</div>

      <!-- Question -->
      <section v-else-if="phase !== 'done' && q" class="mt-6">
        <p class="text-lg font-semibold">{{ q.prompt }}</p>

        <div v-if="q.kind === 'pick' && q.context.length" class="mt-3 grid gap-2" :class="q.context.length > 1 ? 'sm:grid-cols-2' : ''">
          <div v-for="(c, k) in q.context" :key="c.id" class="context rounded-xl border px-4 py-3">
            <div v-if="q.game === 'missing'" class="text-[11px] uppercase tracking-widest muted">{{ k === 0 ? 'Before' : 'After' }}</div>
            <div class="font-black tabular-nums">{{ formatYear(c.year) }}</div>
            <div class="text-sm">{{ c.name }}</div>
          </div>
        </div>
        <div v-if="q.kind === 'pick' && q.clue" class="context rounded-xl border px-4 py-3 mt-3 font-semibold">{{ q.clue }}</div>

        <!-- Multiple choice -->
        <div v-if="q.kind === 'pick'" class="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            v-for="(o, k) in q.options"
            :key="o.id"
            class="option rounded-xl border px-4 py-3 text-left"
            :class="optionClass(k)"
            :disabled="phase !== 'question'"
            @click="answerPick(k)"
          >
            <span class="key">{{ k + 1 }}</span>
            <span>{{ o.label }}</span>
            <span v-if="phase === 'reveal' && k === q.correct" class="ml-auto" aria-label="correct">✓</span>
            <span v-else-if="phase === 'reveal' && k === picked" class="ml-auto" aria-label="your answer, wrong">✗</span>
          </button>
        </div>

        <!-- Put in order: tap earliest → latest -->
        <div v-else-if="q.kind === 'order'" class="mt-4">
          <p class="text-xs secondary mb-2">Tap the events from earliest to latest. Tap a placed event to remove it.</p>
          <div class="grid gap-2 sm:grid-cols-2">
            <button
              v-for="e in q.events"
              :key="e.id"
              class="option rounded-xl border px-4 py-3 text-left"
              :class="orderClass(e.id)"
              :disabled="phase !== 'question'"
              @click="toggleOrder(e.id)"
            >
              <span class="key">{{ order.includes(e.id) ? order.indexOf(e.id) + 1 : '·' }}</span>
              <span>{{ e.name }}</span>
              <template v-if="phase === 'reveal'">
                <span v-if="positionRight(e.id)" class="ml-auto" aria-label="right position">✓</span>
                <span v-else class="ml-auto" :aria-label="`should be number ${q.answer.indexOf(e.id) + 1}`">✗ {{ q.answer.indexOf(e.id) + 1 }}</span>
              </template>
            </button>
          </div>
          <button
            v-if="phase === 'question'"
            class="btn primary w-full mt-3"
            :disabled="order.length < q.events.length"
            @click="checkOrder"
          >
            Check order
          </button>
        </div>

        <!-- Reveal -->
        <div v-if="phase === 'reveal'" class="reveal rounded-2xl border p-4 mt-5">
          <p class="font-bold" :class="lastRight ? 'good' : 'bad'">{{ lastRight ? '✓ Correct!' : '✗ Not quite.' }}</p>
          <p v-if="q.kind === 'order' && !lastRight" class="text-sm secondary mt-1">
            ✗ marks events in the wrong position — the number shows where each belongs.
          </p>
          <RevealTimeline class="mt-3" :items="q.reveal" :wrong-ids="wrongIds" />
          <div class="flex flex-wrap gap-2 mt-4">
            <button class="btn primary" @click="next">
              {{ index < ROUND_LENGTH - 1 ? 'Next question →' : 'See results' }}
            </button>
            <button class="btn" @click="explore(q.reveal)">Explore on the timeline</button>
          </div>
        </div>
      </section>

      <!-- Results -->
      <section v-else-if="phase === 'done'" class="mt-8 text-center">
        <div class="text-5xl font-black tabular-nums">{{ score }}<span class="text-2xl secondary"> / {{ ROUND_LENGTH }}</span></div>
        <div class="text-2xl mt-2 tracking-widest" aria-hidden="true">{{ results.map((r) => (r ? '✅' : '❌')).join('') }}</div>
        <p class="text-sm secondary mt-2">{{ verdict }}</p>
        <div class="flex flex-wrap justify-center gap-2 mt-6">
          <button class="btn primary" @click="share">Share result</button>
          <RouterLink :to="{ path: route.path, query: { mode: 'practice', r: Date.now() } }" class="btn">
            {{ practice ? 'Another practice round' : 'Practice round' }}
          </RouterLink>
          <RouterLink to="/dateflow/play" class="btn">All games</RouterLink>
        </div>
        <p v-if="shareStatus" class="text-xs secondary mt-3">{{ shareStatus }}</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import '@/assets/dateflow-theme.css'
import { useDateFlowStore } from '@/stores/dateflow'
import {
  GAMES,
  ROUND_LENGTH,
  dailyRng,
  generateRound,
  isCorrect,
  rngFromSeed,
  type Question,
  type RevealItem,
} from '@/engine/dateflow/games/rounds'
import { buildGameShareText, saveDailyScore, shareGameResult } from '@/services/dateflowGames'
import RevealTimeline from '@/components/dateflow/games/RevealTimeline.vue'
import { formatYear } from '@/utils/formatYear'

const store = useDateFlowStore()
const route = useRoute()
const router = useRouter()
const today = new Date().toISOString().slice(0, 10) // same convention as DatePick

const game = computed(() => GAMES.find((g) => g.id === route.params.game))
const practice = computed(() => route.query.mode === 'practice')

const questions = ref<Question[]>([])
const index = ref(0)
const results = ref<boolean[]>([])
const phase = ref<'question' | 'reveal' | 'done'>('question')
const picked = ref<number | null>(null)
const order = ref<string[]>([])
const shareStatus = ref('')

const q = computed(() => questions.value[index.value])
const score = computed(() => results.value.filter(Boolean).length)
const lastRight = computed(() => results.value[index.value] ?? false)
// What the player got wrong: their pick, or the events they put in the wrong position.
const wrongIds = computed(() => {
  const cur = q.value
  if (!cur || phase.value !== 'reveal') return []
  if (cur.kind === 'order') return cur.answer.filter((id) => !positionRight(id))
  if (picked.value === null || picked.value === cur.correct) return []
  return [cur.options[picked.value]!.id]
})

function positionRight(id: string) {
  const cur = q.value
  return cur?.kind === 'order' && order.value.indexOf(id) === cur.answer.indexOf(id)
}

function orderClass(id: string) {
  if (phase.value !== 'reveal') return { placed: order.value.includes(id) }
  return positionRight(id) ? 'right' : 'wrong'
}
const verdict = computed(() =>
  score.value === ROUND_LENGTH ? 'Perfect round!' : score.value >= 3 ? 'Nicely done.' : 'History is long — try a practice round.',
)

async function start() {
  if (!game.value) {
    router.replace('/dateflow/play')
    return
  }
  if (store.isLoading) await store.load()
  // Daily rounds come from the date only; practice rounds are random.
  const rng = practice.value ? rngFromSeed(Math.floor(Math.random() * 2 ** 31)) : dailyRng(game.value.id, today)
  questions.value = generateRound(game.value.id, store.events, store.durations, rng)
  index.value = 0
  results.value = []
  phase.value = 'question'
  picked.value = null
  order.value = []
  shareStatus.value = ''
}
watch(() => route.fullPath, start, { immediate: true })

function optionClass(k: number) {
  const cur = q.value
  if (phase.value !== 'reveal' || !cur || cur.kind !== 'pick') return ''
  if (k === cur.correct) return 'right'
  if (k === picked.value) return 'wrong'
  return 'dim'
}

function answerPick(k: number) {
  const cur = q.value
  if (phase.value !== 'question' || !cur || cur.kind !== 'pick') return
  picked.value = k
  results.value.push(isCorrect(cur, k))
  phase.value = 'reveal'
}

function toggleOrder(id: string) {
  if (phase.value !== 'question') return
  order.value = order.value.includes(id) ? order.value.filter((x) => x !== id) : [...order.value, id]
}

function checkOrder() {
  const cur = q.value
  if (!cur || cur.kind !== 'order') return
  results.value.push(isCorrect(cur, order.value))
  phase.value = 'reveal'
}

function next() {
  if (index.value < ROUND_LENGTH - 1) {
    index.value++
    picked.value = null
    order.value = []
    phase.value = 'question'
    return
  }
  phase.value = 'done'
  if (!practice.value && game.value) saveDailyScore(game.value.id, today, score.value)
}

/** Frame this question's events on the main timeline. */
function explore(items: RevealItem[]) {
  store.showSpan(Math.min(...items.map((i) => i.start)), Math.max(...items.map((i) => i.end)))
  router.push('/dateflow')
}

async function share() {
  if (!game.value) return
  const text = buildGameShareText(
    game.value.title,
    practice.value ? 'Practice' : today,
    results.value,
    `${window.location.origin}/dateflow/play`,
  )
  const result = await shareGameResult(text)
  shareStatus.value = result === 'copied' ? 'Copied to clipboard!' : result === 'error' ? "Couldn't share — try again." : ''
}

// Keyboard: 1–4 answer, Enter moves on.
function onKey(e: KeyboardEvent) {
  if (phase.value === 'question' && q.value?.kind === 'pick') {
    const k = Number(e.key) - 1
    if (k >= 0 && k < q.value.options.length) answerPick(k)
  } else if (phase.value === 'reveal' && e.key === 'Enter') {
    next()
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.context,
.reveal {
  background: var(--df-surface);
  border-color: var(--df-border);
}
.option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--df-surface);
  border-color: var(--df-border);
  color: var(--df-text);
  font-weight: 600;
  transition: border-color 0.15s, background 0.15s;
}
.option:hover:not(:disabled) {
  border-color: var(--df-text-2);
}
.option.placed {
  border-color: var(--df-text);
  background: var(--df-btn);
}
/* Status colours always come with ✓ / ✗ text, never colour alone. */
.option.right {
  border-color: #0ca30c;
  box-shadow: inset 0 0 0 1px #0ca30c;
}
.option.wrong {
  border-color: #d03b3b;
  box-shadow: inset 0 0 0 1px #d03b3b;
}
.option.dim {
  opacity: 0.5;
}
.key {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  background: var(--df-btn);
  color: var(--df-text-2);
}
.pip {
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 9999px;
  background: var(--df-btn-hover);
}
.pip.current {
  background: var(--df-text-2);
}
.pip.right {
  background: #0ca30c;
}
.pip.wrong {
  background: #d03b3b;
}
.good {
  color: #0ca30c;
}
.bad {
  color: #d03b3b;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2.5rem;
  padding: 0 1rem;
  border-radius: 0.625rem;
  background: var(--df-btn);
  color: var(--df-text);
  font-size: 0.875rem;
  font-weight: 600;
}
.btn:hover:not(:disabled) {
  background: var(--df-btn-hover);
}
.btn.primary {
  background: var(--df-text);
  color: var(--df-bg);
}
.btn:disabled {
  opacity: 0.4;
}
</style>
