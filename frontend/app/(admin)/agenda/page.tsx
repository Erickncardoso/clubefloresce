'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { ApiError } from '@/lib/api'
import type { AuthUser } from '@/lib/types'
import {
  type AgendaAppointment,
  addDays,
  createAgendaAppointment,
  deleteAgendaAppointment,
  endOfWeek,
  fetchAgendaAppointments,
  fetchPatientsForAgenda,
  formatAgendaTime,
  startOfDay,
  startOfWeek,
  updateAgendaAppointment,
} from '@/lib/agenda'
import {
  AgendaCalendar,
  type AgendaViewMode,
  type ScheduleSlot,
} from '@/components/agenda/AgendaCalendar'
import {
  AgendaAppointmentModal,
  type AgendaSavePayload,
} from '@/components/agenda/AgendaAppointmentModal'
import styles from './agenda.module.scss'

function formatAgendaDateTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AgendaPage() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [appointments, setAppointments] = useState<AgendaAppointment[]>([])
  const [patients, setPatients] = useState<AuthUser[]>([])
  const [anchorDate, setAnchorDate] = useState(() => new Date())
  const [viewMode, setViewMode] = useState<AgendaViewMode>('week')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<AgendaAppointment[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [modalSaving, setModalSaving] = useState(false)
  const [modalError, setModalError] = useState('')
  const [editing, setEditing] = useState<AgendaAppointment | null>(null)
  const [prefill, setPrefill] = useState<{
    patientId?: string
    startsAt?: string
    durationMin?: number
  }>({})

  const range = useMemo(() => {
    if (viewMode === 'day') {
      const start = startOfDay(anchorDate)
      return { start, end: addDays(start, 1) }
    }
    return {
      start: startOfWeek(anchorDate, 0),
      end: addDays(endOfWeek(anchorDate, 0), 1),
    }
  }, [anchorDate, viewMode])

  const loadAppointments = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await fetchAgendaAppointments({
        from: range.start.toISOString(),
        to: range.end.toISOString(),
      })
      setAppointments(data.appointments || [])
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Falha ao carregar a agenda.'
      setLoadError(message)
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }, [range.start, range.end])

  useEffect(() => {
    void loadAppointments()
  }, [loadAppointments])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await fetchPatientsForAgenda()
        if (!cancelled) setPatients(list)
      } catch {
        if (!cancelled) setPatients([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function openCreateModal() {
    setEditing(null)
    setPrefill({})
    setModalError('')
    setModalOpen(true)
  }

  function openEditModal(item: AgendaAppointment) {
    setEditing(item)
    setPrefill({})
    setModalError('')
    setModalOpen(true)
  }

  function openFromSlot(slot: ScheduleSlot) {
    setEditing(null)
    setPrefill({
      startsAt: slot.startsAt,
      durationMin: slot.durationMin,
    })
    setModalError('')
    setModalOpen(true)
  }

  function closeModal() {
    if (modalSaving) return
    setModalOpen(false)
    setEditing(null)
    setModalError('')
  }

  async function saveAppointment(payload: AgendaSavePayload) {
    setModalSaving(true)
    setModalError('')
    try {
      if (editing?.id) {
        await updateAgendaAppointment(editing.id, {
          patientId: payload.patientId,
          patientName: payload.patientName,
          title: payload.title,
          startsAt: payload.startsAt,
          durationMin: payload.durationMin,
          notes: payload.notes || null,
        })
      } else {
        await createAgendaAppointment({
          patientId: payload.patientId,
          patientName: payload.patientName,
          title: payload.title,
          startsAt: payload.startsAt,
          durationMin: payload.durationMin,
          notes: payload.notes || null,
        })
      }
      setModalOpen(false)
      setEditing(null)
      await loadAppointments()
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : 'Não foi possível salvar o agendamento.',
      )
    } finally {
      setModalSaving(false)
    }
  }

  async function deleteCurrent() {
    if (!editing?.id) return
    if (!window.confirm('Excluir este agendamento?')) return
    setModalSaving(true)
    setModalError('')
    try {
      await deleteAgendaAppointment(editing.id)
      setModalOpen(false)
      setEditing(null)
      await loadAppointments()
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : 'Não foi possível excluir o agendamento.',
      )
    } finally {
      setModalSaving(false)
    }
  }

  function runSearch() {
    const q = searchQuery.trim().toLowerCase()
    if (!q) {
      setSearchResults([])
      return
    }
    const results = appointments
      .filter((item) => {
        const name = (item.patientName || '').toLowerCase()
        const title = (item.title || '').toLowerCase()
        const notes = (item.notes || '').toLowerCase()
        return name.includes(q) || title.includes(q) || notes.includes(q)
      })
      .slice(0, 20)
    setSearchResults(results)
  }

  function jumpToAppointment(item: AgendaAppointment) {
    setAnchorDate(new Date(item.startsAt))
    setViewMode('day')
    openEditModal(item)
  }

  return (
    <div className={`admin-shell ${styles.page}`}>
      <AgendaCalendar
        loading={loading}
        loadError={loadError}
        appointments={appointments}
        anchorDate={anchorDate}
        searchQuery={searchQuery}
        viewMode={viewMode}
        onAnchorChange={setAnchorDate}
        onSearchChange={setSearchQuery}
        onSearchSubmit={runSearch}
        onViewModeChange={setViewMode}
        onNewAppointment={openCreateModal}
        onOpenAppointment={openEditModal}
        onScheduleSlot={openFromSlot}
      />

      {searchResults.length > 0 ? (
        <section className={`admin-shell-card ${styles.searchResults}`}>
          <header className={styles.searchHead}>
            <h2>Resultados da busca</h2>
            <span>{searchResults.length} encontrado(s)</span>
          </header>
          <ul className={styles.searchList}>
            {searchResults.map((item) => (
              <li key={item.id}>
                <button type="button" className={styles.searchItem} onClick={() => jumpToAppointment(item)}>
                  <time>
                    {formatAgendaDateTime(item.startsAt)} · {formatAgendaTime(item.startsAt)}
                  </time>
                  <div>
                    <strong>{item.patientName}</strong>
                    <span>{item.title}</span>
                  </div>
                  <ChevronRight size={16} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <AgendaAppointmentModal
        open={modalOpen}
        patients={patients}
        appointment={editing}
        defaultDate={anchorDate}
        prefill={prefill}
        saving={modalSaving}
        error={modalError}
        onClose={closeModal}
        onSave={saveAppointment}
        onDelete={editing ? deleteCurrent : undefined}
      />
    </div>
  )
}
