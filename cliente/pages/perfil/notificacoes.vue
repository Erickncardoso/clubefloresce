<template>
  <div class="patient-page notif-page">
    <PatientHeader title="Notificações" show-back back-to="/perfil">
      <template #actions>
        <button type="button" class="notif-mark-all" @click="markAllRead">Marcar todas como lidas</button>
      </template>
    </PatientHeader>

    <section v-for="group in grouped" :key="group.label" class="notif-group">
      <h2>{{ group.label }}</h2>
      <article v-for="n in group.items" :key="n.id" class="notif-item" :class="{ unread: !n.read }">
        <div class="notif-icon-wrap" :class="`notif-icon-wrap--${n.type}`">
          <component :is="n.icon" class="notif-icon" />
        </div>
        <div class="notif-body">
          <strong>{{ n.title }}</strong>
          <p>{{ n.text }}</p>
          <span>{{ n.time }}</span>
        </div>
        <span v-if="!n.read" class="notif-dot" />
      </article>
    </section>
  </div>
</template>

<script setup>
import { CalendarCheck, Sparkles, Users, BookOpen } from 'lucide-vue-next'

definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const notifications = ref([
  { id: 1, type: 'bella', icon: Sparkles, title: 'BELLA', text: 'Nova dica personalizada para você!', time: 'Há 2h', read: false, group: 'HOJE' },
  { id: 2, type: 'checkin', icon: CalendarCheck, title: 'Check-in', text: 'Não esqueça de completar seu check-in semanal.', time: 'Há 5h', read: false, group: 'HOJE' },
  { id: 3, type: 'community', icon: Users, title: 'Comunidade', text: 'Alguém comentou na sua publicação.', time: 'Ontem', read: true, group: 'ONTEM' },
  { id: 4, type: 'content', icon: BookOpen, title: 'Novo conteúdo', text: 'Novo curso disponível para você.', time: 'Ontem', read: true, group: 'ONTEM' },
  { id: 5, type: 'checkin', icon: CalendarCheck, title: 'Check-in', text: 'Parabéns! Você completou 4 semanas seguidas.', time: '3 dias', read: true, group: 'ESTA SEMANA' },
])

const grouped = computed(() => {
  const labels = ['HOJE', 'ONTEM', 'ESTA SEMANA']
  return labels.map((label) => ({
    label,
    items: notifications.value.filter((n) => n.group === label),
  })).filter((g) => g.items.length)
})

function markAllRead() {
  notifications.value.forEach((n) => { n.read = true })
}
</script>

<style scoped>
.notif-page {
  padding-top: 0;
}

.notif-mark-all {
  border: none;
  background: transparent;
  color: var(--pa-green);
  font-size: 0.72rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
}

.notif-group {
  margin-bottom: 1.25rem;
}

.notif-group h2 {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--pa-text-muted);
  margin: 0 0 0.65rem;
}

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 0.85rem 0;
  border-bottom: 1px solid var(--pa-border);
  position: relative;
}

.notif-icon-wrap {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notif-icon-wrap--bella { background: #ecfdf5; color: var(--pa-green); }
.notif-icon-wrap--checkin { background: #eff6ff; color: #2563eb; }
.notif-icon-wrap--community { background: #fdf4ff; color: #9333ea; }
.notif-icon-wrap--content { background: #fff7ed; color: #ea580c; }

.notif-icon {
  width: 1.15rem;
  height: 1.15rem;
}

.notif-body strong {
  display: block;
  font-size: 0.88rem;
}

.notif-body p {
  margin: 0.15rem 0;
  font-size: 0.82rem;
  color: var(--pa-text-muted);
  line-height: 1.4;
}

.notif-body span {
  font-size: 0.72rem;
  color: #9ca3af;
}

.notif-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--pa-green);
  flex-shrink: 0;
  margin-top: 0.35rem;
}
</style>
