<template>
  <div class="pci">
    <ul class="pci-list">
      <li v-for="item in items" :key="item.label" class="pci-row">
        <span class="pci-icon" aria-hidden="true">
          <component :is="item.icon" />
        </span>
        <div class="pci-copy">
          <span class="pci-label">{{ item.label }}</span>
          <span class="pci-value">
            {{ item.value }}
            <a
              v-if="item.whatsappUrl"
              :href="item.whatsappUrl"
              class="pci-wa"
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir WhatsApp"
              aria-label="Abrir WhatsApp"
            >
              <WhatsAppIcon class="pci-wa-icon" />
            </a>
          </span>
        </div>
      </li>
    </ul>

    <button type="button" class="pci-edit" @click="$emit('edit')">
      <Pencil class="pci-edit-icon" aria-hidden="true" />
      Editar informações
    </button>
  </div>
</template>

<script setup>
import { CalendarDays, Info, Mail, Pencil, Phone, UserRound } from 'lucide-vue-next'
import WhatsAppIcon from '~/components/WhatsAppIcon.vue'

const props = defineProps({
  user: { type: Object, default: null },
  profile: { type: Object, default: () => ({}) },
})

defineEmits(['edit'])

const formattedPhone = computed(() => {
  const digits = String(props.user?.phone || '').replace(/\D/g, '')
  if (!digits) return '—'
  if (digits.length === 13 && digits.startsWith('55')) {
    const local = digits.slice(2)
    return `+55 (${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
  }
  if (digits.length === 11) {
    return `+55 (${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  return props.user?.phone || '—'
})

const whatsappUrl = computed(() => {
  const digits = String(props.user?.phone || '').replace(/\D/g, '')
  if (!digits) return ''
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${withCountry}`
})

const statusLabel = computed(() => {
  const key = String(props.user?.status || 'ATIVO').toUpperCase()
  if (key === 'INATIVO') return 'Inativo'
  if (key === 'PENDENTE') return 'Pendente'
  return 'Ativo'
})

const createdLabel = computed(() => {
  if (!props.user?.createdAt) return '—'
  return new Date(props.user.createdAt).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
})

const items = computed(() => [
  {
    label: 'Nome completo',
    value: props.user?.name || '—',
    icon: UserRound,
  },
  {
    label: 'Email',
    value: props.user?.email || '—',
    icon: Mail,
  },
  {
    label: 'Telefone',
    value: formattedPhone.value,
    icon: Phone,
    whatsappUrl: whatsappUrl.value || null,
  },
  {
    label: 'Cadastrado em',
    value: createdLabel.value,
    icon: CalendarDays,
  },
  {
    label: 'Status',
    value: statusLabel.value,
    icon: Info,
  },
])
</script>

<style scoped>
.pci {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin-bottom: 0.35rem;
}

.pci-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.pci-row {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 0.85rem 0;
  border-bottom: 1px solid var(--admin-border, #e8ece9);
}

.pci-row:first-child {
  padding-top: 0.15rem;
}

.pci-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border-radius: var(--cf-radius-full);
  background: rgba(139, 150, 124, 0.12);
  color: var(--primary, #8b967c);
}

.pci-icon svg {
  width: 0.95rem;
  height: 0.95rem;
}

.pci-copy {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
  flex: 1;
}

.pci-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #374151;
}

.pci-value {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8125rem;
  font-weight: 400;
  color: #6b7280;
  line-height: 1.4;
  word-break: break-word;
}

.pci-wa {
  display: inline-flex;
  align-items: center;
  color: #128c7e;
  text-decoration: none;
}

.pci-wa-icon {
  width: 1rem;
  height: 1rem;
}

.pci-edit {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.15rem;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--primary, #8b967c);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s ease;
}

.pci-edit:hover {
  color: #6d7864;
}

.pci-edit-icon {
  width: 0.9rem;
  height: 0.9rem;
}
</style>
