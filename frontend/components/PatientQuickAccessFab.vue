<template>
  <Teleport to="body">
    <button
      type="button"
      class="patient-quick-fab"
      :class="{ 'patient-quick-fab--open': open }"
      aria-label="Acesso rápido"
      :aria-expanded="open ? 'true' : 'false'"
      @click="onFabClick"
    >
      <X v-if="open" class="patient-quick-fab__icon" :size="24" :stroke-width="2" aria-hidden="true" />
      <CirclePlus v-else class="patient-quick-fab__icon" :size="24" :stroke-width="1.85" aria-hidden="true" />
    </button>

    <PatientQuickAccessDial />
  </Teleport>
</template>

<script setup>
import { CirclePlus, X } from 'lucide-vue-next'
import PatientQuickAccessDial from '~/components/PatientQuickAccessDial.vue'
import { PATIENT_QUICK_DIAL_ITEMS } from '~/utils/patient-quick-dial'
import { patientHapticQuickDialOpen, patientHapticTap } from '~/utils/patient-haptics.mjs'

const { open, toggle, close } = usePatientQuickAccess()
const route = useRoute()

function onFabClick() {
  const willOpen = !open.value
  toggle()

  if (!willOpen) return

  if (!patientHapticQuickDialOpen(PATIENT_QUICK_DIAL_ITEMS.length, 58)) {
    patientHapticTap(16)
  }
}

watch(() => route.fullPath, close)
</script>
