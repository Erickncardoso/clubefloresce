<template>
  <Teleport to="body">
    <Transition name="qap-fade">
      <div v-if="open" class="qap-overlay" @click.self="emitClose">
        <form
          class="modal-card qap-modal admin-shell"
          :class="{ 'qap-modal--dragging': drag.active }"
          :style="sheetStyle"
          @submit.prevent="handleSubmit"
        >
          <button
            type="button"
            class="qap-sheet-handle-hit"
            aria-label="Fechar"
            @click="onHandleClick"
            @pointerdown="onDragStart"
          >
            <span class="qap-sheet-handle" aria-hidden="true" />
          </button>

          <header class="qap-header">
            <h3>{{ modalTitle }}</h3>
            <button type="button" class="qap-close" aria-label="Fechar" @click="emitClose">
              <X :size="20" />
            </button>
          </header>

          <p v-if="isApprove" class="qap-hint">
            A senha já foi definida pelo paciente. Complete o perfil e libere o acesso.
          </p>

          <div class="qap-body modal-fields">
            <div class="qap-top">
              <div class="qap-photo">
                <div class="qap-photo-box">
                  <div class="qap-photo-avatar-wrap">
                    <PatientAvatar
                      :src="avatarPreview || form.avatarUrl"
                      :name="form.name || 'Paciente'"
                      size="xl"
                      :ring="false"
                    />
                  </div>
                  <p class="qap-photo-text">Selecione um arquivo JPG ou PNG do seu dispositivo</p>
                  <button type="button" class="qap-photo-btn" @click="triggerAvatarPick">
                    Escolher foto
                  </button>
                  <button
                    v-if="avatarPreview || form.avatarUrl"
                    type="button"
                    class="qap-photo-clear"
                    @click="clearAvatar"
                  >
                    Remover foto
                  </button>
                </div>
                <input
                  ref="avatarInputRef"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  class="qap-photo-input"
                  @change="onAvatarPick"
                >
              </div>

              <div class="field field--float qap-top-name">
                <label for="qap-name">Nome <span class="qap-req">*</span></label>
                <input
                  id="qap-name"
                  v-model="form.name"
                  required
                  placeholder="Nome completo"
                  autocomplete="name"
                >
              </div>
              <div class="field field--float qap-top-email">
                <label for="qap-email">E-mail</label>
                <input
                  id="qap-email"
                  v-model="form.email"
                  type="email"
                  :required="!isEdit"
                  :readonly="isEdit"
                  placeholder="email@exemplo.com"
                  autocomplete="email"
                >
              </div>
            </div>

            <div class="qap-row qap-row--2 qap-row--controls">
              <SharedCfPhoneInput
                v-model="form.phone"
                input-id="qap-phone"
                label="Telefone"
                class="qap-phone"
              />
              <div class="field field--float qap-control-field">
                <label for="qap-birth">Data de nascimento</label>
                <SharedCfDateInput id="qap-birth" v-model="form.birthDate" />
              </div>
            </div>

            <div class="qap-row qap-row--2">
              <div class="field field--float">
                <label for="qap-cpf">CPF</label>
                <input
                  id="qap-cpf"
                  :value="form.cpf"
                  inputmode="numeric"
                  placeholder="000.000.000-00"
                  maxlength="14"
                  @input="onCpfInput"
                >
              </div>
              <div class="field field--float">
                <label for="qap-rg">RG</label>
                <input
                  id="qap-rg"
                  :value="form.rg"
                  inputmode="text"
                  placeholder="00.000.000-0"
                  maxlength="14"
                  @input="onRgInput"
                >
              </div>
            </div>

            <div class="qap-row qap-row--2 qap-row--align-start">
              <div class="qap-gender-block">
                <span class="qap-block-label">Sexo</span>
                <div class="qap-segment" role="group" aria-label="Sexo">
                  <button
                    type="button"
                    class="qap-segment-btn"
                    :class="{ 'qap-segment-btn--active': form.gender === 'female' }"
                    @click="form.gender = 'female'"
                  >
                    Feminino
                  </button>
                  <button
                    type="button"
                    class="qap-segment-btn"
                    :class="{ 'qap-segment-btn--active': form.gender === 'male' }"
                    @click="form.gender = 'male'"
                  >
                    Masculino
                  </button>
                </div>
                <div v-if="isEdit" class="qap-active-row">
                  <label class="qap-active-toggle">
                    <input
                      v-model="isPatientActive"
                      type="checkbox"
                      class="qap-active-input"
                    >
                    <span class="qap-active-track" aria-hidden="true" />
                  </label>
                  <span class="qap-active-label">Ativo</span>
                  <span class="qap-tip-wrap">
                    <button
                      type="button"
                      class="qap-tip-trigger"
                      aria-label="Informação sobre status ativo"
                    >
                      <HelpCircle class="qap-tip-icon" aria-hidden="true" />
                    </button>
                    <span role="tooltip" class="qap-tip">
                      Ao inativar um contato, ele deixará de aparecer como opção para novos cadastros
                    </span>
                  </span>
                </div>
              </div>

              <div class="qap-tags-field">
                <div class="qap-tags-head">
                  <span class="qap-block-label">
                    Etiquetas
                    <span class="qap-tip-wrap qap-tip-wrap--inline">
                      <button
                        type="button"
                        class="qap-tip-trigger"
                        aria-label="Informação sobre etiquetas"
                      >
                        <HelpCircle class="qap-tip-icon" aria-hidden="true" />
                      </button>
                      <span role="tooltip" class="qap-tip">
                        Organize pacientes com etiquetas coloridas para filtros e buscas rápidas
                      </span>
                    </span>
                  </span>
                  <button type="button" class="qap-tags-add" @click="openTagPicker">
                    + Adicionar
                  </button>
                </div>
                <PatientsPatientTagPicker ref="tagPickerRef" v-model="form.tagItems" />
              </div>
            </div>

            <div class="qap-divider" />

            <section class="qap-section">
              <h4 class="qap-section-title">Informações adicionais</h4>

              <div class="field field--float">
                <label for="qap-origin">Origem</label>
                <SharedCfSelect
                  id="qap-origin"
                  v-model="form.referralSource"
                  :options="referralSourceOptions"
                  placeholder="Selecione a origem"
                />
              </div>

              <div class="qap-row qap-row--2">
                <div class="field field--float">
                  <label for="qap-occupation">Profissão</label>
                  <input id="qap-occupation" v-model="form.occupation" placeholder="Profissão">
                </div>
                <div class="field field--float">
                  <label for="qap-marital">Estado civil</label>
                  <SharedCfSelect id="qap-marital" v-model="form.maritalStatus" :options="maritalOptions" />
                </div>
              </div>

              <div class="field field--float">
                <label for="qap-notes">Observações</label>
                <input id="qap-notes" v-model="form.notes" placeholder="Observações gerais">
              </div>
            </section>

            <div class="qap-divider" />

            <PatientsPatientProfileExtraSections
              :form="form"
              :state-options="stateOptions"
              :exclude-user-id="isEdit ? userId : ''"
              :looking-up-cep="lookingUpCep"
              :cep-lookup-error="cepLookupError"
              :on-cep-input="onCepInput"
            />

            <section class="qap-more">
              <button
                type="button"
                class="qap-more-toggle"
                :aria-expanded="moreOpen"
                @click="moreOpen = !moreOpen"
              >
                <span>Mais informações</span>
                <ChevronDown class="qap-more-chevron" :class="{ 'qap-more-chevron--open': moreOpen }" />
              </button>

              <div v-if="moreOpen" class="qap-more-body">
                <div class="field field--float">
                  <label for="qap-nickname">Apelido</label>
                  <input id="qap-nickname" v-model="form.nickname" placeholder="Como prefere ser chamada">
                </div>

                <div class="qap-row qap-row--2">
                  <div class="field field--float">
                    <label for="qap-modality">Modalidade</label>
                    <SharedCfSelect id="qap-modality" v-model="form.modality" :options="modalityOptions" />
                  </div>
                  <div class="qap-flags">
                    <label class="qap-check">
                      <input v-model="form.athlete" type="checkbox">
                      <span>Atleta</span>
                    </label>
                    <label class="qap-check">
                      <input v-model="form.pregnant" type="checkbox">
                      <span>Gestante</span>
                    </label>
                    <label class="qap-check">
                      <input v-model="form.lactating" type="checkbox">
                      <span>Lactante</span>
                    </label>
                  </div>
                </div>

                <div class="field field--float">
                  <label for="qap-objective">Objetivo</label>
                  <input id="qap-objective" v-model="form.objective" placeholder="Objetivo nutricional">
                </div>
              </div>
            </section>

            <section v-if="!isEdit || accessOpen" class="qap-more">
              <button
                v-if="isEdit"
                type="button"
                class="qap-more-toggle"
                :aria-expanded="accessOpen"
                @click="accessOpen = !accessOpen"
              >
                <span>Plano e acesso</span>
                <ChevronDown class="qap-more-chevron" :class="{ 'qap-more-chevron--open': accessOpen }" />
              </button>

              <div v-if="!isEdit || accessOpen" class="qap-more-body qap-more-body--flat">
                <div class="qap-row qap-row--2">
                  <div class="field field--float">
                    <label for="qap-plan">Plano</label>
                    <SharedCfSelect id="qap-plan" v-model="form.plan" :options="planOptions" />
                  </div>
                  <div class="field field--float">
                    <label for="qap-payment">Forma de pagamento</label>
                    <SharedCfSelect
                      id="qap-payment"
                      v-model="form.billingPaymentMethod"
                      :options="paymentMethodOptions"
                    />
                  </div>
                </div>

                <div class="qap-row qap-row--2">
                  <div class="field field--float">
                    <label for="qap-expires">
                      Acesso válido até
                      <span v-if="isApprove && !isFreePlan" class="qap-req">*</span>
                    </label>
                    <SharedCfDateInput
                      id="qap-expires"
                      v-model="form.accessExpiresAt"
                      :min="minAccessDate"
                      :required="isApprove && !isFreePlan"
                    />
                  </div>
                  <div v-if="!isApprove && !isEdit" class="field field--float">
                    <label for="qap-password">Senha inicial <span class="qap-req">*</span></label>
                    <input
                      id="qap-password"
                      v-model="form.password"
                      type="password"
                      required
                      minlength="8"
                      placeholder="Mínimo 8 caracteres"
                      autocomplete="new-password"
                    >
                  </div>
                </div>

                <div class="qap-duration-row">
                  <button
                    v-for="preset in accessDurationPresets"
                    :key="String(preset.days)"
                    type="button"
                    class="qap-duration-chip"
                    @click="applyAccessDuration(preset.days)"
                  >
                    {{ preset.label }}
                  </button>
                </div>
                <p class="qap-field-hint">{{ accessHint }}</p>
              </div>
            </section>

            <section v-if="!isApprove && !isEdit" class="qap-welcome">
              <div class="qap-welcome-head">
                <div>
                  <h4>Boas-vindas no WhatsApp</h4>
                  <p class="qap-field-hint">Envia mensagem após cadastrar (precisa de celular).</p>
                </div>
                <label class="qap-active-row qap-active-row--compact">
                  <input v-model="form.sendWelcomeWhatsapp" type="checkbox" class="qap-active-input">
                  <span class="qap-active-track" aria-hidden="true" />
                </label>
              </div>
              <div v-if="form.sendWelcomeWhatsapp" class="field field--float">
                <label for="qap-welcome-msg">Mensagem</label>
                <textarea
                  id="qap-welcome-msg"
                  v-model="form.welcomeMessageOverride"
                  rows="5"
                  placeholder="Carregando modelo…"
                />
              </div>
            </section>

            <section v-else-if="isApprove" class="qap-welcome">
              <h4>Mensagem de aprovação</h4>
              <p class="qap-field-hint">E-mail e WhatsApp são enviados automaticamente ao aprovar.</p>
              <div class="field field--float">
                <label for="qap-welcome-msg-approve">Mensagem WhatsApp</label>
                <textarea
                  id="qap-welcome-msg-approve"
                  v-model="form.welcomeMessageOverride"
                  rows="5"
                  placeholder="Carregando modelo…"
                />
              </div>
            </section>

            <p v-if="error" class="qap-error">{{ error }}</p>
          </div>

          <footer class="qap-footer">
            <button
              type="submit"
              class="qap-save"
              :disabled="submitting || uploadingAvatar || uploadingAttachments"
            >
              <span v-if="submitting || uploadingAvatar || uploadingAttachments">
                {{ uploadingAvatar ? 'Enviando foto…' : uploadingAttachments ? 'Enviando anexos…' : 'Salvando…' }}
              </span>
              <span v-else-if="isApprove">Aprovar e liberar</span>
              <span v-else-if="isEdit">Salvar</span>
              <span v-else>Cadastrar</span>
            </button>
          </footer>
        </form>
      </div>
    </Transition>

    <Transition name="qap-fade">
      <div
        v-if="open && discardConfirmOpen"
        class="qap-discard-overlay"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="qap-discard-title"
        @click.self="cancelDiscard"
        @keydown.esc="cancelDiscard"
      >
        <div class="qap-discard-modal" @click.stop>
          <div class="qap-discard-head">
            <div class="qap-discard-icon" aria-hidden="true">
              <AlertTriangle class="qap-discard-icon-svg" />
            </div>
            <p id="qap-discard-title" class="qap-discard-title">
              Cancelar as alterações do paciente?
            </p>
          </div>

          <div class="qap-discard-divider" />

          <div class="qap-discard-actions">
            <button type="button" class="qap-discard-back" @click="cancelDiscard">
              Voltar
            </button>
            <button type="button" class="qap-discard-confirm" @click="confirmDiscard">
              Sim, cancelar
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { AlertTriangle, ChevronDown, HelpCircle, X } from 'lucide-vue-next'
import { useQuickAddPatient } from '~/composables/useQuickAddPatient.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: 'create' },
  seed: { type: Object, default: null },
  registrationRequestId: { type: String, default: '' },
  userId: { type: String, default: '' },
})

const emit = defineEmits(['close', 'created', 'updated'])

const {
  form,
  avatarFile,
  avatarPreview,
  submitting,
  uploadingAvatar,
  uploadingAttachments,
  lookingUpCep,
  cepLookupError,
  error,
  planOptions,
  accessDurationPresets,
  applyAccessDuration,
  isFreePlan,
  accessHint,
  paymentMethodOptions,
  maritalOptions,
  modalityOptions,
  stateOptions,
  referralSourceOptions,
  minAccessDate,
  resetForm,
  onCpfInput,
  onRgInput,
  onCepInput,
  onAvatarPick,
  clearAvatar,
  ensureWelcomeTemplate,
  submit,
  submitEdit,
} = useQuickAddPatient()

const avatarInputRef = ref(null)
const tagPickerRef = ref(null)
const moreOpen = ref(false)
const accessOpen = ref(false)
const discardConfirmOpen = ref(false)
const initialSnapshot = ref('')

const isApprove = computed(() => props.mode === 'approve')
const isEdit = computed(() => props.mode === 'edit')

const modalTitle = computed(() => {
  if (isApprove.value) return 'Aprovar solicitação'
  if (isEdit.value) return 'Editar paciente'
  return 'Novo paciente'
})

const isPatientActive = computed({
  get: () => form.status === 'ATIVO',
  set: (value) => {
    form.status = value ? 'ATIVO' : 'INATIVO'
  },
})

const dragOffset = ref(0)
const drag = reactive({
  active: false,
  startY: 0,
  moved: false,
})

const sheetStyle = computed(() => {
  if (!drag.active && dragOffset.value === 0) return undefined
  return {
    transform: `translateY(${dragOffset.value}px)`,
    transition: drag.active ? 'none' : 'transform 0.22s ease',
  }
})

function serializeTagItems(items = []) {
  return [...items]
    .map((item) => ({
      id: item?.id || '',
      name: item?.name || '',
      color: item?.color || '',
    }))
    .sort((a, b) => String(a.id || a.name).localeCompare(String(b.id || b.name)))
}

function serializeFormState() {
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
    additionalContacts: form.additionalContacts?.map(({ _key, file, ...rest }) => rest) || [],
    emergencyContacts: form.emergencyContacts?.map(({ _key, ...rest }) => rest) || [],
    guardianEnabled: Boolean(form.guardianEnabled),
    guardians: form.guardians?.map(({ _key, ...rest }) => rest) || [],
    identityDocuments: form.identityDocuments?.map(({ _key, ...rest }) => rest) || [],
    notifyEmail: Boolean(form.notifyEmail),
    notifySms: Boolean(form.notifySms),
    notifyWhatsapp: Boolean(form.notifyWhatsapp),
    profileAttachments: form.profileAttachments?.map(({ _key, file, ...rest }) => rest) || [],
    plan: form.plan || '',
    status: form.status || '',
    accessExpiresAt: form.accessExpiresAt || '',
    billingPaymentMethod: form.billingPaymentMethod || '',
    avatarUrl: form.avatarUrl || '',
    sendWelcomeWhatsapp: Boolean(form.sendWelcomeWhatsapp),
    welcomeMessageOverride: form.welcomeMessageOverride || '',
    tagItems: serializeTagItems(form.tagItems),
    avatarPreview: avatarPreview.value || '',
    hasAvatarFile: Boolean(avatarFile.value),
  })
}

function captureSnapshot() {
  initialSnapshot.value = serializeFormState()
}

const isDirty = computed(() => {
  if (!props.open || !initialSnapshot.value) return false
  return serializeFormState() !== initialSnapshot.value
})

watch(
  () => props.open,
  async (isOpen) => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = isOpen ? 'hidden' : ''
    }
    dragOffset.value = 0
    drag.active = false
    drag.moved = false
    discardConfirmOpen.value = false
    if (!isOpen) {
      initialSnapshot.value = ''
      return
    }
    moreOpen.value = false
    accessOpen.value = !isEdit.value
    resetForm(props.seed)
    if (!isEdit.value) await ensureWelcomeTemplate()
    await nextTick()
    captureSnapshot()
  },
)

onBeforeUnmount(() => {
  detachDragListeners()
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})

function emitClose(force = false) {
  if (submitting.value) return
  if (!force && isDirty.value) {
    discardConfirmOpen.value = true
    return
  }
  discardConfirmOpen.value = false
  emit('close')
}

function cancelDiscard() {
  discardConfirmOpen.value = false
}

function confirmDiscard() {
  discardConfirmOpen.value = false
  emit('close')
}

function triggerAvatarPick() {
  avatarInputRef.value?.click()
}

function openTagPicker() {
  tagPickerRef.value?.openMenu?.()
}

function detachDragListeners() {
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
  window.removeEventListener('pointercancel', onDragEnd)
}

function onHandleClick(event) {
  if (drag.moved) {
    event.preventDefault()
    event.stopPropagation()
    drag.moved = false
    return
  }
  emitClose()
}

function onDragStart(event) {
  if (submitting.value) return
  if (window.matchMedia('(min-width: 721px)').matches) return
  if (event.button != null && event.button !== 0) return
  drag.active = true
  drag.moved = false
  drag.startY = event.clientY
  dragOffset.value = 0
  event.currentTarget?.setPointerCapture?.(event.pointerId)
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragEnd)
  window.addEventListener('pointercancel', onDragEnd)
}

function onDragMove(event) {
  if (!drag.active) return
  const delta = Math.max(0, event.clientY - drag.startY)
  if (delta > 6) drag.moved = true
  dragOffset.value = delta
}

function onDragEnd() {
  if (!drag.active) return
  const shouldClose = dragOffset.value > 110
  drag.active = false
  detachDragListeners()

  if (shouldClose) {
    dragOffset.value = Math.max(dragOffset.value, window.innerHeight * 0.5)
    window.setTimeout(() => {
      dragOffset.value = 0
      emitClose()
    }, 160)
    return
  }

  dragOffset.value = 0
}

async function handleSubmit() {
  try {
    if (isEdit.value) {
      const user = await submitEdit(props.userId)
      captureSnapshot()
      emit('updated', user)
      return
    }
    const user = await submit({
      registrationRequestId: isApprove.value ? props.registrationRequestId : null,
      requireAccessExpires: isApprove.value,
    })
    captureSnapshot()
    emit('created', user)
  } catch {
    /* error on composable */
  }
}
</script>

<style scoped>
.qap-overlay {
  --qap-accent: #8b967c;
  --qap-accent-hover: #7a856e;
  --qap-accent-soft: rgba(139, 150, 124, 0.14);
  --qap-accent-ring: rgba(139, 150, 124, 0.55);
  --qap-accent-glow: rgba(139, 150, 124, 0.12);
  position: fixed;
  inset: 0;
  z-index: 5000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: rgba(17, 24, 39, 0.45);
}

.qap-modal {
  --qap-gutter: 1.25rem;
  width: min(100%, 42rem);
  max-height: min(92dvh, 880px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  border-radius: var(--cf-radius-control);
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.18);
  padding: 0 !important;
  gap: 0 !important;
}

.qap-modal--dragging {
  transition: none !important;
  user-select: none;
}

.qap-sheet-handle-hit {
  display: none;
}

.qap-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem var(--qap-gutter) 0.75rem;
  flex-shrink: 0;
}

.qap-header h3 {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.02em;
}

.qap-close {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: none;
  background: transparent;
  color: #6b7280;
  border-radius: var(--cf-radius-control);
  cursor: pointer;
}

.qap-close:hover {
  background: #f3f4f6;
  color: #111827;
}

.qap-hint {
  margin: 0;
  padding: 0 var(--qap-gutter) 0.5rem;
  font-size: 0.8125rem;
  color: #6b7280;
  line-height: 1.45;
}

.qap-body {
  flex: 0 1 auto;
  min-height: 0;
  max-height: calc(min(92dvh, 880px) - 8.25rem);
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0 var(--qap-gutter) 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem !important;
  margin-top: 0 !important;
  scrollbar-width: none;
  -ms-overflow-style: none;
  width: 100%;
  box-sizing: border-box;
}

.qap-body.modal-fields {
  gap: 0.75rem !important;
  margin-top: 0 !important;
}

.qap-body::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.qap-top {
  display: grid;
  grid-template-columns: 9.5rem minmax(0, 1fr);
  grid-template-rows: auto auto;
  gap: 0.75rem 0.85rem;
  align-items: start;
  width: 100%;
}

.qap-row {
  display: grid;
  gap: 0.75rem;
  min-width: 0;
  width: 100%;
}

.qap-row--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.qap-gender-block,
.qap-tags-field,
.qap-section {
  width: 100%;
  min-width: 0;
}

.qap-modal :deep(.ptp) {
  gap: 0;
  width: 100%;
}

.qap-photo {
  position: relative;
  grid-row: 1 / 3;
  align-self: start;
}

.qap-top-name,
.qap-top-email {
  min-width: 0;
}

.qap-photo-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 0.85rem 0.55rem;
  border: 1.5px dashed #d1d5db;
  border-radius: var(--cf-radius-control);
  background: #fafafa;
}

.qap-photo-avatar-wrap {
  margin-bottom: 0.55rem;
}

.qap-photo-avatar-wrap :deep(.patient-avatar--xl) {
  width: 4.75rem;
  height: 4.75rem;
  filter: none;
}

.qap-photo-text {
  margin: 0 0 0.55rem;
  font-size: 0.6875rem;
  line-height: 1.35;
  color: #9ca3af;
}

.qap-photo-btn {
  border: none;
  background: var(--qap-accent-soft);
  color: var(--qap-accent);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.4rem 0.75rem;
  border-radius: var(--cf-radius-control);
  cursor: pointer;
  transition: background 0.15s ease;
}

.qap-photo-btn:hover {
  background: rgba(139, 150, 124, 0.2);
}

.qap-photo-clear {
  margin-top: 0.35rem;
  border: none;
  background: transparent;
  color: #9ca3af;
  font: inherit;
  font-size: 0.6875rem;
  cursor: pointer;
}

.qap-photo-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.qap-row--controls {
  align-items: start;
}

.qap-row--align-start {
  align-items: start;
}

.qap-control-field {
  min-width: 0;
}

.qap-gender-block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
  width: 100%;
}

.qap-block-label {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #374151;
}

.qap-req {
  color: #dc2626;
}

.qap-field-hint {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: #9ca3af;
}

.qap-field-hint--error {
  color: #dc2626;
}

.qap-modal :deep(.field--float) {
  min-width: 0;
  margin-top: 0.1rem;
}

.qap-modal :deep(.field--float .cf-select),
.qap-modal :deep(.field--float .cf-date-input) {
  width: 100%;
}

/* Altura única dos controles no modal (2.75rem = padrão admin) */
.qap-modal :deep(.field--float input:not([type='range'])) {
  min-height: 2.75rem;
}

.qap-modal :deep(.qap-phone .cf-phone-input) {
  display: flex;
  align-items: center;
  min-height: 2.75rem !important;
  height: 2.75rem !important;
}

.qap-modal :deep(.qap-phone.cf-phone-field) {
  min-width: 0;
  margin-top: 0.15rem;
}

.qap-modal :deep(.qap-phone .cf-phone-country) {
  display: flex;
  align-self: stretch;
}

.qap-modal :deep(.qap-phone .cf-phone-country-btn) {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 0.5rem;
}

.qap-modal :deep(.cf-phone-field.field--float input:not([type='range'])) {
  min-height: 0 !important;
  height: 100% !important;
  padding: 0 0.65rem !important;
  border: none !important;
  box-shadow: none !important;
  font-size: 0.9rem;
  line-height: 1.2;
}

.qap-modal :deep(.qap-phone .cf-phone-input input) {
  align-self: center;
}

.qap-modal :deep(.cf-date-input-trigger) {
  min-height: 2.75rem !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

.qap-modal :deep(.cf-date-input-text) {
  padding: 0 0.35rem 0 0.75rem;
  font-size: 0.9rem;
  line-height: 2.75rem;
}

.qap-modal :deep(.cf-date-calendar-btn) {
  min-height: 2.75rem !important;
  width: 2.75rem !important;
}

.qap-modal :deep(.cf-select-trigger) {
  min-height: 2.75rem !important;
  padding-top: 0.85rem !important;
  padding-bottom: 0.85rem !important;
}

.qap-modal :deep(.ptp-field) {
  min-height: 2.75rem;
  height: 2.75rem;
  width: 100%;
}

.qap-modal :deep(.qap-phone.cf-phone-field) {
  width: 100%;
}

.qap-modal :deep(.cf-select-trigger),
.qap-modal :deep(.cf-date-input-trigger),
.qap-modal :deep(.cf-select-trigger:focus),
.qap-modal :deep(.cf-select--open .cf-select-trigger),
.qap-modal :deep(.cf-date-input-trigger:focus),
.qap-modal :deep(.cf-date-input--open .cf-date-input-trigger),
.qap-modal :deep(.cf-date-input-trigger--focused) {
  box-shadow: none !important;
}

.qap-modal :deep(.qap-phone .cf-phone-country-menu li:hover),
.qap-modal :deep(.qap-phone .cf-phone-country-menu li[aria-selected='true']) {
  background: rgba(139, 150, 124, 0.12);
}

.qap-segment {
  display: inline-flex;
  width: 100%;
  min-height: 2.75rem;
  box-sizing: border-box;
  padding: 0.18rem;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: var(--cf-radius-control);
  overflow: hidden;
}

.qap-segment-btn {
  flex: 1 1 0;
  border: none;
  background: transparent;
  padding: 0.48rem 0.65rem;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #6b7280;
  border-radius: calc(var(--cf-radius-control) - 3px);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.qap-segment-btn--active {
  background: #fff;
  color: #111827;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.qap-active-row {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.5rem;
}

.qap-active-row--compact {
  margin-top: 0;
}

.qap-active-toggle {
  display: inline-flex;
  cursor: pointer;
  user-select: none;
}

.qap-active-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.qap-active-track {
  width: 2.55rem;
  height: 1.4rem;
  border-radius: var(--cf-radius-pill);
  background: #d1d5db;
  position: relative;
  transition: background 0.2s ease;
  flex-shrink: 0;
}

.qap-active-track::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 1.08rem;
  height: 1.08rem;
  border-radius: var(--cf-radius-full);
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease;
}

.qap-active-input:checked + .qap-active-track {
  background: #6ee7a5;
}

.qap-active-input:checked + .qap-active-track::after {
  transform: translateX(1.12rem);
}

.qap-active-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.qap-tip-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.qap-tip-wrap--inline {
  margin-left: 0.15rem;
}

.qap-tip-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.15rem;
  height: 1.15rem;
  padding: 0;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: help;
}

.qap-tip-trigger:hover,
.qap-tip-wrap:focus-within .qap-tip-trigger {
  color: #6b7280;
}

.qap-tip-icon {
  width: 0.85rem;
  height: 0.85rem;
}

.qap-tip {
  position: absolute;
  bottom: calc(100% + 0.45rem);
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  max-width: 14.5rem;
  padding: 0.55rem 0.7rem;
  border-radius: var(--cf-radius-xs);
  background: #1f2937;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.4;
  text-align: center;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.15s ease, visibility 0.15s ease;
  z-index: 20;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.22);
}

.qap-tip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: #1f2937;
}

.qap-tip-wrap:hover .qap-tip,
.qap-tip-wrap:focus-within .qap-tip {
  opacity: 1;
  visibility: visible;
}

.qap-tags-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
  position: relative;
  overflow: visible;
}

.qap-modal :deep(.ptp--open) {
  position: relative;
  z-index: 40;
}

.qap-modal :deep(.ptp-menu) {
  z-index: 130;
}

.qap-tags-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 1.125rem;
}

.qap-tags-add {
  border: none;
  background: transparent;
  color: var(--qap-accent);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  white-space: nowrap;
}

.qap-tags-add:hover {
  color: var(--qap-accent-hover);
}

.qap-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 0.15rem calc(var(--qap-gutter) * -1) 0;
  width: calc(100% + var(--qap-gutter) * 2);
}

.qap-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.qap-section-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 700;
  color: #111827;
}

.qap-more-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.35rem 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  color: #4b5563;
  cursor: pointer;
}

.qap-more-chevron {
  width: 1rem;
  height: 1rem;
  transition: transform 0.2s ease;
}

.qap-more-chevron--open {
  transform: rotate(180deg);
}

.qap-more-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 0.35rem;
}

.qap-more-body--flat {
  padding-top: 0;
}

.qap-flags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  align-items: center;
  min-height: 2.65rem;
  padding-top: 1.65rem;
}

.qap-check {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8125rem;
  color: #374151;
  cursor: pointer;
}

.qap-duration-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.qap-duration-chip {
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #4b5563;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.35rem 0.65rem;
  border-radius: var(--cf-radius-control);
  cursor: pointer;
}

.qap-duration-chip:hover {
  border-color: rgba(139, 150, 124, 0.4);
  color: var(--qap-accent);
}

.qap-welcome h4 {
  margin: 0 0 0.35rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: #374151;
}

.qap-welcome-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.65rem;
}

.qap-error {
  margin: 0;
  color: #dc2626;
  font-size: 0.8125rem;
}

.qap-footer {
  display: flex;
  justify-content: center;
  padding: 0.75rem var(--qap-gutter) 1.1rem;
  flex-shrink: 0;
  position: relative;
  border-top: none;
}

.qap-footer::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: #f3f4f6;
}

.qap-save {
  min-width: 9rem;
  min-height: 2.5rem;
  padding: 0.55rem 1.75rem;
  border: none;
  border-radius: var(--cf-radius-control);
  background: var(--qap-accent);
  color: #fff;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, opacity 0.15s ease;
}

.qap-save:hover:not(:disabled) {
  background: var(--qap-accent-hover);
}

.qap-save:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.qap-fade-enter-active,
.qap-fade-leave-active {
  transition: opacity 0.2s ease;
}

.qap-fade-enter-active .qap-modal,
.qap-fade-leave-active .qap-modal {
  transition: transform 0.24s ease, opacity 0.24s ease;
}

.qap-fade-enter-from,
.qap-fade-leave-to {
  opacity: 0;
}

.qap-fade-enter-from .qap-modal,
.qap-fade-leave-to .qap-modal {
  transform: translateY(12px) scale(0.98);
  opacity: 0;
}

.qap-discard-overlay {
  position: fixed;
  inset: 0;
  z-index: 5500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: rgba(17, 24, 39, 0.45);
}

.qap-discard-modal {
  width: min(100%, 26rem);
  background: #fff;
  border-radius: var(--cf-radius-control);
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.18);
  overflow: hidden;
}

.qap-discard-head {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 1.15rem 1.15rem 1rem;
}

.qap-discard-icon {
  display: grid;
  place-items: center;
  width: 2.35rem;
  height: 2.35rem;
  border-radius: var(--cf-radius-full);
  background: #fef9c3;
  color: #ca8a04;
  flex-shrink: 0;
}

.qap-discard-icon-svg {
  width: 1.15rem;
  height: 1.15rem;
}

.qap-discard-title {
  margin: 0.15rem 0 0;
  font-size: 0.9375rem;
  font-weight: 700;
  line-height: 1.45;
  color: #111827;
}

.qap-discard-divider {
  height: 1px;
  background: #e5e7eb;
}

.qap-discard-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 0.85rem 1.15rem 1rem;
}

.qap-discard-back {
  border: none;
  background: transparent;
  color: #374151;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.35rem 0.15rem;
}

.qap-discard-back:hover {
  color: #111827;
}

.qap-discard-confirm {
  border: none;
  background: #f5b942;
  color: #fff;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.55rem 1rem;
  border-radius: var(--cf-radius-control);
  transition: background 0.15s ease;
}

.qap-discard-confirm:hover {
  background: #e6ab2e;
}

@supports (corner-shape: squircle) {
  .qap-modal,
  .qap-photo-box,
  .qap-segment,
  .qap-segment-btn,
  .qap-save,
  .qap-photo-btn,
  .qap-tip,
  .qap-discard-modal,
  .qap-discard-confirm {
    corner-shape: squircle;
  }
}

@media (max-width: 720px) {
  .qap-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .qap-modal {
    width: 100%;
    max-height: 96dvh;
    border-radius: var(--cf-radius-control) var(--cf-radius-control) 0 0;
  }

  .qap-sheet-handle-hit {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 1.75rem;
    padding: 0.55rem 0 0.2rem;
    border: none;
    background: transparent;
    cursor: grab;
    flex-shrink: 0;
    touch-action: none;
  }

  .qap-sheet-handle {
    width: 2.75rem;
    height: 0.28rem;
    border-radius: var(--cf-radius-pill);
    background: #d1d5db;
  }

  .qap-top {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }

  .qap-photo {
    grid-row: auto;
    justify-self: center;
    width: min(100%, 8.5rem);
  }

  .qap-row--2 {
    grid-template-columns: 1fr;
  }

  .qap-flags {
    padding-top: 0;
  }
}
</style>
