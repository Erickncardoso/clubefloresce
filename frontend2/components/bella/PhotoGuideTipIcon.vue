<template>
  <span class="photo-guide-tip-icon" aria-hidden="true">
    <!-- Enquadre: cantos do scan (estilo Cal AI) -->
    <svg v-if="name === 'scan-frame'" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 4H5a1 1 0 0 0-1 1v2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2"
        stroke="currentColor"
        stroke-width="1.65"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <rect x="7.5" y="7.5" width="9" height="9" rx="1" stroke="currentColor" stroke-width="1.35" stroke-dasharray="2.5 2.5" opacity="0.55" />
    </svg>

    <!-- Não corte: prato inteiro visível -->
    <svg v-else-if="name === 'no-crop'" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="7" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.65" />
      <path d="M2.5 10.5v3M21.5 10.5v3" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" />
      <path d="M1.5 12h2M20.5 12h2" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" />
    </svg>

    <!-- Luz natural -->
    <svg v-else-if="name === 'sun'" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3.75" stroke="currentColor" stroke-width="1.65" />
      <path
        d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6.1 6.1l1.55 1.55M16.35 16.35l1.55 1.55M6.1 17.9l1.55-1.55M16.35 7.65l1.55-1.55"
        stroke="currentColor"
        stroke-width="1.65"
        stroke-linecap="round"
      />
    </svg>

    <!-- Evite sombras duras -->
    <svg v-else-if="name === 'soft-light'" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="10" r="3" stroke="currentColor" stroke-width="1.65" />
      <path
        d="M9 5.5v1.4M9 14.1v1.4M5.5 10h1.4M12.1 10h1.4M6.6 6.6l1 1M10.4 10.4l1 1M6.6 13.4l1-1M10.4 9.6l1-1"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linecap="round"
      />
      <path
        d="M15 8c1.8 0 3.2 1.35 3.2 3.05 0 1.15-.65 2.15-1.65 2.7"
        stroke="currentColor"
        stroke-width="1.65"
        stroke-linecap="round"
      />
      <path d="M14 16.5h6" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" opacity="0.55" />
    </svg>

    <!-- Segure firme: visão de cima do prato/celular -->
    <svg v-else-if="name === 'top-view'" viewBox="0 0 24 24" fill="none">
      <rect x="7" y="4.5" width="10" height="15" rx="2" stroke="currentColor" stroke-width="1.65" />
      <circle cx="12" cy="17.2" r="0.9" fill="currentColor" />
      <ellipse cx="12" cy="10.5" rx="3.2" ry="2.4" stroke="currentColor" stroke-width="1.35" />
      <path d="M12 2.8v1.2" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" />
    </svg>

    <!-- Revisar antes de salvar -->
    <svg v-else-if="name === 'review'" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" stroke-width="1.65" />
      <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4.5" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" />
      <path d="M16.5 16l1.3 1.3 2.7-2.8" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" />
    </svg>

    <!-- Badge / confirmação -->
    <svg v-else-if="name === 'check'" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.65" />
      <path d="M8 12.2l2.4 2.4L16.2 9.2" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" />
    </svg>

    <!-- Câmera minimalista -->
    <svg v-else-if="name === 'camera'" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 8.5h2.2l1.2-1.8h5.2l1.2 1.8H18a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7.5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        stroke-width="1.65"
        stroke-linejoin="round"
      />
      <circle cx="12" cy="13.5" r="3" stroke="currentColor" stroke-width="1.65" />
    </svg>
  </span>
</template>

<script setup>
defineProps({
  name: {
    type: String,
    required: true,
  },
})
</script>

<style scoped>
.photo-guide-tip-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.35rem;
  height: 1.35rem;
  flex-shrink: 0;
  margin-top: 0.06rem;
  color: var(--cf-green, #8b967c);
}

.photo-guide-tip-icon svg {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
