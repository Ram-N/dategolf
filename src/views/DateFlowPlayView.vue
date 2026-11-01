<template>
  <div class="dateflow min-h-[calc(100dvh-40px)]" :data-theme="store.theme">
    <div class="max-w-2xl mx-auto px-4 py-6">
      <div class="flex items-center justify-between gap-4">
        <div>
          <RouterLink to="/dateflow" class="text-xs font-semibold secondary hover:underline">← Back to the timeline</RouterLink>
          <h1 class="text-3xl font-black tracking-tight mt-2">DateFlow games</h1>
          <p class="text-sm secondary mt-1">Five ways to test your sense of when things happened. A new daily round every day.</p>
        </div>
        <button
          class="btn w-9 shrink-0"
          :aria-label="store.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="store.toggleTheme()"
        >
          {{ store.theme === 'dark' ? '☀' : '☾' }}
        </button>
      </div>

      <ul class="mt-6 space-y-3">
        <li v-for="g in GAMES" :key="g.id" class="card rounded-2xl border p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-bold">{{ g.title }}</h2>
              <p class="text-sm secondary mt-0.5">{{ g.blurb }}</p>
            </div>
            <span v-if="scores[g.id] !== null" class="score shrink-0">Today {{ scores[g.id] }}/{{ ROUND_LENGTH }}</span>
          </div>
          <div class="flex gap-2 mt-3">
            <RouterLink :to="`/dateflow/play/${g.id}`" class="btn primary">
              {{ scores[g.id] !== null ? 'Replay daily' : 'Play daily' }}
            </RouterLink>
            <RouterLink :to="{ path: `/dateflow/play/${g.id}`, query: { mode: 'practice' } }" class="btn">Practice</RouterLink>
          </div>
        </li>
      </ul>
      <p class="text-xs muted mt-6">Daily rounds are the same for everyone on {{ today }}. Practice rounds are random.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import '@/assets/dateflow-theme.css'
import { useDateFlowStore } from '@/stores/dateflow'
import { GAMES, ROUND_LENGTH, type GameId } from '@/engine/dateflow/games/rounds'
import { loadDailyScore } from '@/services/dateflowGames'

const store = useDateFlowStore()
const today = new Date().toISOString().slice(0, 10) // same convention as DatePick
const scores = computed(
  () => Object.fromEntries(GAMES.map((g) => [g.id, loadDailyScore(g.id, today)])) as Record<GameId, number | null>,
)
</script>

<style scoped>
.card {
  background: var(--df-surface);
  border-color: var(--df-border);
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2.25rem;
  padding: 0 0.875rem;
  border-radius: 0.5rem;
  background: var(--df-btn);
  color: var(--df-text);
  font-size: 0.875rem;
  font-weight: 600;
}
.btn:hover {
  background: var(--df-btn-hover);
}
.btn.primary {
  background: var(--df-text);
  color: var(--df-bg);
}
.btn.primary:hover {
  opacity: 0.9;
}
.score {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  background: var(--df-btn);
  color: var(--df-text);
}
</style>
