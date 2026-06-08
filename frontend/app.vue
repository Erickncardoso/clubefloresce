<template>
  <NuxtPage />
  <PatientTabBar v-if="showTabBar" />
  <PatientPwaPrompt v-if="config.public.mobileApp" />
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
  min-height: 100%;
  margin: 0;
  overflow-x: hidden;
  max-width: 100%;
}

body {
  background: #ffffff;
  font-family: var(--cf-font);
}
</style>
