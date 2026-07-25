<template>
  <NuxtLayout name="dashboard">
    <div class="agenda-page admin-shell">
      <header class="admin-shell-header agenda-page__head">
        <div>
          <h1>Agenda</h1>
          <p>Consultas e retornos das suas pacientes — busque por nome e navegue entre dias e semanas.</p>
        </div>
        <button type="button" class="btn-primary" @click="openCreateModal">
          + Novo agendamento
        </button>
      </header>

      <section class="agenda-toolbar admin-shell-card">
        <div class="agenda-search">
          <Search class="agenda-search__icon" aria-hidden="true" />
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Buscar paciente na agenda…"
            aria-label="Buscar paciente na agenda"
            autocomplete="off"
            @keydown.enter.prevent="focusFirstSearchMatch"
          >
          <button
            v-if="searchQuery.trim()"
            type="button"
            class="agenda-search__clear"
            @click="clearSearch"
          >
            Limpar
          </button>
        </div>

        <div class="agenda-nav">
          <div class="agenda-nav__group">
            <button type="button" class="btn-secondary agenda-nav__btn" @click="goPrev">
              <ChevronLeft aria-hidden="true" />
              {{ viewMode === 'day' ? 'Dia anterior' : 'Semana anterior' }}
            </button>
            <button type="button" class="btn-secondary agenda-nav__btn agenda-nav__btn--today" @click="goToday">
              Hoje
            </button>
            <button type="button" class="btn-secondary agenda-nav__btn" @click="goNext">
              {{ viewMode === 'day' ? 'Próximo dia' : 'Próxima semana' }}
              <ChevronRight aria-hidden="true" />
            </button>
          </div>

          <div class="agenda-nav__views" role="tablist" aria-label="Visualização da agenda">
            <button
              type="button"
              role="tab"
              class="agenda-view-pill"
              :class="{ 'agenda-view-pill--active': viewMode === 'week' }"
              :aria-selected="viewMode === 'week'"
              @click="viewMode = 'week'"
            >
              Semana
            </button>
            <button
              type="button"
              role="tab"
              class="agenda-view-pill"
              :class="{ 'agenda-view-pill--active': viewMode === 'day' }"
              :aria-selected="viewMode === 'day'"
              @click="viewMode = 'day'"
            >
              Dia
            </button>
          </div>
        </div>

        <p class="agenda-range-label">
          {{ rangeLabel }}
        </p>

        <div class="agenda-week-strip" role="tablist" aria-label="Dias da semana">
          <button
            v-for="day in weekDays"
            :key="day.key"
            type="button"
            role="tab"
            class="agenda-day-pill"
            :class="{
              'agenda-day-pill--selected': selectedDayKey === day.key,
              'agenda-day-pill--today': day.isToday,
            }"
            :aria-selected="selectedDayKey === day.key"
            @click="selectDay(day.key)"
          >
            <span>{{ day.weekdayLabel }}</span>
            <strong>{{ day.dayNumber }}</strong>
            <small v-if="countForDay(day.key)">{{ countForDay(day.key) }}</small>
          </button>
        </div>
      </section>

      <section class="agenda-body admin-shell-card">
        <div v-if="loading" class="agenda-state">Carregando agenda…</div>
        <div v-else-if="loadError" class="agenda-state agenda-state--error">{{ loadError }}</div>

        <template v-else-if="viewMode === 'day'">
          <header class="agenda-day-head">
            <h2>{{ selectedDayTitle }}</h2>
            <span>{{ visibleDayAppointments.length }} agendamento(s)</span>
          </header>

          <ul v-if="visibleDayAppointments.length" class="agenda-list">
            <li v-for="item in visibleDayAppointments" :key="item.id">
              <button type="button" class="agenda-item" @click="openEditModal(item)">
                <time>{{ formatAgendaTime(item.startsAt) }}</time>
                <div class="agenda-item__copy">
                  <strong>{{ item.patientName }}</strong>
                  <span>{{ item.title }} · {{ item.durationMin }} min</span>
                </div>
                <ChevronRight class="agenda-item__arrow" aria-hidden="true" />
              </button>
            </li>
          </ul>
          <p v-else class="agenda-state">Nenhum agendamento neste dia.</p>
        </template>

        <template v-else>
          <div class="agenda-week-grid">
            <article v-for="day in weekDays" :key="`col-${day.key}`" class="agenda-week-col">
              <header
                class="agenda-week-col__head"
                :class="{
                  'agenda-week-col__head--today': day.isToday,
                  'agenda-week-col__head--selected': selectedDayKey === day.key,
                }"
              >
                <button type="button" class="agenda-week-col__title" @click="selectDay(day.key)">
                  <span>{{ day.weekdayLabel }}</span>
                  <strong>{{ day.dayNumber }}</strong>
                </button>
              </header>
              <ul class="agenda-week-col__list">
                <li v-for="item in appointmentsForDay(day.key)" :key="item.id">
                  <button type="button" class="agenda-week-item" @click="openEditModal(item)">
                    <time>{{ formatAgendaTime(item.startsAt) }}</time>
                    <strong>{{ item.patientName }}</strong>
                    <span>{{ item.title }}</span>
                  </button>
                </li>
                <li v-if="!appointmentsForDay(day.key).length" class="agenda-week-col__empty">
                  —
                </li>
              </ul>
            </article>
          </div>
        </template>
      </section>

      <section v-if="searchResults.length" class="agenda-search-results admin-shell-card">
        <header class="agenda-search-results__head">
          <h2>Resultados da busca</h2>
          <span>{{ searchResults.length }} encontrado(s)</span>
        </header>
        <ul class="agenda-list">
          <li v-for="item in searchResults" :key="`search-${item.id}`">
            <button type="button" class="agenda-item" @click="jumpToAppointment(item)">
              <time>{{ formatAgendaDateTime(item.startsAt) }}</time>
              <div class="agenda-item__copy">
                <strong>{{ item.patientName }}</strong>
                <span>{{ item.title }}</span>
              </div>
              <ChevronRight class="agenda-item__arrow" aria-hidden="true" />
            </button>
          </li>
        </ul>
      </section>

      <AgendaAppointmentModal
        :open="modalOpen"
        :patients="patients"
        :appointment="editingAppointment"
        :default-date="selectedDate"
        :saving="modalSaving"
        :error="modalError"
        @close="closeModal"
        @save="saveAppointment"
        @delete="deleteCurrentAppointment"
      />
    </div>
  </NuxtLayout>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { ChevronLeft, ChevronRight, Search } from 'lucide-vue-next'
import { authHeaders, verifyAuthSession } from '~/composables/useAuthSession.js'
import { useAgenda } from '~/composables/useAgenda.js'
import AgendaAppointmentModal from '~/components/agenda/AgendaAppointmentModal.vue'
import {
  addDays,
  buildWeekDays,
  endOfWeek,
  filterAppointmentsByQuery,
  formatAgendaDateTime,
  formatAgendaDayTitle,
  formatAgendaTime,
  formatWeekRangeLabel,
  groupAppointmentsByDay,
  parseDateKey,
  startOfWeek,
  toDateKey,
} from '~/utils/agenda-calendar.js'

const apiBase = useApiBase()
const {
  fetchAppointments,
  searchAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} = useAgenda()

const loading = ref(true)
const loadError = ref('')
const appointments = ref([])
const patients = ref([])
const searchQuery = ref('')
const searchResults = ref([])
const viewMode = ref('week')
const anchorDate = ref(new Date())
const selectedDayKey = ref(toDateKey(new Date()))
const highlightedAppointmentId = ref('')

const modalOpen = ref(false)
const modalSaving = ref(false)
const modalError = ref('')
const editingAppointment = ref(null)

const weekDays = computed(() => buildWeekDays(anchorDate.value, 1))
const selectedDate = computed(() => parseDateKey(selectedDayKey.value) || new Date())
const selectedDayTitle = computed(() => formatAgendaDayTitle(selectedDate.value))
const rangeLabel = computed(() => {
  if (viewMode.value === 'day') return selectedDayTitle.value
  const start = startOfWeek(anchorDate.value, 1)
  const end = endOfWeek(anchorDate.value, 1)
  return formatWeekRangeLabel(start, end)
})

const groupedAppointments = computed(() => groupAppointmentsByDay(appointments.value))

function appointmentsForDay(dayKey) {
  const list = groupedAppointments.value.get(dayKey) || []
  return filterAppointmentsByQuery(list, searchQuery.value)
}

function countForDay(dayKey) {
  return appointmentsForDay(dayKey).length
}

const visibleDayAppointments = computed(() => appointmentsForDay(selectedDayKey.value))

async function loadPatients() {
  const data = await $fetch(`${apiBase.value}/users`, { headers: authHeaders() })
  patients.value = Array.isArray(data)
    ? data.filter((user) => user.role === 'PACIENTE')
    : []
}

async function loadAppointmentsRange() {
  loading.value = true
  loadError.value = ''
  try {
    const start = viewMode.value === 'day'
      ? selectedDate.value
      : startOfWeek(anchorDate.value, 1)
    const end = viewMode.value === 'day'
      ? addDays(selectedDate.value, 1)
      : addDays(endOfWeek(anchorDate.value, 1), 1)
    const data = await fetchAppointments({
      from: start.toISOString(),
      to: end.toISOString(),
    })
    appointments.value = data?.appointments || []
  } catch {
    loadError.value = 'Não foi possível carregar a agenda.'
    appointments.value = []
  } finally {
    loading.value = false
  }
}

async function runSearch() {
  const q = searchQuery.value.trim()
  if (!q) {
    searchResults.value = []
    return
  }
  try {
    const data = await searchAppointments(q, 12)
    searchResults.value = data?.appointments || []
  } catch {
    searchResults.value = filterAppointmentsByQuery(appointments.value, q)
  }
}

function selectDay(dayKey) {
  selectedDayKey.value = dayKey
  const date = parseDateKey(dayKey)
  if (date) anchorDate.value = date
}

function goToday() {
  const today = new Date()
  anchorDate.value = today
  selectedDayKey.value = toDateKey(today)
}

function goPrev() {
  if (viewMode.value === 'day') {
    const next = addDays(selectedDate.value, -1)
    anchorDate.value = next
    selectedDayKey.value = toDateKey(next)
    return
  }
  anchorDate.value = addDays(anchorDate.value, -7)
  selectedDayKey.value = toDateKey(startOfWeek(anchorDate.value, 1))
}

function goNext() {
  if (viewMode.value === 'day') {
    const next = addDays(selectedDate.value, 1)
    anchorDate.value = next
    selectedDayKey.value = toDateKey(next)
    return
  }
  anchorDate.value = addDays(anchorDate.value, 7)
  selectedDayKey.value = toDateKey(startOfWeek(anchorDate.value, 1))
}

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
}

function focusFirstSearchMatch() {
  void runSearch()
  if (searchResults.value[0]) jumpToAppointment(searchResults.value[0])
}

function jumpToAppointment(item) {
  if (!item?.startsAt) return
  const date = new Date(item.startsAt)
  anchorDate.value = date
  selectedDayKey.value = toDateKey(date)
  highlightedAppointmentId.value = item.id
  viewMode.value = 'day'
  clearSearch()
}

function openCreateModal() {
  editingAppointment.value = null
  modalError.value = ''
  modalOpen.value = true
}

function openEditModal(item) {
  editingAppointment.value = item
  modalError.value = ''
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  editingAppointment.value = null
  modalError.value = ''
}

async function saveAppointment(payload) {
  modalSaving.value = true
  modalError.value = ''
  try {
    if (editingAppointment.value?.id) {
      await updateAppointment(editingAppointment.value.id, payload)
    } else {
      await createAppointment(payload)
    }
    closeModal()
    await loadAppointmentsRange()
  } catch (err) {
    modalError.value = err?.data?.message || 'Não foi possível salvar o agendamento.'
  } finally {
    modalSaving.value = false
  }
}

async function deleteCurrentAppointment() {
  if (!editingAppointment.value?.id) return
  modalSaving.value = true
  modalError.value = ''
  try {
    await deleteAppointment(editingAppointment.value.id)
    closeModal()
    await loadAppointmentsRange()
  } catch (err) {
    modalError.value = err?.data?.message || 'Não foi possível excluir o agendamento.'
  } finally {
    modalSaving.value = false
  }
}

let searchTimer = null
watch(searchQuery, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    void runSearch()
  }, 260)
})

watch([anchorDate, viewMode, selectedDayKey], () => {
  void loadAppointmentsRange()
})

onMounted(async () => {
  await verifyAuthSession({ requiredRole: 'NUTRICIONISTA' })
  await Promise.all([loadPatients(), loadAppointmentsRange()])
})

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
})
</script>

<style scoped>
.agenda-page {
  display: grid;
  gap: 1rem;
  padding-bottom: 1rem;
}

.agenda-page__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.agenda-toolbar,
.agenda-body,
.agenda-search-results {
  padding: 1rem 1.1rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-control);
  background: #fff;
}

.agenda-search {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-control);
  background: #f8faf9;
}

.agenda-search__icon {
  width: 1rem;
  height: 1rem;
  color: #9ca3af;
  flex-shrink: 0;
}

.agenda-search input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 0.875rem;
  color: var(--admin-ink, #141414);
  outline: none;
}

.agenda-search__clear {
  border: none;
  background: transparent;
  color: var(--admin-primary, #8b967c);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.agenda-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 0.85rem;
}

.agenda-nav__group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.agenda-nav__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.agenda-nav__btn svg {
  width: 0.95rem;
  height: 0.95rem;
}

.agenda-nav__btn--today {
  font-weight: 600;
}

.agenda-nav__views {
  display: inline-flex;
  gap: 0.35rem;
  padding: 0.2rem;
  border-radius: var(--cf-radius-control);
  background: #f3f5f4;
}

.agenda-view-pill {
  min-height: 2rem;
  padding: 0.35rem 0.75rem;
  border: none;
  border-radius: var(--cf-radius-control);
  background: transparent;
  color: #6b7280;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
}

.agenda-view-pill--active {
  background: #fff;
  color: var(--admin-ink, #141414);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.agenda-range-label {
  margin: 0.75rem 0 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--admin-ink, #141414);
  text-transform: capitalize;
}

.agenda-week-strip {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.4rem;
  margin-top: 0.85rem;
}

.agenda-day-pill {
  display: grid;
  justify-items: center;
  gap: 0.12rem;
  min-height: 4.1rem;
  padding: 0.45rem 0.35rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-control);
  background: #fff;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.agenda-day-pill span {
  font-size: 0.68rem;
  color: #8a9288;
  text-transform: uppercase;
}

.agenda-day-pill strong {
  font-size: 1rem;
  font-weight: 600;
  color: var(--admin-ink, #141414);
}

.agenda-day-pill small {
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 0.25rem;
  border-radius: var(--cf-radius-pill);
  background: rgba(139, 150, 124, 0.14);
  font-size: 0.62rem;
  font-weight: 600;
  color: #4a5f48;
  line-height: 1.1rem;
}

.agenda-day-pill--today {
  border-color: rgba(139, 150, 124, 0.55);
  background: rgba(139, 150, 124, 0.08);
}

.agenda-day-pill--selected {
  border-color: var(--admin-primary, #8b967c);
  background: rgba(139, 150, 124, 0.14);
}

.agenda-day-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.agenda-day-head h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--admin-ink, #141414);
  text-transform: capitalize;
}

.agenda-day-head span {
  font-size: 0.8125rem;
  color: var(--admin-muted, #66706e);
}

.agenda-state {
  margin: 0;
  padding: 1.5rem 0;
  text-align: center;
  color: var(--admin-muted, #66706e);
  font-size: 0.875rem;
}

.agenda-state--error {
  color: #b42318;
}

.agenda-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.45rem;
}

.agenda-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
  width: 100%;
  padding: 0.75rem 0.85rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-control);
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.agenda-item:hover {
  background: rgba(139, 150, 124, 0.08);
  border-color: rgba(139, 150, 124, 0.35);
}

.agenda-item time {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--admin-primary, #8b967c);
  white-space: nowrap;
}

.agenda-item__copy {
  min-width: 0;
}

.agenda-item__copy strong {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--admin-ink, #141414);
}

.agenda-item__copy span {
  display: block;
  margin-top: 0.12rem;
  font-size: 0.75rem;
  color: var(--admin-muted, #66706e);
}

.agenda-item__arrow {
  width: 1rem;
  height: 1rem;
  color: #9ca3af;
}

.agenda-week-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.55rem;
  overflow-x: auto;
}

.agenda-week-col {
  min-width: 8.5rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-control);
  background: #fafbfa;
  overflow: hidden;
}

.agenda-week-col__head {
  padding: 0.55rem 0.65rem;
  border-bottom: 1px solid var(--admin-border, #e8ece9);
  background: #fff;
}

.agenda-week-col__head--today {
  background: rgba(139, 150, 124, 0.1);
}

.agenda-week-col__head--selected {
  box-shadow: inset 0 -2px 0 var(--admin-primary, #8b967c);
}

.agenda-week-col__title {
  display: grid;
  gap: 0.08rem;
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font: inherit;
}

.agenda-week-col__title span {
  font-size: 0.68rem;
  color: #8a9288;
  text-transform: uppercase;
}

.agenda-week-col__title strong {
  font-size: 0.95rem;
  color: var(--admin-ink, #141414);
}

.agenda-week-col__list {
  list-style: none;
  margin: 0;
  padding: 0.45rem;
  display: grid;
  gap: 0.35rem;
  min-height: 6rem;
}

.agenda-week-item {
  display: grid;
  gap: 0.08rem;
  width: 100%;
  padding: 0.45rem 0.5rem;
  border: 1px solid #eef1ee;
  border-radius: var(--cf-radius-control);
  background: #fff;
  text-align: left;
  cursor: pointer;
  font: inherit;
}

.agenda-week-item time {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--admin-primary, #8b967c);
}

.agenda-week-item strong {
  font-size: 0.75rem;
  color: var(--admin-ink, #141414);
}

.agenda-week-item span {
  font-size: 0.68rem;
  color: var(--admin-muted, #66706e);
}

.agenda-week-col__empty {
  padding: 0.45rem 0.5rem;
  font-size: 0.75rem;
  color: #cbd5e1;
}

.agenda-search-results__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.agenda-search-results__head h2 {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
}

.agenda-search-results__head span {
  font-size: 0.75rem;
  color: var(--admin-muted, #66706e);
}

@media (max-width: 980px) {
  .agenda-week-strip,
  .agenda-week-grid {
    grid-template-columns: repeat(7, minmax(4.5rem, 1fr));
    overflow-x: auto;
  }

  .agenda-nav {
    flex-direction: column;
    align-items: stretch;
  }

  .agenda-nav__views {
    justify-content: center;
  }
}
</style>
