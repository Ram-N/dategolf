<template>
  <!-- A small dropdown for the control bands (Display, More, the phone menu): a button and a panel of controls.
       A click on a plain button inside closes it; a choice that should keep it open sits in [data-keep-open]. -->
  <div ref="rootEl" class="relative">
    <button class="df-btn" :class="{ icon }" :aria-expanded="open" aria-haspopup="true" :aria-label="ariaLabel"
            :title="title" @click="toggle">
      <slot name="label">{{ label }}</slot>
    </button>
    <div v-if="open" class="df-panel absolute top-11 z-40 p-2" :style="{ left: panelLeft + 'px', width: width + 'px' }"
         role="dialog" :aria-label="ariaLabel ?? label" @click="closeAfterAction">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePopover } from '@/composables/usePopover'

const props = withDefaults(
  defineProps<{ label?: string; ariaLabel?: string; title?: string; width?: number; icon?: boolean }>(),
  { label: '', ariaLabel: undefined, title: undefined, width: 240, icon: false },
)
const { open, rootEl, panelLeft, toggle } = usePopover(props.width)

function closeAfterAction(e: MouseEvent) {
  const t = e.target as HTMLElement
  if (t.closest('button, a') && !t.closest('[data-keep-open]')) open.value = false
}
</script>
