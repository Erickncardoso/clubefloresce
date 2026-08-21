'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { HeartPulse, Leaf, ListChecks, Paperclip } from 'lucide-react'
import { PatientChartPageSkeleton } from '@/components/patients/PatientChartPageSkeleton'
import { PatientChartHeader } from '@/components/patients/PatientChartHeader'
import { PatientCrmTabs } from '@/components/patients/PatientCrmTabs'
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
import { PatientCheckinsPanel } from '@/components/patients/PatientCheckinsPanel'
import { CheckinResponseMockup } from '@/components/patients/CheckinResponseMockup'
import {
  PatientNutritionModal,
} from '@/components/patients/PatientNutritionModal'
import { NutritionMonthView } from '@/components/evolucao/NutritionMonthView'
import { QuickAddPatientModal } from '@/components/patients/QuickAddPatientModal'
import { PatientVideoCallModal } from '@/components/patients/PatientVideoCallModal'
import { usePatientChart } from '@/lib/patient-chart/context'
import { PATIENT_CHART_TABS, PATIENT_EVOLUCAO_SUBS } from '@/lib/patient-chart/nav'
import { userToQuickAddSeed } from '@/lib/quick-add-patient'
import { formatCheckinPeriod } from '@/lib/checkin-answers'
import type { TemplateCheckInResponse } from '@/lib/patient-chart/api'
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
    templateResponses,
    activeTab,
    evolucaoSubTab,
    setTab,
    setEvolucaoSubTab,
    reload,
    setUser,
    uploadMealPlan,
  } = chart

  const [editOpen, setEditOpen] = useState(false)
  const [callOpen, setCallOpen] = useState(false)
  const [checkinModalOpen, setCheckinModalOpen] = useState(false)
  const [selectedCheckin, setSelectedCheckin] = useState<TemplateCheckInResponse | null>(null)
  const [uploadingPlan, setUploadingPlan] = useState(false)

  const activeTabLabel = useMemo(
    () => PATIENT_CHART_TABS.find((t) => t.id === activeTab)?.label || '',
    [activeTab],
  )

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

  return (
    <div className={styles.page}>
      <div className={styles.crmStage}>
        <div className={styles.crmPanel}>
          <PatientChartHeader
            user={user}
            profile={profile}
            overview={overview}
            sectionLabel={activeTabLabel}
            compact
            onEditPatient={() => setEditOpen(true)}
            onStartCall={() => setCallOpen(true)}
            tabs={
              <PatientCrmTabs
                activeTab={activeTab}
                onSelectTab={(tab) => setTab(tab)}
                phone={user.phone}
                email={user.email}
                patientId={user.id}
                patientName={user.name}
                onStartCall={() => setCallOpen(true)}
              />
            }
          />
          <div className={styles.crmBody}>
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
              if (sub === 'checkins') {
                setTab('checkin')
                return
              }
              setTab('evolucao')
              setEvolucaoSubTab(sub as never)
            }}
            onNavigateTab={(tab) => setTab(tab)}
            onEditProfile={() => setEditOpen(true)}
          />
        </section>
      ) : null}

      {activeTab === 'checkin' ? (
        <section className={styles.panel}>
          <div className={styles.card}>
            <h3>Check-ins desta paciente</h3>
            <p className={styles.checkinLead}>
              Toque em um check-in para ver as respostas e as fotos de refeição.
            </p>
            <PatientCheckinsPanel
              responses={templateResponses}
              limit={50}
              onSelect={(item) => {
                setSelectedCheckin(item)
                setCheckinModalOpen(true)
              }}
            />
          </div>

          {selectedCheckin ? (
            <PatientNutritionModal
              open={checkinModalOpen}
              onOpenChange={(open) => {
                setCheckinModalOpen(open)
                if (!open) setSelectedCheckin(null)
              }}
              patientId={user.id}
              patientName={user.name || 'Paciente'}
              patientAvatar={user.avatar}
              kicker={selectedCheckin.template?.title || 'Check-in'}
              initialTab="fotos"
              meta={
                <>
                  <span>
                    {formatCheckinPeriod(
                      selectedCheckin.periodKey,
                      selectedCheckin.template?.frequency,
                    )}
                  </span>
                  <span>
                    {selectedCheckin.updatedAt
                      ? new Date(selectedCheckin.updatedAt).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </span>
                </>
              }
              leftTitle="Respostas no celular"
              leftPanel={
                <CheckinResponseMockup
                  title={selectedCheckin.template?.title || 'Check-in'}
                  steps={selectedCheckin.template?.steps as never}
                  answers={selectedCheckin.answers}
                  patientId={user.id}
                />
              }
            />
          ) : null}
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
              <button
                key={sub.id}
                type="button"
                className={`${styles.subtab} ${evolucaoSubTab === sub.id ? styles.subtabActive : ''}`}
                onClick={() => setEvolucaoSubTab(sub.id)}
              >
                {sub.label}
              </button>
            ))}
          </div>

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
        </div>
        </div>
      </div>

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
