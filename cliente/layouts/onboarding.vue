<template>
  <div class="onboarding-layout">
    <slot />
  </div>
</template>

<script setup>
const { suppress: suppressTabBar, release: releaseTabBar } = usePatientTabBar()

onMounted(() => {
  suppressTabBar()
})

onBeforeUnmount(() => {
  releaseTabBar()
})
</script>

<style scoped>
.onboarding-layout {
  min-height: 100dvh;
  background: #fff;
  overflow-x: hidden;
  max-width: 100%;
  min-width: 0;
}

.onboarding-layout :deep(button) {
  color: inherit;
}
</style>
