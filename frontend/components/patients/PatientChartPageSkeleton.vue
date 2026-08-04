<template>
  <div class="pcsk" aria-busy="true" aria-live="polite" aria-label="Carregando ficha do paciente">
    <header class="pcsk-header">
      <div class="pcsk-head-row">
        <div class="pcsk-breadcrumb">
          <PatientSkeleton variant="text" width="4.75rem" />
          <PatientSkeleton variant="text" width="0.45rem" />
          <PatientSkeleton variant="text" width="7.5rem" />
          <PatientSkeleton variant="text" width="0.45rem" />
          <PatientSkeleton variant="text" width="5.5rem" />
        </div>
        <div class="pcsk-toolbar">
          <PatientSkeleton variant="text" width="5.5rem" height="0.75rem" />
          <div class="pcsk-actions">
            <PatientSkeleton width="2rem" height="2rem" />
            <PatientSkeleton width="2rem" height="2rem" />
            <PatientSkeleton width="6.5rem" height="2rem" />
          </div>
        </div>
      </div>
      <PatientSkeleton class="pcsk-section-title" variant="title" width="8rem" height="1.15rem" />
    </header>

    <section class="pcsk-panel">
      <div v-for="n in 5" :key="`info-${n}`" class="pcsk-info-row">
        <PatientSkeleton circle width="2rem" height="2rem" />
        <div class="pcsk-info-copy">
          <PatientSkeleton variant="text" width="5.5rem" height="0.78rem" />
          <PatientSkeleton variant="text" width="11rem" height="0.85rem" />
        </div>
      </div>
      <PatientSkeleton variant="text" width="8.5rem" height="0.85rem" />

      <div class="pcsk-grid">
        <PatientSkeleton v-for="n in 4" :key="`card-${n}`" class="pcsk-card" height="7.5rem" />
      </div>
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
  gap: 0.5rem;
  padding-bottom: 2rem;
}

.pcsk-header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.pcsk-head-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.pcsk-breadcrumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  flex: 1;
  min-width: 0;
}

.pcsk-toolbar {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
  flex-shrink: 0;
}

.pcsk-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.pcsk-section-title {
  padding-bottom: 0.85rem;
  border-bottom: 1px solid #e8ece9;
}

.pcsk-panel {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding-top: 0.25rem;
}

.pcsk-info-row {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid #eef1ee;
}

.pcsk-info-copy {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1;
  min-width: 0;
}

.pcsk-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
  margin-top: 0.5rem;
}

.pcsk-card {
  border-radius: var(--cf-radius-control);
}

@media (max-width: 820px) {
  .pcsk-head-row {
    flex-direction: column;
  }

  .pcsk-toolbar {
    align-items: flex-start;
  }

  .pcsk-grid {
    grid-template-columns: 1fr;
  }
}
</style>
