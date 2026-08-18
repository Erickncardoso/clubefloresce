'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { HeartPulse, Leaf, ListChecks, Paperclip } from 'lucide-react'
import { PatientChartPageSkeleton } from '@/components/patients/PatientChartPageSkeleton'
import { PatientChartHeader } from '@/components/patients/PatientChartHeader'
import { PatientChartEmptyState } from '@/components/patients/PatientChartEmptyState'
import { PatientChartInfoList } from '@/components/patients/PatientChartInfoList'
import { PatientChartAccountPanel } from '@/components/patients/PatientChartAccountPanel'
import { PatientChartOverview } from '@/components/patients/PatientChartOverview'
import { PatientAnamneseWorkspace } from '@/components/patients/PatientAnamneseWorkspace'
import {
  PatientOrientacoesWorkspace,
  PatientDocumentosWorkspace,
  PatientAntropometriaWorkspace,
  PatientExamesWorkspace,
} from '@/components/patients/PatientChartWorkspaces'
import { PatientMealPlanWorkspace } from '@/components/patients/PatientMealPlanWorkspace'
import { PatientGoalsPanel } from '@/components/patients/PatientGoalsPanel'
import { PatientPhotosPanel } from '@/components/patients/PatientPhotosPanel'
import { NutritionMonthView } from '@/components/evolucao/NutritionMonthView'
import { QuickAddPatientModal } from '@/components/patients/QuickAddPatientModal'
import { PatientVideoCallModal } from '@/components/patients/PatientVideoCallModal'
import { usePatientChart } from '@/lib/patient-chart/context'
import { PATIENT_CHART_TABS, PATIENT_EVOLUCAO_SUBS } from '@/lib/patient-chart/nav'
import { userToQuickAddSeed } from '@/lib/quick-add-patient'
import {
  buildAnswerRows,
  formatCheckinPeriod,
} from '@/lib/checkin-answers'
import type { PatientUser } from '@/lib/types'
import styles from './patient.module.scss'

export default function PatientChartPage() {
  const chart = usePatientChart()
  const {
    loading,
    error,
    user,
    profile,
    overview,
    mealPlan,
    foodDiary,
    checkInHistory,
    templateResponses,
    currentWeekStart,
    activeTab,
    evolucaoSubTab,
    tabHref,
    setTab,
    setEvolucaoSubTab,
    reload,
    setUser,
    uploadMealPlan,
    saveCheckIn,
  } = chart

  const [editOpen, setEditOpen] = useState(false)
  const [callOpen, setCallOpen] = useState(false)
  const [uploadingPlan, setUploadingPlan] = useState(false)
  const [savingCheckIn, setSavingCheckIn] = useState(false)
  const [checkInMessage, setCheckInMessage] = useState('')
  const [checkInError, setCheckInError] = useState(false)
  const [checkInForm, setCheckInForm] = useState({
    weekStart: '',
    mood: 3,
    energy: 3,
    adherence: 3,
    weightKg: '',
    notes: '',
  })

  useEffect(() => {
    setCheckInForm((prev) => ({
      ...prev,
      weekStart: currentWeekStart || prev.weekStart,
    }))
  }, [currentWeekStart])

  const activeTabLabel = useMemo(
    () => PATIENT_CHART_TABS.find((t) => t.id === activeTab)?.label || '',
    [activeTab],
  )

  const weekSelectOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = []
    const raw = String(currentWeekStart || '').trim()
    const ymd = raw.match(/^(\d{4}-\d{2}-\d{2})/)?.[1]
    const parsed = ymd ? new Date(`${ymd}T12:00:00`) : new Date()
    const base = Number.isFinite(parsed.getTime()) ? parsed : new Date()

    for (let i = 0; i < 8; i += 1) {
      const d = new Date(base.getTime())
      d.setDate(d.getDate() - i * 7)
      if (!Number.isFinite(d.getTime())) continue
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      options.push({
        value: `${y}-${m}-${day}`,
        label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
      })
    }
    return options
  }, [currentWeekStart])

  if (loading) return <PatientChartPageSkeleton />

  if (error || !user) {
    return (
      <div className={styles.stateError}>
        <p>{error || 'Paciente não encontrado.'}</p>
        <Link href="/dashboard" className="btn-secondary">
          Voltar ao início
        </Link>
      </div>
    )
  }

  async function onMealPlanUpload(file: File) {
    setUploadingPlan(true)
    try {
      await uploadMealPlan(file)
    } finally {
      setUploadingPlan(false)
    }
  }

  async function onSaveCheckIn(e: React.FormEvent) {
    e.preventDefault()
    setSavingCheckIn(true)
    setCheckInMessage('')
    setCheckInError(false)
    try {
      await saveCheckIn({
        weekStart: checkInForm.weekStart || currentWeekStart,
        mood: checkInForm.mood,
        energy: checkInForm.energy,
        adherence: checkInForm.adherence,
        weightKg: checkInForm.weightKg ? Number(checkInForm.weightKg) : null,
        notes: checkInForm.notes || null,
      })
      setCheckInMessage('Check-in salvo.')
    } catch (err) {
      setCheckInError(true)
      setCheckInMessage(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSavingCheckIn(false)
    }
  }

  return (
    <div className={styles.page}>
      <PatientChartHeader
        user={user}
        profile={profile}
        overview={overview}
        sectionLabel={activeTabLabel}
        compact
        onEditPatient={() => setEditOpen(true)}
        onStartCall={() => setCallOpen(true)}
      />

      {activeTab === 'visao' ? (
        <section className={styles.panel}>
          <PatientChartInfoList
            user={user as never}
            profile={profile as never}
            onEdit={() => setEditOpen(true)}
          />
          <PatientChartAccountPanel
            user={user}
            onEdit={() => setEditOpen(true)}
            onUpdated={(next) => {
              setUser(next)
              void reload()
            }}
          />
          <PatientChartOverview
            patientId={user.id}
            profile={profile as never}
            overview={overview as never}
            templateResponses={templateResponses}
            onNavigateEvolucao={(sub) => {
              setTab('evolucao')
              setEvolucaoSubTab(sub as never)
            }}
            onNavigateTab={(tab) => setTab(tab)}
            onEditProfile={() => setEditOpen(true)}
          />
        </section>
      ) : null}

      {activeTab === 'anamnese' ? (
        <section className={styles.panel}>
          <PatientAnamneseWorkspace
            user={user as unknown as PatientUser}
            profile={profile as never}
            onSaved={(next) => {
              setUser(next as never)
              void reload()
            }}
          />
        </section>
      ) : null}

      {activeTab === 'planos' ? (
        <section className={styles.panel}>
          <PatientMealPlanWorkspace
            user={user as unknown as PatientUser}
            mealPlan={mealPlan}
            uploading={uploadingPlan}
            onSaved={(next) => {
              setUser(next as never)
              void reload()
            }}
            onUpload={onMealPlanUpload}
          />
        </section>
      ) : null}

      {activeTab === 'orientacoes' ? (
        <section className={styles.panel}>
          <PatientOrientacoesWorkspace
            user={user as unknown as PatientUser}
            onSaved={(next) => {
              setUser(next as never)
              void reload()
            }}
          />
        </section>
      ) : null}

      {activeTab === 'documentos' ? (
        <section className={styles.panel}>
          <PatientDocumentosWorkspace
            user={user as unknown as PatientUser}
            onSaved={(next) => {
              setUser(next as never)
              void reload()
            }}
          />
        </section>
      ) : null}

      {activeTab === 'antropometria' ? (
        <section className={styles.panel}>
          <PatientAntropometriaWorkspace
            user={user as unknown as PatientUser}
            onSaved={(next) => {
              setUser(next as never)
              void reload()
            }}
          />
        </section>
      ) : null}

      {activeTab === 'gastos' ? (
        <section className={styles.panel}>
          <PatientChartEmptyState
            icon={HeartPulse}
            title="Calcule o primeiro gasto energético"
            description="Registre o gasto energético do paciente para estimar suas necessidades calóricas, definir metas e elaborar planos alimentares mais precisos."
            actionLabel="+ Novo cálculo"
          />
        </section>
      ) : null}

      {activeTab === 'exames' ? (
        <section className={styles.panel}>
          <PatientExamesWorkspace
            user={user as unknown as PatientUser}
            onSaved={(next) => {
              setUser(next as never)
              void reload()
            }}
          />
        </section>
      ) : null}

      {activeTab === 'prescricoes' ? (
        <section className={styles.panel}>
          <PatientChartEmptyState
            icon={Leaf}
            title="Nada prescrito por enquanto"
            description="Cadastre suplementações, orientações e protocolos para compartilhar com o paciente em poucos cliques."
            actionLabel="+ Nova prescrição"
          />
        </section>
      ) : null}

      {activeTab === 'pagamentos' ? (
        <section className={styles.panel}>
          <PatientChartAccountPanel
            user={user}
            standalone
            onEdit={() => setEditOpen(true)}
            onUpdated={(next) => {
              setUser(next)
              void reload()
            }}
          />
        </section>
      ) : null}

      {activeTab === 'arquivos' ? (
        <section className={styles.panel}>
          <PatientChartEmptyState
            icon={Paperclip}
            title="Nenhum arquivo enviado ainda"
            description="Armazene documentos, fotos e relatórios importantes para acompanhar o paciente com segurança e praticidade."
            actionLabel="+ Adicionar arquivo"
          />
        </section>
      ) : null}

      {activeTab === 'questionarios' ? (
        <section className={styles.panel}>
          <PatientChartEmptyState
            icon={ListChecks}
            title="Crie questionários para seus pacientes"
            description="Monte questionários para conduzir o atendimento com contexto completo e acompanhar respostas ao longo do tempo."
            actionLabel="+ Novo questionário"
          />
        </section>
      ) : null}

      {activeTab === 'evolucao' ? (
        <section className={styles.panel}>
          <div className={styles.subtabs}>
            {PATIENT_EVOLUCAO_SUBS.map((sub) => (
              <Link
                key={sub.id}
                href={tabHref('evolucao', sub.id)}
                className={`${styles.subtab} ${evolucaoSubTab === sub.id ? styles.subtabActive : ''}`}
              >
                {sub.label}
              </Link>
            ))}
          </div>

          {evolucaoSubTab === 'checkins' ? (
            <div className={styles.card}>
              <h3>Respostas do paciente</h3>
              {templateResponses.map((item) => (
                <article key={item.id} className={styles.response}>
                  <div className={styles.responseHead}>
                    <strong>{item.template?.title || 'Check-in'}</strong>
                    <p>
                      {formatCheckinPeriod(item.periodKey, item.template?.frequency)} ·{' '}
                      {item.updatedAt
                        ? new Date(item.updatedAt).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </p>
                  </div>
                  <ul>
                    {buildAnswerRows(item.template?.steps, item.answers).map((row) => (
                      <li key={row.id}>
                        <span>{row.label}</span>
                        <strong>{row.value}</strong>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
              {!templateResponses.length ? (
                <p className={styles.empty}>Nenhuma resposta de check-in ainda.</p>
              ) : null}

              <details className={styles.legacy}>
                <summary>Registro manual (legado)</summary>
                <form className={styles.checkinForm} onSubmit={onSaveCheckIn}>
                  <label>
                    Semana
                    <select
                      value={checkInForm.weekStart}
                      onChange={(e) =>
                        setCheckInForm((prev) => ({ ...prev, weekStart: e.target.value }))
                      }
                    >
                      {weekSelectOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className={styles.scores}>
                    <label>
                      Humor {checkInForm.mood}
                      <input
                        type="range"
                        min={1}
                        max={5}
                        value={checkInForm.mood}
                        onChange={(e) =>
                          setCheckInForm((prev) => ({ ...prev, mood: Number(e.target.value) }))
                        }
                      />
                    </label>
                    <label>
                      Energia {checkInForm.energy}
                      <input
                        type="range"
                        min={1}
                        max={5}
                        value={checkInForm.energy}
                        onChange={(e) =>
                          setCheckInForm((prev) => ({ ...prev, energy: Number(e.target.value) }))
                        }
                      />
                    </label>
                    <label>
                      Aderência {checkInForm.adherence}
                      <input
                        type="range"
                        min={1}
                        max={5}
                        value={checkInForm.adherence}
                        onChange={(e) =>
                          setCheckInForm((prev) => ({
                            ...prev,
                            adherence: Number(e.target.value),
                          }))
                        }
                      />
                    </label>
                  </div>
                  <label>
                    Peso (kg)
                    <input
                      type="number"
                      step="0.1"
                      min={20}
                      max={500}
                      value={checkInForm.weightKg}
                      onChange={(e) =>
                        setCheckInForm((prev) => ({ ...prev, weightKg: e.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Observações
                    <textarea
                      rows={3}
                      value={checkInForm.notes}
                      onChange={(e) =>
                        setCheckInForm((prev) => ({ ...prev, notes: e.target.value }))
                      }
                    />
                  </label>
                  <button type="submit" className="btn-primary" disabled={savingCheckIn}>
                    {savingCheckIn ? 'Salvando…' : 'Salvar check-in'}
                  </button>
                  {checkInMessage ? (
                    <p className={`${styles.msg} ${checkInError ? styles.msgError : ''}`}>
                      {checkInMessage}
                    </p>
                  ) : null}
                </form>

                <div className={styles.history}>
                  {checkInHistory.map((item) => (
                    <article
                      key={item.id}
                      className={styles.historyCard}
                      onClick={() =>
                        setCheckInForm({
                          weekStart: item.weekStart || '',
                          mood: item.mood || 3,
                          energy: item.energy || 3,
                          adherence: item.adherence || 3,
                          weightKg: item.weightKg != null ? String(item.weightKg) : '',
                          notes: item.notes || '',
                        })
                      }
                      role="button"
                      tabIndex={0}
                    >
                      <strong>
                        {item.weekStart
                          ? new Date(`${item.weekStart}T12:00:00`).toLocaleDateString('pt-BR')
                          : '—'}
                      </strong>
                      <div>
                        <span>Humor {item.mood}/5</span>
                        <span>Energia {item.energy}/5</span>
                        {item.weightKg != null ? <span>{item.weightKg} kg</span> : null}
                      </div>
                    </article>
                  ))}
                </div>
              </details>
            </div>
          ) : null}

          {evolucaoSubTab === 'nutricao' ? (
            <div className={styles.card}>
              <h3>Panorama nutricional</h3>
              <NutritionMonthView patientId={user.id} />
            </div>
          ) : null}

          {evolucaoSubTab === 'metas' ? (
            <div className={styles.card}>
              <h3>Metas do paciente</h3>
              <PatientGoalsPanel
                patientId={user.id}
                nutritionTarget={(overview as { nutritionTarget?: never })?.nutritionTarget}
              />
            </div>
          ) : null}

          {evolucaoSubTab === 'fotos' ? (
            <div className={styles.card}>
              <h3>Fotos de refeições</h3>
              <PatientPhotosPanel patientId={user.id} />
            </div>
          ) : null}

          {evolucaoSubTab === 'diario' ? (
            <div className={styles.card}>
              <h3>Registros recentes do diário</h3>
              {!foodDiary.length ? (
                <p className={styles.empty}>Nenhuma refeição registrada.</p>
              ) : (
                foodDiary.map((entry) => (
                  <div key={entry.id} className={styles.diary}>
                    {entry.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.imageUrl} alt="" loading="lazy" />
                    ) : null}
                    <div>
                      <strong>{entry.mealLabel || entry.mealType}</strong>
                      <span>
                        {entry.entryDate
                          ? new Date(`${entry.entryDate}T12:00:00`).toLocaleDateString('pt-BR')
                          : '—'}
                      </span>
                      <div className={styles.macros}>
                        {entry.caloriesKcal != null ? (
                          <span>{Math.round(entry.caloriesKcal)} kcal</span>
                        ) : null}
                        {entry.proteinG != null ? <span>P {Math.round(entry.proteinG)}g</span> : null}
                        {entry.carbsG != null ? <span>C {Math.round(entry.carbsG)}g</span> : null}
                        {entry.fatG != null ? <span>G {Math.round(entry.fatG)}g</span> : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      <QuickAddPatientModal
        open={editOpen}
        mode="edit"
        seed={userToQuickAddSeed({
          ...user,
          patientProfileData: profile || user.patientProfileData,
        })}
        editUserId={user.id}
        onClose={() => setEditOpen(false)}
        onCreated={(next) => {
          setUser(next as never)
          setEditOpen(false)
          void reload()
        }}
      />

      <PatientVideoCallModal
        open={callOpen}
        patientId={user.id}
        patientName={user.name || 'Paciente'}
        onClose={() => setCallOpen(false)}
      />
    </div>
  )
}
