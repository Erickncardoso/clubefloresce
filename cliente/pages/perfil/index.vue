<template>
  <div class="patient-page perfil-page">
    <PatientHeader />

    <PatientPageSkeleton v-if="pageLoading" layout="profile" />

    <template v-else>
      <section class="perfil-identity" aria-labelledby="perfil-name">
        <label
          class="perfil-avatar-control"
          :class="{ 'perfil-avatar-control--uploading': avatarUploading }"
          aria-label="Alterar foto do perfil"
        >
          <PatientAvatar
            size="xl"
            :src="avatarUrl"
            :name="fullName"
            :interactive="!avatarUploading"
          />
          <span class="perfil-avatar-edit" aria-hidden="true">
            <Loader2 v-if="avatarUploading" class="perfil-avatar-spinner" />
            <Camera v-else />
          </span>
          <input
            ref="avatarInputEl"
            type="file"
            name="profile-avatar"
            accept="image/jpeg,image/png,image/webp"
            class="perfil-avatar-input"
            :disabled="avatarUploading"
            @change="onAvatarSelected"
          />
        </label>

        <h1 id="perfil-name">{{ fullName }}</h1>
        <p v-if="memberSince" class="perfil-member">Membro desde {{ memberSince }}</p>
        <span class="perfil-plan">
          <BadgeCheck aria-hidden="true" />
          {{ planName }}
        </span>

        <p v-if="avatarError" class="perfil-feedback perfil-feedback--error" role="alert">
          {{ avatarError }}
        </p>
        <p v-else-if="avatarSuccess" class="perfil-feedback" aria-live="polite">
          {{ avatarSuccess }}
        </p>
      </section>

      <section class="perfil-journey" aria-label="Resumo da sua jornada">
        <div class="perfil-stat">
          <Flower2 aria-hidden="true" />
          <strong>{{ flowers }}</strong>
          <span>Flores</span>
        </div>
        <div class="perfil-stat">
          <CalendarCheck aria-hidden="true" />
          <strong>{{ checkInWeeks }}</strong>
          <span>Check-ins</span>
        </div>
        <div class="perfil-stat">
          <Sun aria-hidden="true" />
          <strong>{{ level }}</strong>
          <span>Nível</span>
        </div>
      </section>

      <section class="perfil-section" aria-labelledby="perfil-follow-title">
        <h2 id="perfil-follow-title">Acompanhamento</h2>
        <nav class="perfil-list" aria-label="Acompanhamento">
          <button type="button" class="perfil-row" @click="openPremiumPath('/evolucao?tab=metas')">
            <span class="perfil-row-icon perfil-row-icon--goals" aria-hidden="true">
              <Target />
            </span>
            <span class="perfil-row-copy">
              <strong>Minhas metas</strong>
              <small>Água, sono, exercícios e rotina</small>
            </span>
            <ChevronRight class="perfil-row-arrow" aria-hidden="true" />
          </button>

          <button type="button" class="perfil-row" @click="openPremiumPath('/dieta')">
            <span class="perfil-row-icon perfil-row-icon--plan" aria-hidden="true">
              <UtensilsCrossed />
            </span>
            <span class="perfil-row-copy">
              <strong>Meu plano alimentar</strong>
              <small>Refeições e orientações da nutricionista</small>
            </span>
            <ChevronRight class="perfil-row-arrow" aria-hidden="true" />
          </button>

          <button type="button" class="perfil-row" @click="openPremiumPath('/check-in/historico')">
            <span class="perfil-row-icon perfil-row-icon--reports" aria-hidden="true">
              <BarChart3 />
            </span>
            <span class="perfil-row-copy">
              <strong>Relatórios e check-ins</strong>
              <small>Acompanhe sua evolução semanal</small>
            </span>
            <ChevronRight class="perfil-row-arrow" aria-hidden="true" />
          </button>
        </nav>
      </section>

      <section class="perfil-section" aria-labelledby="perfil-account-title">
        <h2 id="perfil-account-title">Conta</h2>
        <nav class="perfil-list" aria-label="Conta">
          <NuxtLink to="/perfil/configuracoes" class="perfil-row">
            <span class="perfil-row-icon" aria-hidden="true">
              <UserRound />
            </span>
            <span class="perfil-row-copy">
              <strong>Informações e preferências</strong>
              <small>Foto, notificações e dados da conta</small>
            </span>
            <ChevronRight class="perfil-row-arrow" aria-hidden="true" />
          </NuxtLink>

          <NuxtLink to="/assinatura" class="perfil-row">
            <span class="perfil-row-icon perfil-row-icon--billing" aria-hidden="true">
              <CreditCard />
            </span>
            <span class="perfil-row-copy">
              <strong>Assinatura</strong>
              <small>{{ subscriptionDescription }}</small>
            </span>
            <ChevronRight class="perfil-row-arrow" aria-hidden="true" />
          </NuxtLink>

          <NuxtLink to="/perfil/notificacoes" class="perfil-row">
            <span class="perfil-row-icon perfil-row-icon--notifications" aria-hidden="true">
              <Bell />
            </span>
            <span class="perfil-row-copy">
              <strong>Notificações</strong>
              <small>Avisos, lembretes e novidades</small>
            </span>
            <ChevronRight class="perfil-row-arrow" aria-hidden="true" />
          </NuxtLink>
        </nav>
      </section>

      <section class="perfil-section" aria-labelledby="perfil-support-title">
        <h2 id="perfil-support-title">Suporte e privacidade</h2>
        <nav class="perfil-list" aria-label="Suporte e privacidade">
          <a
            href="mailto:contato@nutrisabellajardim.com.br?subject=Ajuda%20no%20Clube%20Florescer"
            class="perfil-row"
          >
            <span class="perfil-row-icon" aria-hidden="true">
              <CircleHelp />
            </span>
            <span class="perfil-row-copy">
              <strong>Ajuda e suporte</strong>
              <small>Fale com a equipe do Clube Florescer</small>
            </span>
            <ChevronRight class="perfil-row-arrow" aria-hidden="true" />
          </a>

          <NuxtLink to="/legal/privacidade" class="perfil-row">
            <span class="perfil-row-icon" aria-hidden="true">
              <ShieldCheck />
            </span>
            <span class="perfil-row-copy">
              <strong>Privacidade</strong>
              <small>Como seus dados são protegidos</small>
            </span>
            <ChevronRight class="perfil-row-arrow" aria-hidden="true" />
          </NuxtLink>

          <NuxtLink to="/legal/termos" class="perfil-row">
            <span class="perfil-row-icon" aria-hidden="true">
              <ScrollText />
            </span>
            <span class="perfil-row-copy">
              <strong>Termos de uso</strong>
              <small>Condições do Clube Florescer</small>
            </span>
            <ChevronRight class="perfil-row-arrow" aria-hidden="true" />
          </NuxtLink>
        </nav>
      </section>

      <button
        ref="logoutButton"
        type="button"
        class="perfil-logout"
        @click="openLogoutConfirm"
      >
        <LogOut aria-hidden="true" />
        Sair da conta
      </button>
    </template>

    <Teleport to="body">
      <Transition name="perfil-sheet">
        <div
          v-if="showLogoutConfirm"
          class="perfil-logout-overlay"
          @click.self="showLogoutConfirm = false"
          @keydown.esc="showLogoutConfirm = false"
        >
          <section
            class="perfil-logout-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="perfil-logout-title"
          >
            <span class="perfil-sheet-handle" aria-hidden="true" />
            <button
              ref="logoutCancelButton"
              type="button"
              class="perfil-sheet-close"
              aria-label="Fechar"
              @click="showLogoutConfirm = false"
            >
              <X aria-hidden="true" />
            </button>
            <span class="perfil-sheet-icon" aria-hidden="true">
              <LogOut />
            </span>
            <h2 id="perfil-logout-title">Sair do Clube Florescer?</h2>
            <p>Você precisará entrar novamente para acessar seu plano e acompanhamento.</p>
            <button
              type="button"
              class="perfil-sheet-confirm"
              :disabled="loggingOut"
              @click="logout"
            >
              <Loader2 v-if="loggingOut" class="perfil-avatar-spinner" aria-hidden="true" />
              {{ loggingOut ? 'Saindo…' : 'Sair da conta' }}
            </button>
            <button
              type="button"
              class="perfil-sheet-cancel"
              :disabled="loggingOut"
              @click="showLogoutConfirm = false"
            >
              Continuar no app
            </button>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import {
  BadgeCheck,
  BarChart3,
  Bell,
  CalendarCheck,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Flower2,
  Loader2,
  LogOut,
  Settings,
  ScrollText,
  ShieldCheck,
  Sun,
  Target,
  UserRound,
  UtensilsCrossed,
  X,
} from 'lucide-vue-next'
import Camera from '~/components/icons/CameraIcon.vue'
import { logoutAuthSession } from '~/composables/useAuthSession.js'

definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const config = useRuntimeConfig()
const { authFetchInit } = usePatientAuth()
const { verifiedUser } = useAuthSession()
const { navigateOrGate } = usePatientPremiumGate()
const {
  clearPatientSession,
  userFullName,
  userAvatar,
  memberSinceLabel,
  syncPatientProfile,
  uploadProfileAvatar,
} = usePatientApp()
const {
  todaySummary,
  hydrate: hydrateGoals,
} = usePatientGoals()

const fullName = computed(() => userFullName())
const avatarUrl = computed(() => userAvatar())
const memberSince = computed(() => memberSinceLabel())
const checkInWeeks = ref(0)
const pageLoading = ref(true)
const avatarUploading = ref(false)
const avatarError = ref('')
const avatarSuccess = ref('')
const showLogoutConfirm = ref(false)
const loggingOut = ref(false)
const logoutButton = ref(null)
const logoutCancelButton = ref(null)

const completedGoals = computed(() =>
  todaySummary.value.filter((item) => item.percent >= 100).length,
)
const flowers = computed(() => checkInWeeks.value * 5 + completedGoals.value)
const level = computed(() => {
  if (flowers.value >= 40) return 'Jardim'
  if (flowers.value >= 15) return 'Girassol'
  if (flowers.value >= 5) return 'Broto'
  return 'Semente'
})
const planName = computed(() => {
  const plan = String(verifiedUser.value?.plan || '').toUpperCase()
  if (plan === 'PLATINUM') return 'Plano Completo'
  if (plan === 'PREMIUM' || plan === 'ESSENTIAL') return 'Plano Essencial'
  if (plan === 'FREE') return 'Plano gratuito'
  return 'Clube Florescer'
})
const subscriptionDescription = computed(() => {
  const expiresAt = verifiedUser.value?.accessExpiresAt
  if (!expiresAt) return planName.value
  const date = new Date(expiresAt)
  if (Number.isNaN(date.getTime())) return planName.value
  return `Acesso até ${new Intl.DateTimeFormat('pt-BR').format(date)}`
})

watch(showLogoutConfirm, (isOpen) => {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('evo-goal-modal-open', isOpen)
  }
  if (isOpen) {
    nextTick(() => logoutCancelButton.value?.focus())
  } else {
    nextTick(() => logoutButton.value?.focus())
  }
})

function openPremiumPath(path) {
  void navigateOrGate(path)
}

onMounted(async () => {
  pageLoading.value = true
  hydrateGoals()

  const [, checkinResult] = await Promise.allSettled([
    syncPatientProfile(),
    $fetch(`${config.public.apiBase}/checkin/me`, authFetchInit()),
  ])

  if (checkinResult.status === 'fulfilled') {
    const data = checkinResult.value
    checkInWeeks.value = (data.history?.length || 0) + (data.current ? 1 : 0)
  }
  pageLoading.value = false
})

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('evo-goal-modal-open')
  }
})

async function logout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await logoutAuthSession(config.public.apiBase)
    clearPatientSession()
    await navigateTo('/')
  } finally {
    loggingOut.value = false
  }
}

function openLogoutConfirm() {
  showLogoutConfirm.value = true
}

async function onAvatarSelected(event) {
  const input = event.target
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    avatarError.value = 'Escolha uma imagem JPG, PNG ou WEBP.'
    avatarSuccess.value = ''
    return
  }

  if (file.size > 8 * 1024 * 1024) {
    avatarError.value = 'A imagem deve ter no máximo 8 MB.'
    avatarSuccess.value = ''
    return
  }

  avatarError.value = ''
  avatarSuccess.value = ''
  avatarUploading.value = true

  try {
    await uploadProfileAvatar(file)
    avatarSuccess.value = 'Foto atualizada.'
  } catch (error) {
    avatarError.value = error?.data?.message || 'Não foi possível atualizar a foto. Tente novamente.'
  } finally {
    avatarUploading.value = false
  }
}
</script>

<style scoped>
.perfil-page {
  padding-top: 0;
  padding-bottom: calc(6rem + env(safe-area-inset-bottom, 0px));
  background: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', var(--cf-font);
}

.perfil-page :deep(.cf-header) {
  margin-inline: calc(-1 * var(--cf-page-pad-x));
  background: #fff;
}

.perfil-settings {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #6f7863;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.perfil-settings svg {
  width: 1.2rem;
  height: 1.2rem;
  stroke-width: 1.7;
}

.perfil-settings:focus-visible,
.perfil-avatar-control:focus-within,
.perfil-row:focus-visible,
.perfil-logout:focus-visible,
.perfil-sheet-close:focus-visible,
.perfil-sheet-confirm:focus-visible,
.perfil-sheet-cancel:focus-visible {
  outline: 2px solid #76836b;
  outline-offset: 2px;
}

.perfil-identity {
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 0.5rem 0 1.4rem;
  text-align: center;
}

.perfil-avatar-control {
  position: relative;
  display: block;
  margin-bottom: 0.8rem;
  cursor: pointer;
  touch-action: manipulation;
}

.perfil-avatar-control--uploading {
  cursor: wait;
  pointer-events: none;
}

.perfil-avatar-input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.perfil-avatar-edit {
  position: absolute;
  right: -0.1rem;
  bottom: -0.05rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #88977c;
  color: #fff;
  transition: transform 0.16s cubic-bezier(0.22, 1, 0.36, 1);
}

.perfil-avatar-edit svg {
  width: 0.9rem;
  height: 0.9rem;
  stroke-width: 1.9;
}

.perfil-avatar-control:active .perfil-avatar-edit {
  background: #6f7c64;
  transform: scale(0.94);
}

.perfil-avatar-spinner {
  animation: perfil-spin 0.8s linear infinite;
}

@keyframes perfil-spin {
  to {
    transform: rotate(360deg);
  }
}

.perfil-identity h1 {
  margin: 0;
  color: #1d1d1f;
  font-size: 1.18rem;
  font-weight: 500;
  line-height: 1.25;
  letter-spacing: -0.025em;
  text-wrap: balance;
}

.perfil-member {
  margin: 0.25rem 0 0;
  color: #6e6e73;
  font-size: 0.75rem;
  line-height: 1.4;
}

.perfil-plan {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.6rem;
  padding: 0.3rem 0.55rem;
  border-radius: 999px;
  background: #f1f3ef;
  color: #65705c;
  font-size: 0.65rem;
  font-weight: 500;
}

.perfil-plan svg {
  width: 0.8rem;
  height: 0.8rem;
  stroke-width: 1.8;
}

.perfil-feedback {
  margin: 0.65rem 0 0;
  color: #5d7555;
  font-size: 0.7rem;
}

.perfil-feedback--error {
  color: #b34242;
}

.perfil-journey {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 1.65rem;
  overflow: hidden;
  border: 1px solid #e5e5ea;
  border-radius: 1rem;
  background: #fff;
}

.perfil-stat {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 0.85rem 0.4rem;
  flex-direction: column;
  text-align: center;
}

.perfil-stat + .perfil-stat::before {
  position: absolute;
  top: 0.75rem;
  bottom: 0.75rem;
  left: 0;
  width: 1px;
  background: #ececf0;
  content: '';
}

.perfil-stat > svg {
  width: 1rem;
  height: 1rem;
  margin-bottom: 0.35rem;
  color: #85917b;
  stroke-width: 1.7;
}

.perfil-stat strong {
  max-width: 100%;
  overflow: hidden;
  color: #242426;
  font-size: 0.86rem;
  font-weight: 500;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.perfil-stat span {
  margin-top: 0.16rem;
  color: #7a7a80;
  font-size: 0.62rem;
}

.perfil-section {
  margin-bottom: 1.35rem;
}

.perfil-section h2 {
  margin: 0 0 0.55rem 0.15rem;
  color: #6e6e73;
  font-size: 0.7rem;
  font-weight: 500;
  line-height: 1.3;
}

.perfil-list {
  overflow: hidden;
  border: 1px solid #e5e5ea;
  border-radius: 1rem;
  background: #fff;
}

.perfil-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.72rem;
  width: 100%;
  min-height: 4rem;
  margin: 0;
  padding: 0.65rem 0.8rem;
  border: none;
  background: transparent;
  color: #242426;
  text-align: left;
  font: inherit;
  text-decoration: none;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.16s ease;
}

.perfil-row + .perfil-row::before {
  position: absolute;
  top: 0;
  right: 0.8rem;
  left: 3.75rem;
  height: 1px;
  background: #ececf0;
  content: '';
}

.perfil-row-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 50%;
  background: #f2f3f1;
  color: #75806c;
  flex-shrink: 0;
}

.perfil-row-icon--goals {
  background: #f0f2eb;
  color: #6f7f61;
}

.perfil-row-icon--plan {
  background: #f6f1ec;
  color: #9a7560;
}

.perfil-row-icon--reports {
  background: #edf3f5;
  color: #66838c;
}

.perfil-row-icon--billing {
  background: #f4f1ec;
  color: #927a5e;
}

.perfil-row-icon--notifications {
  background: #f1f2f7;
  color: #6f75a1;
}

.perfil-row-icon svg {
  width: 1rem;
  height: 1rem;
  stroke-width: 1.75;
}

.perfil-row-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.perfil-row-copy strong {
  overflow: hidden;
  color: #242426;
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.perfil-row-copy small {
  overflow: hidden;
  margin-top: 0.12rem;
  color: #77777d;
  font-size: 0.64rem;
  font-weight: 400;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.perfil-row-arrow {
  width: 0.9rem;
  height: 0.9rem;
  color: #b0b0b5;
  stroke-width: 1.8;
  flex-shrink: 0;
}

.perfil-logout {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  width: 100%;
  min-height: 2.85rem;
  margin-top: 0.25rem;
  border: 1px solid #eadada;
  border-radius: 0.85rem;
  background: #fff;
  color: #a84848;
  font-family: inherit;
  font-size: 0.76rem;
  font-weight: 500;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.perfil-logout svg {
  width: 0.95rem;
  height: 0.95rem;
  stroke-width: 1.8;
}

.perfil-logout-overlay {
  position: fixed;
  inset: 0;
  z-index: 25000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(20, 24, 28, 0.38);
  overscroll-behavior: contain;
}

.perfil-logout-sheet {
  position: relative;
  width: 100%;
  max-width: 430px;
  padding: 0.55rem 1rem calc(1rem + env(safe-area-inset-bottom, 0px));
  border-radius: 1.25rem 1.25rem 0 0;
  background: #fff;
  text-align: center;
}

.perfil-sheet-handle {
  display: block;
  width: 2.25rem;
  height: 0.25rem;
  margin: 0 auto 1rem;
  border-radius: 999px;
  background: #d2d2d7;
}

.perfil-sheet-close {
  position: absolute;
  top: 0.75rem;
  right: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #f2f2f4;
  color: #5f5f65;
  cursor: pointer;
}

.perfil-sheet-close svg {
  width: 0.95rem;
  height: 0.95rem;
}

.perfil-sheet-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  margin: 0.25rem auto 0.75rem;
  border-radius: 50%;
  background: #f8eeee;
  color: #ad4e4e;
}

.perfil-sheet-icon svg {
  width: 1.15rem;
  height: 1.15rem;
  stroke-width: 1.8;
}

.perfil-logout-sheet h2 {
  margin: 0;
  color: #242426;
  font-size: 1rem;
  font-weight: 500;
  letter-spacing: -0.015em;
  text-wrap: balance;
}

.perfil-logout-sheet p {
  max-width: 20rem;
  margin: 0.45rem auto 1rem;
  color: #6e6e73;
  font-size: 0.72rem;
  line-height: 1.45;
  text-wrap: pretty;
}

.perfil-sheet-confirm,
.perfil-sheet-cancel {
  width: 100%;
  min-height: 2.8rem;
  border-radius: 0.75rem;
  font-family: inherit;
  font-size: 0.76rem;
  font-weight: 500;
  cursor: pointer;
}

.perfil-sheet-confirm {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border: 0;
  background: #ad4e4e;
  color: #fff;
}

.perfil-sheet-confirm:disabled,
.perfil-sheet-cancel:disabled {
  cursor: default;
  opacity: 0.55;
}

.perfil-sheet-cancel {
  margin-top: 0.45rem;
  border: 0;
  background: transparent;
  color: #4f5550;
}

@media (hover: hover) {
  .perfil-settings:hover,
  .perfil-sheet-close:hover {
    background: #f2f2f4;
  }

  .perfil-row:hover {
    background: #f8f8f9;
  }

  .perfil-logout:hover {
    background: #fcf7f7;
  }

  .perfil-sheet-confirm:hover {
    background: #993f3f;
  }
}

.perfil-sheet-enter-active,
.perfil-sheet-leave-active {
  transition: opacity 0.2s ease;
}

.perfil-sheet-enter-active .perfil-logout-sheet,
.perfil-sheet-leave-active .perfil-logout-sheet {
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.perfil-sheet-enter-from,
.perfil-sheet-leave-to {
  opacity: 0;
}

.perfil-sheet-enter-from .perfil-logout-sheet,
.perfil-sheet-leave-to .perfil-logout-sheet {
  transform: translateY(100%);
}

@media (prefers-reduced-motion: reduce) {
  .perfil-avatar-edit,
  .perfil-row,
  .perfil-sheet-enter-active,
  .perfil-sheet-leave-active,
  .perfil-sheet-enter-active .perfil-logout-sheet,
  .perfil-sheet-leave-active .perfil-logout-sheet {
    transition-duration: 0.01ms;
  }

  .perfil-avatar-spinner {
    animation-duration: 1.5s;
  }
}
</style>
