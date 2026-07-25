<template>
  <Teleport to="body">
    <Transition name="qap-sheet">
      <div v-if="open" class="modal-overlay qap-overlay" @click.self="emitClose">
        <form
          class="modal-card qap-modal"
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
            <div>
              <h3>{{ modalTitle }}</h3>
              <p v-if="isApprove" class="modal-hint">
                A senha já foi definida pelo paciente. Complete o perfil e libere o acesso.
              </p>
              <p v-else-if="isEdit" class="modal-hint">Atualize os dados cadastrais, perfil e acesso da paciente.</p>
              <p v-else class="modal-hint">Cadastro rápido com perfil e boas-vindas no WhatsApp.</p>
            </div>
            <button type="button" class="qap-close" aria-label="Fechar" @click="emitClose">
              <X :size="20" />
            </button>
          </header>

        <div class="qap-body modal-fields">
          <section class="qap-identity">
            <label class="qap-avatar" :class="{ 'qap-avatar--filled': Boolean(avatarPreview || form.avatarUrl) }">
              <input
                ref="avatarInputRef"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                class="qap-avatar-input"
                @change="onAvatarPick"
              >
              <img
                v-if="avatarPreview || form.avatarUrl"
                :src="avatarPreview || form.avatarUrl"
                alt=""
                class="qap-avatar-img"
              >
              <span v-else class="qap-avatar-placeholder">
                <Camera :size="22" />
                <small>Foto</small>
              </span>
              <button
                v-if="avatarPreview || form.avatarUrl"
                type="button"
                class="qap-avatar-clear"
                aria-label="Remover foto"
                @click.stop.prevent="clearAvatar"
              >
                <X :size="14" />
              </button>
            </label>

            <div class="qap-identity-fields">
              <div class="field field--float">
                <label for="qap-name">Nome completo</label>
                <input id="qap-name" v-model="form.name" required placeholder="Nome da paciente" autocomplete="name">
              </div>
              <div class="field field--float">
                <label for="qap-nickname">Apelido</label>
                <input id="qap-nickname" v-model="form.nickname" placeholder="Como prefere ser chamada">
              </div>
            </div>
          </section>

          <div class="qap-grid qap-grid--3">
            <div class="field field--float">
              <label for="qap-gender">Gênero</label>
              <SharedCfSelect id="qap-gender" v-model="form.gender" :options="genderOptions" />
            </div>
            <div class="field field--float">
              <label for="qap-birth">Nascimento</label>
              <SharedCfDateInput id="qap-birth" v-model="form.birthDate" />
            </div>
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
          </div>

          <div class="qap-grid qap-grid--phone">
            <SharedCfPhoneInput
              v-model="form.phone"
              input-id="qap-phone"
              label="Celular"
              class="qap-phone"
            />
            <div class="field field--float">
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

          <div class="qap-tags-block">
            <span class="qap-tags-label">Tags</span>
            <PatientsPatientTagPicker v-model="form.tagItems" />
          </div>

          <div class="qap-grid qap-grid--location">
            <div class="field field--float">
              <label for="qap-city">Cidade</label>
              <input id="qap-city" v-model="form.city" placeholder="Cidade">
            </div>
            <div class="field field--float field--uf">
              <label for="qap-state">UF</label>
              <SharedCfSelect id="qap-state" v-model="form.state" :options="stateOptions" />
            </div>
            <div class="field field--float">
              <label for="qap-occupation">Ocupação</label>
              <input id="qap-occupation" v-model="form.occupation" placeholder="Profissão">
            </div>
            <div class="field field--float">
              <label for="qap-marital">Estado civil</label>
              <SharedCfSelect id="qap-marital" v-model="form.maritalStatus" :options="maritalOptions" />
            </div>
          </div>

          <div class="qap-grid qap-grid--flags">
            <div class="field field--float">
              <label for="qap-modality">Modalidade</label>
              <SharedCfSelect id="qap-modality" v-model="form.modality" :options="modalityOptions" />
            </div>
            <div class="qap-checks">
              <label class="qap-check">
                <input v-model="form.athlete" type="checkbox" class="qap-check-input">
                <span class="qap-check-box" aria-hidden="true">
                  <Check class="qap-check-icon" />
                </span>
                <span class="qap-check-label">Atleta</span>
              </label>
              <label class="qap-check">
                <input v-model="form.pregnant" type="checkbox" class="qap-check-input">
                <span class="qap-check-box" aria-hidden="true">
                  <Check class="qap-check-icon" />
                </span>
                <span class="qap-check-label">Gestante</span>
              </label>
              <label class="qap-check">
                <input v-model="form.lactating" type="checkbox" class="qap-check-input">
                <span class="qap-check-box" aria-hidden="true">
                  <Check class="qap-check-icon" />
                </span>
                <span class="qap-check-label">Lactante</span>
              </label>
            </div>
          </div>

          <section class="qap-advanced">
            <button
              type="button"
              class="qap-advanced-toggle"
              :aria-expanded="advancedOpen"
              @click="advancedOpen = !advancedOpen"
            >
              <span>Informações avançadas</span>
              <ChevronUp v-if="advancedOpen" class="qap-advanced-chevron" />
              <ChevronDown v-else class="qap-advanced-chevron" />
            </button>

            <div v-if="advancedOpen" class="qap-advanced-body">
              <div class="field field--float">
                <label for="qap-objective">Objetivo</label>
                <input
                  id="qap-objective"
                  v-model="form.objective"
                  placeholder="Ex: Emagrecimento, ganho de massa muscular..."
                >
              </div>

              <div class="field field--float">
                <label for="qap-notes">Observação</label>
                <textarea
                  id="qap-notes"
                  v-model="form.notes"
                  rows="3"
                  placeholder="Anotações sobre o paciente..."
                />
              </div>

              <div class="qap-advanced-divider" />

              <div class="qap-grid qap-grid--address-top">
                <div class="field field--float">
                  <label for="qap-cep">CEP</label>
                  <input
                    id="qap-cep"
                    :value="form.zipCode"
                    inputmode="numeric"
                    placeholder="00000-000"
                    maxlength="9"
                    autocomplete="postal-code"
                    @input="onCepInput"
                  >
                  <p v-if="lookingUpCep" class="qap-cep-hint">Buscando endereço…</p>
                  <p v-else-if="cepLookupError" class="qap-cep-hint qap-cep-hint--error">{{ cepLookupError }}</p>
                </div>
                <div class="field field--float">
                  <label for="qap-neighborhood">Bairro</label>
                  <input
                    id="qap-neighborhood"
                    v-model="form.neighborhood"
                    placeholder="Nome do bairro"
                  >
                </div>
              </div>

              <div class="qap-grid qap-grid--address-bottom">
                <div class="field field--float">
                  <label for="qap-street">Rua</label>
                  <input
                    id="qap-street"
                    v-model="form.street"
                    placeholder="Nome da rua"
                  >
                </div>
                <div class="field field--float">
                  <label for="qap-street-number">Número</label>
                  <input
                    id="qap-street-number"
                    v-model="form.streetNumber"
                    placeholder="Nº"
                  >
                </div>
              </div>
            </div>
          </section>

          <section class="qap-block">
            <h4>Acesso</h4>
            <div class="qap-grid qap-grid--access">
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
              <div class="field field--float">
                <label for="qap-expires">
                  Acesso válido até
                  <span v-if="isApprove && !isFreePlan" class="label-required">*</span>
                </label>
                <SharedCfDateInput
                  id="qap-expires"
                  v-model="form.accessExpiresAt"
                  :min="minAccessDate"
                  :required="isApprove && !isFreePlan"
                />
              </div>
              <div v-if="isEdit" class="field field--float">
                <label for="qap-status">Status</label>
                <SharedCfSelect id="qap-status" v-model="form.status" :options="statusOptions" />
              </div>
              <div v-if="!isApprove && !isEdit" class="field field--float">
                <label for="qap-password">Senha inicial</label>
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

            <p class="field-hint">{{ accessHint }}</p>
            <p v-if="isApprove" class="field-hint">
              O paciente já escolheu a senha no app. Após aprovar, entra com e-mail e senha.
            </p>
          </section>

          <section v-if="!isApprove && !isEdit" class="qap-block qap-block--welcome">
            <div class="qap-welcome-head">
              <div>
                <h4>Boas-vindas no WhatsApp</h4>
                <p class="field-hint">Envia a mensagem de aprovação após cadastrar (precisa de celular).</p>
              </div>
              <label class="qap-toggle">
                <input v-model="form.sendWelcomeWhatsapp" type="checkbox">
                <span class="qap-toggle-track" aria-hidden="true" />
                <span class="qap-toggle-label">{{ form.sendWelcomeWhatsapp ? 'Ativo' : 'Off' }}</span>
              </label>
            </div>

            <div v-if="form.sendWelcomeWhatsapp" class="field field--float qap-welcome-field">
              <label for="qap-welcome-msg">Mensagem</label>
              <textarea
                id="qap-welcome-msg"
                v-model="form.welcomeMessageOverride"
                rows="7"
                placeholder="Carregando modelo…"
              />
              <p class="field-hint" v-pre>
                Placeholders: {{nome}}, {{primeiroNome}}, {{linkApp}}, {{acessoAte}}
              </p>
            </div>
          </section>

          <section v-else class="qap-block qap-block--welcome">
            <h4>Mensagem de aprovação</h4>
            <p class="field-hint qap-welcome-desc">
              Ao aprovar, e-mail e WhatsApp (se houver celular) são enviados automaticamente.
            </p>
            <div class="field field--float qap-welcome-field">
              <label for="qap-welcome-msg-approve">Mensagem WhatsApp</label>
              <textarea
                id="qap-welcome-msg-approve"
                v-model="form.welcomeMessageOverride"
                rows="7"
                placeholder="Carregando modelo…"
              />
              <p class="field-hint" v-pre>
                Placeholders: {{nome}}, {{primeiroNome}}, {{linkApp}}, {{acessoAte}}
              </p>
            </div>
          </section>

          <p v-if="error" class="create-error">{{ error }}</p>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" :disabled="submitting" @click="emitClose">
            Cancelar
          </button>
          <button type="submit" class="btn-primary modal-submit" :disabled="submitting || uploadingAvatar">
            <span v-if="submitting || uploadingAvatar">
              {{ uploadingAvatar ? 'Enviando foto…' : 'Salvando…' }}
            </span>
            <span v-else-if="isEdit">Salvar alterações</span>
            <span v-else>{{ isApprove ? 'Aprovar e liberar' : 'Cadastrar' }}</span>
          </button>
        </div>
      </form>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { Camera, Check, ChevronDown, ChevronUp, X } from 'lucide-vue-next'
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
  avatarPreview,
  submitting,
  uploadingAvatar,
  lookingUpCep,
  cepLookupError,
  error,
  planOptions,
  accessDurationPresets,
  applyAccessDuration,
  isFreePlan,
  accessHint,
  paymentMethodOptions,
  genderOptions,
  maritalOptions,
  modalityOptions,
  stateOptions,
  minAccessDate,
  resetForm,
  onCpfInput,
  onCepInput,
  onAvatarPick,
  clearAvatar,
  ensureWelcomeTemplate,
  submit,
  submitEdit,
} = useQuickAddPatient()

const avatarInputRef = ref(null)
const isApprove = computed(() => props.mode === 'approve')
const isEdit = computed(() => props.mode === 'edit')
const modalTitle = computed(() => {
  if (isApprove.value) return 'Aprovar solicitação'
  if (isEdit.value) return 'Editar paciente'
  return 'Novo paciente'
})

const statusOptions = [
  { value: 'ATIVO', label: 'Ativa' },
  { value: 'INATIVO', label: 'Inativa' },
  { value: 'PENDENTE', label: 'Pendente' },
]
const advancedOpen = ref(false)
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

watch(
  () => props.open,
  async (isOpen) => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = isOpen ? 'hidden' : ''
    }
    dragOffset.value = 0
    drag.active = false
    drag.moved = false
    if (!isOpen) return
    advancedOpen.value = isEdit.value
    resetForm(props.seed)
    if (!isEdit.value) await ensureWelcomeTemplate()
  },
)

onBeforeUnmount(() => {
  detachDragListeners()
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})

function emitClose() {
  if (submitting.value) return
  emit('close')
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
      emit('updated', user)
      return
    }
    const user = await submit({
      registrationRequestId: isApprove.value ? props.registrationRequestId : null,
      requireAccessExpires: isApprove.value,
    })
    emit('created', user)
  } catch {
    // error already set on composable
  }
}
</script>

<style scoped>
.modal-overlay.qap-overlay {
  position: fixed;
  inset: 0;
  z-index: 5000;
  display: flex;
  align-items: flex-end;
  justify-content: stretch;
  padding: 0;
  background: rgba(0, 0, 0, 0.4);
}

.modal-card.qap-modal {
  --qap-primary: #8B967C;
  --qap-primary-soft: rgba(139, 150, 124, 0.14);
  width: 100%;
  max-width: none;
  height: min(96dvh, 100%);
  max-height: 96dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
  margin: 0;
  background: #fff;
  border-radius: var(--cf-radius-control) var(--cf-radius-control) 0 0 !important;
  box-shadow: 0 -12px 40px rgba(28, 32, 28, 0.14);
  will-change: transform;
}

.qap-modal--dragging {
  transition: none !important;
  user-select: none;
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

.qap-sheet-handle-hit:active {
  cursor: grabbing;
}

.qap-sheet-handle {
  width: 2.75rem;
  height: 0.28rem;
  border-radius: 999px;
  background: #d5d8d0;
  pointer-events: none;
}

.qap-sheet-enter-active,
.qap-sheet-leave-active {
  transition: background-color 0.28s ease;
}

.qap-sheet-enter-active .qap-modal,
.qap-sheet-leave-active .qap-modal {
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

.qap-sheet-enter-from,
.qap-sheet-leave-to {
  background-color: rgba(0, 0, 0, 0);
}

.qap-sheet-enter-from .qap-modal,
.qap-sheet-leave-to .qap-modal {
  transform: translateY(100%);
}

.qap-modal h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 800;
}

.qap-modal .modal-hint {
  margin: 0.35rem 0 0;
  font-size: 0.84rem;
  color: #78716c;
  line-height: 1.45;
}

.qap-modal .field-hint {
  margin: 0.35rem 0 0;
  font-size: 0.78rem;
  color: #9ca3af;
}

.qap-modal .label-required {
  color: #c2410c;
}

/* Mesmo padrão de field--float do admin-pages (garante no Teleport) */
.qap-modal :deep(.field--float) {
  position: relative;
  margin-top: 0.35rem;
}

.qap-modal :deep(.field--float > label) {
  position: absolute;
  top: -0.58rem;
  left: 0.78rem;
  margin: 0;
  padding: 0 0.4rem;
  background: #fff;
  z-index: 2;
  font-size: 0.76rem;
  font-weight: var(--admin-font-label-weight, 600);
  color: #444;
  line-height: 1;
}

.qap-modal :deep(.field input),
.qap-modal :deep(.field textarea) {
  width: 100%;
  padding: 0.85rem 0.9rem;
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  font-family: inherit;
  font-size: 0.9rem;
  box-sizing: border-box;
  background: #fff;
  box-shadow: none;
  transition: border-color 0.15s ease;
}

.qap-modal :deep(.field input:focus),
.qap-modal :deep(.field textarea:focus) {
  outline: none;
  border-color: #b8d4b4;
  box-shadow: none;
}

.qap-modal :deep(.field--float input),
.qap-modal :deep(.field--float textarea) {
  padding-top: 0.95rem;
}

.qap-modal :deep(.field--float .cf-select),
.qap-modal :deep(.field--float .cf-date-input) {
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

.qap-modal :deep(.qap-phone.cf-phone-field) {
  margin-top: 0.35rem;
  min-width: 0;
}

.qap-modal :deep(.qap-phone > label) {
  position: absolute;
  top: -0.58rem;
  left: 0.78rem;
  margin: 0;
  padding: 0 0.4rem;
  background: #fff;
  z-index: 2;
  font-size: 0.76rem;
  font-weight: var(--admin-font-label-weight, 600);
  color: #444;
  line-height: 1;
}

.qap-modal :deep(.qap-phone .cf-phone-input) {
  border-radius: var(--cf-radius-control);
  box-shadow: none;
  transition: border-color 0.15s ease;
}

.qap-modal :deep(.qap-phone.focused .cf-phone-input),
.qap-modal :deep(.qap-phone .cf-phone-input:focus-within) {
  border-color: #b8d4b4;
  box-shadow: none;
}

.qap-modal :deep(.qap-phone .cf-phone-country-menu li:hover),
.qap-modal :deep(.qap-phone .cf-phone-country-menu li[aria-selected='true']) {
  background: rgba(139, 150, 124, 0.12);
}

.qap-body {
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0.35rem clamp(1.25rem, 3vw, 2.5rem) 0.75rem;
  margin-top: 0 !important;
  gap: 0.95rem !important;
}

.qap-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem clamp(1.25rem, 3vw, 2.5rem) 0.75rem;
  flex-shrink: 0;
}

.qap-header h3 {
  margin: 0;
}

.qap-header .modal-hint {
  margin: 0.35rem 0 0;
}

.qap-close {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  background: transparent;
  color: #6b7368;
  border-radius: var(--cf-radius-control, 1.625rem);
  cursor: pointer;
  flex-shrink: 0;
}

.qap-close:hover {
  background: var(--qap-primary-soft);
  color: #2c322c;
}

.qap-block h4 {
  margin: 0.25rem 0 0.65rem;
  font-size: 0.95rem;
  color: #2c322c;
}

.qap-block--welcome {
  margin-top: 0.55rem;
  padding-top: 1rem;
  border-top: 1px solid #eef1ee;
}

.qap-welcome-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.qap-welcome-head h4 {
  margin: 0 0 0.4rem;
}

.qap-welcome-head .field-hint {
  margin: 0;
  line-height: 1.45;
}

.qap-welcome-desc {
  margin: 0 0 1rem !important;
  line-height: 1.45;
}

.qap-welcome-field {
  margin-top: 0.25rem;
}

.qap-welcome-field .field-hint {
  margin-top: 0.55rem;
}

.qap-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
  margin-top: 0.15rem;
}

.qap-toggle input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.qap-toggle-track {
  width: 2.6rem;
  height: 1.45rem;
  border-radius: 999px;
  background: #d5d8d0;
  position: relative;
  transition: background 0.2s ease;
}

.qap-toggle-track::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
  transition: transform 0.2s ease;
}

.qap-toggle input:checked + .qap-toggle-track {
  background: var(--qap-primary);
}

.qap-toggle input:checked + .qap-toggle-track::after {
  transform: translateX(1.15rem);
}

.qap-identity {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem;
  align-items: start;
}

.qap-avatar {
  position: relative;
  width: 88px;
  height: 88px;
  margin-top: 0.35rem;
  border-radius: var(--cf-radius-control);
  border: 2px dashed rgba(139, 150, 124, 0.55);
  background: var(--qap-primary-soft);
  display: grid;
  place-items: center;
  cursor: pointer;
  overflow: hidden;
  flex-shrink: 0;
}

.qap-avatar--filled {
  border-style: solid;
  border-color: var(--qap-primary);
}

.qap-avatar-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.qap-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.qap-avatar-placeholder {
  display: grid;
  place-items: center;
  gap: 0.2rem;
  color: var(--qap-primary);
  font-size: 0.72rem;
  pointer-events: none;
}

.qap-avatar-clear {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 2;
  width: 1.4rem;
  height: 1.4rem;
  border: none;
  border-radius: 999px;
  background: rgba(28, 32, 28, 0.72);
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.qap-identity-fields,
.qap-grid {
  display: grid;
  gap: 0.85rem;
  min-width: 0;
}

.qap-identity-fields {
  grid-template-columns: 1fr;
}

.qap-grid--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.qap-grid--phone {
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  align-items: start;
}

.qap-grid--location {
  grid-template-columns: minmax(0, 1.3fr) 96px minmax(0, 1fr) minmax(0, 1fr);
}

.qap-grid--flags {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr);
  align-items: end;
}

.qap-grid--access {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.qap-duration-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.75rem;
}

.qap-duration-chip {
  border: 1.5px solid #e8ece9;
  background: #fff;
  color: #444;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.4rem 0.75rem;
  border-radius: var(--cf-radius-control);
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.qap-duration-chip:hover {
  border-color: #d4e5d1;
}

.qap-duration-chip--active {
  border-color: var(--qap-primary);
  background: var(--qap-primary-soft);
  color: #2c322c;
}

.qap-grid--address-top {
  grid-template-columns: minmax(0, 0.7fr) minmax(0, 1.3fr);
}

.qap-cep-hint {
  margin: 0.35rem 0 0;
  font-size: 0.75rem;
  color: #6b7368;
}

.qap-cep-hint--error {
  color: #c53030;
}

.qap-grid--address-bottom {
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 0.6fr);
}

.qap-advanced {
  margin-top: 0.15rem;
  padding-top: 0.35rem;
  border-top: 1px solid #eef1ee;
}

.qap-advanced-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0.15rem 0 0.35rem;
  padding: 0.25rem 0;
  border: none;
  background: transparent;
  color: var(--qap-primary);
  font: inherit;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
}

.qap-advanced-chevron {
  width: 1rem;
  height: 1rem;
}

.qap-advanced-body {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding-bottom: 0.25rem;
}

.qap-advanced-divider {
  height: 1px;
  background: #eef1ee;
  margin: 0.15rem 0;
}

.qap-grid .field,
.qap-identity-fields .field,
.qap-block .field,
.qap-body > .field {
  min-width: 0;
}

.qap-tags-block {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.qap-tags-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #6b7368;
}

.qap-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem 1rem;
  padding: 0.85rem 0.25rem 0.55rem;
}

.qap-check {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.88rem;
  color: #2c322c;
  cursor: pointer;
  user-select: none;
}

.qap-check-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

.qap-check-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
  border: 1.5px solid #e8ece9;
  border-radius: 0.4rem;
  background: #fff;
  color: transparent;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.qap-check-icon {
  width: 0.78rem;
  height: 0.78rem;
  stroke-width: 3;
}

.qap-check-label {
  font-size: 0.88rem;
  font-weight: 500;
  color: #2c322c;
}

.qap-check-input:checked + .qap-check-box {
  background: var(--qap-primary);
  border-color: var(--qap-primary);
  color: #fff;
}

.qap-check-input:focus-visible + .qap-check-box {
  border-color: #b8d4b4;
}

.qap-check:hover .qap-check-box {
  border-color: #d4e5d1;
}

.qap-toggle-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #6b7368;
  min-width: 2.4rem;
}

.create-error {
  margin: 0.25rem 0 0;
  color: #c53030;
  font-size: 0.88rem;
}

.qap-modal .modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  flex-shrink: 0;
  margin: 0;
  padding: 0.95rem clamp(1.25rem, 3vw, 2.5rem) calc(1.15rem + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid #eef1ee;
  background: #fff;
}

.qap-modal .modal-submit {
  margin: 0;
}

@media (max-width: 720px) {
  .qap-modal {
    height: 100dvh;
    max-height: 100dvh;
    border-radius: var(--cf-radius-control) var(--cf-radius-control) 0 0 !important;
  }

  .qap-identity {
    grid-template-columns: 1fr;
    justify-items: center;
  }

  .qap-identity-fields {
    width: 100%;
  }

  .qap-grid--3,
  .qap-grid--phone,
  .qap-grid--location,
  .qap-grid--flags,
  .qap-grid--access,
  .qap-grid--address-top,
  .qap-grid--address-bottom {
    grid-template-columns: 1fr;
  }

  .qap-welcome-head {
    flex-direction: column;
  }

  .qap-modal .modal-actions {
    flex-direction: column-reverse;
  }

  .qap-modal .modal-actions .btn-secondary,
  .qap-modal .modal-actions .btn-primary {
    width: 100%;
  }
}
</style>
