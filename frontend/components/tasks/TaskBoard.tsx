'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { X, ChevronDown, ChevronUp, Plus, Check } from 'lucide-react'
import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  type Task,
  type TaskPriority,
} from '@/lib/tasks'
import styles from './TaskBoard.module.scss'
import { AnimatedDialog } from '@/components/overlays'

const PRIORITIES = [
  { value: 'URGENTE' as TaskPriority, label: 'Urgente', dot: '#f87171' },
  { value: 'IMPORTANTE' as TaskPriority, label: 'Importante', dot: '#facc15' },
  { value: 'NORMAL' as TaskPriority, label: 'Normal', dot: '#4ade80' },
  { value: 'SOMEDAY' as TaskPriority, label: 'Someday', dot: '#94a3b8' },
]

type Filter = 'TODAS' | TaskPriority

interface EditState {
  task: Task
  title: string
  priority: TaskPriority
}

export function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('TODAS')
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<TaskPriority>('NORMAL')
  const [editState, setEditState] = useState<EditState | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const editTitleRef = useRef<HTMLTextAreaElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setTasks(await fetchTasks())
    } catch {
      /* keep */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (creating) inputRef.current?.focus()
  }, [creating])

  useEffect(() => {
    if (editState) {
      setTimeout(() => editTitleRef.current?.focus(), 50)
    }
  }, [editState])

  const visible = tasks
    .filter((t) => filter === 'TODAS' || t.priority === filter)
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      const order = ['URGENTE', 'IMPORTANTE', 'NORMAL', 'SOMEDAY']
      return (
        order.indexOf(a.priority) - order.indexOf(b.priority) ||
        a.position - b.position ||
        a.createdAt.localeCompare(b.createdAt)
      )
    })

  const pending = tasks.filter((t) => !t.done).length
  const done = tasks.filter((t) => t.done).length

  function startCreate() {
    setCreating(true)
    setNewTitle('')
    setNewPriority('NORMAL')
  }

  async function handleAdd() {
    const title = newTitle.trim()
    setCreating(false)
    if (!title) return
    const position = tasks.filter((t) => t.priority === newPriority).length
    const optimistic: Task = {
      id: `tmp-${Date.now()}`,
      title,
      priority: newPriority,
      color: null,
      done: false,
      position,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setTasks((p) => [optimistic, ...p])
    try {
      const created = await createTask({ title, priority: newPriority })
      setTasks((p) => p.map((t) => (t.id === optimistic.id ? created : t)))
    } catch {
      setTasks((p) => p.filter((t) => t.id !== optimistic.id))
    }
  }

  async function handleSaveEdit() {
    if (!editState) return
    const { task, title, priority } = editState
    const trimmed = title.trim()
    if (!trimmed) return
    setTasks((p) => p.map((t) => (t.id === task.id ? { ...t, title: trimmed, priority } : t)))
    setEditState(null)
    try {
      await updateTask(task.id, { title: trimmed, priority })
    } catch {
      setTasks((p) =>
        p.map((t) =>
          t.id === task.id ? { ...t, title: task.title, priority: task.priority } : t,
        ),
      )
    }
  }

  async function handleDeleteFromModal() {
    if (!editState) return
    const { task } = editState
    setEditState(null)
    setTasks((p) => p.filter((t) => t.id !== task.id))
    try {
      await deleteTask(task.id)
    } catch {
      setTasks((p) => [...p, task])
    }
  }

  async function handleToggle(task: Task, e?: React.MouseEvent) {
    e?.stopPropagation()
    const next = !task.done
    setTasks((p) => p.map((t) => (t.id === task.id ? { ...t, done: next } : t)))
    try {
      await updateTask(task.id, { done: next })
    } catch {
      setTasks((p) => p.map((t) => (t.id === task.id ? { ...t, done: task.done } : t)))
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.cardTitle}>Tarefas</h2>
          {!loading && pending > 0 && <span className={styles.badge}>{pending}</span>}
          {loading ? <span className={styles.skelBadge} aria-hidden /> : null}
        </div>
        <div className={styles.headerRight}>
          {done > 0 && (
            <span className={styles.doneCount}>
              {done} concluída{done !== 1 ? 's' : ''}
            </span>
          )}
          {!collapsed && (
            <button
              type="button"
              className={styles.addBtn}
              onClick={startCreate}
              disabled={creating || loading}
            >
              <Plus size={14} />
              Nova
            </button>
          )}
          <button
            type="button"
            className={styles.iconBtn}
            aria-label={collapsed ? 'Expandir' : 'Minimizar'}
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {loading ? (
            <>
              <div className={styles.filters} aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={styles.skelFilter}
                    style={{ width: `${3.2 + (i % 3) * 0.55}rem` }}
                  />
                ))}
              </div>
              <div className={styles.list}>
                <div className={styles.skelList} aria-busy aria-label="Carregando tarefas">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={styles.skelRow}>
                      <span className={styles.skelCheck} />
                      <span className={styles.skelTitle} style={{ width: `${72 - i * 8}%` }} />
                      <span className={styles.skelPri} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={styles.filters}>
                {(['TODAS', ...PRIORITIES.map((p) => p.value)] as Filter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`${styles.filterTab} ${filter === f ? styles.filterTabActive : ''}`}
                    onClick={() => setFilter(f)}
                  >
                    {f === 'TODAS' ? 'Todas' : PRIORITIES.find((p) => p.value === f)!.label}
                  </button>
                ))}
              </div>

              <div className={styles.list}>
                {creating && (
                  <div className={styles.createRow}>
                    <div className={styles.createPriorities}>
                      {PRIORITIES.map(({ value, label, dot }) => (
                        <button
                          key={value}
                          type="button"
                          className={`${styles.priorityPill} ${newPriority === value ? styles.priorityPillActive : ''}`}
                          onClick={() => setNewPriority(value)}
                        >
                          <span className={styles.priDot} style={{ background: dot }} />
                          {label}
                        </button>
                      ))}
                    </div>
                    <input
                      ref={inputRef}
                      className={styles.createInput}
                      value={newTitle}
                      placeholder="Escreva sua tarefa…"
                      maxLength={200}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void handleAdd()
                        }
                        if (e.key === 'Escape') setCreating(false)
                      }}
                      onBlur={() => void handleAdd()}
                    />
                  </div>
                )}

                {visible.map((task) => {
                  const pri = PRIORITIES.find((p) => p.value === task.priority)
                  return (
                    <button
                      key={task.id}
                      type="button"
                      className={`${styles.row} ${task.done ? styles.rowDone : ''}`}
                      onClick={() =>
                        setEditState({ task, title: task.title, priority: task.priority })
                      }
                    >
                      <span
                        className={`${styles.check} ${task.done ? styles.checkOn : ''}`}
                        onClick={(e) => void handleToggle(task, e)}
                        role="presentation"
                      >
                        {task.done ? <Check size={12} strokeWidth={3} /> : null}
                      </span>
                      <span className={styles.rowTitle}>{task.title}</span>
                      {pri ? (
                        <span className={styles.rowPri}>
                          <span className={styles.priDot} style={{ background: pri.dot }} />
                          {pri.label}
                        </span>
                      ) : null}
                    </button>
                  )
                })}

                {visible.length === 0 && !creating && (
                  <p className={styles.empty}>
                    {filter === 'TODAS'
                      ? 'Nenhuma tarefa ainda.'
                      : `Nenhuma tarefa ${PRIORITIES.find((p) => p.value === filter)?.label.toLowerCase()}.`}
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}

      <AnimatedDialog
        open={Boolean(editState)}
        onOpenChange={(next) => {
          if (!next) setEditState(null)
        }}
        title="Editar tarefa"
        contentClassName={styles.modal}
      >
        {editState ? (
          <>
            <div className={styles.modalHeader}>
              <h3>Editar tarefa</h3>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="Fechar"
                onClick={() => setEditState(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.modalSection}>
              <label>Prioridade</label>
              <div className={styles.priorityPills}>
                {PRIORITIES.map(({ value, label, dot }) => (
                  <button
                    key={value}
                    type="button"
                    className={`${styles.priorityPill} ${editState.priority === value ? styles.priorityPillActive : ''}`}
                    onClick={() =>
                      setEditState((prev) => (prev ? { ...prev, priority: value } : prev))
                    }
                  >
                    <span className={styles.priDot} style={{ background: dot }} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.modalSection}>
              <label>Título</label>
              <textarea
                ref={editTitleRef}
                className={styles.modalTextarea}
                value={editState.title}
                rows={3}
                maxLength={200}
                onChange={(e) =>
                  setEditState((prev) => (prev ? { ...prev, title: e.target.value } : prev))
                }
              />
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.doneBtn}
                onClick={() => {
                  void handleToggle(editState.task)
                  setEditState((prev) =>
                    prev
                      ? { ...prev, task: { ...prev.task, done: !prev.task.done } }
                      : prev,
                  )
                }}
              >
                {editState.task.done ? 'Reabrir' : '✓ Concluir'}
              </button>
              <button
                type="button"
                className={styles.deleteModalBtn}
                onClick={() => void handleDeleteFromModal()}
              >
                <X size={14} /> Excluir
              </button>
              <button type="button" className={styles.saveBtn} onClick={() => void handleSaveEdit()}>
                Salvar
              </button>
            </div>
          </>
        ) : null}
      </AnimatedDialog>
    </div>
  )
}
