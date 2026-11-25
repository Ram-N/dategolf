<template>
  <!-- Help mode (doc 18, 5b): a prompt until something is clicked, then that thing's help -->
  <aside class="help-card" data-help-card role="dialog" aria-label="Help" aria-live="polite">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="kicker">What's this?</p>
        <h2 class="title">{{ entry ? entry.title : 'Click anything to learn what it is' }}</h2>
      </div>
      <button class="close" aria-label="Leave help (Esc)" @click="emit('close')">✕</button>
    </div>
    <template v-if="entry">
      <p class="text">{{ entry.text }}</p>
      <p v-if="entry.tip" class="tip">{{ entry.tip }}</p>
      <div v-if="see.length" class="see">
        <span class="see-label">See also</span>
        <button v-for="k in see" :key="k" class="chip" @click="emit('show', k)">{{ HELP[k].title }}</button>
      </div>
    </template>
    <p v-else class="text">
      A lane, a bar, a dot, a dashed line, a button: click it and its help shows here.
      <span class="hint-touch">On a phone or tablet, tap instead.</span>
    </p>
    <button class="done" @click="emit('close')">Done</button>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { HELP, isHelpKey, type HelpEntry, type HelpKey } from '@/engine/dateflow/help'

const props = defineProps<{ helpKey: HelpKey | null }>()
const emit = defineEmits<{ show: [key: HelpKey]; close: [] }>()

const entry = computed<HelpEntry | null>(() => (props.helpKey ? HELP[props.helpKey] : null))
const see = computed(() => (entry.value?.see ?? []).filter(isHelpKey))
</script>

<style scoped>
.help-card {
  position: fixed;
  right: 1rem;
  bottom: 4.5rem;
  z-index: 60; /* over the cards, which are z-50 */
  width: 340px;
  max-width: calc(100% - 2rem);
  max-height: calc(100dvh - 8rem);
  overflow-y: auto;
  padding: 0.875rem 1rem;
  border-radius: 0.875rem;
  border: 2px solid var(--df-text);
  background: var(--df-surface);
  color: var(--df-text);
  box-shadow: 0 10px 30px rgb(0 0 0 / 0.25);
}
.kicker {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--df-muted);
}
.title {
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.3;
}
.close {
  min-width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.375rem;
  background: var(--df-btn);
  font-weight: 700;
}
.text {
  margin-top: 0.375rem;
  font-size: 0.875rem;
  line-height: 1.5;
}
.tip {
  margin-top: 0.375rem;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--df-text-2);
}
.see {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.625rem;
}
.see-label {
  font-size: 11px;
  color: var(--df-muted);
  margin-right: 0.125rem;
}
.chip {
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  background: var(--df-btn);
  font-size: 12px;
  font-weight: 600;
}
.chip:hover {
  background: var(--df-btn-hover);
}
.hint-touch {
  display: block;
  margin-top: 0.25rem;
  font-size: 12px;
  color: var(--df-text-2);
}
@media (hover: hover) {
  .hint-touch {
    display: none;
  }
}
.done {
  margin-top: 0.75rem;
  font-size: 12px;
  text-decoration: underline;
  color: var(--df-text-2);
}
</style>
