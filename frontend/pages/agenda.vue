<template>
  <NuxtLayout name="dashboard">
    <div class="agenda-page admin-shell">
      <AgendaGoogleCalendar
        ref="calendarRef"
        :loading="loading"
        :load-error="loadError"
        :appointments="appointments"
        :anchor-date="anchorDate"
        :search-query="searchQuery"
        @update:anchor-date="onAnchorDateChange"
        @update:search-query="searchQuery = $event"
        @update:view-mode="calendarViewMode = $event"
        @open-appointment="openEditModal"
        @schedule-slot="openSchedulePopover"
        @clear-selection="closeSchedulePopover"
        @search-submit="focusFirstSearchMatch"
        @new-appointment="openCreateModal"
      />

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

      <AgendaSchedulePopover
        :open="popoverOpen"
        :anchor="popoverAnchor"
        :slot-data="popoverSlot"
        :patients="patients"
        :saving="popoverSaving"
        :error="popoverError"
        @close="closeSchedulePopover"
        @save="saveFromPopover"
        @expand="expandPopoverToModal"
      />

      <AgendaAppointmentModal
        :open="modalOpen"
        :patients="patients"
        :appointment="editingAppointment"
        :default-date="selectedDate"
        :prefill-patient-id="schedulePrefill.patientId"
        :prefill-starts-at="schedulePrefill.startsAt"
        :prefill-duration-min="schedulePrefill.durationMin"
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
import { ChevronRight } from 'lucide-vue-next'
import { authHeaders, verifyAuthSession } from '~/composables/useAuthSession.js'
import { useAdminAgendaTopbar } from '~/composables/useAdminAgendaTopbar.js'
import { useAgenda } from '~/composables/useAgenda.js'
import AgendaAppointmentModal from '~/components/agenda/AgendaAppointmentModal.vue'
import AgendaGoogleCalendar from '~/components/agenda/AgendaGoogleCalendar.vue'
import AgendaSchedulePopover from '~/components/agenda/AgendaSchedulePopover.vue'
import {
  addDays,
  endOfMonth,
  endOfWeek,
  formatAgendaDateTime,
  parseDateKey,
  startOfMonth,
  startOfWeek,
  toDateKey,
} from '~/utils/agenda-calendar.js'

const apiBase = useApiBase()
const route = useRoute()
const {
  fetchAppointments,
  searchAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} = useAgenda()
const { refreshAdminAgendaTopbar } = useAdminAgendaTopbar()

const loading = ref(true)
const loadError = ref('')
const appointments = ref([])
const patients = ref([])
const searchQuery = ref('')
const searchResults = ref([])
const anchorDate = ref(new Date())
const selectedDayKey = ref(toDateKey(new Date()))
const calendarViewMode = ref('week')

const modalOpen = ref(false)
const modalSaving = ref(false)
const modalError = ref('')
const editingAppointment = ref(null)
const schedulePrefill = ref({ patientId: '', startsAt: '', durationMin: 60 })

const popoverOpen = ref(false)
const popoverSaving = ref(false)
const popoverError = ref('')
const popoverAnchor = ref({ x: 0, y: 0, width: 0, height: 0 })
const popoverSlot = ref({ dayKey: '', startsAt: '', durationMin: 60, endMinutes: null, patientId: '' })
const calendarRef = ref(null)

const selectedDate = computed(() => parseDateKey(selectedDayKey.value) || new Date())

async function loadPatients() {
  const data = await $fetch(`${apiBase.value}/users`, { headers: authHeaders() })
  patients.value = Array.isArray(data)
    ? data.filter((user) => user.role === 'PACIENTE')
    : []
}

function getRangeForView() {
  if (calendarViewMode.value === 'day') {
    const day = anchorDate.value
    const start = new Date(day)
    start.setHours(0, 0, 0, 0)
    const end = addDays(start, 1)
    return { start, end }
  }
  if (calendarViewMode.value === 'month') {
    return {
      start: startOfMonth(anchorDate.value),
      end: addDays(endOfMonth(anchorDate.value), 1),
    }
  }
  return {
    start: startOfWeek(anchorDate.value, 0),
    end: addDays(endOfWeek(anchorDate.value, 0), 1),
  }
}

async function loadAppointmentsRange() {
  loading.value = true
  loadError.value = ''
  try {
    const { start, end } = getRangeForView()
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
    searchResults.value = []
  }
}

function onAnchorDateChange(date) {
  anchorDate.value = date
  selectedDayKey.value = toDateKey(date)
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
  calendarViewMode.value = 'day'
  searchQuery.value = ''
  searchResults.value = []
}

function openCreateModal() {
  closeSchedulePopover()
  editingAppointment.value = null
  schedulePrefill.value = { patientId: '', startsAt: '', durationMin: 60 }
  modalError.value = ''
  modalOpen.value = true
}

function openSchedulePopover(slot) {
  if (!slot?.startsAt) return
  editingAppointment.value = null
  modalOpen.value = false
  popoverSlot.value = {
    dayKey: slot.dayKey || '',
    startsAt: slot.startsAt,
    durationMin: slot.quickClick ? 60 : (Number(slot.durationMin) || 30),
    endMinutes: slot.endMinutes ?? null,
    patientId: slot.patientId || '',
  }
  popoverAnchor.value = slot.anchor || { x: 0, y: 0, width: 0, height: 40 }
  if (slot.dayKey) selectedDayKey.value = slot.dayKey
  popoverError.value = ''
  popoverOpen.value = true
}

function closeSchedulePopover() {
  popoverOpen.value = false
  popoverError.value = ''
  calendarRef.value?.clearSelectionPreview?.()
}

function expandPopoverToModal(formData = {}) {
  schedulePrefill.value = {
    patientId: formData.patientId || popoverSlot.value.patientId || '',
    startsAt: popoverSlot.value.startsAt || '',
    durationMin: Number(formData.durationMin ?? popoverSlot.value.durationMin) || 60,
  }
  if (popoverSlot.value.dayKey) selectedDayKey.value = popoverSlot.value.dayKey
  closeSchedulePopover()
  modalError.value = ''
  modalOpen.value = true
}

async function saveFromPopover(payload) {
  popoverSaving.value = true
  popoverError.value = ''
  try {
    await createAppointment(payload)
    closeSchedulePopover()
    await loadAppointmentsRange()
    refreshAdminAgendaTopbar()
  } catch (err) {
    popoverError.value = err?.data?.message || 'Não foi possível salvar o agendamento.'
  } finally {
    popoverSaving.value = false
  }
}

function openScheduleModal(slot) {
  openSchedulePopover(slot)
}

function openEditModal(item) {
  closeSchedulePopover()
  editingAppointment.value = item
  schedulePrefill.value = { patientId: '', startsAt: '', durationMin: 60 }
  modalError.value = ''
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  editingAppointment.value = null
  schedulePrefill.value = { patientId: '', startsAt: '', durationMin: 60 }
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
    refreshAdminAgendaTopbar()
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
    refreshAdminAgendaTopbar()
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

watch([anchorDate, calendarViewMode], () => {
  void loadAppointmentsRange()
})

onMounted(async () => {
  await verifyAuthSession({ requiredRole: 'NUTRICIONISTA' })
  if (route.query.day) {
    const date = parseDateKey(String(route.query.day))
    if (date) {
      anchorDate.value = date
      selectedDayKey.value = toDateKey(date)
      calendarViewMode.value = 'day'
    }
  }
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

.agenda-search-results {
  padding: 1rem 1.1rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-control);
  background: #fff;
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
</style>
