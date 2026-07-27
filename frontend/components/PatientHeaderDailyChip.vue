<template>
  <button
    type="button"
    class="patient-header-streak"
    aria-label="Abrir calendário de dias ativos"
    :aria-expanded="calendarOpen"
    @click="toggleCalendar"
  >
    <PatientFlameIcon3d size="sm" />
    <span class="patient-header-streak__value">{{ activeStreak }}</span>
  </button>

  <PatientActivityCalendarPanel />
</template>

<script setup>
const {
  activeStreak,
  calendarOpen,
  openCalendar,
  closeCalendar,
} = usePatientDailyHeader()

function toggleCalendar() {
  if (calendarOpen.value) closeCalendar()
  else openCalendar()
}
</script>

<style scoped>
.patient-header-streak {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.22rem;
  min-width: 2.75rem;
  height: 2.75rem;
  padding: 0 0.35rem;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--cf-text);
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s ease, transform 0.12s ease;
}

.patient-header-streak:active {
  transform: scale(0.96);
  background: var(--cf-border);
}

.patient-header-streak__value {
  line-height: 1;
}

@media (prefers-reduced-motion: reduce) {
  .patient-header-streak {
    transition: none;
  }
}
</style>
