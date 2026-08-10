'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { AuthUser } from '@/lib/types'
import {
  AGENDA_DURATION_OPTIONS,
  AGENDA_QUICK_HOURS,
  AGENDA_TITLE_OPTIONS,
  type AgendaAppointment,
  buildSlotDateTime,
  defaultAppointmentDateTime,
  toDateKey,
  toLocalDateTimeInputValue,
  fromLocalDateTimeInputValue,
} from '@/lib/agenda'
import { FloatField } from '@/components/ui/FloatField'
import { AnimatedDialog } from '@/components/overlays'
import styles from './AgendaAppointmentModal.module.scss'

export type AgendaSavePayload = {
  patientId: string
  patientName: string
  title: string
  startsAt: string
  durationMin: number
  notes: string
}

type Prefill = {
  patientId?: string
  startsAt?: string
  durationMin?: number
}

type Props = {
  open: boolean
  patients: AuthUser[]
  appointment: AgendaAppointment | null
  defaultDate?: Date | null
  prefill?: Prefill
  saving?: boolean
  error?: string
  onClose: () => void
  onSave: (payload: AgendaSavePayload) => void
  onDelete?: () => void
}

export function AgendaAppointmentModal({
  open,
  patients,
  appointment,
  defaultDate = null,
  prefill,
  saving = false,
  error = '',
  onClose,
  onSave,
  onDelete,
}: Props) {
  const editing = Boolean(appointment?.id)
  const [patientId, setPatientId] = useState('')
  const [title, setTitle] = useState('Consulta')
  const [startsAtLocal, setStartsAtLocal] = useState('')
  const [durationMin, setDurationMin] = useState(60)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    if (appointment) {
      setPatientId(appointment.patientId || '')
      setTitle(appointment.title || 'Consulta')
      setStartsAtLocal(toLocalDateTimeInputValue(appointment.startsAt))
      setDurationMin(Number(appointment.durationMin) || 60)
      setNotes(appointment.notes || '')
      return
    }
    const iso =
      prefill?.startsAt ||
      defaultAppointmentDateTime(defaultDate || new Date())
    setPatientId(prefill?.patientId || '')
    setTitle('Consulta')
    setStartsAtLocal(toLocalDateTimeInputValue(iso))
    setDurationMin(Number(prefill?.durationMin) || 60)
    setNotes('')
  }, [open, appointment, defaultDate, prefill])

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === patientId),
    [patients, patientId],
  )

  function applyQuickHour(hour: number) {
    const dayKey = toDateKey(new Date(fromLocalDateTimeInputValue(startsAtLocal) || Date.now()))
    const iso = buildSlotDateTime(dayKey, hour, 0)
    setStartsAtLocal(toLocalDateTimeInputValue(iso))
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const patient = patients.find((p) => p.id === patientId)
    if (!patient) return
    const startsAt = fromLocalDateTimeInputValue(startsAtLocal)
    if (!startsAt) return
    onSave({
      patientId: patient.id,
      patientName: patient.name,
      title: title.trim() || 'Consulta',
      startsAt,
      durationMin: Number(durationMin) || 60,
      notes: notes.trim(),
    })
  }

  const titleText = editing ? 'Editar agendamento' : 'Agendar paciente'

  return (
    <AnimatedDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title={titleText}
      contentClassName={`modal-card ${styles.card}`}
    >
      <header className={styles.head}>
        <div>
          <h2 id="agenda-modal-title">{titleText}</h2>
          {selectedPatient?.name ? <p>{selectedPatient.name}</p> : null}
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
      </header>

      <form className={styles.form} onSubmit={onSubmit}>
        <FloatField
          as="select"
          label="Paciente"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          required
        >
          <option value="">Selecione…</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </FloatField>

        <FloatField
          as="select"
          label="Tipo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        >
          {AGENDA_TITLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </FloatField>

        <FloatField
          label="Data e horário"
          type="datetime-local"
          value={startsAtLocal}
          onChange={(e) => setStartsAtLocal(e.target.value)}
          required
        />

        {!editing ? (
          <div className={styles.quickHours}>
            <span>Horários rápidos</span>
            <div className={styles.hourGrid}>
              {AGENDA_QUICK_HOURS.map((hour) => (
                <button
                  key={hour}
                  type="button"
                  className={styles.hourBtn}
                  onClick={() => applyQuickHour(hour)}
                >
                  {String(hour).padStart(2, '0')}:00
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <FloatField
          as="select"
          label="Duração"
          value={durationMin}
          onChange={(e) => setDurationMin(Number(e.target.value))}
        >
          {AGENDA_DURATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </FloatField>

        <FloatField
          as="textarea"
          label="Observações"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {error ? <p className={styles.error}>{error}</p> : null}

        <footer className={styles.foot}>
          {editing && onDelete ? (
            <button
              type="button"
              className={`btn-secondary ${styles.danger}`}
              disabled={saving}
              onClick={onDelete}
            >
              Excluir
            </button>
          ) : (
            <span />
          )}
          <div className={styles.actions}>
            <button type="button" className="btn-secondary" disabled={saving} onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving || !patientId}
            >
              {saving ? 'Salvando…' : editing ? 'Salvar' : 'Agendar'}
            </button>
          </div>
        </footer>
      </form>
    </AnimatedDialog>
  )
}
