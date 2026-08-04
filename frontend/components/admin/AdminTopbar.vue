<template>
  <header class="admin-topbar" aria-label="Barra superior">
    <button
      type="button"
      class="admin-topbar-search"
      aria-label="Buscar paciente (Ctrl + K)"
      @click="openSearch"
    >
      <Search class="admin-topbar-search-icon" aria-hidden="true" />
      <span class="admin-topbar-search-label">Buscar paciente</span>
      <kbd class="admin-topbar-search-kbd">Ctrl + K</kbd>
    </button>

    <div class="admin-topbar-actions">
      <AdminAgendaTopbarWidget />

      <NuxtLink
        to="/whatsapp/chat"
        class="admin-topbar-icon-btn"
        title="Notificações"
        aria-label="Notificações"
      >
        <Bell aria-hidden="true" />
        <span v-if="notificationCount > 0" class="admin-topbar-badge">{{ notificationBadge }}</span>
      </NuxtLink>

      <NuxtLink
        to="/whatsapp/chat"
        class="admin-topbar-icon-btn"
        title="Mensagens"
        aria-label="Mensagens"
      >
        <MessageCircle aria-hidden="true" />
      </NuxtLink>

      <button
        ref="profileTriggerRef"
        type="button"
        class="admin-topbar-profile"
        :class="{ 'admin-topbar-profile--open': profileOpen }"
        :aria-expanded="profileOpen"
        aria-haspopup="menu"
        title="Menu de perfil"
        @click.stop="$emit('toggle-profile')"
      >
        <PatientAvatar
          :src="profile.avatar"
          :name="profile.name"
          size="sm"
          :ring="false"
        />
        <span class="admin-topbar-profile-copy">
          <strong>{{ profile.name || 'Usuário' }}</strong>
          <small v-if="roleLabel">{{ roleLabel }}</small>
        </span>
        <ChevronDown class="admin-topbar-profile-chevron" :class="{ open: profileOpen }" aria-hidden="true" />
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="searchOpen"
        class="admin-topbar-search-layer"
        role="dialog"
        aria-modal="true"
        aria-label="Buscar paciente"
        @keydown.escape="closeSearch"
      >
        <div class="admin-topbar-search-backdrop" aria-hidden="true" @click="closeSearch" />
        <div class="admin-topbar-search-panel">
          <div class="admin-topbar-search-field">
            <Search class="admin-topbar-search-field-icon" aria-hidden="true" />
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              type="search"
              placeholder="Buscar paciente por nome ou e-mail..."
              aria-label="Buscar paciente"
              autocomplete="off"
              @keydown.down.prevent="moveSelection(1)"
              @keydown.up.prevent="moveSelection(-1)"
              @keydown.enter.prevent="selectHighlighted"
            >
            <kbd class="admin-topbar-search-kbd">Esc</kbd>
          </div>

          <div v-if="loadingPatients" class="admin-topbar-search-state">Carregando pacientes…</div>
          <div v-else-if="loadError" class="admin-topbar-search-state admin-topbar-search-state--error">
            {{ loadError }}
          </div>
          <div v-else-if="!filteredPatients.length" class="admin-topbar-search-state">
            Nenhum paciente encontrado.
          </div>
          <ul v-else class="admin-topbar-search-list" role="listbox">
            <li
              v-for="(patient, index) in filteredPatients"
              :key="patient.id"
              role="option"
              :aria-selected="index === highlightedIndex"
            >
              <NuxtLink
                :to="buildPatientPath(patient)"
                class="admin-topbar-search-item"
                :class="{ 'admin-topbar-search-item--active': index === highlightedIndex }"
                @click="closeSearch"
                @mouseenter="highlightedIndex = index"
              >
                <PatientAvatar :src="patient.avatar" :name="patient.name" :user="patient" size="sm" :ring="false" />
                <span class="admin-topbar-search-item-copy">
                  <strong>{{ patient.name }}</strong>
                  <small>{{ patient.email || 'Sem e-mail' }}</small>
                </span>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </Teleport>
  </header>
</template>

<script setup>
import { Bell, ChevronDown, MessageCircle, Search } from 'lucide-vue-next'
import { authHeaders } from '~/composables/useAuthSession.js'
import { buildPatientPath } from '~/utils/patient-slug.js'

const props = defineProps({
  profile: { type: Object, default: () => ({ name: '', avatar: '' }) },
  roleLabel: { type: String, default: '' },
  profileOpen: { type: Boolean, default: false },
  notificationCount: { type: Number, default: 0 },
})

defineEmits(['toggle-profile'])

const profileTriggerRef = ref(null)
defineExpose({ profileTriggerRef })

const config = useRuntimeConfig()
const router = useRouter()

const searchOpen = ref(false)
const searchQuery = ref('')
const searchInputRef = ref(null)
const patients = ref([])
const loadingPatients = ref(false)
const loadError = ref('')
const highlightedIndex = ref(0)

const notificationBadge = computed(() => {
  const count = Math.max(0, Number(props.notificationCount) || 0)
  return count > 9 ? '9+' : String(count)
})

const filteredPatients = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const list = patients.value.filter((p) => p.role === 'PACIENTE')
  if (!q) return list.slice(0, 12)
  return list
    .filter((p) => {
      const name = String(p.name || '').toLowerCase()
      const email = String(p.email || '').toLowerCase()
      return name.includes(q) || email.includes(q)
    })
    .slice(0, 12)
})

watch(filteredPatients, () => {
  highlightedIndex.value = 0
})

async function loadPatients() {
  loadingPatients.value = true
  loadError.value = ''
  try {
    const data = await $fetch(`${config.public.apiBase}/users`, { headers: authHeaders() })
    patients.value = Array.isArray(data) ? data : []
  } catch {
    loadError.value = 'Não foi possível carregar os pacientes.'
    patients.value = []
  } finally {
    loadingPatients.value = false
  }
}

function openSearch() {
  searchOpen.value = true
  searchQuery.value = ''
  highlightedIndex.value = 0
  if (!patients.value.length) void loadPatients()
  nextTick(() => searchInputRef.value?.focus())
}

function closeSearch() {
  searchOpen.value = false
}

function moveSelection(delta) {
  const max = filteredPatients.value.length
  if (!max) return
  highlightedIndex.value = (highlightedIndex.value + delta + max) % max
}

function selectHighlighted() {
  const patient = filteredPatients.value[highlightedIndex.value]
  if (patient?.id) {
    closeSearch()
    void router.push(buildPatientPath(patient))
  }
}

function onGlobalKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === 'k') {
    event.preventDefault()
    if (searchOpen.value) closeSearch()
    else openSearch()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onGlobalKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onGlobalKeydown)
})
</script>

<style scoped>
.admin-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 3.25rem;
  padding: 0.45rem 1.25rem;
  background: #fff;
  border-bottom: 1px solid var(--admin-border, #e8ece9);
  flex-shrink: 0;
}

.admin-topbar-search {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  max-width: 22rem;
  width: 100%;
  flex: 1 1 auto;
  height: 2.125rem;
  padding: 0 0.75rem;
  border: 1px solid var(--admin-border, #e8ece9);
  background: #f8faf9;
  color: #6b7280;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
}

.admin-topbar-search:hover {
  border-color: rgba(139, 150, 124, 0.45);
  background: #fff;
}

.admin-topbar-search-icon {
  width: 0.9rem;
  height: 0.9rem;
  flex-shrink: 0;
  color: #9ca3af;
}

.admin-topbar-search-label {
  flex: 1;
  min-width: 0;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #9ca3af;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.admin-topbar-search-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 3.1rem;
  height: 1.25rem;
  padding: 0 0.35rem;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #9ca3af;
  font-size: 0.625rem;
  font-weight: 600;
  line-height: 1;
  font-family: inherit;
}

.admin-topbar-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.admin-topbar-icon-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  background: transparent;
  color: #6b7280;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.admin-topbar-icon-btn:hover {
  background: rgba(139, 150, 124, 0.1);
  color: #374151;
}

.admin-topbar-icon-btn svg {
  width: 1.05rem;
  height: 1.05rem;
}

.admin-topbar-badge {
  position: absolute;
  top: 0.1rem;
  right: 0.08rem;
  min-width: 0.95rem;
  height: 0.95rem;
  padding: 0 0.2rem;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 0.5625rem;
  font-weight: 700;
  line-height: 0.95rem;
  text-align: center;
}

.admin-topbar-profile {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  max-width: 13rem;
  height: 2.125rem;
  margin-left: 0.15rem;
  padding: 0.15rem 0.45rem 0.15rem 0.2rem;
  border: 1px solid var(--admin-border, #e8ece9);
  background: #fff;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.admin-topbar-profile:hover,
.admin-topbar-profile--open {
  background: #f8faf9;
  border-color: rgba(139, 150, 124, 0.35);
}

.admin-topbar-profile :deep(.patient-avatar--sm) {
  width: 1.625rem;
  height: 1.625rem;
}

.admin-topbar-profile-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  line-height: 1.15;
}

.admin-topbar-profile-copy strong {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1f2937;
  font-size: 0.75rem;
  font-weight: 600;
}

.admin-topbar-profile-copy small {
  color: #9ca3af;
  font-size: 0.625rem;
  font-weight: 500;
}

.admin-topbar-profile-chevron {
  width: 0.85rem;
  height: 0.85rem;
  flex-shrink: 0;
  color: #9ca3af;
  transition: transform 0.15s ease;
}

.admin-topbar-profile-chevron.open {
  transform: rotate(180deg);
}

.admin-topbar-search-layer {
  position: fixed;
  inset: 0;
  z-index: 220;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 8vh 1rem 1rem;
}

.admin-topbar-search-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
}

.admin-topbar-search-panel {
  position: relative;
  width: min(34rem, 100%);
  border: 1px solid #e5e7eb;
  background: #fff;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.admin-topbar-search-field {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.85rem 0.95rem;
  border-bottom: 1px solid #e5e7eb;
}

.admin-topbar-search-field-icon {
  width: 1rem;
  height: 1rem;
  color: #9ca3af;
  flex-shrink: 0;
}

.admin-topbar-search-field input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: #1f2937;
  font-size: 0.875rem;
}

.admin-topbar-search-state {
  padding: 1rem 0.95rem;
  color: #6b7280;
  font-size: 0.8125rem;
}

.admin-topbar-search-state--error {
  color: #b42318;
}

.admin-topbar-search-list {
  margin: 0;
  padding: 0.35rem;
  list-style: none;
  max-height: min(24rem, 50vh);
  overflow-y: auto;
}

.admin-topbar-search-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.55rem 0.65rem;
  border: none;
  background: transparent;
  text-align: left;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: background 0.15s;
}

.admin-topbar-search-item:hover,
.admin-topbar-search-item--active {
  background: rgba(139, 150, 124, 0.1);
}

.admin-topbar-search-item-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 0.1rem;
}

.admin-topbar-search-item-copy strong {
  color: #1f2937;
  font-size: 0.8125rem;
  font-weight: 600;
}

.admin-topbar-search-item-copy small {
  color: #9ca3af;
  font-size: 0.75rem;
}

@media (max-width: 900px) {
  .admin-topbar {
    display: none;
  }
}

@media (max-width: 1080px) {
  .admin-topbar-search-label,
  .admin-topbar-search-kbd {
    display: none;
  }

  .admin-topbar-search {
    max-width: 2.5rem;
    flex: 0 0 2.125rem;
    justify-content: center;
    padding: 0;
  }

  .admin-topbar-profile-copy {
    display: none;
  }

  .admin-topbar-profile {
    max-width: none;
    padding: 0.15rem;
  }
}
</style>
