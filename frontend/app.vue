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
  overflow-y: scroll;
}

html:has(.patient-shell),
html:has(.cf-tab-bar),
html:has(.cf-tab-bar-wrap) {
  overflow: hidden;
  height: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  min-height: -webkit-fill-available;
  max-height: 100dvh;
}

body {
  margin: 0;
  min-height: 100%;
  max-width: 100%;
  overflow-x: hidden;
  overflow-y: visible;
  background: #ffffff;
  font-family: var(--cf-font);
}

html:has(.patient-shell) body,
html:has(.cf-tab-bar) body,
html:has(.cf-tab-bar-wrap) body {
  height: 100%;
  min-height: -webkit-fill-available;
  max-height: 100dvh;
  overflow: hidden;
}

#__nuxt {
  min-height: 100%;
  max-width: 100%;
  overflow: visible;
}

html:has(.patient-shell) #__nuxt,
html:has(.cf-tab-bar) #__nuxt,
html:has(.cf-tab-bar-wrap) #__nuxt {
  min-height: 0;
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
}
</style>
