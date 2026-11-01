import { onMounted, onUnmounted, ref } from 'vue'

/**
 * A toolbar popover: toggles open, closes on outside click or Escape, and positions its
 * panel right-aligned under the trigger but clamped on screen (the trigger can sit
 * mid-screen when the toolbar wraps on a phone).
 */
export function usePopover(panelWidth: number, edge = 8) {
  const open = ref(false)
  const rootEl = ref<HTMLElement | null>(null)
  const panelLeft = ref(0)

  function toggle() {
    if (!open.value && rootEl.value) {
      const r = rootEl.value.getBoundingClientRect()
      const wanted = r.right - panelWidth
      panelLeft.value = Math.min(Math.max(wanted, edge), window.innerWidth - edge - panelWidth) - r.left
    }
    open.value = !open.value
  }

  function onDocPointer(e: PointerEvent) {
    if (open.value && rootEl.value && !rootEl.value.contains(e.target as Node)) open.value = false
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') open.value = false
  }
  onMounted(() => {
    document.addEventListener('pointerdown', onDocPointer)
    window.addEventListener('keydown', onKey)
  })
  onUnmounted(() => {
    document.removeEventListener('pointerdown', onDocPointer)
    window.removeEventListener('keydown', onKey)
  })

  return { open, rootEl, panelLeft, toggle }
}
