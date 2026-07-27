<template>
  <div
    v-show="visible"
    class="patient-screen-dim"
    :class="{ 'patient-screen-dim--interactive': quickDialOpen }"
    aria-hidden="true"
    @click="onClick"
  />
</template>

<script setup>
import { IOS_PWA_DIM_OVERLAY_SELECTOR, isVisibleOverlay } from '~/utils/ios-pwa-overlay.mjs'

const { open: quickDialOpen, close: closeQuickDial } = usePatientQuickAccess()

const otherOverlayActive = ref(false)
let observer = null

function syncOverlays() {
  let found = false
  for (const el of document.querySelectorAll(IOS_PWA_DIM_OVERLAY_SELECTOR)) {
    if (isVisibleOverlay(el)) {
      found = true
      break
    }
  }
  otherOverlayActive.value = found
}

const visible = computed(() => quickDialOpen.value || otherOverlayActive.value)

function onClick() {
  if (quickDialOpen.value) closeQuickDial()
}

onMounted(() => {
  syncOverlays()
  observer = new MutationObserver(() => {
    requestAnimationFrame(syncOverlays)
  })
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden'],
  })
})

onUnmounted(() => {
  observer?.disconnect()
  observer = null
})
</script>
