<template>
  <NuxtPwaManifest />
  <NuxtPage />
  <PatientTabBar v-if="showTabBar" />
  <PatientPwaUpdate />
  <PatientPwaPrompt />
  <CfConfirmModal />
</template>

<script setup>
const route = useRoute()

const hideTabBarPaths = ['/', '/register']

const showTabBar = computed(() => {
  if (hideTabBarPaths.includes(route.path)) return false
  if (route.path.startsWith('/modulos/')) return false
  return true
})
</script>

<style>
html,
body,
#__nuxt {
  margin: 0;
  min-height: 100%;
  max-width: 100%;
}

body {
  background: #ffffff;
  font-family: var(--cf-font);
  -webkit-font-smoothing: antialiased;
}
</style>
