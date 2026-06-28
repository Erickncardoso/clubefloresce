<template>
  <div class="patient-page perfil-page">
    <PatientHeader title="Meu perfil" show-back back-to="/inicio" :show-bell="false">
      <template #actions>
        <button type="button" class="perfil-settings" aria-label="Configurações" @click="navigateTo('/perfil/configuracoes')">
          <Settings class="perfil-settings-icon" />
        </button>
      </template>
    </PatientHeader>

    <PatientPageSkeleton v-if="pageLoading" layout="profile" />

    <template v-else>
    <section class="perfil-hero">
      <label
        class="perfil-avatar-wrap"
        :class="{ 'perfil-avatar-wrap--uploading': avatarUploading }"
        aria-label="Alterar foto do perfil"
      >
        <PatientAvatar
          size="xl"
          :src="avatarUrl"
          :name="fullName"
          :initials="initials"
          :interactive="!avatarUploading"
        />
        <span class="perfil-avatar-edit" aria-hidden="true">
          <Loader2 v-if="avatarUploading" class="perfil-avatar-edit-icon perfil-avatar-edit-icon--spin" />
          <Camera v-else class="perfil-avatar-edit-icon" />
        </span>
        <input
          ref="avatarInputEl"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          class="perfil-avatar-input"
          :disabled="avatarUploading"
          @change="onAvatarSelected"
        />
      </label>
      <p v-if="avatarError" class="perfil-avatar-error" role="alert">{{ avatarError }}</p>
      <h1 class="perfil-name">{{ fullName }}</h1>
      <p v-if="memberSince" class="perfil-since">Membro desde {{ memberSince }}</p>
    </section>

    <section class="perfil-stats">
      <div class="perfil-stat">
        <Flower2 class="perfil-stat-icon" />
        <strong>{{ flowers }}</strong>
        <span>Flores</span>
      </div>
      <div class="perfil-stat">
        <CalendarCheck class="perfil-stat-icon" />
        <strong>{{ checkInWeeks }}</strong>
        <span>Check-ins</span>
      </div>
      <div class="perfil-stat">
        <Sun class="perfil-stat-icon" />
        <strong>{{ level }}</strong>
        <span>Nível</span>
      </div>
    </section>

    <nav class="perfil-menu">
      <NuxtLink to="/perfil/configuracoes" class="perfil-menu-item">
        <User class="perfil-menu-icon" />
        <span>Minhas informações</span>
        <ChevronRight class="perfil-menu-arrow" />
      </NuxtLink>
      <NuxtLink to="/evolucao?tab=metas" class="perfil-menu-item">
        <Target class="perfil-menu-icon" />
        <span>Metas</span>
        <ChevronRight class="perfil-menu-arrow" />
      </NuxtLink>
      <NuxtLink to="/dieta" class="perfil-menu-item">
        <UtensilsCrossed class="perfil-menu-icon" />
        <span>Meu plano</span>
        <ChevronRight class="perfil-menu-arrow" />
      </NuxtLink>
      <NuxtLink to="/check-in/historico" class="perfil-menu-item">
        <BarChart3 class="perfil-menu-icon" />
        <span>Relatórios</span>
        <ChevronRight class="perfil-menu-arrow" />
      </NuxtLink>
      <NuxtLink to="/perfil/notificacoes" class="perfil-menu-item">
        <Bell class="perfil-menu-icon" />
        <span>Notificações</span>
        <ChevronRight class="perfil-menu-arrow" />
      </NuxtLink>
      <NuxtLink to="/perfil/configuracoes" class="perfil-menu-item">
        <HelpCircle class="perfil-menu-icon" />
        <span>Ajuda e suporte</span>
        <ChevronRight class="perfil-menu-arrow" />
      </NuxtLink>
      <button type="button" class="perfil-menu-item perfil-menu-item--logout" @click="logout">
        <LogOut class="perfil-menu-icon" />
        <span>Sair</span>
      </button>
    </nav>
    </template>
  </div>
</template>

<script setup>
import {
  BarChart3,
  Bell,
  CalendarCheck,
  Camera,
  ChevronRight,
  Flower2,
  HelpCircle,
  Loader2,
  LogOut,
  Settings,
  Sun,
  Target,
  User,
  UtensilsCrossed,
} from 'lucide-vue-next'

definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const config = useRuntimeConfig()
const { authFetchInit } = usePatientAuth()
const {
  clearPatientSession,
  userFullName,
  userInitials,
  userAvatar,
  memberSinceLabel,
  uploadProfileAvatar,
} = usePatientApp()

const fullName = computed(() => userFullName())
const initials = computed(() => userInitials())
const avatarUrl = computed(() => userAvatar())
const memberSince = computed(() => memberSinceLabel())
const checkInWeeks = ref(0)
const flowers = ref(24)
const level = ref('Girassol')
const pageLoading = ref(true)
const avatarInputEl = ref(null)
const avatarUploading = ref(false)
const avatarError = ref('')

onMounted(async () => {
  pageLoading.value = true
  flowers.value = 12 + Math.floor(Math.random() * 20)
  try {
    const data = await $fetch(`${config.public.apiBase}/checkin/me`, authFetchInit())
    checkInWeeks.value = (data.history?.length || 0) + (data.current ? 1 : 0)
    flowers.value = Math.max(flowers.value, checkInWeeks.value * 2)
  } catch { /* ignore */ } finally {
    pageLoading.value = false
  }
})

function logout() {
  clearPatientSession()
  navigateTo('/')
}

function onAvatarSelected(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  if (!file.type.startsWith('image/')) {
    avatarError.value = 'Selecione uma imagem (JPG, PNG ou WEBP).'
    return
  }

  if (file.size > 8 * 1024 * 1024) {
    avatarError.value = 'A imagem deve ter no máximo 8 MB.'
    return
  }

  avatarError.value = ''
  avatarUploading.value = true

  uploadProfileAvatar(file)
    .catch((err) => {
      avatarError.value = err?.data?.message || 'Não foi possível atualizar a foto. Tente novamente.'
    })
    .finally(() => {
      avatarUploading.value = false
    })
}
</script>

<style scoped>
.perfil-page {
  padding-top: 0;
}

.perfil-settings {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--cf-pink);
  cursor: pointer;
}

.perfil-settings-icon {
  width: 1.2rem;
  height: 1.2rem;
}

.perfil-hero {
  text-align: center;
  padding: 0.25rem 0 1.25rem;
}

.perfil-avatar-wrap {
  position: relative;
  display: block;
  width: fit-content;
  margin: 0 auto 0.85rem;
  cursor: pointer;
}

.perfil-avatar-wrap--uploading {
  cursor: wait;
  pointer-events: none;
}

.perfil-avatar-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.perfil-avatar-error {
  margin: -0.5rem 0 0.75rem;
  font-size: 0.78rem;
  color: #d64545;
  text-align: center;
}

.perfil-avatar-edit {
  position: absolute;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 2px solid var(--cf-surface);
  border-radius: 50%;
  background: var(--cf-green);
  color: #fff;
  pointer-events: none;
}

.perfil-avatar-wrap:active .perfil-avatar-edit {
  transform: scale(0.96);
  background: var(--cf-green-dark);
}

.perfil-avatar-edit-icon {
  width: 0.95rem;
  height: 0.95rem;
}

.perfil-avatar-edit-icon--spin {
  animation: perfil-avatar-spin 0.9s linear infinite;
}

@keyframes perfil-avatar-spin {
  to {
    transform: rotate(360deg);
  }
}

.perfil-name {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.25;
  color: var(--cf-text);
  text-wrap: balance;
}

.perfil-since {
  margin: 0.25rem 0 0;
  font-size: 0.82rem;
  color: var(--cf-text-muted);
}

.perfil-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.55rem;
  margin-bottom: 1.25rem;
}

.perfil-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.85rem 0.35rem;
  border-radius: var(--cf-radius-sm);
  background: var(--cf-surface);
  box-shadow: var(--cf-shadow);
  text-align: center;
}

.perfil-stat-icon {
  width: 1.1rem;
  height: 1.1rem;
  color: var(--cf-pink);
}

.perfil-stat strong {
  font-size: 1rem;
  font-weight: 600;
  color: var(--cf-text);
}

.perfil-stat span {
  font-size: 0.68rem;
  color: var(--cf-text-muted);
}

.perfil-menu {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.perfil-menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.95rem 1rem;
  border-radius: var(--cf-radius-sm);
  background: var(--cf-surface);
  box-shadow: var(--cf-shadow);
  border: none;
  text-decoration: none;
  color: var(--cf-text);
  font-size: 0.9rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  width: 100%;
  text-align: left;
}

.perfil-menu-icon {
  width: 1.1rem;
  height: 1.1rem;
  color: var(--cf-pink);
  flex-shrink: 0;
}

.perfil-menu-arrow {
  margin-left: auto;
  width: 1rem;
  height: 1rem;
  color: #ccc;
}

.perfil-menu-item--logout {
  color: #d64545;
  margin-top: 0.35rem;
}

.perfil-menu-item--logout .perfil-menu-icon {
  color: #d64545;
}
</style>
