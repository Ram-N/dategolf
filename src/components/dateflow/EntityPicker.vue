<template>
  <!-- Pick an event or span by typing its name (a native datalist: keyboard- and screen-reader-friendly) -->
  <label class="picker">
    <span class="lbl">{{ label }}</span>
    <input
      :list="listId"
      :value="current"
      :placeholder="placeholder"
      class="inp"
      @change="choose(($event.target as HTMLInputElement).value)"
    />
    <datalist :id="listId">
      <option v-for="o in options" :key="o.id" :value="o.label" />
    </datalist>
  </label>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'

const props = defineProps<{
  options: { id: string; label: string }[]
  modelValue: string | null
  label: string
  placeholder?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [id: string | null] }>()

const listId = `picker-${useId()}`
const current = computed(() => props.options.find((o) => o.id === props.modelValue)?.label ?? '')

function choose(text: string) {
  const hit = props.options.find((o) => o.label === text) ??
    props.options.find((o) => o.label.toLowerCase().startsWith(text.trim().toLowerCase()))
  emit('update:modelValue', text.trim() && hit ? hit.id : null)
}
</script>

<style scoped>
.picker {
  display: block;
}
.lbl {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--df-text-2);
  margin-bottom: 0.2rem;
}
.inp {
  width: 100%;
  height: 2.1rem;
  padding: 0 0.6rem;
  border-radius: 0.5rem;
  border: 1px solid var(--df-border);
  background: var(--df-bg);
  color: var(--df-text);
  font-size: 0.875rem;
}
</style>
