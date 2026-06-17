<template>
  <div class="patient-page evo-nutricao-page patient-page--with-tab">
    <PatientHeader title="Nutrição do mês" show-back back-to="/inicio" :show-bell="false" />
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
