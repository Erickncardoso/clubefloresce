<template>
  <svg
    class="modality-icon"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <!-- Não informado: círculo tracejado + traço -->
    <g v-if="name === 'unset'">
      <circle
        cx="12"
        cy="12"
        r="8.25"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-dasharray="2.8 2.4"
        stroke-linecap="round"
      />
      <path
        d="M8.5 12h7"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
      />
    </g>

    <!-- Online: tela + sinal suave -->
    <g v-else-if="name === 'online'">
      <rect
        x="3.5"
        y="5.5"
        width="17"
        height="11.5"
        rx="2.4"
        stroke="currentColor"
        stroke-width="1.7"
      />
      <path
        d="M9 20.2h6"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
      />
      <path
        d="M12 17v3.2"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
      />
      <circle cx="12" cy="11.2" r="1.15" fill="currentColor" />
      <path
        d="M9.35 9.1a3.4 3.4 0 0 1 5.3 0"
        stroke="currentColor"
        stroke-width="1.55"
        stroke-linecap="round"
      />
      <path
        d="M7.7 7.35a5.5 5.5 0 0 1 8.6 0"
        stroke="currentColor"
        stroke-width="1.55"
        stroke-linecap="round"
      />
    </g>

    <!-- Presencial: pin + pessoa -->
    <g v-else-if="name === 'presencial'">
      <path
        d="M12 21s6.2-5.05 6.2-10.05A6.2 6.2 0 0 0 12 4.75a6.2 6.2 0 0 0-6.2 6.2C5.8 15.95 12 21 12 21Z"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linejoin="round"
      />
      <circle
        cx="12"
        cy="10.35"
        r="2.05"
        stroke="currentColor"
        stroke-width="1.55"
      />
      <path
        d="M9.7 14.05c.55-.7 1.35-1.1 2.3-1.1s1.75.4 2.3 1.1"
        stroke="currentColor"
        stroke-width="1.45"
        stroke-linecap="round"
      />
    </g>
  </svg>
</template>

<script setup>
defineProps({
  name: {
    type: String,
    required: true,
    validator: (value) => ['unset', 'online', 'presencial'].includes(value),
  },
})
</script>

<style scoped>
.modality-icon {
  width: 1.05rem;
  height: 1.05rem;
  display: block;
  flex-shrink: 0;
}
</style>
