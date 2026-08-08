<template>
  <svg
    class="patient-flame-3d"
    :class="[`patient-flame-3d--${size}`]"
    viewBox="0 0 24 28"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="patientFlameOuter" x1="12" y1="2" x2="12" y2="26" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#ffc766" />
        <stop offset="42%" stop-color="#ff8c2a" />
        <stop offset="100%" stop-color="#e85d04" />
      </linearGradient>
      <linearGradient id="patientFlameInner" x1="12" y1="8" x2="12" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#fff4dc" />
        <stop offset="50%" stop-color="#ffd699" />
        <stop offset="100%" stop-color="#ffb347" />
      </linearGradient>
      <filter id="patientFlameShadow" x="-30%" y="-20%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="1.4" flood-color="#c2410c" flood-opacity="0.35" />
        <feDropShadow dx="0" dy="0.5" stdDeviation="0.4" flood-color="#ffffff" flood-opacity="0.55" />
      </filter>
    </defs>
    <path
      filter="url(#patientFlameShadow)"
      d="M12 1.5c1.2 2.8 3.4 4.4 4.6 7.1 1.4 3.1.9 6.8-1.3 9.4-1.1 1.3-2.7 2.2-4.4 2.5-1.1.2-2.2.1-3.2-.3-2.5-1-4.2-3.4-4.5-6.1-.3-2.8 1-5.6 3.1-7.4C8.1 5.2 10.2 3.4 12 1.5Z"
      fill="url(#patientFlameOuter)"
    />
    <path
      d="M12 9.5c.7 1.5 1.8 2.4 2.3 3.8.6 1.6.3 3.5-.9 4.7-.7.7-1.7 1.1-2.7 1.2-.6.1-1.2 0-1.7-.2-1.3-.5-2.2-1.7-2.3-3.1-.1-1.5.6-2.9 1.6-3.8.8-.7 1.8-1.3 2.7-2.6Z"
      fill="url(#patientFlameInner)"
    />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: String, default: 'md' },
})
</script>

<style scoped>
.patient-flame-3d {
  display: block;
  flex-shrink: 0;
}

.patient-flame-3d--xs {
  width: 0.72rem;
  height: 0.85rem;
}

.patient-flame-3d--sm {
  width: 0.95rem;
  height: 1.1rem;
}

.patient-flame-3d--md {
  width: 1.15rem;
  height: 1.35rem;
}

.patient-flame-3d--lg {
  width: 1.45rem;
  height: 1.75rem;
}
</style>
