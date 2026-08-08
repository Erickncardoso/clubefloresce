'use client'

import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react'
import {
  AGENDA_DAY_END_HOUR,
  AGENDA_DAY_START_HOUR,
  AGENDA_HOUR_HEIGHT_PX,
  WEEKDAY_LABELS,
  type AgendaAppointment,
  type AgendaDayColumn,
  addDays,
  buildHourLabels,
  buildSlotDateTime,
  buildWeekDays,
  endOfWeek,
  formatAgendaTime,
  formatWeekRangeLabel,
  getEventColorStyle,
  groupAppointmentsByDay,
  isToday,
  layoutAgendaEvent,
  startOfDay,
  startOfWeek,
  toDateKey,
} from '@/lib/agenda'
import styles from './AgendaCalendar.module.scss'

export type AgendaViewMode = 'day' | 'week'

export type ScheduleSlot = {
  dayKey: string
  startsAt: string
  durationMin: number
}

type Props = {
  loading?: boolean
  loadError?: string
  appointments: AgendaAppointment[]
  anchorDate: Date
  searchQuery: string
  viewMode: AgendaViewMode
  onAnchorChange: (date: Date) => void
  onSearchChange: (value: string) => void
  onSearchSubmit: () => void
  onViewModeChange: (mode: AgendaViewMode) => void
  onNewAppointment: () => void
  onOpenAppointment: (item: AgendaAppointment) => void
  onScheduleSlot: (slot: ScheduleSlot) => void
}

type DragState = {
  dayKey: string
  startMinutes: number
  endMinutes: number
}

const HOUR_LABELS = buildHourLabels()
const GRID_HOURS = AGENDA_DAY_END_HOUR - AGENDA_DAY_START_HOUR + 1
const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

function snapMinutes(raw: number) {
  const clamped = Math.max(
    AGENDA_DAY_START_HOUR * 60,
    Math.min(AGENDA_DAY_END_HOUR * 60 + 45, raw),
  )
  return Math.round(clamped / 15) * 15
}

function minutesFromPointer(columnEl: HTMLElement, clientY: number) {
  const rect = columnEl.getBoundingClientRect()
  const y = clientY - rect.top + columnEl.scrollTop
  const raw = AGENDA_DAY_START_HOUR * 60 + (y / AGENDA_HOUR_HEIGHT_PX) * 60
  return snapMinutes(raw)
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function AgendaCalendar({
  loading = false,
  loadError = '',
  appointments,
  anchorDate,
  searchQuery,
  viewMode,
  onAnchorChange,
  onSearchChange,
  onSearchSubmit,
  onViewModeChange,
  onNewAppointment,
  onOpenAppointment,
  onScheduleSlot,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [nowTick, setNowTick] = useState(() => Date.now())

  const weekDays = useMemo(() => buildWeekDays(anchorDate, 0), [anchorDate])
  const visibleDays: AgendaDayColumn[] = useMemo(() => {
    if (viewMode === 'day') {
      const d = startOfDay(anchorDate)
      return [
        {
          key: toDateKey(d),
          date: d,
          weekdayLabel: WEEKDAY_LABELS[d.getDay()],
          dayNumber: d.getDate(),
          isToday: isToday(d),
        },
      ]
    }
    return weekDays
  }, [viewMode, anchorDate, weekDays])

  const rangeStart = viewMode === 'day' ? startOfDay(anchorDate) : startOfWeek(anchorDate, 0)
  const rangeEnd = viewMode === 'day' ? startOfDay(anchorDate) : endOfWeek(anchorDate, 0)
  const rangeLabel = formatWeekRangeLabel(rangeStart, rangeEnd)

  const byDay = useMemo(() => groupAppointmentsByDay(appointments), [appointments])

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear()
    return Array.from({ length: 7 }, (_, i) => y - 2 + i)
  }, [])

  const currentTimeOffset = useMemo(() => {
    const now = new Date(nowTick)
    const minutes = now.getHours() * 60 + now.getMinutes()
    const dayStart = AGENDA_DAY_START_HOUR * 60
    const dayEnd = (AGENDA_DAY_END_HOUR + 1) * 60
    if (minutes < dayStart || minutes > dayEnd) return null
    return ((minutes - dayStart) / 60) * AGENDA_HOUR_HEIGHT_PX
  }, [nowTick])

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const hour = Math.max(AGENDA_DAY_START_HOUR, Math.min(9, new Date().getHours()))
    el.scrollTop = (hour - AGENDA_DAY_START_HOUR) * AGENDA_HOUR_HEIGHT_PX - 24
  }, [viewMode])

  function goPrev() {
    onAnchorChange(addDays(anchorDate, viewMode === 'day' ? -1 : -7))
  }

  function goNext() {
    onAnchorChange(addDays(anchorDate, viewMode === 'day' ? 1 : 7))
  }

  function goToday() {
    onAnchorChange(new Date())
  }

  function setMonth(month: number) {
    const next = new Date(anchorDate)
    next.setMonth(month)
    onAnchorChange(next)
  }

  function setYear(year: number) {
    const next = new Date(anchorDate)
    next.setFullYear(year)
    onAnchorChange(next)
  }

  function miniMonthCells() {
    const first = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
    const start = startOfWeek(first, 0)
    return Array.from({ length: 42 }, (_, i) => {
      const date = addDays(start, i)
      return {
        key: toDateKey(date),
        date,
        dayNumber: date.getDate(),
        inMonth: date.getMonth() === anchorDate.getMonth(),
        isToday: isToday(date),
      }
    })
  }

  function finishDrag(state: DragState) {
    const start = Math.min(state.startMinutes, state.endMinutes)
    const end = Math.max(state.startMinutes, state.endMinutes)
    const durationMin = Math.max(30, end - start)
    const hour = Math.floor(start / 60)
    const minute = start % 60
    onScheduleSlot({
      dayKey: state.dayKey,
      startsAt: buildSlotDateTime(state.dayKey, hour, minute),
      durationMin,
    })
  }

  function onColumnPointerDown(day: AgendaDayColumn, e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    const column = e.currentTarget
    const minutes = minutesFromPointer(column, e.clientY)
    const next: DragState = {
      dayKey: day.key,
      startMinutes: minutes,
      endMinutes: minutes + 60,
    }
    dragRef.current = next
    setDragState(next)
    column.setPointerCapture(e.pointerId)

    function onMove(ev: PointerEvent) {
      const current = dragRef.current
      if (!current) return
      const endMinutes = Math.max(minutesFromPointer(column, ev.clientY), current.startMinutes + 15)
      const updated = { ...current, endMinutes }
      dragRef.current = updated
      setDragState(updated)
    }

    function onUp() {
      column.releasePointerCapture(e.pointerId)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      const finalState = dragRef.current
      dragRef.current = null
      setDragState(null)
      if (finalState) finishDrag(finalState)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function selectionStyle(dayKey: string) {
    if (!dragState || dragState.dayKey !== dayKey) return undefined
    const start = Math.min(dragState.startMinutes, dragState.endMinutes)
    const end = Math.max(dragState.startMinutes, dragState.endMinutes)
    const top =
      ((start - AGENDA_DAY_START_HOUR * 60) / 60) * AGENDA_HOUR_HEIGHT_PX
    const height = Math.max(((end - start) / 60) * AGENDA_HOUR_HEIGHT_PX, 18)
    return { top: `${top}px`, height: `${height}px` }
  }

  const gridStyle = {
    '--gcal-hour-height': `${AGENDA_HOUR_HEIGHT_PX}px`,
    '--gcal-hours': String(GRID_HOURS),
  } as CSSProperties

  return (
    <div className={`admin-shell-card cf-squircle cf-squircle--control ${styles.root}`}>
      <aside className={styles.sidebar}>
        <button type="button" className={`btn-primary ${styles.createBtn}`} onClick={onNewAppointment}>
          <Plus size={16} aria-hidden />
          Adicionar agendamento
        </button>

        <div className={styles.miniCal}>
          <header className={styles.miniHead}>
            <button
              type="button"
              className={styles.miniNav}
              aria-label="Mês anterior"
              onClick={() => setMonth(anchorDate.getMonth() - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <p>
              {capitalize(MONTH_NAMES[anchorDate.getMonth()])} {anchorDate.getFullYear()}
            </p>
            <button
              type="button"
              className={styles.miniNav}
              aria-label="Próximo mês"
              onClick={() => setMonth(anchorDate.getMonth() + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </header>
          <div className={styles.miniWeekdays} aria-hidden>
            {WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label.slice(0, 1)}</span>
            ))}
          </div>
          <div className={styles.miniGrid}>
            {miniMonthCells().map((cell) => (
              <button
                key={cell.key}
                type="button"
                className={[
                  styles.miniDay,
                  cell.inMonth ? '' : styles.miniDayOutside,
                  cell.isToday ? styles.miniDayToday : '',
                  toDateKey(anchorDate) === cell.key ? styles.miniDaySelected : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onAnchorChange(cell.date)}
              >
                {cell.dayNumber}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <section className={styles.main}>
        <header className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <button type="button" className={`btn-secondary ${styles.navBtn}`} onClick={goPrev} aria-label="Anterior">
              <ChevronLeft size={16} />
            </button>
            <button type="button" className={`btn-secondary ${styles.todayBtn}`} onClick={goToday}>
              Hoje
            </button>
            <button type="button" className={`btn-secondary ${styles.navBtn}`} onClick={goNext} aria-label="Próximo">
              <ChevronRight size={16} />
            </button>

            <div className={styles.datePickers}>
              <select
                className={styles.select}
                aria-label="Mês"
                value={anchorDate.getMonth()}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {MONTH_NAMES.map((name, index) => (
                  <option key={name} value={index}>
                    {capitalize(name)}
                  </option>
                ))}
              </select>
              <select
                className={`${styles.select} ${styles.selectYear}`}
                aria-label="Ano"
                value={anchorDate.getFullYear()}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <p className={styles.rangeLabel}>{rangeLabel}</p>
          </div>

          <div className={styles.toolbarRight}>
            <label className={styles.search}>
              <Search size={14} aria-hidden />
              <input
                type="search"
                value={searchQuery}
                placeholder="Pesquisar e pressione Enter"
                aria-label="Pesquisar na agenda"
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onSearchSubmit()
                  }
                }}
              />
            </label>

            <div className={styles.viewToggle} role="tablist" aria-label="Visualização">
              <button
                type="button"
                role="tab"
                className={`${styles.viewBtn} ${viewMode === 'day' ? styles.viewBtnActive : ''}`}
                aria-selected={viewMode === 'day'}
                onClick={() => onViewModeChange('day')}
              >
                Dia
              </button>
              <button
                type="button"
                role="tab"
                className={`${styles.viewBtn} ${viewMode === 'week' ? styles.viewBtnActive : ''}`}
                aria-selected={viewMode === 'week'}
                onClick={() => onViewModeChange('week')}
              >
                Semana
              </button>
            </div>
          </div>
        </header>

        {loading ? <div className={styles.state}>Carregando agenda…</div> : null}
        {!loading && loadError ? <div className={`${styles.state} ${styles.stateError}`}>{loadError}</div> : null}

        {!loading && !loadError ? (
          <div className={styles.timeWrap}>
            <div className={styles.timeHead}>
              <div className={styles.gutter} aria-hidden />
              <div
                className={styles.headDays}
                style={{ gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))` }}
              >
                {visibleDays.map((day) => (
                  <div
                    key={`head-${day.key}`}
                    className={`${styles.headDay} ${day.isToday ? styles.headDayToday : ''}`}
                  >
                    <span>{day.weekdayLabel}</span>
                    <strong>{day.dayNumber}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div ref={scrollRef} className={styles.timeScroll}>
              <div className={styles.timeGrid} style={gridStyle}>
                <div className={styles.timeGutter}>
                  {HOUR_LABELS.map((slot) => (
                    <div key={slot.hour} className={styles.gutterLabel}>
                      {slot.label}
                    </div>
                  ))}
                </div>

                <div
                  className={styles.columns}
                  style={{ gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))` }}
                >
                  {visibleDays.map((day) => {
                    const dayItems = byDay.get(day.key) || []
                    return (
                      <div
                        key={`col-${day.key}`}
                        className={[
                          styles.column,
                          day.isToday ? styles.columnToday : '',
                          dragState?.dayKey === day.key ? styles.columnDragging : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onPointerDown={(e) => onColumnPointerDown(day, e)}
                      >
                        {HOUR_LABELS.map((slot) => (
                          <div key={`${day.key}-${slot.hour}`} className={styles.hourLine} />
                        ))}

                        {selectionStyle(day.key) ? (
                          <div className={styles.selection} style={selectionStyle(day.key)} aria-hidden />
                        ) : null}

                        {dayItems.map((item) => {
                          const layout = layoutAgendaEvent(item)
                          const colors = getEventColorStyle(item.patientId)
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className={styles.event}
                              style={{
                                top: `${layout.top}px`,
                                height: `${layout.height}px`,
                                background: colors.bg,
                                borderLeftColor: colors.accent,
                                color: colors.text,
                              }}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation()
                                onOpenAppointment(item)
                              }}
                            >
                              <strong>
                                {formatAgendaTime(item.startsAt)} · {item.patientName}
                              </strong>
                              <span>{item.title}</span>
                            </button>
                          )
                        })}

                        {day.isToday && currentTimeOffset != null ? (
                          <div
                            className={styles.nowLine}
                            style={{ top: `${currentTimeOffset}px` }}
                            aria-hidden
                          >
                            <span className={styles.nowDot} />
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <p className={styles.dragHint}>
              Arraste na grade para selecionar horário · clique em um evento para editar
            </p>
          </div>
        ) : null}
      </section>
    </div>
  )
}
