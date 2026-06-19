<template>
  <div class="patient-page config-page">
    <PatientHeader title="Configurações" show-back back-to="/perfil" />

    <section class="config-profile">
      <PatientAvatar
        size="lg"
        :src="avatarUrl"
        :name="fullName"
        :initials="initials"
      />
      <div class="config-profile-copy">
        <p class="config-profile-name">{{ fullName }}</p>
        <p class="config-profile-hint">Foto e dados pessoais em breve.</p>
      </div>
    </section>

    <section class="config-section">
      <h2>Notificações</h2>
      <div
        v-for="item in notifToggles"
        :key="item.key"
        class="config-toggle-row"
      >
        <button
          type="button"
          class="config-toggle-label-btn"
          @click="toggleNotif(item)"
        >
          {{ item.label }}
        </button>
        <button
          type="button"
          class="config-check-btn"
          :aria-pressed="item.on"
          :aria-label="item.on ? `Desativar ${item.label}` : `Ativar ${item.label}`"
          @click="toggleNotif(item)"
        >
          <DietaCheckIcon :completed="item.on" />
        </button>
      </div>
    </section>

    <section class="config-section">
      <h2>Conta</h2>
      <button type="button" class="config-link">Editar perfil</button>
      <button type="button" class="config-link">Alterar senha</button>
      <button type="button" class="config-link">Privacidade</button>
    </section>

    <section class="config-section">
      <h2>App</h2>
      <div class="config-row"><span>Tema</span><span>Claro</span></div>
      <div class="config-row"><span>Idioma</span><span>Português</span></div>
      <div class="config-row"><span>Versão</span><span>1.0.0</span></div>
    </section>

    <button type="button" class="config-danger">Excluir minha conta</button>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const { userFullName, userInitials, userAvatar } = usePatientApp()

const fullName = computed(() => userFullName())
const initials = computed(() => userInitials())
const avatarUrl = computed(() => userAvatar())

const notifToggles = reactive([
  { key: 'checkin', label: 'Lembrete de check-in semanal', on: true },
  { key: 'content', label: 'Novos conteúdos disponíveis', on: true },
  { key: 'bella', label: 'Mensagens da BELLA', on: false },
  { key: 'community', label: 'Atividade na comunidade', on: true },
])

function toggleNotif(item) {
  item.on = !item.on
}
</script>

<style scoped>
.config-page {
  padding-top: 0;
}

.config-profile {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  margin-bottom: 1.5rem;
  padding: 0.9rem 1rem;
  border-radius: var(--cf-radius-sm);
  background: var(--cf-surface);
  border: 1px solid var(--cf-border);
}

.config-profile-copy {
  min-width: 0;
}

.config-profile-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--cf-text);
}

.config-profile-hint {
  margin: 0.2rem 0 0;
  font-size: 0.78rem;
  color: var(--cf-text-muted);
}

.config-section {
  margin-bottom: 1.5rem;
}

.config-section h2 {
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--pa-text-muted);
  margin: 0 0 0.75rem;
}

.config-toggle-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 1px solid var(--pa-border);
}

.config-toggle-label-btn {
  flex: 1;
  min-width: 0;
  padding: 0.95rem 0;
  border: none;
  background: transparent;
  font-size: 0.92rem;
  font-weight: 600;
  font-family: inherit;
  text-align: left;
  color: var(--pa-text);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.config-check-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  margin: 0.15rem 0;
  padding: 0;
  border: none;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.config-check-btn:active {
  background: rgba(99, 186, 138, 0.08);
}

.config-check-btn :deep(.dieta-status-icon) {
  width: 1.25rem;
  height: 1.25rem;
}

.config-toggle-label-btn:focus-visible,
.config-check-btn:focus-visible {
  outline: 2px solid var(--cf-green);
  outline-offset: 2px;
}

.config-link {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.95rem 0;
  border: none;
  border-bottom: 1px solid var(--pa-border);
  background: transparent;
  font-size: 0.92rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  color: var(--pa-text);
}

.config-row {
  display: flex;
  justify-content: space-between;
  padding: 0.95rem 0;
  border-bottom: 1px solid var(--pa-border);
  font-size: 0.92rem;
}

.config-row span:last-child {
  color: var(--pa-text-muted);
}

.config-danger {
  width: 100%;
  margin-top: 1rem;
  padding: 0.75rem;
  border: none;
  background: transparent;
  color: var(--pa-red);
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
}
</style>
