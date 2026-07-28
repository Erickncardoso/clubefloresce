<template>
  <div class="adr-shell admin-shell-card">
    <aside class="adr-sidebar">
      <AgendaMiniCalendar
        v-model="anchorDateModel"
        :range-start="weekStart"
        :range-end="weekEnd"
      />

      <div class="adr-filter">
        <header class="adr-filter__head">
          <div>
            <h2>Pacientes</h2>
            <p>{{ selectedPatientIds.length }} selecionada(s)</p>
          </div>
          <button type="button" class="adr-filter__toggle" @click="toggleAllPatients">
            {{ allPatientsSelected ? 'Limpar' : 'Todas' }}
          </button>
        </header>

        <label class="adr-filter__search">
          <Search aria-hidden="true" />
          <input
            v-model="patientFilterQuery"
            type="search"
            placeholder="Filtrar pacientes…"
            aria-label="Filtrar pacientes"
          >
        </label>

        <div class="adr-filter__list">
          <section
            v-for="group in groupedPatients"
            :key="group.key"
            class="adr-filter__group"
          >
            <h3>{{ group.label }}</h3>
            <ul>
              <li v-for="patient in group.patients" :key="patient.id">
                <label class="adr-filter__item">
                  <input
                    v-model="selectedPatientIds"
                    type="checkbox"
                    :value="patient.id"
                  >
                  <PatientAvatar
                    v-if="showAvatars"
                    :src="patient.avatar"
                    :name="patient.name"
                    size="sm"
                    :ring="false"
                  />
                  <span class="adr-filter__name">{{ patient.name }}</span>
                  <small
                    v-if="patientWeekCount(patient.id)"
                    class="adr-filter__badge"
                  >
                    {{ patientWeekCount(patient.id) }}
                  </small>
                </label>
              </li>
            </ul>
          </section>
          <p v-if="!groupedPatients.length" class="adr-filter__empty">Nenhuma paciente encontrada.</p>
        </div>
      </div>
    </aside>

    <section class="adr-main">
      <header class="adr-toolbar">
        <div class="adr-toolbar__left">
          <button type="button" class="btn-secondary adr-toolbar__nav" @click="goPrevWeek">
            <ChevronLeft aria-hidden="true" />
          </button>
          <button type="button" class="btn-secondary adr-toolbar__today" @click="goToday">
            Hoje
          </button>
          <button type="button" class="btn-secondary adr-toolbar__nav" @click="goNextWeek">
            <ChevronRight aria-hidden="true" />
          </button>
          <div class="adr-toolbar__meta">
            <p class="adr-toolbar__range">{{ rangeLabel }}</p>
            <p class="adr-toolbar__stats">
              {{ weekAppointmentCount }} consulta(s) · {{ visibleResources.length }} paciente(s) na grade
            </p>
          </div>
        </div>

        <div class="adr-toolbar__right">
          <label class="adr-toolbar__search">
            <Search aria-hidden="true" />
            <input
              :value="searchQuery"
              type="search"
              placeholder="Buscar…"
              aria-label="Buscar na agenda"
              @input="$emit('update:searchQuery', $event.target.value)"
              @keydown.enter.prevent="$emit('search-submit')"
            >
          </label>
          <button type="button" class="btn-primary adr-toolbar__new" @click="$emit('new-appointment')">
            + Agendar
          </button>
          <details class="adr-view-options">
            <summary>Visualização</summary>
            <div class="adr-view-options__panel">
              <label class="adr-toggle">
                <input v-model="hideEmptyResources" type="checkbox">
                <span>Só pacientes com consulta</span>
              </label>
              <label class="adr-toggle">
                <input v-model="showAvatars" type="checkbox">
                <span>Mostrar avatar</span>
              </label>
              <label class="adr-toggle">
                <input v-model="hideWeekends" type="checkbox">
                <span>Ocultar finais de semana</span>
              </label>
              <label class="adr-slider">
                <span>Largura da coluna</span>
                <input
                  v-model.number="dayColumnWidthEm"
                  type="range"
                  min="9"
                  max="18"
                  step="1"
                >
                <strong>{{ dayColumnWidthEm }}em</strong>
              </label>
            </div>
          </details>
        </div>
      </header>

      <p class="adr-hint">Clique em <strong>+ Agendar</strong> na célula do dia ou em uma consulta existente para editar.</p>

      <div v-if="loading" class="adr-state">Carregando agenda…</div>
      <div v-else-if="loadError" class="adr-state adr-state--error">{{ loadError }}</div>

      <div v-else class="adr-grid-wrap">
        <table class="adr-grid" :style="gridStyle">
          <thead>
            <tr>
              <th class="adr-grid__resource-head" scope="col">Paciente</th>
              <th
                v-for="day in visibleDays"
                :key="day.key"
                scope="col"
                class="adr-grid__day-head"
                :class="{
                  'adr-grid__day-head--today': day.isToday,
                  'adr-grid__day-head--selected': selectedDayKey === day.key,
                }"
              >
                <button type="button" @click="$emit('select-day', day.key)">
                  <span>{{ dayHeader(day.date).weekday }}</span>
                  <strong>{{ dayHeader(day.date).dayNumber }}</strong>
                  <small>{{ dayHeader(day.date).month }}</small>
                  <em v-if="dayAppointmentCount(day.key)">{{ dayAppointmentCount(day.key) }}</em>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!visibleResources.length">
              <td :colspan="visibleDays.length + 1" class="adr-grid__empty-row">
                Selecione pacientes na barra lateral para montar a grade de agendamento.
              </td>
            </tr>
            <tr v-for="resource in visibleResources" :key="resource.id">
              <th scope="row" class="adr-grid__resource-cell">
                <div class="adr-resource">
                  <PatientAvatar
                    v-if="showAvatars"
                    :src="resource.avatar"
                    :name="resource.name"
                    size="sm"
                    :ring="false"
                  />
                  <span class="adr-resource__name">{{ resource.name }}</span>
                </div>
              </th>
              <td
                v-for="day in visibleDays"
                :key="`${resource.id}-${day.key}`"
                class="adr-grid__day-cell"
                :class="{
                  'adr-grid__day-cell--today': day.isToday,
                  'adr-grid__day-cell--past': isPastDay(day.date),
                }"
              >
                <button
                  v-for="item in appointmentsFor(resource.id, day.key)"
                  :key="item.id"
                  type="button"
                  class="adr-event"
                  :style="eventStyle(item)"
                  @click="$emit('open-appointment', item)"
                >
                  <span class="adr-event__desc">{{ item.title }}</span>
                  <span class="adr-event__time">{{ formatAgendaTime(item.startsAt) }}</span>
                  <span class="adr-event__duration">{{ item.durationMin }} min</span>
                </button>

                <button
                  type="button"
                  class="adr-slot"
                  :aria-label="`Agendar ${resource.name} em ${dayHeader(day.date).weekday} ${dayHeader(day.date).dayNumber}`"
                  @click="emitScheduleSlot(resource, day.key)"
                >
                  <Plus aria-hidden="true" />
                  <span>Agendar</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-vue-next'
import AgendaMiniCalendar from '~/components/agenda/AgendaMiniCalendar.vue'
import PatientAvatar from '~/components/PatientAvatar.vue'
import {
  addDays,
  buildSlotDateTime,
  buildWeekDaysFiltered,
  countAppointmentsForPatient,
  countAppointmentsForWeek,
  endOfWeek,
  filterAppointmentsByQuery,
  formatAgendaShortDayHeader,
  formatAgendaTime,
  formatWeekRangeLabel,
  getEventColorStyle,
  getPatientStatusGroup,
  groupAppointmentsByPatientDay,
  startOfDay,
  startOfWeek,
  toDateKey,
} from '~/utils/agenda-calendar.js'

const props = defineProps({
  loading: { type: Boolean, default: false },
  loadError: { type: String, default: '' },
  appointments: { type: Array, default: () => [] },
  patients: { type: Array, default: () => [] },
  anchorDate: { type: Date, required: true },
  selectedDayKey: { type: String, default: '' },
  searchQuery: { type: String, default: '' },
})

const emit = defineEmits([
  'update:anchorDate',
  'update:searchQuery',
  'select-day',
  'open-appointment',
  'schedule-slot',
  'search-submit',
  'new-appointment',
])

const hideEmptyResources = ref(false)
const showAvatars = ref(true)
const hideWeekends = ref(false)
const dayColumnWidthEm = ref(12)
const patientFilterQuery = ref('')
const selectedPatientIds = ref([])

const anchorDateModel = computed({
  get: () => props.anchorDate,
  set: (value) => emit('update:anchorDate', value),
})

const weekStart = computed(() => startOfWeek(props.anchorDate, 1))
const weekEnd = computed(() => endOfWeek(props.anchorDate, 1))

const visibleDays = computed(() => buildWeekDaysFiltered(props.anchorDate, {
  weekStartsOn: 1,
  hideWeekends: hideWeekends.value,
}))

const visibleDayKeys = computed(() => visibleDays.value.map((day) => day.key))

const filteredAppointments = computed(() => (
  filterAppointmentsByQuery(props.appointments, props.searchQuery)
))

const appointmentsByPatientDay = computed(() => (
  groupAppointmentsByPatientDay(filteredAppointments.value)
))

const rangeLabel = computed(() => {
  const days = visibleDays.value
  if (!days.length) return ''
  return formatWeekRangeLabel(days[0].date, days[days.length - 1].date)
})

const weekAppointmentCount = computed(() => (
  countAppointmentsForWeek(filteredAppointments.value, visibleDayKeys.value)
))

const filteredPatients = computed(() => {
  const q = patientFilterQuery.value.trim().toLowerCase()
  return props.patients.filter((patient) => {
    if (!q) return true
    return String(patient.name || '').toLowerCase().includes(q)
  })
})

const groupedPatients = computed(() => {
  const groups = new Map()
  for (const patient of filteredPatients.value) {
    const label = getPatientStatusGroup(patient.status)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label).push(patient)
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
    .map(([label, patients]) => ({
      key: label,
      label,
      patients: patients.sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR')),
    }))
})

const activePatientIds = computed(() => (
  props.patients
    .filter((patient) => String(patient.status || '').toUpperCase() === 'ATIVO')
    .map((patient) => patient.id)
))

const allPatientIds = computed(() => props.patients.map((patient) => patient.id))

const allPatientsSelected = computed(() => (
  allPatientIds.value.length > 0
  && selectedPatientIds.value.length === allPatientIds.value.length
))

const visibleResources = computed(() => {
  const selected = new Set(selectedPatientIds.value)
  const list = props.patients.filter((patient) => selected.has(patient.id))

  return list.filter((patient) => {
    if (!hideEmptyResources.value) return true
    return patientWeekCount(patient.id) > 0
  })
})

const gridStyle = computed(() => ({
  '--adr-day-col-width': `${dayColumnWidthEm.value}em`,
}))

watch(
  () => props.patients,
  (patients) => {
    if (!patients.length || selectedPatientIds.value.length) return
    const defaults = activePatientIds.value.length ? activePatientIds.value : patients.map((p) => p.id)
    selectedPatientIds.value = defaults.slice(0, 16)
  },
  { immediate: true },
)

function appointmentsFor(patientId, dayKey) {
  return appointmentsByPatientDay.value.get(patientId)?.get(dayKey) || []
}

function dayAppointmentCount(dayKey) {
  return filteredAppointments.value.filter((item) => (
    toDateKey(new Date(item.startsAt)) === dayKey
  )).length
}

function patientWeekCount(patientId) {
  return countAppointmentsForPatient(
    filteredAppointments.value,
    patientId,
    visibleDayKeys.value,
  )
}

function dayHeader(date) {
  return formatAgendaShortDayHeader(date)
}

function isPastDay(date) {
  return startOfDay(date).getTime() < startOfDay(new Date()).getTime()
}

function eventStyle(item) {
  const colors = getEventColorStyle(item.patientId || item.id)
  return {
    background: colors.bg,
    color: colors.text,
    borderColor: colors.accent,
  }
}

function emitScheduleSlot(patient, dayKey) {
  emit('schedule-slot', {
    patientId: patient.id,
    patientName: patient.name,
    dayKey,
    startsAt: buildSlotDateTime(dayKey, 9, 0),
  })
}

function goPrevWeek() {
  emit('update:anchorDate', addDays(props.anchorDate, -7))
}

function goNextWeek() {
  emit('update:anchorDate', addDays(props.anchorDate, 7))
}

function goToday() {
  emit('update:anchorDate', new Date())
  emit('select-day', toDateKey(new Date()))
}

function toggleAllPatients() {
  selectedPatientIds.value = allPatientsSelected.value ? [] : [...allPatientIds.value]
}
</script>

<style scoped>
.adr-shell {
  display: grid;
  grid-template-columns: minmax(15rem, 18rem) minmax(0, 1fr);
  gap: 0;
  padding: 0;
  overflow: hidden;
  min-height: 36rem;
}

.adr-sidebar {
  display: grid;
  align-content: start;
  gap: 1rem;
  padding: 1rem;
  border-right: 1px solid var(--admin-border, #e8ece9);
  background: #fafbfa;
}

.adr-filter {
  display: grid;
  gap: 0.65rem;
  min-height: 0;
}

.adr-filter__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

.adr-filter__head h2 {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--admin-ink, #141414);
}

.adr-filter__head p {
  margin: 0.15rem 0 0;
  font-size: 0.68rem;
  color: var(--admin-muted, #66706e);
}

.adr-filter__toggle {
  border: none;
  background: transparent;
  color: var(--admin-primary, #8b967c);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.adr-filter__search {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.55rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-control);
  background: #fff;
}

.adr-filter__search svg {
  width: 0.9rem;
  height: 0.9rem;
  color: #9ca3af;
}

.adr-filter__search input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 0.75rem;
  outline: none;
}

.adr-filter__list {
  max-height: 24em;
  overflow: auto;
  padding-right: 0.15rem;
}

.adr-filter__group + .adr-filter__group {
  margin-top: 0.75rem;
}

.adr-filter__group h3 {
  margin: 0 0 0.35rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #8a9288;
}

.adr-filter__group ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.2rem;
}

.adr-filter__item {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.28rem 0.15rem;
  font-size: 0.76rem;
  color: var(--admin-ink, #141414);
  cursor: pointer;
}

.adr-filter__item input {
  accent-color: var(--admin-primary, #8b967c);
  flex-shrink: 0;
}

.adr-filter__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-transform: none;
}

.adr-filter__badge {
  margin-left: auto;
  min-width: 1.15rem;
  height: 1.15rem;
  padding: 0 0.3rem;
  border-radius: var(--cf-radius-pill);
  background: rgba(139, 150, 124, 0.16);
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1.15rem;
  color: #4a5f48;
  text-align: center;
}

.adr-filter__empty {
  margin: 0;
  font-size: 0.75rem;
  color: var(--admin-muted, #66706e);
}

.adr-main {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  min-width: 0;
  min-height: 32rem;
}

.adr-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--admin-border, #e8ece9);
  background: #fff;
}

.adr-toolbar__left,
.adr-toolbar__right {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.adr-toolbar__meta {
  display: grid;
  gap: 0.08rem;
}

.adr-toolbar__nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.2rem;
  padding-inline: 0.55rem;
}

.adr-toolbar__nav svg {
  width: 0.95rem;
  height: 0.95rem;
}

.adr-toolbar__today {
  font-weight: 600;
}

.adr-toolbar__range {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--admin-ink, #141414);
  text-transform: capitalize;
}

.adr-toolbar__stats {
  margin: 0;
  font-size: 0.72rem;
  color: var(--admin-muted, #66706e);
}

.adr-toolbar__new {
  min-height: 2.2rem;
  padding-inline: 0.85rem;
  font-size: 0.8125rem;
}

.adr-toolbar__search {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 9rem;
  padding: 0.35rem 0.55rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-control);
  background: #fff;
}

.adr-toolbar__search svg {
  width: 0.85rem;
  height: 0.85rem;
  color: #9ca3af;
}

.adr-toolbar__search input {
  width: 7rem;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 0.75rem;
  outline: none;
}

.adr-view-options {
  position: relative;
}

.adr-view-options summary {
  list-style: none;
  cursor: pointer;
  min-height: 2.2rem;
  padding: 0.45rem 0.75rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-control);
  background: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--admin-muted, #66706e);
}

.adr-view-options summary::-webkit-details-marker {
  display: none;
}

.adr-view-options__panel {
  position: absolute;
  top: calc(100% + 0.35rem);
  right: 0;
  z-index: 5;
  display: grid;
  gap: 0.55rem;
  min-width: 15rem;
  padding: 0.75rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-control);
  background: #fff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
}

.adr-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  color: var(--admin-muted, #66706e);
}

.adr-toggle input {
  accent-color: var(--admin-primary, #8b967c);
}

.adr-slider {
  display: grid;
  gap: 0.25rem;
  font-size: 0.72rem;
  color: var(--admin-muted, #66706e);
}

.adr-slider input {
  width: 100%;
  accent-color: var(--admin-primary, #8b967c);
}

.adr-slider strong {
  font-size: 0.72rem;
  color: var(--admin-ink, #141414);
}

.adr-search {
  display: none;
}

.adr-search__clear {
  display: none;
}

.adr-hint {
  margin: 0.55rem 1rem 0;
  font-size: 0.72rem;
  color: var(--admin-muted, #66706e);
}

.adr-hint strong {
  color: var(--admin-primary, #8b967c);
  font-weight: 700;
}

.adr-state {
  margin: 1.5rem;
  text-align: center;
  color: var(--admin-muted, #66706e);
  font-size: 0.875rem;
}

.adr-state--error {
  color: #b42318;
}

.adr-grid-wrap {
  overflow: auto;
  margin: 0.65rem 1rem 1rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-control);
  background: #fff;
}

.adr-grid {
  width: max-content;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
}

.adr-grid__resource-head,
.adr-grid__resource-cell {
  position: sticky;
  left: 0;
  z-index: 2;
  width: 12rem;
  min-width: 12rem;
  background: #fff;
  box-shadow: 1px 0 0 var(--admin-border, #e8ece9);
  text-transform: none;
}

.adr-grid__resource-head {
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid var(--admin-border, #e8ece9);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #8a9288;
  text-align: left;
}

.adr-grid__day-head {
  width: var(--adr-day-col-width, 12em);
  min-width: var(--adr-day-col-width, 12em);
  padding: 0;
  border-bottom: 1px solid var(--admin-border, #e8ece9);
  background: #fafbfa;
}

.adr-grid__day-head button {
  display: grid;
  justify-items: center;
  gap: 0.05rem;
  width: 100%;
  padding: 0.55rem 0.35rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font: inherit;
}

.adr-grid__day-head span {
  font-size: 0.62rem;
  text-transform: uppercase;
  color: #8a9288;
}

.adr-grid__day-head strong {
  font-size: 0.95rem;
  color: var(--admin-ink, #141414);
}

.adr-grid__day-head small {
  font-size: 0.62rem;
  color: var(--admin-muted, #66706e);
  text-transform: lowercase;
}

.adr-grid__day-head em {
  margin-top: 0.15rem;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 0.28rem;
  border-radius: var(--cf-radius-pill);
  background: rgba(139, 150, 124, 0.16);
  font-style: normal;
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1.1rem;
  color: #4a5f48;
}

.adr-grid__day-head--today {
  background: rgba(139, 150, 124, 0.12);
}

.adr-grid__day-head--selected button {
  box-shadow: inset 0 -2px 0 var(--admin-primary, #8b967c);
}

.adr-grid__resource-cell {
  padding: 0.55rem 0.65rem;
  border-bottom: 1px solid #eef1ee;
  vertical-align: top;
}

.adr-resource {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
}

.adr-resource__name {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--admin-ink, #141414);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-transform: none;
}

.adr-grid__day-cell {
  width: var(--adr-day-col-width, 12em);
  min-width: var(--adr-day-col-width, 12em);
  min-height: 5.5rem;
  padding: 0.35rem;
  border-bottom: 1px solid #eef1ee;
  border-left: 1px solid #f3f5f4;
  vertical-align: top;
  background: #fff;
}

.adr-grid__day-cell--today {
  background: rgba(139, 150, 124, 0.05);
}

.adr-grid__day-cell--past {
  background: #fafafa;
}

.adr-grid__day-cell:has(.adr-event) .adr-slot {
  margin-top: 0.25rem;
}

.adr-event {
  display: grid;
  gap: 0.08rem;
  width: 100%;
  margin-bottom: 0.35rem;
  padding: 0.55rem 0.6em;
  border: 1px solid transparent;
  border-inline-start-width: 0;
  border-radius: calc(var(--cf-radius-control) * 0.55);
  text-align: left;
  cursor: pointer;
  font: inherit;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.adr-event:last-of-type {
  margin-bottom: 0.35rem;
}

.adr-event:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
}

.adr-event__desc {
  order: -1;
  font-size: 0.78rem;
  font-weight: 500;
  line-height: 1.25;
}

.adr-event__time {
  font-size: 0.68rem;
  font-weight: 600;
}

.adr-event__duration {
  font-size: 0.62rem;
  opacity: 0.75;
}

.adr-grid__day-cell:not(:has(.adr-event)) .adr-slot {
  opacity: 1;
  min-height: 3.2rem;
}

.adr-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  width: 100%;
  min-height: 2rem;
  padding: 0.35rem 0.45rem;
  border: 1px dashed rgba(139, 150, 124, 0.35);
  border-radius: calc(var(--cf-radius-control) * 0.55);
  background: rgba(139, 150, 124, 0.04);
  color: var(--admin-primary, #8b967c);
  font: inherit;
  font-size: 0.68rem;
  font-weight: 600;
  cursor: pointer;
  opacity: 0.72;
  transition: opacity 0.12s ease, background 0.12s ease, border-color 0.12s ease;
}

.adr-grid__day-cell:hover .adr-slot,
.adr-slot:focus-visible {
  opacity: 1;
  background: rgba(139, 150, 124, 0.12);
  border-color: rgba(139, 150, 124, 0.55);
}

.adr-slot svg {
  width: 0.85rem;
  height: 0.85rem;
}

.adr-grid__empty-row {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--admin-muted, #66706e);
  font-size: 0.875rem;
}

@media (max-width: 1080px) {
  .adr-shell {
    grid-template-columns: 1fr;
  }

  .adr-sidebar {
    border-right: none;
    border-bottom: 1px solid var(--admin-border, #e8ece9);
  }

  .adr-filter__list {
    max-height: 12rem;
  }

  .adr-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .adr-toolbar__right {
    justify-content: space-between;
  }

  .adr-slot {
    opacity: 1;
  }
}
</style>
