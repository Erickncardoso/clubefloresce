<template>
  <NuxtPwaManifest />
  <NuxtPage />
  <PatientTabBar v-if="showTabBar" />
  <PatientPwaUpdate v-if="config.public.mobileApp" />
  <PatientPwaPrompt v-if="config.public.mobileApp" />
  <CfConfirmModal />
</template>

<script setup>
const config = useRuntimeConfig()
const route = useRoute()

const hideTabBarPaths = ['/', '/register']

const showTabBar = computed(
  () => config.public.mobileApp && !hideTabBarPaths.includes(route.path),
)
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
