<template>
  <NuxtPwaManifest />
  <NuxtPage />
  <PatientTabBar v-if="showTabBar" />
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
html {
  margin: 0;
  max-width: 100%;
  overflow-x: hidden;
}

html:has(.patient-shell),
html:has(.cf-tab-bar-wrap) {
  overflow: hidden;
  height: 100%;
}

body {
  margin: 0;
  max-width: 100%;
  overflow-x: hidden;
  background: #ffffff;
  font-family: var(--cf-font);
}

html:has(.patient-shell) body,
html:has(.cf-tab-bar-wrap) body {
  position: fixed;
  inset: 0;
  width: 100%;
  overflow: hidden;
  overscroll-behavior: none;
}

#__nuxt {
  height: 100%;
  max-width: 100%;
  overflow: hidden;
}
</style>
