<template>
  <div class="wa-pix-card" :class="`wa-pix-card--${variant}`">
    <div class="wa-pix-body">
      <div class="wa-pix-icon-wrap" aria-hidden="true">
        <svg class="wa-pix-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="24" fill="#E2F7F0" />
          <g fill="#32BCAD">
            <path d="M24 10.5a3.5 3.5 0 0 0-3.5 3.5v4.5a3.5 3.5 0 1 0 7 0V14a3.5 3.5 0 0 0-3.5-3.5Z" />
            <path d="M24 29.5a3.5 3.5 0 0 0-3.5 3.5v4.5a3.5 3.5 0 1 0 7 0V33a3.5 3.5 0 0 0-3.5-3.5Z" />
            <path d="M10.5 24a3.5 3.5 0 0 1 3.5-3.5h4.5a3.5 3.5 0 1 1 0 7H14a3.5 3.5 0 0 1-3.5-3.5Z" />
            <path d="M29.5 24a3.5 3.5 0 0 1 3.5-3.5h4.5a3.5 3.5 0 1 1 0 7H33a3.5 3.5 0 0 1-3.5-3.5Z" />
          </g>
        </svg>
      </div>
      <div class="wa-pix-copy-block">
        <p v-if="variant === 'request-payment' && formattedAmount" class="wa-pix-amount">R$ {{ formattedAmount }}</p>
        <p class="wa-pix-name">{{ displayName }}</p>
        <p v-if="keyLine" class="wa-pix-key">{{ keyLine }}</p>
      </div>
      <div v-if="$slots.meta" class="wa-pix-meta">
        <slot name="meta" />
      </div>
    </div>
    <button type="button" class="wa-pix-action" @click.stop="$emit('action')">
      <span v-if="variant === 'pix-button'" class="wa-pix-copy-ico" aria-hidden="true" />
      <span>{{ actionLabel }}</span>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatPixKeyDisplay, pixTypeDisplayLabel } from '~/composables/whatsapp/useWhatsappInteractive.js'

const props = defineProps({
  pixName: { type: String, default: '' },
  pixType: { type: String, default: 'EVP' },
  pixKey: { type: String, default: '' },
  amount: { type: [Number, String], default: 0 },
  variant: {
    type: String,
    default: 'pix-button',
    validator: (value) => ['pix-button', 'request-payment'].includes(value)
  }
})

defineEmits(['action'])

const displayName = computed(() => {
  const name = String(props.pixName || '').trim()
  return name || 'Pix'
})

const formattedKey = computed(() => formatPixKeyDisplay(props.pixType, props.pixKey))

const keyLine = computed(() => {
  const key = formattedKey.value
  if (!key) return ''
  return `${pixTypeDisplayLabel(props.pixType)}: ${key}`
})

const formattedAmount = computed(() => {
  const value = Number(props.amount || 0)
  if (!Number.isFinite(value) || value <= 0) return ''
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
})

const actionLabel = computed(() => (
  props.variant === 'request-payment' ? 'Revisar e pagar' : 'Copiar chave Pix'
))
</script>

<style scoped>
.wa-pix-card {
  width: 100%;
  background: transparent;
}
.wa-pix-body {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  grid-template-rows: auto auto;
  gap: 2px 12px;
  padding: 10px 12px 8px;
  align-items: start;
}
.wa-pix-icon-wrap {
  grid-row: 1 / span 2;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}
.wa-pix-icon {
  width: 48px;
  height: 48px;
  display: block;
}
.wa-pix-copy-block {
  min-width: 0;
  padding-top: 2px;
}
.wa-pix-amount {
  margin: 0 0 2px;
  font-size: 1.05rem;
  font-weight: 700;
  color: #111b21;
  line-height: 1.25;
}
.wa-pix-name {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 500;
  color: #111b21;
  line-height: 1.3;
  word-break: break-word;
}
.wa-pix-key {
  margin: 2px 0 0;
  font-size: 0.84rem;
  color: #667781;
  line-height: 1.35;
  word-break: break-word;
}
.wa-pix-meta {
  grid-column: 2;
  justify-self: end;
  align-self: end;
  margin-top: -2px;
}
.wa-pix-meta :deep(.msg-time) {
  position: static;
  float: none;
  margin: 0;
  white-space: nowrap;
}
.wa-pix-action {
  width: 100%;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-top: 1px solid rgba(11, 20, 26, 0.08);
  background: transparent;
  color: #008069;
  font-size: 0.92rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0 12px;
  box-sizing: border-box;
}
.wa-pix-action:hover {
  background: rgba(255, 255, 255, 0.35);
}
.wa-pix-copy-ico {
  width: 16px;
  height: 16px;
  border: 2px solid #008069;
  border-radius: 2px;
  position: relative;
  display: inline-block;
  flex-shrink: 0;
}
.wa-pix-copy-ico::after {
  content: '';
  position: absolute;
  width: 11px;
  height: 11px;
  border: 2px solid #008069;
  border-radius: 2px;
  left: 6px;
  top: -6px;
  background: transparent;
}
</style>
