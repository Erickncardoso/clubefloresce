<template>
  <span
    class="user-tag user-tag--paymethod"
    :class="showMethodIcon ? 'user-tag--paymethod-logo' : tagClass"
  >
    <img
      v-if="showPixIcon"
      :src="pixLogoUrl"
      alt="Pago com Pix"
      class="paymethod-icon paymethod-icon--pix"
      title="Pago com Pix"
    >
    <img
      v-else-if="showCardIcon"
      :src="cardLogoUrl"
      alt="Pago com cartão"
      class="paymethod-icon paymethod-icon--card"
      title="Pago com cartão"
    >
    <span v-else>{{ label }}</span>
  </span>
</template>

<script setup>
import cardLogoUrl from '~/assets/images/card-logo.svg'
import pixLogoUrl from '~/assets/images/pix-logo.svg'
import {
  isPatientCardPaid,
  isPatientPixPaid,
  paymentMethodLabel,
  paymentMethodTagClass,
} from '~/utils/patient-billing-display'

const props = defineProps({
  user: { type: Object, required: true },
})

const tagClass = computed(() => paymentMethodTagClass(props.user))
const label = computed(() => paymentMethodLabel(props.user))
const showPixIcon = computed(() => isPatientPixPaid(props.user))
const showCardIcon = computed(() => isPatientCardPaid(props.user))
const showMethodIcon = computed(() => showPixIcon.value || showCardIcon.value)
</script>

<style scoped>
.user-tag--paymethod-logo {
  background: transparent;
  border: none;
  padding: 0;
}

.paymethod-icon {
  display: block;
  width: auto;
  object-fit: contain;
}

.paymethod-icon--pix {
  height: 18px;
}

.paymethod-icon--card {
  height: 20px;
}
</style>
