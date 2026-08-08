<template>
  <section class="pp-extra">
    <div class="pp-extra__list">
      <div
        v-for="section in sections"
        :key="section.id"
        class="pp-extra__block"
      >
        <button
          type="button"
          class="pp-extra__toggle"
          :aria-expanded="openSections[section.id]"
          @click="toggleSection(section.id)"
        >
          <span class="pp-extra__toggle-title">{{ section.title }}</span>
          <span class="pp-extra__toggle-end">
            <span v-if="!openSections[section.id]" class="pp-extra__toggle-summary">{{ section.summary }}</span>
            <ChevronDown
              class="pp-extra__chevron"
              :class="{ 'pp-extra__chevron--open': openSections[section.id] }"
              aria-hidden="true"
            />
          </span>
        </button>

        <div v-if="openSections[section.id]" class="pp-extra__panel">
          <!-- Contatos adicionais -->
          <template v-if="section.id === 'additionalContacts'">
            <div
              v-for="(row, index) in form.additionalContacts"
              :key="row._key"
              class="pp-extra__row pp-extra__row--3"
            >
              <div class="field field--float">
                <label :for="`pp-add-type-${row._key}`">Tipo</label>
                <SharedCfSelect
                  :id="`pp-add-type-${row._key}`"
                  v-model="row.type"
                  :options="CONTACT_TYPE_OPTIONS"
                  placeholder="Selecione"
                />
              </div>
              <div class="field field--float">
                <label :for="`pp-add-number-${row._key}`">Número</label>
                <input
                  :id="`pp-add-number-${row._key}`"
                  v-model="row.number"
                  type="text"
                  :placeholder="row.type ? 'Digite' : 'Selecione o tipo'"
                >
              </div>
              <button
                type="button"
                class="pp-extra__remove"
                aria-label="Remover contato"
                @click="removeRow('additionalContacts', index)"
              >
                <Trash2 :size="17" />
              </button>
            </div>
            <button type="button" class="pp-extra__link" @click="addAdditionalContact">
              <Plus :size="15" /> Adicionar contato
            </button>
          </template>

          <!-- Contatos de emergência -->
          <template v-else-if="section.id === 'emergencyContacts'">
            <div class="pp-extra__panel-actions">
              <button type="button" class="pp-extra__link" @click="addEmergencyContact">
                <Plus :size="15" /> Adicionar
              </button>
            </div>
            <div
              v-for="(row, index) in form.emergencyContacts"
              :key="row._key"
              class="pp-extra__row pp-extra__row--3"
            >
              <div class="field field--float">
                <label :for="`pp-em-rel-${row._key}`">Parentesco <span class="pp-extra__req">*</span></label>
                <SharedCfSelect
                  :id="`pp-em-rel-${row._key}`"
                  v-model="row.relationship"
                  :options="RELATIONSHIP_OPTIONS"
                  placeholder="Selecione"
                />
              </div>
              <div class="field field--float">
                <label :for="`pp-em-user-${row._key}`">Responsável</label>
                <SharedCfSelect
                  :id="`pp-em-user-${row._key}`"
                  v-model="row.contactUserId"
                  :options="patientOptions"
                  placeholder="Pesquise/Selecione"
                  @update:model-value="onEmergencyUserPick(row)"
                />
              </div>
              <button
                type="button"
                class="pp-extra__remove"
                aria-label="Remover contato de emergência"
                @click="removeRow('emergencyContacts', index)"
              >
                <Trash2 :size="17" />
              </button>
            </div>
          </template>

          <!-- Responsável -->
          <template v-else-if="section.id === 'guardians'">
            <div class="pp-extra__toggle-row">
              <label class="pp-extra__switch">
                <input v-model="form.guardianEnabled" type="checkbox" class="pp-extra__switch-input">
                <span class="pp-extra__switch-track" aria-hidden="true" />
              </label>
              <span class="pp-extra__switch-label">Habilitar responsável</span>
              <span class="qap-tip-wrap">
                <button type="button" class="qap-tip-trigger" aria-label="Informação sobre responsável">
                  <HelpCircle class="qap-tip-icon" aria-hidden="true" />
                </button>
                <span role="tooltip" class="qap-tip">
                  Ao habilitar, este paciente passa a ter uma pessoa responsável
                </span>
              </span>
            </div>

            <template v-if="form.guardianEnabled">
              <div class="pp-extra__panel-actions">
                <button type="button" class="pp-extra__link" @click="addGuardian">
                  <Plus :size="15" /> Adicionar
                </button>
              </div>
              <div
                v-for="(row, index) in form.guardians"
                :key="row._key"
                class="pp-extra__row pp-extra__row--2"
              >
                <div class="field field--float">
                  <label :for="`pp-guard-rel-${row._key}`">Parentesco <span class="pp-extra__req">*</span></label>
                  <SharedCfSelect
                    :id="`pp-guard-rel-${row._key}`"
                    v-model="row.relationship"
                    :options="RELATIONSHIP_OPTIONS"
                    placeholder="Selecione"
                  />
                </div>
                <div class="field field--float pp-extra__field-with-remove">
                  <label :for="`pp-guard-user-${row._key}`">Responsável</label>
                  <SharedCfSelect
                    :id="`pp-guard-user-${row._key}`"
                    v-model="row.contactUserId"
                    :options="patientOptions"
                    placeholder="Pesquise/Selecione"
                    @update:model-value="onGuardianUserPick(row)"
                  />
                  <button
                    type="button"
                    class="pp-extra__remove pp-extra__remove--corner"
                    aria-label="Remover responsável"
                    @click="removeRow('guardians', index)"
                  >
                    <Trash2 :size="17" />
                  </button>
                </div>
              </div>
            </template>
          </template>

          <!-- Documentos -->
          <template v-else-if="section.id === 'identityDocuments'">
            <div
              v-for="(row, index) in form.identityDocuments"
              :key="row._key"
              class="pp-extra__row pp-extra__row--3"
            >
              <div class="field field--float">
                <label :for="`pp-doc-type-${row._key}`">Tipo</label>
                <SharedCfSelect
                  :id="`pp-doc-type-${row._key}`"
                  v-model="row.type"
                  :options="IDENTITY_DOC_TYPE_OPTIONS"
                  placeholder="Selecione"
                />
              </div>
              <div class="field field--float">
                <label :for="`pp-doc-number-${row._key}`">Número</label>
                <input
                  :id="`pp-doc-number-${row._key}`"
                  v-model="row.number"
                  type="text"
                  :placeholder="row.type ? 'Digite' : 'Selecione o tipo'"
                >
              </div>
              <button
                type="button"
                class="pp-extra__remove"
                aria-label="Remover documento"
                @click="removeRow('identityDocuments', index)"
              >
                <Trash2 :size="17" />
              </button>
            </div>
            <button type="button" class="pp-extra__link" @click="addIdentityDocument">
              <Plus :size="15" /> Adicionar documento
            </button>
          </template>

          <!-- Notificações -->
          <template v-else-if="section.id === 'notifications'">
            <div class="pp-extra__notify-row">
              <label v-for="channel in notifyChannels" :key="channel.key" class="pp-extra__notify">
                <input v-model="form[channel.key]" type="checkbox" class="pp-extra__switch-input">
                <span class="pp-extra__switch-track" aria-hidden="true" />
                <span>{{ channel.label }}</span>
              </label>
            </div>
          </template>

          <!-- Endereço -->
          <template v-else-if="section.id === 'address'">
            <div class="pp-extra__row pp-extra__row--2">
              <div class="field field--float">
                <label for="pp-country">País</label>
                <SharedCfSelect id="pp-country" v-model="form.country" :options="COUNTRY_OPTIONS" />
              </div>
              <div class="field field--float pp-extra__cep-field">
                <label for="pp-zip">Código postal <span class="pp-extra__req">*</span></label>
                <input
                  id="pp-zip"
                  :value="form.zipCode"
                  inputmode="numeric"
                  placeholder="00000-000"
                  maxlength="9"
                  @input="onCepInput"
                >
                <button type="button" class="pp-extra__cep-link" @click="triggerCepLookup">
                  Buscar CEP
                </button>
                <p v-if="lookingUpCep" class="pp-extra__hint">Buscando endereço…</p>
                <p v-else-if="cepLookupError" class="pp-extra__hint pp-extra__hint--error">{{ cepLookupError }}</p>
              </div>
            </div>
            <div class="pp-extra__row pp-extra__row--2">
              <div class="field field--float">
                <label for="pp-state">Estado <span class="pp-extra__req">*</span></label>
                <SharedCfSelect id="pp-state" v-model="form.state" :options="stateOptions" placeholder="Selecione" />
              </div>
              <div class="field field--float">
                <label for="pp-city">Cidade <span class="pp-extra__req">*</span></label>
                <input id="pp-city" v-model="form.city" placeholder="Digite">
              </div>
            </div>
            <div class="pp-extra__row pp-extra__row--2">
              <div class="field field--float">
                <label for="pp-neighborhood">Bairro <span class="pp-extra__req">*</span></label>
                <input id="pp-neighborhood" v-model="form.neighborhood" placeholder="Digite">
              </div>
              <div class="field field--float">
                <label for="pp-street">Rua <span class="pp-extra__req">*</span></label>
                <input id="pp-street" v-model="form.street" placeholder="Digite">
              </div>
            </div>
            <div class="pp-extra__row pp-extra__row--2">
              <div class="field field--float">
                <label for="pp-street-number">Número <span class="pp-extra__req">*</span></label>
                <input id="pp-street-number" v-model="form.streetNumber" placeholder="Digite">
              </div>
              <div class="field field--float">
                <label for="pp-complement">Complemento</label>
                <input id="pp-complement" v-model="form.addressComplement" placeholder="Digite">
              </div>
            </div>
          </template>

          <!-- Anexos -->
          <template v-else-if="section.id === 'attachments'">
            <div
              class="pp-extra__dropzone"
              :class="{ 'pp-extra__dropzone--drag': dragActive }"
              @dragover.prevent="dragActive = true"
              @dragleave.prevent="dragActive = false"
              @drop.prevent="onDropFiles"
            >
              <CloudUpload :size="24" aria-hidden="true" />
              <p class="pp-extra__drop-text">Arraste arquivos aqui ou</p>
              <button type="button" class="pp-extra__drop-btn" @click="triggerFilePick">
                Escolher arquivos
              </button>
              <p class="pp-extra__drop-hint">PDF, imagens e documentos — até {{ documentMaxLabel }}</p>
              <input
                ref="fileInputRef"
                type="file"
                multiple
                class="pp-extra__file-input"
                @change="onFilePick"
              >
            </div>
            <ul v-if="form.profileAttachments.length" class="pp-extra__files">
              <li v-for="(file, index) in form.profileAttachments" :key="file._key">
                <span class="pp-extra__file-name">{{ file.name }}</span>
                <span v-if="file.file && !file.url" class="pp-extra__file-pending">pendente</span>
                <button
                  type="button"
                  class="pp-extra__remove pp-extra__remove--inline"
                  aria-label="Remover anexo"
                  @click="removeRow('profileAttachments', index)"
                >
                  <Trash2 :size="16" />
                </button>
              </li>
            </ul>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ChevronDown, CloudUpload, HelpCircle, Plus, Trash2 } from 'lucide-vue-next'
import { authFetchInit } from '~/composables/useAuthSession.js'
import { useDocumentUploadLimits } from '~/composables/useUploadConfig'
import {
  CONTACT_TYPE_OPTIONS,
  COUNTRY_OPTIONS,
  IDENTITY_DOC_TYPE_OPTIONS,
  RELATIONSHIP_OPTIONS,
  createAdditionalContactRow,
  createAttachmentRow,
  createEmergencyContactRow,
  createGuardianRow,
  createIdentityDocumentRow,
  notificationSummary,
} from '~/utils/patient-profile-extra.js'

const props = defineProps({
  form: { type: Object, required: true },
  stateOptions: { type: Array, default: () => [] },
  excludeUserId: { type: String, default: '' },
  lookingUpCep: { type: Boolean, default: false },
  cepLookupError: { type: String, default: '' },
  onCepInput: { type: Function, default: null },
})

const apiBase = useApiBase()
const { documentMaxLabel } = useDocumentUploadLimits()
const fileInputRef = ref(null)
const dragActive = ref(false)
const patientOptions = ref([{ value: '', label: 'Pesquise/Selecione' }])
const patientsLoaded = ref(false)

const openSections = reactive({
  additionalContacts: false,
  emergencyContacts: false,
  guardians: false,
  identityDocuments: false,
  notifications: false,
  address: false,
  attachments: false,
})

const notifyChannels = [
  { key: 'notifyEmail', label: 'E-mail' },
  { key: 'notifySms', label: 'SMS' },
  { key: 'notifyWhatsapp', label: 'WhatsApp' },
]

const sections = computed(() => [
  {
    id: 'additionalContacts',
    title: 'Contatos adicionais',
    summary: props.form.additionalContacts?.length
      ? `${props.form.additionalContacts.length} contato(s)`
      : 'Sem contatos adicionais',
  },
  {
    id: 'emergencyContacts',
    title: 'Contatos de emergência',
    summary: props.form.emergencyContacts?.length
      ? `${props.form.emergencyContacts.length} contato(s)`
      : 'Sem contatos de emergência',
  },
  {
    id: 'guardians',
    title: 'Responsável',
    summary: props.form.guardianEnabled
      ? `${props.form.guardians?.length || 0} responsável(is)`
      : 'Sem responsável',
  },
  {
    id: 'identityDocuments',
    title: 'Documentos',
    summary: props.form.identityDocuments?.length
      ? `${props.form.identityDocuments.length} documento(s)`
      : 'Nenhum documento cadastrado',
  },
  {
    id: 'notifications',
    title: 'Notificações',
    summary: notificationSummary(props.form),
  },
  {
    id: 'address',
    title: 'Endereço',
    summary: props.form.city && props.form.state
      ? `${props.form.city} — ${props.form.state}`
      : 'Endereço não informado',
  },
  {
    id: 'attachments',
    title: 'Anexos',
    summary: props.form.profileAttachments?.length
      ? `${props.form.profileAttachments.length} arquivo(s)`
      : 'Nenhum anexo',
  },
])

function toggleSection(id) {
  openSections[id] = !openSections[id]
  if (!patientsLoaded.value && (id === 'emergencyContacts' || id === 'guardians')) {
    loadPatients()
  }
}

async function loadPatients() {
  try {
    const users = await $fetch(`${apiBase.value}/users`, authFetchInit())
    const options = (Array.isArray(users) ? users : [])
      .filter((entry) => entry?.role === 'PACIENTE' && entry.id !== props.excludeUserId)
      .map((entry) => ({ value: entry.id, label: entry.name || 'Paciente' }))
    patientOptions.value = [{ value: '', label: 'Pesquise/Selecione' }, ...options]
    patientsLoaded.value = true
  } catch {
    patientOptions.value = [{ value: '', label: 'Pesquise/Selecione' }]
  }
}

function onEmergencyUserPick(row) {
  const match = patientOptions.value.find((item) => item.value === row.contactUserId)
  row.contactName = match?.label || ''
}

function onGuardianUserPick(row) {
  const match = patientOptions.value.find((item) => item.value === row.contactUserId)
  row.contactName = match?.label || ''
}

function addAdditionalContact() {
  props.form.additionalContacts.push(createAdditionalContactRow())
}

function addEmergencyContact() {
  props.form.emergencyContacts.push(createEmergencyContactRow())
  if (!patientsLoaded.value) loadPatients()
}

function addGuardian() {
  props.form.guardians.push(createGuardianRow())
  if (!patientsLoaded.value) loadPatients()
}

function addIdentityDocument() {
  props.form.identityDocuments.push(createIdentityDocumentRow())
}

function removeRow(field, index) {
  props.form[field].splice(index, 1)
}

function triggerCepLookup() {
  const digits = String(props.form.zipCode || '').replace(/\D/g, '')
  if (digits.length === 8 && props.onCepInput) {
    props.onCepInput({ target: { value: props.form.zipCode } })
  }
}

function triggerFilePick() {
  fileInputRef.value?.click()
}

function appendFiles(fileList) {
  const files = Array.from(fileList || [])
  for (const file of files) {
    props.form.profileAttachments.push(createAttachmentRow(file))
  }
}

function onFilePick(event) {
  appendFiles(event.target.files)
  if (event.target) event.target.value = ''
}

function onDropFiles(event) {
  dragActive.value = false
  appendFiles(event.dataTransfer?.files)
}
</script>

<style scoped>
.pp-extra {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.pp-extra__list {
  border-top: 1px solid #e5e7eb;
}

.pp-extra__block + .pp-extra__block {
  border-top: 1px solid #e5e7eb;
}

.pp-extra__toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  padding: 0.8rem 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.pp-extra__toggle-title {
  font: inherit;
  font-size: 0.875rem;
  font-weight: 700;
  color: #111827;
}

.pp-extra__toggle-end {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
}

.pp-extra__toggle-summary {
  font-size: 0.8125rem;
  color: #9ca3af;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 11rem;
}

.pp-extra__chevron {
  width: 1rem;
  height: 1rem;
  color: #6b7280;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.pp-extra__chevron--open {
  transform: rotate(180deg);
}

.pp-extra__panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-bottom: 0.85rem;
}

.pp-extra__panel-actions {
  display: flex;
  justify-content: flex-end;
}

.pp-extra__row {
  display: grid;
  gap: 0.65rem;
  align-items: end;
}

.pp-extra__row--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.pp-extra__row--3 {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) auto;
}

.pp-extra__field-with-remove {
  position: relative;
  padding-right: 1.75rem;
}

.pp-extra__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2.65rem;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  border-radius: var(--cf-radius-control);
}

.pp-extra__remove:hover {
  color: #ef4444;
}

.pp-extra__remove--corner {
  position: absolute;
  top: 1.65rem;
  right: 0;
  height: 2rem;
}

.pp-extra__remove--inline {
  width: 1.75rem;
  height: 1.75rem;
}

.pp-extra__link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border: none;
  background: transparent;
  color: var(--qap-accent, #8b967c);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.pp-extra__link:hover {
  color: var(--qap-accent-hover, #6f7863);
}

.pp-extra__req {
  color: #dc2626;
}

.pp-extra__toggle-row,
.pp-extra__notify-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.25rem;
}

.pp-extra__switch,
.pp-extra__notify {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  cursor: pointer;
  user-select: none;
}

.pp-extra__switch-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.pp-extra__switch-track {
  width: 2.55rem;
  height: 1.4rem;
  border-radius: var(--cf-radius-pill);
  background: #d1d5db;
  position: relative;
  transition: background 0.2s ease;
  flex-shrink: 0;
}

.pp-extra__switch-track::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 1.08rem;
  height: 1.08rem;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease;
}

.pp-extra__switch-input:checked + .pp-extra__switch-track {
  background: #6ee7a5;
}

.pp-extra__switch-input:checked + .pp-extra__switch-track::after {
  transform: translateX(1.12rem);
}

.pp-extra__switch-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.qap-tip-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.qap-tip-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: help;
  padding: 0;
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

.pp-extra__cep-field {
  position: relative;
}

.pp-extra__cep-link {
  position: absolute;
  right: 0.65rem;
  top: 1.85rem;
  border: none;
  background: transparent;
  color: var(--qap-accent, #8b967c);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.pp-extra__hint {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: #6b7280;
}

.pp-extra__hint--error {
  color: #dc2626;
}

.pp-extra__dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 1rem;
  border: 1.5px dashed #d1d5db;
  border-radius: var(--cf-radius-control);
  background: #fafafa;
  color: var(--qap-accent, #8b967c);
  text-align: center;
}

.pp-extra__dropzone--drag {
  border-color: var(--qap-accent, #8b967c);
  background: rgba(139, 150, 124, 0.06);
}

.pp-extra__drop-text {
  margin: 0;
  font-size: 0.8125rem;
  color: #6b7280;
}

.pp-extra__drop-hint {
  margin: 0;
  font-size: 0.6875rem;
  color: #9ca3af;
}

.pp-extra__drop-btn {
  border: none;
  background: var(--qap-accent-soft, rgba(139, 150, 124, 0.14));
  color: var(--qap-accent, #8b967c);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  padding: 0.4rem 0.75rem;
  border-radius: var(--cf-radius-control);
  cursor: pointer;
}

.pp-extra__file-input {
  display: none;
}

.pp-extra__files {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.pp-extra__files li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: #374151;
}

.pp-extra__file-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pp-extra__file-pending {
  font-size: 0.6875rem;
  color: #9ca3af;
}

@media (max-width: 640px) {
  .pp-extra__row--2,
  .pp-extra__row--3 {
    grid-template-columns: 1fr;
  }

  .pp-extra__toggle-summary {
    display: none;
  }
}
</style>
