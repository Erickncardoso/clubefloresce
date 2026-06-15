<template>
  <div class="patient-page-skeleton" aria-live="polite" aria-busy="true">
    <!-- Home / início -->
    <template v-if="layout === 'home'">
      <div class="patient-page-skeleton__hero">
        <PatientSkeleton variant="avatar" circle />
        <div class="patient-page-skeleton__stack">
          <PatientSkeleton variant="text" width="42%" />
          <PatientSkeleton variant="title" width="58%" />
          <PatientSkeleton variant="text" width="72%" />
        </div>
      </div>
      <PatientSkeleton variant="card" />
      <PatientSkeleton variant="card" />
      <PatientSkeleton variant="banner" />
      <PatientSkeleton variant="banner" />
    </template>

    <!-- Biblioteca / conteúdo -->
    <template v-else-if="layout === 'library'">
      <PatientSkeleton variant="featured" />
      <div class="patient-page-skeleton__chips">
        <PatientSkeleton v-for="n in 4" :key="n" variant="chip" />
      </div>
      <PatientSkeleton variant="row" />
      <PatientSkeleton variant="row" />
    </template>

    <!-- Cursos (carrossel) -->
    <template v-else-if="layout === 'courses'">
      <PatientSkeleton variant="hero" />
      <PatientSkeleton variant="text" width="38%" height="0.9rem" />
      <div class="patient-page-skeleton__carousel">
        <PatientSkeleton v-for="n in 3" :key="n" variant="tile" />
      </div>
      <PatientSkeleton variant="text" width="32%" height="0.9rem" />
      <div class="patient-page-skeleton__carousel">
        <PatientSkeleton v-for="n in 3" :key="n" variant="tile" />
      </div>
    </template>

    <!-- Comunidade -->
    <template v-else-if="layout === 'feed'">
      <div class="patient-page-skeleton__tabs">
        <PatientSkeleton v-for="n in 3" :key="n" variant="chip" width="5.5rem" />
      </div>
      <PatientSkeleton variant="compose" />
      <PatientSkeleton v-for="n in 3" :key="n" variant="post" />
    </template>

    <!-- Dieta / plano -->
    <template v-else-if="layout === 'plan'">
      <PatientSkeleton variant="text" width="50%" />
      <PatientSkeleton variant="card" />
      <PatientSkeleton v-for="n in 4" :key="n" variant="row" height="4.25rem" />
    </template>

    <!-- Check-in -->
    <template v-else-if="layout === 'checkin'">
      <PatientSkeleton v-for="n in 3" :key="n" variant="row" height="5.5rem" />
    </template>

    <!-- Perfil -->
    <template v-else-if="layout === 'profile'">
      <div class="patient-page-skeleton__profile-hero">
        <PatientSkeleton variant="avatar" circle width="5.5rem" height="5.5rem" />
        <PatientSkeleton variant="title" width="55%" />
        <PatientSkeleton variant="text" width="40%" />
      </div>
      <div class="patient-page-skeleton__stats">
        <PatientSkeleton v-for="n in 3" :key="n" variant="stat" />
      </div>
      <PatientSkeleton v-for="n in 5" :key="`menu-${n}`" variant="row" height="3.25rem" />
    </template>

    <!-- Aula / módulo -->
    <template v-else-if="layout === 'lesson'">
      <PatientSkeleton variant="video" />
      <PatientSkeleton variant="text" width="65%" height="1.1rem" />
      <div class="patient-page-skeleton__tabs">
        <PatientSkeleton v-for="n in 4" :key="n" variant="chip" width="4.5rem" />
      </div>
      <PatientSkeleton variant="card" />
      <PatientSkeleton variant="card" />
    </template>

    <!-- Chat Bella -->
    <template v-else-if="layout === 'chat'">
      <div class="patient-page-skeleton__chat">
        <div class="patient-page-skeleton__chat-row patient-page-skeleton__chat-row--bot">
          <PatientSkeleton variant="avatar" circle width="2rem" height="2rem" />
          <PatientSkeleton variant="bubble" width="72%" />
        </div>
        <div class="patient-page-skeleton__chat-row patient-page-skeleton__chat-row--user">
          <PatientSkeleton variant="bubble" width="58%" />
        </div>
        <div class="patient-page-skeleton__chat-row patient-page-skeleton__chat-row--bot">
          <PatientSkeleton variant="avatar" circle width="2rem" height="2rem" />
          <PatientSkeleton variant="bubble" width="80%" />
        </div>
      </div>
    </template>

    <!-- Genérico -->
    <template v-else>
      <PatientSkeleton variant="featured" />
      <PatientSkeleton variant="row" />
      <PatientSkeleton variant="row" />
    </template>
  </div>
</template>

<script setup>
defineProps({
  layout: {
    type: String,
    default: 'default',
  },
})
</script>
