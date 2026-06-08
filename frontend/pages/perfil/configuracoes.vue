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
      <label v-for="item in notifToggles" :key="item.key" class="config-toggle">
        <span>{{ item.label }}</span>
        <input v-model="item.on" type="checkbox" />
      </label>
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

.config-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.95rem 0;
  border-bottom: 1px solid var(--pa-border);
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
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
