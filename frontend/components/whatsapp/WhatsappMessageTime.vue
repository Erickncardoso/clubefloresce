<template>
  <span class="msg-time" :class="extraClass">
    <Pin v-if="pinned" class="msg-pin-icon" aria-hidden="true" />
    {{ formatTime(timestamp) }}
    <span v-if="isEdited" class="msg-edited-label">Editada</span>
    <WhatsappDeliveryTicks
      v-if="showDelivery && fromMe && deliveryStatus"
      :status="deliveryStatus"
    />
  </span>
</template>

<script setup>
import { Pin } from 'lucide-vue-next'
import WhatsappDeliveryTicks from '~/components/whatsapp/WhatsappDeliveryTicks.vue'

defineProps({
  timestamp: { type: [Number, String], default: 0 },
  formatTime: { type: Function, required: true },
  isEdited: { type: Boolean, default: false },
  fromMe: { type: Boolean, default: false },
  deliveryStatus: { type: String, default: '' },
  pinned: { type: Boolean, default: false },
  extraClass: { type: [String, Object, Array], default: '' },
  showDelivery: { type: Boolean, default: true },
})
</script>
