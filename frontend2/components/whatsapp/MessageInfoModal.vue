<template>
  <Teleport to="body">
    <div v-if="open && message" class="msg-info-overlay" @click.self="$emit('close')">
      <div class="msg-info-modal" role="dialog" aria-modal="true" aria-label="Dados da mensagem">
        <header class="msg-info-header">
          <button type="button" class="msg-info-close" aria-label="Fechar" @click="$emit('close')">
            <X class="msg-info-close-icon" />
          </button>
          <h2 class="msg-info-title">Dados da mensagem</h2>
        </header>

        <dl class="msg-info-list">
          <div class="msg-info-row">
            <dt>Enviada</dt>
            <dd>{{ sentLabel }}</dd>
          </div>
          <div v-if="deliveryLabel" class="msg-info-row">
            <dt>Entrega</dt>
            <dd>{{ deliveryLabel }}</dd>
          </div>
          <div v-if="messageTypeLabel" class="msg-info-row">
            <dt>Tipo</dt>
            <dd>{{ messageTypeLabel }}</dd>
          </div>
          <div v-if="messageId" class="msg-info-row msg-info-row--mono">
            <dt>ID</dt>
            <dd>{{ messageId }}</dd>
          </div>
        </dl>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  message: { type: Object, default: null },
  formatTime: { type: Function, default: (ts) => String(ts || '') },
})

defineEmits(['close'])

const messageId = computed(() =>
  String(props.message?.normalizedMessageId || props.message?.messageid || props.message?.id || '').trim(),
)

const sentLabel = computed(() => {
  const ts = props.message?.timestamp
  if (!ts) return '—'
  try {
    const d = new Date(Number(ts) || ts)
    if (Number.isNaN(d.getTime())) return props.formatTime(ts)
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return props.formatTime(ts)
  }
})

const deliveryLabel = computed(() => {
  if (!props.message?.fromMe) return ''
  const status = String(props.message?.deliveryStatus || '').toLowerCase()
  if (status === 'read') return 'Lida'
  if (status === 'delivered') return 'Entregue'
  if (status === 'sent') return 'Enviada'
  if (status === 'pending') return 'Pendente'
  return status ? status : 'Enviada'
})

const messageTypeLabel = computed(() => {
  const msg = props.message
  if (!msg) return ''
  if (msg.mediaType === 'audio') return 'Áudio'
  if (msg.mediaType === 'image') return 'Imagem'
  if (msg.mediaType === 'video') return 'Vídeo'
  if (msg.mediaType === 'document') return 'Documento'
  if (msg.mediaType === 'sticker') return 'Figurinha'
  if (msg.isContactShare) return 'Contato'
  if (msg.interactive?.kind === 'poll') return 'Enquete'
  if (msg.interactive?.kind === 'menu') return 'Lista'
  if (msg.linkPreview) return 'Link'
  return msg.text ? 'Texto' : ''
})
</script>

<style scoped>
.msg-info-overlay {
  position: fixed;
  inset: 0;
  z-index: 10090;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: rgba(11, 20, 26, 0.45);
}

.msg-info-modal {
  width: min(100%, 380px);
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(11, 20, 26, 0.18);
  overflow: hidden;
}

.msg-info-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #e9edef;
}

.msg-info-close {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #54656f;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.msg-info-close:hover {
  background: rgba(11, 20, 26, 0.06);
}

.msg-info-close-icon {
  width: 20px;
  height: 20px;
}

.msg-info-title {
  flex: 1;
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: #111b21;
}

.msg-info-list {
  margin: 0;
  padding: 8px 0 16px;
}

.msg-info-row {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 12px;
  padding: 10px 20px;
}

.msg-info-row dt {
  margin: 0;
  font-size: 0.875rem;
  color: #667781;
}

.msg-info-row dd {
  margin: 0;
  font-size: 0.875rem;
  color: #111b21;
  word-break: break-word;
}

.msg-info-row--mono dd {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  color: #54656f;
}
</style>
