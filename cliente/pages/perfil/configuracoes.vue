<template>
  <div class="patient-page config-page">
    <PatientHeader />

    <section class="config-profile" aria-labelledby="config-profile-title">
      <label
        class="config-avatar-control"
        :class="{ 'config-avatar-control--uploading': avatarUploading }"
        aria-label="Alterar foto do perfil"
      >
        <PatientAvatar
          size="lg"
          :src="avatarUrl"
          :name="fullName"
          :interactive="!avatarUploading"
        />
        <span class="config-avatar-edit" aria-hidden="true">
          <Loader2 v-if="avatarUploading" class="config-spinner" />
          <Camera v-else />
        </span>
        <input
          type="file"
          name="settings-avatar"
          accept="image/jpeg,image/png,image/webp"
          class="config-avatar-input"
          :disabled="avatarUploading"
          @change="onAvatarSelected"
        />
      </label>
      <div class="config-profile-copy">
        <div v-if="!editingName" class="config-name-row">
          <h1 id="config-profile-title">{{ fullName }}</h1>
          <button
            type="button"
            class="config-name-edit-btn"
            aria-label="Editar nome"
            @click="startEditName"
          >
            <Pencil />
            <span>Editar</span>
          </button>
        </div>
        <form
          v-else
          class="config-name-edit"
          @submit.prevent="saveName"
        >
          <label class="sr-only" for="config-profile-name">Nome completo</label>
          <input
            id="config-profile-name"
            ref="nameInputRef"
            v-model="nameDraft"
            type="text"
            maxlength="120"
            autocomplete="name"
            required
            :disabled="nameSaving"
            @keydown.escape.prevent="cancelEditName"
          >
          <div class="config-name-actions">
            <button
              type="button"
              class="config-name-btn config-name-btn--ghost"
              :disabled="nameSaving"
              @click="cancelEditName"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="config-name-btn config-name-btn--primary"
              :disabled="nameSaving || !nameDraftTrimmed"
            >
              <Loader2 v-if="nameSaving" class="config-spinner" />
              <span>{{ nameSaving ? 'Salvando…' : 'Salvar' }}</span>
            </button>
          </div>
        </form>
        <p>{{ accountEmail || 'Conta do Clube Florescer' }}</p>
        <span
          v-if="profileMessage"
          :class="{ 'config-error': profileError }"
          aria-live="polite"
        >
          {{ profileMessage }}
        </span>
      </div>
    </section>

    <section class="config-section" aria-labelledby="config-push-title">
      <div class="config-section-head">
        <span class="config-section-icon" aria-hidden="true"><Bell /></span>
        <div>
          <h2 id="config-push-title">Notificações no celular</h2>
          <p>Controle a permissão deste dispositivo.</p>
        </div>
      </div>
      <div class="config-surface config-push">
        <PatientPushSettings />
      </div>
    </section>

    <section class="config-section" aria-labelledby="config-reminders-title">
      <div class="config-section-head">
        <span class="config-section-icon" aria-hidden="true"><SlidersHorizontal /></span>
        <div>
          <h2 id="config-reminders-title">Lembretes</h2>
          <p>Escolha quais avisos deseja receber.</p>
        </div>
      </div>
      <div class="config-surface">
        <button
          v-for="item in preferences"
          :key="item.key"
          type="button"
          class="config-toggle-row"
          role="switch"
          :aria-checked="item.enabled"
          @click="togglePreference(item.key)"
        >
          <span>{{ item.label }}</span>
          <span class="config-switch" :class="{ 'config-switch--on': item.enabled }" aria-hidden="true">
            <span />
          </span>
        </button>
      </div>
    </section>

    <section class="config-section" aria-labelledby="config-security-title">
      <div class="config-section-head">
        <span class="config-section-icon" aria-hidden="true"><ShieldCheck /></span>
        <div>
          <h2 id="config-security-title">Conta e segurança</h2>
          <p>Acesso, privacidade e documentos.</p>
        </div>
      </div>
      <nav class="config-surface" aria-label="Conta e segurança">
        <NuxtLink to="/esqueci-senha" class="config-link">
          <span>
            <strong>Alterar senha</strong>
            <small>Receba um link seguro por e-mail</small>
          </span>
          <ChevronRight aria-hidden="true" />
        </NuxtLink>
        <NuxtLink to="/legal/privacidade" class="config-link">
          <span>
            <strong>Política de privacidade</strong>
            <small>Veja como seus dados são tratados</small>
          </span>
          <ChevronRight aria-hidden="true" />
        </NuxtLink>
        <NuxtLink to="/legal/termos" class="config-link">
          <span>
            <strong>Termos de uso</strong>
            <small>Condições do Clube Florescer</small>
          </span>
          <ChevronRight aria-hidden="true" />
        </NuxtLink>
      </nav>
    </section>

    <section class="config-section" aria-labelledby="config-app-title">
      <div class="config-section-head">
        <span class="config-section-icon" aria-hidden="true"><Smartphone /></span>
        <div>
          <h2 id="config-app-title">Sobre o app</h2>
          <p>Informações desta instalação.</p>
        </div>
      </div>
      <dl class="config-surface config-about">
        <div><dt>Tema</dt><dd>Claro</dd></div>
        <div><dt>Idioma</dt><dd>Português</dd></div>
        <div><dt>Versão</dt><dd>1.0.0</dd></div>
      </dl>
    </section>
  </div>
</template>

<script setup>
import {
  Bell,
  Camera,
  ChevronRight,
  Loader2,
  Pencil,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
} from 'lucide-vue-next'

definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const PREFERENCES_KEY = 'cf-profile-notification-preferences-v1'
const DEFAULT_PREFERENCES = [
  { key: 'checkin', label: 'Check-in semanal', enabled: true },
  { key: 'content', label: 'Novos conteúdos', enabled: true },
  { key: 'bella', label: 'Mensagens da Bella', enabled: false },
  { key: 'community', label: 'Atividade na comunidade', enabled: true },
]

const { verifiedUser } = useAuthSession()
const {
  userFullName,
  userAvatar,
  syncPatientProfile,
  uploadProfileAvatar,
  updateProfileName,
} = usePatientApp()

const fullName = computed(() => userFullName())
const avatarUrl = computed(() => userAvatar())
const accountEmail = computed(() => verifiedUser.value?.email || '')
const preferences = ref(DEFAULT_PREFERENCES.map((item) => ({ ...item })))
const avatarUploading = ref(false)
const profileMessage = ref('')
const profileError = ref(false)

const editingName = ref(false)
const nameDraft = ref('')
const nameSaving = ref(false)
const nameInputRef = ref(null)
const nameDraftTrimmed = computed(() => String(nameDraft.value || '').replace(/\s+/g, ' ').trim())

onMounted(async () => {
  loadPreferences()
  await syncPatientProfile()
})

function startEditName() {
  nameDraft.value = fullName.value === 'Paciente' ? '' : fullName.value
  editingName.value = true
  profileMessage.value = ''
  profileError.value = false
  nextTick(() => {
    nameInputRef.value?.focus?.()
    nameInputRef.value?.select?.()
  })
}

function cancelEditName() {
  if (nameSaving.value) return
  editingName.value = false
  nameDraft.value = ''
}

async function saveName() {
  const nextName = nameDraftTrimmed.value
  if (nextName.length < 2) {
    profileError.value = true
    profileMessage.value = 'Informe um nome com pelo menos 2 caracteres.'
    return
  }

  nameSaving.value = true
  profileError.value = false
  profileMessage.value = ''
  try {
    await updateProfileName(nextName)
    editingName.value = false
    nameDraft.value = ''
    profileMessage.value = 'Nome atualizado.'
  } catch (error) {
    profileError.value = true
    profileMessage.value = error?.data?.message || 'Não foi possível atualizar o nome.'
  } finally {
    nameSaving.value = false
  }
}

function loadPreferences() {
  if (!import.meta.client) return
  try {
    const stored = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || '{}')
    preferences.value = DEFAULT_PREFERENCES.map((item) => ({
      ...item,
      enabled: typeof stored[item.key] === 'boolean' ? stored[item.key] : item.enabled,
    }))
  } catch {
    preferences.value = DEFAULT_PREFERENCES.map((item) => ({ ...item }))
  }
}

function persistPreferences() {
  if (!import.meta.client) return
  const data = Object.fromEntries(preferences.value.map((item) => [item.key, item.enabled]))
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(data))
}

function togglePreference(key) {
  const item = preferences.value.find((preference) => preference.key === key)
  if (!item) return
  item.enabled = !item.enabled
  persistPreferences()
}

async function onAvatarSelected(event) {
  const input = event.target
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    profileError.value = true
    profileMessage.value = 'Escolha uma imagem JPG, PNG ou WEBP.'
    return
  }

  if (file.size > 8 * 1024 * 1024) {
    profileError.value = true
    profileMessage.value = 'A imagem deve ter no máximo 8 MB.'
    return
  }

  profileError.value = false
  profileMessage.value = ''
  avatarUploading.value = true
  try {
    await uploadProfileAvatar(file)
    profileMessage.value = 'Foto atualizada.'
  } catch (error) {
    profileError.value = true
    profileMessage.value = error?.data?.message || 'Não foi possível atualizar a foto.'
  } finally {
    avatarUploading.value = false
  }
}
</script>

<style scoped>
.config-page {
  padding-top: 0;
  padding-bottom: calc(6rem + env(safe-area-inset-bottom, 0px));
  background: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', var(--cf-font);
}

.config-page :deep(.cf-header) {
  margin-inline: calc(-1 * var(--cf-page-pad-x));
  background: #fff;
}

.config-profile {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin: 0.35rem 0 1.65rem;
  padding: 0.9rem;
  border: 1px solid #e5e5ea;
  border-radius: 1rem;
  background: #fff;
}

.config-avatar-control {
  position: relative;
  display: block;
  cursor: pointer;
  flex-shrink: 0;
  touch-action: manipulation;
}

.config-avatar-control--uploading {
  cursor: wait;
  pointer-events: none;
}

.config-avatar-input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.config-avatar-edit {
  position: absolute;
  right: -0.15rem;
  bottom: -0.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.55rem;
  height: 1.55rem;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #88977c;
  color: #fff;
}

.config-avatar-edit svg {
  width: 0.72rem;
  height: 0.72rem;
  stroke-width: 2;
}

.config-spinner {
  animation: config-spin 0.8s linear infinite;
}

@keyframes config-spin {
  to { transform: rotate(360deg); }
}

.config-profile-copy {
  min-width: 0;
  flex: 1;
}

.config-name-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.config-profile-copy h1 {
  overflow: hidden;
  margin: 0;
  min-width: 0;
  flex: 1;
  color: #242426;
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.config-name-edit-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  flex-shrink: 0;
  margin: 0;
  padding: 0.28rem 0.55rem;
  border: 1px solid #e5e5ea;
  border-radius: var(--cf-radius-control, 0.65rem);
  background: #f7f7f8;
  color: #5d6556;
  font-family: inherit;
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.config-name-edit-btn svg {
  width: 0.72rem;
  height: 0.72rem;
  stroke-width: 2.2;
}

.config-name-edit {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  width: 100%;
  min-width: 0;
}

.config-name-edit input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  margin: 0;
  padding: 0.55rem 0.7rem;
  border: 1.5px solid #e5e5ea;
  border-radius: var(--cf-radius-control, 0.65rem);
  background: #fff;
  color: #242426;
  font-family: inherit;
  font-size: max(16px, 0.88rem);
  line-height: 1.3;
  outline: none;
}

.config-name-edit input:focus {
  border-color: #a8b39a;
  box-shadow: 0 0 0 3px rgba(126, 140, 114, 0.14);
}

.config-name-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.4rem;
}

.config-name-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  min-height: 2rem;
  margin: 0;
  padding: 0.35rem 0.7rem;
  border: none;
  border-radius: var(--cf-radius-control, 0.65rem);
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.config-name-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.config-name-btn--ghost {
  background: transparent;
  color: #6e6e73;
}

.config-name-btn--primary {
  background: #7e8c72;
  color: #fff;
}

.config-name-btn--primary .config-spinner {
  width: 0.85rem;
  height: 0.85rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.config-profile-copy p {
  overflow: hidden;
  margin: 0.18rem 0 0;
  color: #6e6e73;
  font-size: 0.7rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.config-profile-copy > span {
  display: block;
  margin-top: 0.32rem;
  color: #5d7555;
  font-size: 0.65rem;
}

.config-profile-copy > .config-error {
  color: #b34242;
}

.config-section {
  margin-bottom: 1.5rem;
}

.config-section-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0 0 0.6rem 0.1rem;
}

.config-section-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 50%;
  background: #f1f3ef;
  color: #75806c;
  flex-shrink: 0;
}

.config-section-icon svg {
  width: 0.85rem;
  height: 0.85rem;
  stroke-width: 1.8;
}

.config-section-head h2 {
  margin: 0;
  color: #242426;
  font-size: 0.78rem;
  font-weight: 500;
  line-height: 1.3;
}

.config-section-head p {
  margin: 0.1rem 0 0;
  color: #77777d;
  font-size: 0.62rem;
  line-height: 1.35;
}

.config-surface {
  overflow: hidden;
  border: 1px solid #e5e5ea;
  border-radius: 1rem;
  background: #fff;
}

.config-push {
  padding: 0.85rem;
}

.config-push :deep(.push-settings) {
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.config-push :deep(.push-settings-copy h3) {
  display: none;
}

.config-push :deep(.push-settings-copy p) {
  font-size: 0.68rem;
  font-weight: 400;
}

.config-push :deep(.push-settings-btn),
.config-push :deep(.push-meal-label) {
  font-weight: 500;
}

.config-toggle-row {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  min-height: 3.25rem;
  padding: 0.6rem 0.85rem;
  border: 0;
  background: #fff;
  color: #2b2b2e;
  font-family: inherit;
  font-size: 0.76rem;
  font-weight: 400;
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.config-toggle-row + .config-toggle-row::before,
.config-link + .config-link::before,
.config-about > div + div::before {
  position: absolute;
  top: 0;
  right: 0.85rem;
  left: 0.85rem;
  height: 1px;
  background: #ececf0;
  content: '';
}

.config-switch {
  position: relative;
  width: 2.55rem;
  height: 1.5rem;
  border-radius: 999px;
  background: #d9d9de;
  flex-shrink: 0;
}

.config-switch > span {
  position: absolute;
  top: 0.15rem;
  left: 0.15rem;
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(20, 20, 24, 0.2);
  transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1);
}

.config-switch--on {
  background: #7e8c72;
}

.config-switch--on > span {
  transform: translateX(1.05rem);
}

.config-link {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 3.75rem;
  padding: 0.65rem 0.85rem;
  color: #242426;
  text-decoration: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.config-link > span {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.config-link strong {
  font-size: 0.76rem;
  font-weight: 500;
  line-height: 1.35;
}

.config-link small {
  margin-top: 0.12rem;
  color: #77777d;
  font-size: 0.62rem;
  line-height: 1.35;
}

.config-link > svg {
  width: 0.9rem;
  height: 0.9rem;
  color: #b0b0b5;
  flex-shrink: 0;
}

.config-about {
  margin: 0;
}

.config-about > div {
  position: relative;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.8rem 0.85rem;
  font-size: 0.72rem;
}

.config-about dt {
  color: #343438;
}

.config-about dd {
  margin: 0;
  color: #77777d;
}

.config-avatar-control:focus-within,
.config-toggle-row:focus-visible,
.config-link:focus-visible {
  outline: 2px solid #76836b;
  outline-offset: 2px;
}

@media (hover: hover) {
  .config-toggle-row:hover,
  .config-link:hover {
    background: #f8f8f9;
  }
}

@media (prefers-reduced-motion: reduce) {
  .config-switch,
  .config-switch > span {
    transition: none;
  }

  .config-spinner {
    animation-duration: 1.5s;
  }
}
</style>
