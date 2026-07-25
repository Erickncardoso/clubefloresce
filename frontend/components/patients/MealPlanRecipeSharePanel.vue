<template>
  <section class="mpr-share">
    <header class="mpr-share-head">
      <label class="mpr-share-check">
        <input v-model="shareWithAllModel" type="checkbox">
        <span>Compartilhar com todas as pacientes no app</span>
      </label>
    </header>

    <div v-if="!shareWithAllModel" class="mpr-share-body">
      <div class="field field--float">
        <label for="mpr-share-search">Buscar paciente</label>
        <input id="mpr-share-search" v-model="search" type="search" placeholder="Nome da paciente">
      </div>

      <div class="mpr-share-selected">
        <button
          v-for="patient in selectedPatients"
          :key="patient.id"
          type="button"
          class="mpr-share-chip"
          @click="togglePatient(patient.id)"
        >
          <PatientAvatar :src="patient.avatar" :name="patient.name" size="xs" :ring="false" />
          <span>{{ patient.name }}</span>
          <X :size="12" />
        </button>
      </div>

      <ul class="mpr-share-list">
        <li v-for="patient in filteredPatients" :key="patient.id">
          <button type="button" class="mpr-share-item" @click="togglePatient(patient.id)">
            <PatientAvatar :src="patient.avatar" :name="patient.name" size="sm" :ring="false" />
            <span>{{ patient.name }}</span>
            <span v-if="isSelected(patient.id)" class="mpr-share-mark">Selecionada</span>
          </button>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { X } from 'lucide-vue-next'
import PatientAvatar from '~/components/PatientAvatar.vue'

const props = defineProps({
  patients: { type: Array, default: () => [] },
  shareWithAll: { type: Boolean, default: false },
  sharedPatientIds: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:shareWithAll', 'update:sharedPatientIds'])

const search = ref('')

const shareWithAllModel = computed({
  get: () => props.shareWithAll,
  set: (value) => emit('update:shareWithAll', value),
})

const sharedIds = computed({
  get: () => props.sharedPatientIds || [],
  set: (value) => emit('update:sharedPatientIds', value),
})

const filteredPatients = computed(() => {
  const q = search.value.trim().toLowerCase()
  return (props.patients || [])
    .filter((patient) => patient?.id && patient?.name)
    .filter((patient) => !q || String(patient.name).toLowerCase().includes(q))
    .slice(0, 30)
})

const selectedPatients = computed(() =>
  (props.patients || []).filter((patient) => sharedIds.value.includes(patient.id)),
)

function isSelected(id) {
  return sharedIds.value.includes(id)
}

function togglePatient(id) {
  const set = new Set(sharedIds.value)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  sharedIds.value = [...set]
}
</script>

<style scoped>
.mpr-share {
  border: 1px solid #ecefed;
  border-radius: var(--cf-radius-control);
  padding: 0.85rem;
  background: #fafbfa;
}

.mpr-share-head {
  margin-bottom: 0.65rem;
}

.mpr-share-check {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.875rem;
  color: #2c322c;
}

.mpr-share-body {
  display: grid;
  gap: 0.65rem;
}

.mpr-share-selected {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.mpr-share-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.45rem 0.2rem 0.25rem;
  border: 1px solid #e2e8e4;
  border-radius: var(--cf-radius-pill, 999px);
  background: #fff;
  font: inherit;
  font-size: 0.78rem;
  cursor: pointer;
}

.mpr-share-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 10rem;
  overflow: auto;
  border: 1px solid #ecefed;
  border-radius: var(--cf-radius-control);
  background: #fff;
}

.mpr-share-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.5rem 0.65rem;
  border: none;
  background: transparent;
  text-align: left;
  font: inherit;
  cursor: pointer;
}

.mpr-share-item:hover {
  background: #f3f5f3;
}

.mpr-share-mark {
  margin-left: auto;
  font-size: 0.72rem;
  color: #15803d;
}
</style>
