<script setup>
const { $pwa } = useNuxtApp()
const visible = ref(false)

function applyUpdate() {
  $pwa?.updateServiceWorker(true)
}

onMounted(() => {
  if (import.meta.dev) return

  watch(
    () => $pwa?.needRefresh?.value ?? $pwa?.needRefresh,
    (need) => {
      if (need) visible.value = true
    },
    { immediate: true },
  )

  if ($pwa?.needRefresh?.value ?? $pwa?.needRefresh) {
    visible.value = true
  }
})
</script>

<template>
  <Transition name="pwa-update-slide">
    <aside v-if="visible" class="pwa-update" role="alert">
      <p class="pwa-update-text">Nova versão do app disponível.</p>
      <button type="button" class="pwa-update-btn" @click="applyUpdate">
        Atualizar agora
      </button>
    </aside>
  </Transition>
</template>

<style scoped>
.pwa-update {
  position: fixed;
  top: calc(0.75rem + env(safe-area-inset-top, 0px));
  left: 50%;
  z-index: 500;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: min(calc(100% - 1.5rem), 22rem);
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--cf-border);
  border-radius: 0.875rem;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: var(--cf-shadow-lg);
  box-sizing: border-box;
}

.pwa-update-text {
  margin: 0;
  flex: 1;
  font-size: 0.8125rem;
  color: var(--cf-text);
}

.pwa-update-btn {
  border: none;
  border-radius: 0.5rem;
  padding: 0.45rem 0.7rem;
  background: var(--cf-pink);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.pwa-update-slide-enter-active,
.pwa-update-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.pwa-update-slide-enter-from,
.pwa-update-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-0.5rem);
}
</style>
