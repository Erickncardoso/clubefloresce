<template>
  <div ref="rootRef" class="cf-tile-actions-menu">
    <button
      type="button"
      class="cf-tile-actions-trigger cf-squircle cf-squircle--tile"
      :aria-expanded="open"
      aria-haspopup="menu"
      aria-label="Mais opções"
      @click.stop="toggle"
    >
      <MoreVertical class="cf-tile-actions-trigger-icon" />
    </button>

    <div
      v-if="open"
      class="cf-tile-actions-dropdown cf-squircle cf-squircle--tile"
      role="menu"
      @click.stop="close"
    >
      <slot />
    </div>
  </div>
</template>

<script setup>
import { MoreVertical } from 'lucide-vue-next'

const props = defineProps({
  menuKey: {
    type: String,
    required: true,
  },
})

const rootRef = ref(null)
const { open, toggle, close } = useTileActionsMenu(props.menuKey)

function onDocumentClick(event) {
  if (!open.value) return
  if (rootRef.value?.contains(event.target)) return
  close()
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick, true)
})
</script>

<style scoped>
.cf-tile-actions-menu {
  position: relative;
  flex-shrink: 0;
}

.cf-tile-actions-trigger {
  width: clamp(1.875rem, 22%, 2.125rem);
  height: clamp(1.875rem, 22%, 2.125rem);
  min-width: 1.875rem;
  min-height: 1.875rem;
  padding: 0;
  border: 1px solid var(--cf-border, #e4e4e0);
  background: rgba(255, 255, 255, 0.96);
  color: #333;
  box-shadow: var(--cf-shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.06));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  line-height: 0;
  overflow: hidden;
  transition: transform 0.15s ease, background 0.15s ease;
}

/* Herda --cf-radius-squircle-tile do card (raio absoluto ~3rem) */
.cf-tile-actions-trigger.cf-squircle.cf-squircle--tile,
.cf-tile-actions-dropdown.cf-squircle.cf-squircle--tile {
  --cf-squircle-r: var(--cf-radius-squircle-tile, min(3rem, calc(var(--cf-tile-card-w, 9.75rem) * 0.42)));
  border-radius: var(--cf-squircle-r);
}

@supports (corner-shape: squircle) {
  .cf-tile-actions-trigger.cf-squircle.cf-squircle--tile,
  .cf-tile-actions-dropdown.cf-squircle.cf-squircle--tile {
    corner-shape: squircle;
  }
}

.cf-tile-actions-trigger-icon {
  width: clamp(0.95rem, 50%, 1.05rem);
  height: clamp(0.95rem, 50%, 1.05rem);
  display: block;
}

.cf-tile-actions-trigger:active {
  transform: scale(0.94);
}

.cf-tile-actions-dropdown {
  position: absolute;
  top: calc(100% + 0.35rem);
  right: 0;
  z-index: 20;
  min-width: 11.5rem;
  padding: 0;
  background: var(--cf-surface, #fff);
  border: 1px solid var(--cf-border, #e4e4e0);
  box-shadow: var(--cf-shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.06));
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow: hidden;
}

.cf-tile-actions-dropdown :deep(.cf-tile-actions-item) {
  width: 100%;
  border: none;
  background: transparent;
  --cf-squircle-r: var(--cf-radius-squircle-tile, min(3rem, calc(var(--cf-tile-card-w, 9.75rem) * 0.42)));
  border-radius: 0;
  padding: 0.55rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #334155;
  text-align: left;
  cursor: pointer;
  line-height: 1.2;
  transition: background 0.15s ease;
}

.cf-tile-actions-dropdown :deep(.cf-tile-actions-item:first-child) {
  border-top-left-radius: var(--cf-squircle-r);
  border-top-right-radius: var(--cf-squircle-r);
}

.cf-tile-actions-dropdown :deep(.cf-tile-actions-item:last-child) {
  border-bottom-left-radius: var(--cf-squircle-r);
  border-bottom-right-radius: var(--cf-squircle-r);
}

.cf-tile-actions-dropdown :deep(.cf-tile-actions-item:only-child) {
  border-radius: var(--cf-squircle-r);
}

.cf-tile-actions-dropdown :deep(.cf-tile-actions-item svg) {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.cf-tile-actions-dropdown :deep(.cf-tile-actions-item:hover) {
  background: #f4f7f6;
}

.cf-tile-actions-dropdown :deep(.cf-tile-actions-item--edit) {
  color: #2563eb;
}

.cf-tile-actions-dropdown :deep(.cf-tile-actions-item--danger) {
  color: #dc2626;
}

.cf-tile-actions-dropdown :deep(.cf-tile-actions-item--danger:hover) {
  background: #fef2f2;
}

@supports (corner-shape: squircle) {
  .cf-tile-actions-dropdown :deep(.cf-tile-actions-item:first-child),
  .cf-tile-actions-dropdown :deep(.cf-tile-actions-item:last-child),
  .cf-tile-actions-dropdown :deep(.cf-tile-actions-item:only-child) {
    corner-shape: squircle;
  }
}

@media (hover: hover) {
  .cf-tile-actions-trigger:hover {
    background: #fff;
    transform: scale(1.05);
  }
}
</style>
