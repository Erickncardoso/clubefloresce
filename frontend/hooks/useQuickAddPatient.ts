'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { apiFetch, apiUpload, ApiError } from '@/lib/api'
import {
  serializeAdditionalContacts,
  serializeIdentityDocuments,
  serializeLinkedContacts,
  serializeProfileAttachments,
} from '@/lib/patient-profile-extra'
import {
  addDaysToDateInput,
  applySeedToForm,
  emptyQuickAddForm,
  formatCepMask,
  formatCpfMask,
  formatRgMask,
  QUICK_ADD_OPTIONS,
  todayIsoDate,
  type QuickAddForm,
  type QuickAddSeed,
} from '@/lib/quick-add-patient'
import type { AuthUser } from '@/lib/types'

export function useQuickAddPatient() {
  const [form, setForm] = useState<QuickAddForm>(() => emptyQuickAddForm())
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingAttachments, setUploadingAttachments] = useState(false)
  const [lookingUpCep, setLookingUpCep] = useState(false)
  const [cepLookupError, setCepLookupError] = useState('')
  const [error, setError] = useState('')
  const [welcomeTemplate, setWelcomeTemplate] = useState('')
  const welcomeTemplateLoaded = useRef(false)
  const cepLookupSeq = useRef(0)
  const cepLookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const snapshotRef = useRef('')

  const isFreePlan = form.plan === 'FREE'
  const accessHint = useMemo(() => {
    if (isFreePlan) {
      return 'Sem plano: a paciente acessa só início e conta. Ao tentar dieta, Bella e outros recursos, vê aviso para fazer upgrade.'
    }
    if (!form.accessExpiresAt) {
      return 'Validade em branco = acesso sem data limite ao plano escolhido.'
    }
    return 'Acesso completo ao app até a data informada.'
  }, [isFreePlan, form.accessExpiresAt])

  const minAccessDate = todayIsoDate()

  const patchForm = useCallback(( partial: Partial<QuickAddForm> | ((prev: QuickAddForm) => QuickAddForm)) => {
    setForm((prev) => (typeof partial === 'function' ? partial(prev) : { ...prev, ...partial }))
  }, [])

  function markClean(nextForm?: QuickAddForm) {
    snapshotRef.current = JSON.stringify(nextForm || form)
  }

  function isDirty() {
    return JSON.stringify(form) !== snapshotRef.current
  }

  function resetForm(seed: QuickAddSeed | null = null) {
    if (cepLookupTimer.current) {
      clearTimeout(cepLookupTimer.current)
      cepLookupTimer.current = null
    }
    cepLookupSeq.current += 1
    setLookingUpCep(false)
    setCepLookupError('')
    setError('')
    setAvatarFile(null)
    if (avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview)
    setAvatarPreview('')
    const next = applySeedToForm(seed)
    setForm(next)
    snapshotRef.current = JSON.stringify(next)
  }

  function applyAccessDuration(days: number | null) {
    patchForm({ accessExpiresAt: days == null ? '' : addDaysToDateInput(days) })
  }

  function onCpfChange(value: string) {
    patchForm({ cpf: formatCpfMask(value) })
  }

  function onRgChange(value: string) {
    patchForm({ rg: formatRgMask(value) })
  }

  async function lookupCep(digits: string) {
    const seq = ++cepLookupSeq.current
    setLookingUpCep(true)
    setCepLookupError('')
    try {
      const data = await apiFetch<{
        neighborhood?: string
        street?: string
        city?: string
        state?: string
        zipCode?: string
      }>(`/users/cep/${digits}`)
      if (seq !== cepLookupSeq.current) return
      if (!data) {
        setCepLookupError('CEP não encontrado.')
        return
      }
      patchForm((prev) => {
        const next = { ...prev }
        if (data.neighborhood) next.neighborhood = String(data.neighborhood).slice(0, 80)
        if (data.street) next.street = String(data.street).slice(0, 120)
        if (data.city) next.city = String(data.city).slice(0, 80)
        if (data.state) {
          const uf = String(data.state).trim().toUpperCase()
          if (QUICK_ADD_OPTIONS.brStates.includes(uf)) next.state = uf
        }
        if (data.zipCode) next.zipCode = formatCepMask(data.zipCode)
        return next
      })
    } catch (err) {
      if (seq !== cepLookupSeq.current) return
      setCepLookupError(
        err instanceof ApiError ? err.message : 'Não foi possível buscar o CEP.',
      )
    } finally {
      if (seq === cepLookupSeq.current) setLookingUpCep(false)
    }
  }

  function onCepChange(value: string) {
    const masked = formatCepMask(value)
    patchForm({ zipCode: masked })
    setCepLookupError('')
    const digits = masked.replace(/\D/g, '')
    if (cepLookupTimer.current) {
      clearTimeout(cepLookupTimer.current)
      cepLookupTimer.current = null
    }
    if (digits.length !== 8) {
      setLookingUpCep(false)
      return
    }
    cepLookupTimer.current = setTimeout(() => {
      cepLookupTimer.current = null
      void lookupCep(digits)
    }, 250)
  }

  function onAvatarPick(file: File | null) {
    if (!file) return
    if (!file.type?.startsWith('image/')) {
      setError('Selecione uma imagem válida.')
      return
    }
    setAvatarFile(file)
    if (avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview)
    setAvatarPreview(URL.createObjectURL(file))
    patchForm({ avatarUrl: '' })
  }

  function clearAvatar() {
    setAvatarFile(null)
    if (avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview)
    setAvatarPreview('')
    patchForm({ avatarUrl: '' })
  }

  async function ensureWelcomeTemplate() {
    if (welcomeTemplateLoaded.current) return welcomeTemplate
    try {
      const data = await apiFetch<{ message?: string }>('/users/approval-whatsapp-template')
      const message = data?.message || ''
      setWelcomeTemplate(message)
      setForm((prev) =>
        prev.welcomeMessageOverride ? prev : { ...prev, welcomeMessageOverride: message },
      )
      welcomeTemplateLoaded.current = true
      return message
    } catch {
      welcomeTemplateLoaded.current = true
      return ''
    }
  }

  async function uploadAvatarIfNeeded() {
    if (!avatarFile) return form.avatarUrl || null
    setUploadingAvatar(true)
    try {
      const res = await apiUpload<{ url?: string; secure_url?: string }>('/upload', avatarFile)
      const url = res?.url || res?.secure_url || null
      if (!url) throw new Error('Upload da foto não retornou URL.')
      patchForm({ avatarUrl: url })
      return url
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function uploadAttachmentsIfNeeded(current: QuickAddForm) {
    const pending = (current.profileAttachments || []).filter((item) => item.file && !item.url)
    if (!pending.length) return current.profileAttachments

    setUploadingAttachments(true)
    try {
      const next = [...current.profileAttachments]
      for (let i = 0; i < next.length; i += 1) {
        const item = next[i]
        if (!item.file || item.url) continue
        const res = await apiUpload<{ url?: string; secure_url?: string }>(
          '/upload/file',
          item.file,
        )
        const url = res?.url || res?.secure_url || null
        if (!url) throw new Error(`Upload de "${item.name}" não retornou URL.`)
        next[i] = {
          ...item,
          url,
          uploadedAt: new Date().toISOString(),
          file: null,
        }
      }
      patchForm({ profileAttachments: next })
      return next
    } finally {
      setUploadingAttachments(false)
    }
  }

  function buildPatientProfilePayload(current: QuickAddForm) {
    const additionalContacts = serializeAdditionalContacts(current.additionalContacts)
    const emergencyContacts = serializeLinkedContacts(current.emergencyContacts)
    const guardians = current.guardianEnabled
      ? serializeLinkedContacts(current.guardians)
      : []
    const identityDocuments = serializeIdentityDocuments(current.identityDocuments)
    const profileAttachments = serializeProfileAttachments(current.profileAttachments)

    return {
      nickname: current.nickname || null,
      gender: current.gender || null,
      birthDate: current.birthDate || null,
      cpf: current.cpf || null,
      rg: current.rg || null,
      referralSource: current.referralSource || null,
      tags: current.tagItems.length
        ? current.tagItems.map((item) => item.name)
        : current.tags.length
          ? [...current.tags]
          : null,
      tagItems: current.tagItems.length
        ? current.tagItems.map((item) => ({
            id: item.id,
            name: item.name,
            color: String(item.color || '#8B967C').trim().toUpperCase(),
          }))
        : null,
      city: current.city || null,
      state: current.state || null,
      occupation: current.occupation || null,
      maritalStatus: current.maritalStatus || null,
      modality: current.modality || null,
      athlete: current.athlete || null,
      pregnant: current.pregnant || null,
      lactating: current.lactating || null,
      objective: current.objective || null,
      notes: current.notes || null,
      zipCode: current.zipCode || null,
      neighborhood: current.neighborhood || null,
      street: current.street || null,
      streetNumber: current.streetNumber || null,
      country: current.country || 'BR',
      addressComplement: current.addressComplement || null,
      additionalContacts: additionalContacts.length ? additionalContacts : null,
      emergencyContacts: emergencyContacts.length ? emergencyContacts : null,
      guardianEnabled: current.guardianEnabled || null,
      guardians: guardians.length ? guardians : null,
      identityDocuments: identityDocuments.length ? identityDocuments : null,
      notifyEmail: current.notifyEmail,
      notifySms: current.notifySms,
      notifyWhatsapp: current.notifyWhatsapp,
      profileAttachments: profileAttachments.length ? profileAttachments : null,
    }
  }

  async function submit(opts: {
    registrationRequestId?: string | null
    requireAccessExpires?: boolean
  } = {}) {
    const { registrationRequestId = null, requireAccessExpires = false } = opts
    setSubmitting(true)
    setError('')
    try {
      if (!form.name?.trim() || !form.email?.trim()) {
        throw new Error('Nome e e-mail são obrigatórios.')
      }
      if (!registrationRequestId && !form.password?.trim()) {
        throw new Error('Informe a senha inicial.')
      }
      if (requireAccessExpires && !form.accessExpiresAt && form.plan !== 'FREE') {
        throw new Error('Informe até quando o paciente terá acesso.')
      }

      const avatar = await uploadAvatarIfNeeded()
      const attachments = await uploadAttachmentsIfNeeded(form)
      const current = { ...form, profileAttachments: attachments }
      const phoneDigits = String(form.phone || '').replace(/\D/g, '')

      const body: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim(),
        plan: form.plan,
        accessExpiresAt: form.accessExpiresAt || null,
        billingPaymentMethod: form.billingPaymentMethod || null,
        phone: phoneDigits || null,
        avatar: avatar || null,
        patientProfile: buildPatientProfilePayload(current),
        sendWelcomeWhatsapp: Boolean(form.sendWelcomeWhatsapp),
        welcomeMessageOverride:
          registrationRequestId || form.sendWelcomeWhatsapp
            ? form.welcomeMessageOverride || null
            : null,
      }

      if (registrationRequestId) body.registrationRequestId = registrationRequestId
      else body.password = form.password

      return await apiFetch<AuthUser>('/users', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erro ao criar paciente.'
      setError(message)
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  async function submitEdit(userId: string) {
    if (!userId) throw new Error('Paciente não informado.')
    setSubmitting(true)
    setError('')
    try {
      if (!form.name?.trim()) throw new Error('Nome é obrigatório.')

      const avatar = await uploadAvatarIfNeeded()
      const attachments = await uploadAttachmentsIfNeeded(form)
      const current = { ...form, profileAttachments: attachments }
      const phoneDigits = String(form.phone || '').replace(/\D/g, '')

      const body: Record<string, unknown> = {
        name: form.name.trim(),
        phone: phoneDigits || null,
        plan: form.plan,
        status: form.status,
        accessExpiresAt: form.accessExpiresAt || null,
        billingPaymentMethod: form.billingPaymentMethod || null,
        patientProfile: buildPatientProfilePayload(current),
      }
      if (avatar) body.avatar = avatar

      return await apiFetch<AuthUser>(`/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erro ao salvar paciente.'
      setError(message)
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  return {
    form,
    setForm,
    patchForm,
    avatarFile,
    avatarPreview,
    submitting,
    uploadingAvatar,
    uploadingAttachments,
    lookingUpCep,
    cepLookupError,
    error,
    setError,
    welcomeTemplate,
    ...QUICK_ADD_OPTIONS,
    applyAccessDuration,
    isFreePlan,
    accessHint,
    minAccessDate,
    resetForm,
    markClean,
    isDirty,
    onCpfChange,
    onRgChange,
    onCepChange,
    onAvatarPick,
    clearAvatar,
    ensureWelcomeTemplate,
    submit,
    submitEdit,
  }
}
