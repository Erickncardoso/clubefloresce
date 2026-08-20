<template>
  <div class="patient-page evo-nutricao-page patient-page--with-tab">
    <PatientHeader />
    <EvolucaoNutritionMonthView />
  </div>
</template>

<script setup>
definePageMeta({ layout: 'patient', middleware: 'patient-only' })
</script>

<style scoped>
.evo-nutricao-page {
  padding-top: 0;
}
</style>
