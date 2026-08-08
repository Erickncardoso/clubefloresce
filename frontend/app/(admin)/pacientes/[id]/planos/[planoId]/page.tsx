'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import {
  PatientMealPlanEditor,
  type PatientMealPlanEditorHandle,
} from '@/components/patients/PatientMealPlanEditor'
import { PatientChartPageSkeleton } from '@/components/patients/PatientChartPageSkeleton'
import { usePatientChart } from '@/lib/patient-chart/context'
import {
  createEmptyPrescription,
  hydratePrescriptionFromRecord,
} from '@/lib/meal-plan/prescription'
import {
  getMealPlansFromUser,
  publishPlan,
  saveDraftPlan,
} from '@/lib/meal-plan/persistence'
import type { MealPlanFormData, MealPlanRecord, PatientUser as MealPlanPatientUser } from '@/lib/meal-plan/types'
import { getCachedUser } from '@/lib/auth'
import styles from './plano.module.scss'

export default function PatientMealPlanEditorPage() {
  const params = useParams<{ id: string; planoId: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading, error, setUser, reload } = usePatientChart()
  const editorRef = useRef<PatientMealPlanEditorHandle>(null)

  const planoId = params?.planoId || 'novo'
  const isNewPlan = planoId === 'novo'
  const patientId = params?.id || user?.id || ''

  const backToListUrl = `/pacientes/${encodeURIComponent(patientId)}?tab=planos`

  const plans = useMemo(
    () => getMealPlansFromUser(user as MealPlanPatientUser | null),
    [user],
  )

  const [draftPrescription, setDraftPrescription] = useState<MealPlanFormData | null>(null)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState(false)

  useEffect(() => {
    if (!isNewPlan) {
      setDraftPrescription(null)
      return
    }
    setDraftPrescription((prev) => {
      if (prev) return prev
      return createEmptyPrescription({
        title: String(searchParams.get('title') || '').trim() || 'Nova prescrição',
        methodology: (String(searchParams.get('methodology') || 'foods') as MealPlanFormData['methodology']),
      })
    })
  }, [isNewPlan, searchParams])

  const prescription: MealPlanFormData | null = useMemo(() => {
    if (isNewPlan) return draftPrescription
    const record = plans.find((item) => item.id === planoId) || null
    return record ? hydratePrescriptionFromRecord(record) : null
  }, [draftPrescription, isNewPlan, plans, planoId])

  async function adoptSavedPlan(item: MealPlanRecord) {
    if (!item?.id || !isNewPlan || !user) return
    setDraftPrescription(null)
    router.replace(`/pacientes/${encodeURIComponent(user.id)}/planos/${encodeURIComponent(item.id)}`)
  }

  async function onSave(form: MealPlanFormData) {
    if (!user) return
    setSaving(true)
    setSaveMessage('')
    setSaveError(false)
    try {
      const existing = isNewPlan ? null : plans.find((p) => p.id === planoId) || null
      const author = getCachedUser()?.name || 'Nutricionista'
      const { item, updated } = await saveDraftPlan(user as MealPlanPatientUser, form, existing, author)
      setUser(updated as never)
      setSaveMessage('Rascunho salvo.')
      await adoptSavedPlan(item)
      void reload()
    } catch (err) {
      setSaveError(true)
      setSaveMessage(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function onPublish(form: MealPlanFormData) {
    if (!user) return
    setPublishing(true)
    setSaveMessage('')
    setSaveError(false)
    try {
      const existing = isNewPlan ? null : plans.find((p) => p.id === planoId) || null
      const author = getCachedUser()?.name || 'Nutricionista'
      const { item, updated } = await publishPlan(user as MealPlanPatientUser, form, existing, author)
      setUser(updated as never)
      setSaveMessage('Plano publicado.')
      await adoptSavedPlan(item)
      void reload()
    } catch (err) {
      setSaveError(true)
      setSaveMessage(err instanceof Error ? err.message : 'Erro ao publicar.')
    } finally {
      setPublishing(false)
    }
  }

  function goToNewPlan() {
    router.push(`/pacientes/${encodeURIComponent(patientId)}?tab=planos&novo=1`)
  }

  if (loading) return <PatientChartPageSkeleton />
  if (error || !user) {
    return (
      <div className={styles.state}>
        <p>{error || 'Paciente não encontrado.'}</p>
        <Link href="/dashboard" className="btn-secondary">
          Voltar
        </Link>
      </div>
    )
  }

  if (!prescription) {
    return (
      <div className={styles.state}>
        <p>Plano alimentar não encontrado.</p>
        <Link href={backToListUrl} className="btn-secondary">
          Voltar para planos
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <nav className={styles.crumbs} aria-label="Você está em">
        <Link href={backToListUrl} className={styles.crumbsBack}>
          <ArrowLeft size={14} aria-hidden />
          Planos alimentares
        </Link>
        <span className={styles.crumbsSep} aria-hidden>
          /
        </span>
        <span className={styles.crumbsCurrent}>{prescription.title || 'Nova prescrição'}</span>
      </nav>

      <PatientMealPlanEditor
        key={isNewPlan ? 'novo' : planoId}
        ref={editorRef}
        user={user as unknown as MealPlanPatientUser}
        prescription={prescription}
        saving={saving}
        publishing={publishing}
        saveMessage={saveMessage}
        saveError={saveError}
        onSave={(form) => void onSave(form)}
        onPublish={(form) => void onPublish(form)}
        onNewPlan={goToNewPlan}
      />
    </div>
  )
}
