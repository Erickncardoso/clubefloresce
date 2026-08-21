'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, CheckCircle2, FileText, Plus, Salad, Upload, X } from 'lucide-react'
import type { PatientUser } from '@/lib/types'
import {
  MAX_MEAL_PLANS,
  getMealPlansFromUser,
  patchUserMealPlans,
  upsertPlanList,
} from '@/lib/meal-plan/persistence'
import {
  methodologyLabel,
  statusLabel,
  statusTone,
} from '@/lib/meal-plan/prescription'
import type { MealPlanMethodology, MealPlanRecord } from '@/lib/meal-plan/types'
import { PatientChartEmptyState } from '@/components/patients/PatientChartEmptyState'
import { PatientMealPlanNewModal } from '@/components/patients/PatientMealPlanNewModal'
import { ConfirmDialog } from '@/components/overlays'
import styles from './PatientMealPlanWorkspace.module.scss'

type Props = {
  user: PatientUser
  mealPlan?: unknown
  uploading?: boolean
  onSaved?: (user: PatientUser) => void
  onUpload?: (file: File) => Promise<unknown> | void
}

export function PatientMealPlanWorkspace({
  user,
  mealPlan,
  uploading = false,
  onSaved,
  onUpload,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [planFile, setPlanFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [listError, setListError] = useState('')
  const [listNotice, setListNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null)

  const prescriptions = useMemo(() => getMealPlansFromUser(user as never), [user])
  const planLimitReached = prescriptions.length >= MAX_MEAL_PLANS
  const hasPublishedPlan = prescriptions.some((p) => p.status === 'active')
  const importedPlan = mealPlan as {
    title?: string
    plan?: { meals?: unknown[] }
    updatedAt?: string
  } | null

  function openNewModal() {
    if (planLimitReached) {
      setListError(`Limite de ${MAX_MEAL_PLANS} planos atingido.`)
      return
    }
    setNewModalOpen(true)
  }

  useEffect(() => {
    if (searchParams.get('novo') !== '1') return
    openNewModal()
    const params = new URLSearchParams(searchParams.toString())
    params.delete('novo')
    if (!params.get('tab')) params.set('tab', 'planos')
    const qs = params.toString()
    router.replace(`/pacientes/${encodeURIComponent(user.id)}?${qs}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, user.id])

  function startFromModal({
    title,
    methodology,
  }: {
    title: string
    methodology: MealPlanMethodology
  }) {
    const qs = new URLSearchParams({ title, methodology })
    router.push(`/pacientes/${encodeURIComponent(user.id)}/planos/novo?${qs.toString()}`)
  }

  async function removePlan(id: string) {
    setBusy(true)
    setListError('')
    try {
      const next = upsertPlanList(prescriptions, prescriptions[0], id)
      const updated = await patchUserMealPlans(user.id, next)
      onSaved?.(updated as never)
      setListNotice('Plano removido.')
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Erro ao excluir.')
    } finally {
      setBusy(false)
      setDeletePlanId(null)
    }
  }

  async function submitImport() {
    if (!planFile || !onUpload) return
    setBusy(true)
    setListError('')
    try {
      await onUpload(planFile)
      setPlanFile(null)
      setImportOpen(false)
      setListNotice('PDF importado com sucesso.')
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Falha na importação.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.workspace}>
      <header className={styles.head}>
        <div className={styles.meta}>
          <span className={styles.count}>
            <strong>{prescriptions.length}</strong> de {MAX_MEAL_PLANS} planos
          </span>
          <span className={`${styles.published} ${hasPublishedPlan ? styles.publishedOn : ''}`}>
            <i className={styles.dot} aria-hidden />
            {hasPublishedPlan ? 'Há plano publicado' : 'Nenhum plano publicado'}
          </span>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setImportOpen((v) => !v)}
          >
            <Upload size={16} aria-hidden />
            Importar PDF
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={planLimitReached}
            title={planLimitReached ? `Limite de ${MAX_MEAL_PLANS} planos atingido` : ''}
            onClick={openNewModal}
          >
            <Plus size={16} aria-hidden />
            Novo plano alimentar
          </button>
        </div>
      </header>

      {listError ? (
        <p className={styles.alertError} role="alert">
          <AlertCircle size={14} aria-hidden /> {listError}
        </p>
      ) : null}
      {listNotice ? (
        <p className={styles.alertOk} role="status">
          <CheckCircle2 size={14} aria-hidden /> {listNotice}
        </p>
      ) : null}

      {importOpen ? (
        <section className={styles.importBox}>
          <div className={styles.importHead}>
            <div>
              <strong>Importar plano em PDF</strong>
              <p>
                {importedPlan?.plan?.meals?.length
                  ? `Atual: ${importedPlan.title || 'Plano alimentar'}`
                  : 'O PDF vira uma prescrição editável e é publicado no app do paciente.'}
              </p>
            </div>
            <button type="button" aria-label="Fechar" onClick={() => setImportOpen(false)}>
              <X size={16} />
            </button>
          </div>
          <div
            className={`${styles.drop} ${dragOver ? styles.dropOver : ''} ${planFile ? styles.dropFilled : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const file = e.dataTransfer.files?.[0]
              if (file) setPlanFile(file)
            }}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click()
            }}
          >
            <FileText size={22} aria-hidden />
            <span>{planFile ? planFile.name : 'Arraste o PDF ou clique para escolher'}</span>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              hidden
              onChange={(e) => setPlanFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className={styles.importActions}>
            {planFile ? (
              <button type="button" className="btn-secondary" onClick={() => setPlanFile(null)}>
                Limpar
              </button>
            ) : null}
            <button
              type="button"
              className="btn-primary"
              disabled={!planFile || busy || uploading}
              onClick={() => void submitImport()}
            >
              {busy || uploading ? 'Importando…' : 'Importar e publicar'}
            </button>
          </div>
        </section>
      ) : null}

      {!prescriptions.length ? (
        <PatientChartEmptyState
          icon={Salad}
          title="Nenhum plano alimentar ainda"
          description="Crie uma prescrição ou importe um PDF para começar."
          actionLabel="+ Novo plano alimentar"
          onAction={openNewModal}
        />
      ) : (
        <div className={styles.list}>
          {prescriptions.map((plan: MealPlanRecord) => (
            <article key={plan.id} className={styles.card}>
              <Link
                href={`/pacientes/${encodeURIComponent(user.id)}/planos/${encodeURIComponent(plan.id)}`}
                className={styles.cardMain}
              >
                <div>
                  <h3>{plan.title || 'Plano alimentar'}</h3>
                  <p>
                    {methodologyLabel(plan.methodology || 'foods')} ·{' '}
                    {statusLabel(plan.status || 'draft')}
                    {plan.updatedAt
                      ? ` · ${new Date(plan.updatedAt).toLocaleDateString('pt-BR')}`
                      : ''}
                  </p>
                </div>
                <span
                  className={`${styles.badge} ${styles[`tone_${statusTone(plan.status || 'draft')}`]}`}
                >
                  {statusLabel(plan.status || 'draft')}
                </span>
              </Link>
              <button
                type="button"
                className={styles.delete}
                disabled={busy}
                onClick={() => setDeletePlanId(plan.id)}
              >
                Excluir
              </button>
            </article>
          ))}
        </div>
      )}

      <PatientMealPlanNewModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        onSubmit={startFromModal}
      />

      <ConfirmDialog
        open={Boolean(deletePlanId)}
        onOpenChange={(open) => {
          if (!open) setDeletePlanId(null)
        }}
        title="Excluir plano alimentar?"
        description="Esta ação remove o plano da lista do paciente. Não dá para desfazer."
        cancelLabel="Cancelar"
        confirmLabel="Excluir plano"
        tone="danger"
        busy={busy}
        onCancel={() => setDeletePlanId(null)}
        onConfirm={() => {
          if (deletePlanId) void removePlan(deletePlanId)
        }}
      />
    </div>
  )
}
