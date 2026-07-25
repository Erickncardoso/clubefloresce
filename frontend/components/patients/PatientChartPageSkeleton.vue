<template>
  <div class="pcsk" aria-busy="true" aria-live="polite" aria-label="Carregando ficha do paciente">
    <header class="pcsk-header">
      <div class="pcsk-breadcrumb">
        <PatientSkeleton variant="text" width="4.75rem" />
        <PatientSkeleton variant="text" width="0.45rem" />
        <PatientSkeleton variant="text" width="4.25rem" />
        <PatientSkeleton variant="text" width="0.45rem" />
        <PatientSkeleton variant="text" width="7.5rem" />
      </div>

      <div class="pcsk-top">
        <div class="pcsk-main">
          <div class="pcsk-identity">
            <PatientSkeleton variant="avatar" circle width="3.75rem" height="3.75rem" />
            <div class="pcsk-identity-copy">
              <PatientSkeleton variant="title" width="11rem" height="1.15rem" />
              <PatientSkeleton variant="text" width="9.5rem" />
              <PatientSkeleton variant="text" width="7rem" />
            </div>
          </div>

          <div class="pcsk-badges">
            <PatientSkeleton v-for="n in 4" :key="`badge-${n}`" variant="chip" width="6.5rem" height="1.65rem" />
          </div>
        </div>

        <aside class="pcsk-aside">
          <div class="pcsk-metrics">
            <div v-for="n in 5" :key="`metric-${n}`" class="pcsk-metric">
              <PatientSkeleton circle width="1.5rem" height="1.5rem" />
              <div class="pcsk-metric-copy">
                <PatientSkeleton variant="text" width="2.4rem" height="0.62rem" />
                <PatientSkeleton variant="text" width="3.2rem" height="0.78rem" />
              </div>
            </div>
          </div>

          <PatientSkeleton variant="text" width="7rem" height="0.75rem" />

          <div class="pcsk-actions">
            <PatientSkeleton width="5.25rem" height="2.1rem" />
            <PatientSkeleton width="2.1rem" height="2.1rem" />
            <PatientSkeleton width="7.5rem" height="2.1rem" />
          </div>
        </aside>
      </div>
    </header>

    <nav class="pcsk-tabs" aria-hidden="true">
      <PatientSkeleton v-for="n in 7" :key="`tab-${n}`" variant="chip" width="5.75rem" height="2.15rem" />
      <PatientSkeleton variant="chip" width="4.25rem" height="2.15rem" />
    </nav>

    <section class="pcsk-panel">
      <div class="pcsk-panel-main">
        <div class="pcsk-panel-toolbar">
          <PatientSkeleton variant="title" width="9rem" height="1rem" />
          <div class="pcsk-panel-tools">
            <PatientSkeleton width="6.5rem" height="1.85rem" />
            <PatientSkeleton width="7.25rem" height="1.85rem" />
          </div>
        </div>

        <div class="pcsk-config">
          <PatientSkeleton v-for="n in 4" :key="`field-${n}`" class="pcsk-config-field" height="2.75rem" />
          <PatientSkeleton width="8.5rem" height="1.25rem" />
        </div>

        <div class="pcsk-section-head">
          <PatientSkeleton variant="title" width="8.5rem" height="0.95rem" />
          <div class="pcsk-panel-tools">
            <PatientSkeleton width="5.5rem" height="1.85rem" />
            <PatientSkeleton width="8rem" height="1.85rem" />
          </div>
        </div>

        <div class="pcsk-meals">
          <article v-for="n in 3" :key="`meal-${n}`" class="pcsk-meal">
            <div class="pcsk-meal-row">
              <PatientSkeleton width="4.5rem" height="2rem" />
              <PatientSkeleton width="7rem" height="2rem" />
              <PatientSkeleton width="3.5rem" height="1rem" />
              <PatientSkeleton width="4rem" height="1.85rem" />
              <PatientSkeleton width="1.85rem" height="1.85rem" />
              <PatientSkeleton width="1.85rem" height="1.85rem" />
            </div>
            <div class="pcsk-meal-body">
              <PatientSkeleton v-for="row in 3" :key="`food-${n}-${row}`" class="pcsk-food-row" height="2.35rem" />
              <PatientSkeleton width="8.5rem" height="1.85rem" />
            </div>
          </article>
        </div>

        <PatientSkeleton class="pcsk-new-meal" width="11rem" height="2.25rem" />
      </div>

      <aside class="pcsk-sidebar">
        <PatientSkeleton v-for="n in 3" :key="`side-${n}`" class="pcsk-side-card" height="6.5rem" />
      </aside>
    </section>
  </div>
</template>

<script setup>
import PatientSkeleton from '~/components/PatientSkeleton.vue'
</script>

<style scoped>
.pcsk {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 2rem;
}

.pcsk-header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.pcsk-breadcrumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.pcsk-top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(19rem, 36rem);
  gap: 1rem 1.75rem;
  align-items: start;
}

.pcsk-main {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-width: 0;
}

.pcsk-identity {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}

.pcsk-identity-copy {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
  flex: 1;
}

.pcsk-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.pcsk-aside {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-width: 0;
}

.pcsk-metrics {
  display: flex;
  align-items: stretch;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  background: #fff;
  padding: 0.35rem 0.15rem;
}

@supports (corner-shape: squircle) {
  .pcsk-metrics {
    corner-shape: squircle;
  }
}

.pcsk-metric {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.2rem 0.55rem;
}

.pcsk-metric-copy {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.pcsk-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding-top: 0.15rem;
}

.pcsk-tabs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  border-bottom: 1px solid #e8ece9;
  padding-bottom: 0.65rem;
}

.pcsk-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(13rem, 16rem);
  gap: 1rem;
  align-items: start;
}

.pcsk-panel-main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.pcsk-panel-toolbar,
.pcsk-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.pcsk-panel-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.pcsk-config {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.65rem;
  align-items: center;
}

.pcsk-config-field {
  border-radius: var(--cf-radius-control);
}

.pcsk-meals {
  display: grid;
  gap: 0.45rem;
}

.pcsk-meal {
  border: 1px solid #eef1ee;
  border-radius: var(--cf-radius-control);
  overflow: hidden;
  background: #fff;
}

@supports (corner-shape: squircle) {
  .pcsk-meal {
    corner-shape: squircle;
  }
}

.pcsk-meal-row {
  display: grid;
  grid-template-columns: auto minmax(5rem, 6rem) minmax(5rem, 1fr) auto auto auto;
  gap: 0.35rem;
  align-items: center;
  padding: 0.55rem 0.75rem;
  border-bottom: 1px solid #eef1ee;
}

.pcsk-meal-body {
  display: grid;
  gap: 0.35rem;
  padding: 0.55rem 0.75rem 0.75rem;
}

.pcsk-food-row {
  border-radius: var(--cf-radius-sm);
}

.pcsk-sidebar {
  display: grid;
  gap: 0.65rem;
}

.pcsk-new-meal {
  border-radius: var(--cf-radius-control);
}

.pcsk-side-card {
  border-radius: var(--cf-radius-control);
}

@media (max-width: 1080px) {
  .pcsk-top {
    grid-template-columns: 1fr;
  }

  .pcsk-panel {
    grid-template-columns: 1fr;
  }

  .pcsk-config {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .pcsk-config {
    grid-template-columns: 1fr;
  }

  .pcsk-meal-row {
    grid-template-columns: 1fr 1fr;
  }

  .pcsk-metrics {
    flex-wrap: wrap;
  }

  .pcsk-metric {
    flex: 1 1 40%;
  }
}
</style>
