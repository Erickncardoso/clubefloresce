<script setup>
import { authFetchInit } from '~/composables/useAuthSession.js'
import { buildPatientPath } from '~/utils/patient-slug.js'

definePageMeta({
  layout: 'dashboard',
  middleware: 'nutri-only',
})

const route = useRoute()
const apiBase = useApiBase()
const id = computed(() => String(route.params.id || ''))

const user = await $fetch(`${apiBase.value}/users/${encodeURIComponent(id.value)}`, authFetchInit())

await navigateTo(buildPatientPath(user, { query: route.query }), { replace: true })
</script>

<template>
  <div class="redirect-state">Redirecionando para a ficha do paciente…</div>
</template>

<style scoped>
.redirect-state {
  padding: 2rem;
  text-align: center;
  color: #6b7368;
}
</style>
