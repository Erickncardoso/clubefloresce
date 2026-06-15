<template>
  <div class="patient-page notif-page">
    <PatientHeader title="Notificações" show-back back-to="/perfil" />

    <div v-if="hasUnread" class="notif-toolbar">
      <button type="button" class="notif-mark-all" :disabled="markingAll" @click="handleMarkAllRead">
        Marcar todas como lidas
      </button>
    </div>

    <PatientPageSkeleton v-if="loading && !items.length" layout="feed" />

    <p v-else-if="error" class="notif-empty">{{ error }}</p>

    <p v-else-if="!grouped.length" class="notif-empty">Nenhuma notificação por enquanto.</p>

    <section v-for="group in grouped" :key="group.label" class="notif-group">
      <h2>{{ group.label }}</h2>
      <button
        v-for="n in group.items"
        :key="n.id"
        type="button"
        class="notif-item"
        :class="{ unread: !n.read }"
        @click="openNotification(n)"
      >
        <div class="notif-icon-wrap" :class="`notif-icon-wrap--${n.type}`">
          <component :is="n.icon" class="notif-icon" />
        </div>
        <div class="notif-body">
          <strong>{{ n.title }}</strong>
          <p>{{ n.text }}</p>
          <span>{{ n.time }}</span>
        </div>
        <span v-if="!n.read" class="notif-dot" />
      </button>
    </section>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const {
  items,
  grouped,
  hasUnread,
  loading,
  error,
  fetchNotifications,
  markAllRead,
  openNotification,
} = usePatientNotifications()

const markingAll = ref(false)

onMounted(() => {
  fetchNotifications()
})

async function handleMarkAllRead() {
  if (markingAll.value || !hasUnread.value) return
  markingAll.value = true
  try {
    await markAllRead()
  } finally {
    markingAll.value = false
  }
}
</script>

<style scoped>
.notif-page {
  padding-top: 0;
}

.notif-toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 0 0 0.5rem;
}

.notif-mark-all {
  border: none;
  background: transparent;
  color: var(--pa-green);
  font-size: 0.78rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  padding: 0.25rem 0;
}

.notif-mark-all:disabled {
  opacity: 0.5;
  cursor: default;
}

.notif-empty {
  margin: 1.5rem 0;
  text-align: center;
  color: var(--pa-text-muted);
  font-size: 0.88rem;
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
  width: 100%;
  padding: 0.85rem 0;
  border: none;
  border-bottom: 1px solid var(--pa-border);
  background: transparent;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  position: relative;
}

.notif-item:focus-visible {
  outline: 2px solid var(--pa-green);
  outline-offset: 2px;
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
.notif-icon-wrap--general { background: #f3f4f6; color: #4b5563; }

.notif-icon {
  width: 1.15rem;
  height: 1.15rem;
}

.notif-body strong {
  display: block;
  font-size: 0.88rem;
  color: var(--pa-text);
}

.notif-body p {
  margin: 0.15rem 0;
  font-size: 0.82rem;
  color: var(--pa-text-muted);
  line-height: 1.4;
}

.notif-body span {
  font-size: 0.74rem;
  color: #6b7280;
  font-weight: 500;
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
