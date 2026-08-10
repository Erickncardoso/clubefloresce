'use client'

import {
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { AnimatedDialog } from '@/components/overlays'
import { useQuickAddPatient } from '@/hooks/useQuickAddPatient'
import type { QuickAddSeed } from '@/lib/quick-add-patient'
import type { AuthUser } from '@/lib/types'
import type { PatientTagPickerHandle } from '@/components/patients/PatientTagPicker'
import { QuickAddPatientModalFields } from '@/components/patients/QuickAddPatientModalFields'
import styles from './QuickAddPatientModal.module.scss'

type Props = {
  open: boolean
  mode?: 'create' | 'approve' | 'edit'
  seed?: QuickAddSeed | null
  registrationRequestId?: string
  editUserId?: string
  onClose: () => void
  onCreated: (user: AuthUser) => void
}

function serializeTagItems(items: QuickAddSeed['tagItems'] = []) {
  return [...(items || [])]
    .map((item) => ({
      id: item?.id || '',
      name: item?.name || '',
      color: item?.color || '',
    }))
    .sort((a, b) => String(a.id || a.name).localeCompare(String(b.id || b.name)))
}

export function QuickAddPatientModal({
  open,
  mode = 'create',
  seed = null,
  registrationRequestId = '',
  editUserId = '',
  onClose,
  onCreated,
}: Props) {
  const isApprove = mode === 'approve'
  const isEdit = mode === 'edit'
  const modalTitle = isApprove
    ? 'Aprovar solicitação'
    : isEdit
      ? 'Editar paciente'
      : 'Novo paciente'

  const {
    form,
    patchForm,
    avatarFile,
    avatarPreview,
    submitting,
    uploadingAvatar,
    uploadingAttachments,
    lookingUpCep,
    cepLookupError,
    error,
    applyAccessDuration,
    accessHint,
    minAccessDate,
    resetForm,
    onCpfChange,
    onRgChange,
    onCepChange,
    onAvatarPick,
    clearAvatar,
    ensureWelcomeTemplate,
    submit,
    submitEdit,
  } = useQuickAddPatient()

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const tagPickerRef = useRef<PatientTagPickerHandle>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [accessOpen, setAccessOpen] = useState(true)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [snapshot, setSnapshot] = useState('')
  const [awaitingSnapshot, setAwaitingSnapshot] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef({ active: false, startY: 0, moved: false, offset: 0 })

  const serializeFormState = useCallback(() => {
    return JSON.stringify({
      name: form.name || '',
      nickname: form.nickname || '',
      email: form.email || '',
      password: form.password || '',
      phone: form.phone || '',
      gender: form.gender || '',
      birthDate: form.birthDate || '',
      cpf: form.cpf || '',
      rg: form.rg || '',
      referralSource: form.referralSource || '',
      city: form.city || '',
      state: form.state || '',
      occupation: form.occupation || '',
      maritalStatus: form.maritalStatus || '',
      modality: form.modality || '',
      athlete: Boolean(form.athlete),
      pregnant: Boolean(form.pregnant),
      lactating: Boolean(form.lactating),
      objective: form.objective || '',
      notes: form.notes || '',
      zipCode: form.zipCode || '',
      neighborhood: form.neighborhood || '',
      street: form.street || '',
      streetNumber: form.streetNumber || '',
      country: form.country || 'BR',
      addressComplement: form.addressComplement || '',
      additionalContacts: form.additionalContacts?.map(({ _key, ...rest }) => rest) || [],
      emergencyContacts: form.emergencyContacts?.map(({ _key, ...rest }) => rest) || [],
      guardianEnabled: Boolean(form.guardianEnabled),
      guardians: form.guardians?.map(({ _key, ...rest }) => rest) || [],
      identityDocuments: form.identityDocuments?.map(({ _key, ...rest }) => rest) || [],
      notifyEmail: Boolean(form.notifyEmail),
      notifySms: Boolean(form.notifySms),
      notifyWhatsapp: Boolean(form.notifyWhatsapp),
      profileAttachments:
        form.profileAttachments?.map(({ _key, file, ...rest }) => rest) || [],
      plan: form.plan || '',
      status: form.status || '',
      accessExpiresAt: form.accessExpiresAt || '',
      billingPaymentMethod: form.billingPaymentMethod || '',
      avatarUrl: form.avatarUrl || '',
      sendWelcomeWhatsapp: Boolean(form.sendWelcomeWhatsapp),
      welcomeMessageOverride: form.welcomeMessageOverride || '',
      tagItems: serializeTagItems(form.tagItems),
      avatarPreview: avatarPreview || '',
      hasAvatarFile: Boolean(avatarFile),
    })
  }, [form, avatarPreview, avatarFile])

  const isDirty = open && snapshot !== '' && serializeFormState() !== snapshot

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setSnapshot('')
      setAwaitingSnapshot(false)
      setDiscardOpen(false)
      setDragOffset(0)
      setDragging(false)
      return
    }

    let cancelled = false
    setMoreOpen(false)
    setAccessOpen(!isEdit)
    resetForm(seed)
    ;(async () => {
      if (!isEdit) await ensureWelcomeTemplate()
      if (!cancelled) setAwaitingSnapshot(true)
    })()

    return () => {
      cancelled = true
    }
    // Reset only when the dialog opens — seed is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open || !awaitingSnapshot) return
    const id = window.requestAnimationFrame(() => {
      setSnapshot(serializeFormState())
      setAwaitingSnapshot(false)
    })
    return () => window.cancelAnimationFrame(id)
  }, [open, awaitingSnapshot, form, serializeFormState])

  function requestClose(force = false) {
    if (submitting) return
    if (!force && isDirty) {
      setDiscardOpen(true)
      return
    }
    setDiscardOpen(false)
    onClose()
  }

  function detachDragListeners() {
    window.removeEventListener('pointermove', onDragMove)
    window.removeEventListener('pointerup', onDragEnd)
    window.removeEventListener('pointercancel', onDragEnd)
  }

  function onDragMove(event: PointerEvent) {
    if (!dragRef.current.active) return
    const delta = Math.max(0, event.clientY - dragRef.current.startY)
    if (delta > 6) dragRef.current.moved = true
    dragRef.current.offset = delta
    setDragOffset(delta)
  }

  function onDragEnd() {
    if (!dragRef.current.active) return
    const offset = dragRef.current.offset
    dragRef.current.active = false
    setDragging(false)
    detachDragListeners()

    if (offset > 110) {
      setDragOffset(Math.max(offset, window.innerHeight * 0.5))
      window.setTimeout(() => {
        setDragOffset(0)
        requestClose()
      }, 160)
      return
    }
    setDragOffset(0)
  }

  function onDragStart(event: ReactPointerEvent<HTMLButtonElement>) {
    if (submitting) return
    if (window.matchMedia('(min-width: 721px)').matches) return
    if (event.button != null && event.button !== 0) return
    dragRef.current = { active: true, startY: event.clientY, moved: false, offset: 0 }
    setDragging(true)
    setDragOffset(0)
    event.currentTarget.setPointerCapture?.(event.pointerId)
    window.addEventListener('pointermove', onDragMove)
    window.addEventListener('pointerup', onDragEnd)
    window.addEventListener('pointercancel', onDragEnd)
  }

  function onHandleClick(event: ReactPointerEvent<HTMLButtonElement>) {
    if (dragRef.current.moved) {
      event.preventDefault()
      event.stopPropagation()
      dragRef.current.moved = false
      return
    }
    requestClose()
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      if (isEdit) {
        const user = await submitEdit(editUserId)
        setSnapshot(serializeFormState())
        onCreated(user)
        return
      }
      const user = await submit({
        registrationRequestId: isApprove ? registrationRequestId || null : null,
        requireAccessExpires: isApprove,
      })
      setSnapshot(serializeFormState())
      onCreated(user)
    } catch {
      /* error already on hook */
    }
  }

  const sheetStyle =
    dragging || dragOffset
      ? {
          transform: `translateY(${dragOffset}px)`,
          transition: dragging ? 'none' : 'transform 0.22s ease',
          willChange: 'transform' as const,
        }
      : undefined

  const busy = submitting || uploadingAvatar || uploadingAttachments
  const saveLabel = uploadingAvatar
    ? 'Enviando foto…'
    : uploadingAttachments
      ? 'Enviando anexos…'
      : submitting
        ? 'Salvando…'
        : isApprove
          ? 'Aprovar e liberar'
          : isEdit
            ? 'Salvar'
            : 'Cadastrar'

  return (
    <>
      <AnimatedDialog
        open={open}
        onOpenChange={(next) => {
          if (!next) requestClose()
        }}
        title={modalTitle}
        bare
        overlayClassName={styles.overlay}
        contentClassName={styles.dialogHost}
      >
        <div
          className={`${styles.modal} ${dragging ? styles.modalDragging : ''} admin-shell`}
          style={sheetStyle}
        >
          <form className={styles.formRoot} onSubmit={(e) => void onSubmit(e)}>
            <button
              type="button"
              className={styles.sheetHandleHit}
              aria-label="Fechar"
              onClick={onHandleClick}
              onPointerDown={onDragStart}
            >
              <span className={styles.sheetHandle} aria-hidden />
            </button>

            <header className={styles.header}>
              <h3>{modalTitle}</h3>
              <button
                type="button"
                className={styles.close}
                aria-label="Fechar"
                onClick={() => requestClose()}
              >
                <X size={20} />
              </button>
            </header>

            {isApprove ? (
              <p className={styles.hint}>
                A senha já foi definida pelo paciente. Complete o perfil e libere o acesso.
              </p>
            ) : null}

            <QuickAddPatientModalFields
              form={form}
              patchForm={patchForm}
              isEdit={isEdit}
              isApprove={isApprove}
              moreOpen={moreOpen}
              setMoreOpen={setMoreOpen}
              accessOpen={accessOpen}
              setAccessOpen={setAccessOpen}
              avatarPreview={avatarPreview}
              avatarInputRef={avatarInputRef}
              tagPickerRef={tagPickerRef}
              lookingUpCep={lookingUpCep}
              cepLookupError={cepLookupError}
              accessHint={accessHint}
              minAccessDate={minAccessDate}
              error={error}
              onCpfChange={onCpfChange}
              onRgChange={onRgChange}
              onCepChange={onCepChange}
              onAvatarPick={onAvatarPick}
              clearAvatar={clearAvatar}
              applyAccessDuration={applyAccessDuration}
              editUserId={editUserId}
            />

            <footer className={styles.footer}>
              <button type="submit" className={styles.save} disabled={busy}>
                {saveLabel}
              </button>
            </footer>
          </form>
        </div>
      </AnimatedDialog>

      <AnimatedDialog
        open={open && discardOpen}
        onOpenChange={(next) => {
          if (!next) setDiscardOpen(false)
        }}
        title="Cancelar as alterações do paciente?"
        bare
        overlayClassName={styles.discardOverlay}
        contentClassName={styles.discardModal}
      >
        <div className={styles.discardHead}>
          <div className={styles.discardIcon} aria-hidden>
            <AlertTriangle className={styles.discardIconSvg} />
          </div>
          <p className={styles.discardTitle}>Cancelar as alterações do paciente?</p>
        </div>
        <div className={styles.discardDivider} />
        <div className={styles.discardActions}>
          <button type="button" className={styles.discardBack} onClick={() => setDiscardOpen(false)}>
            Voltar
          </button>
          <button
            type="button"
            className={styles.discardConfirm}
            onClick={() => {
              setDiscardOpen(false)
              onClose()
            }}
          >
            Sim, cancelar
          </button>
        </div>
      </AnimatedDialog>
    </>
  )
}
