<template>
  <svg
    class="admin-agenda-flame-3d"
    :class="[`admin-agenda-flame-3d--${size}`]"
    viewBox="0 0 24 28"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="adminAgendaFlameOuter" x1="12" y1="2" x2="12" y2="26" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#c9b48a" />
        <stop offset="45%" stop-color="#8b967c" />
        <stop offset="100%" stop-color="#5f6a52" />
      </linearGradient>
      <linearGradient id="adminAgendaFlameInner" x1="12" y1="8" x2="12" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#fff7e8" />
        <stop offset="55%" stop-color="#d4c4a0" />
        <stop offset="100%" stop-color="#9aa888" />
      </linearGradient>
      <filter id="adminAgendaFlameShadow" x="-30%" y="-20%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="#5f6a52" flood-opacity="0.35" />
        <feDropShadow dx="0" dy="1" stdDeviation="0.5" flood-color="#ffffff" flood-opacity="0.65" />
      </filter>
    </defs>
    <path
      class="admin-agenda-flame-3d__outer"
      filter="url(#adminAgendaFlameShadow)"
      d="M12 1.5c1.2 2.8 3.4 4.4 4.6 7.1 1.4 3.1.9 6.8-1.3 9.4-1.1 1.3-2.7 2.2-4.4 2.5-1.1.2-2.2.1-3.2-.3-2.5-1-4.2-3.4-4.5-6.1-.3-2.8 1-5.6 3.1-7.4C8.1 5.2 10.2 3.4 12 1.5Z"
      fill="url(#adminAgendaFlameOuter)"
    />
    <path
      class="admin-agenda-flame-3d__inner"
      d="M12 9.5c.7 1.5 1.8 2.4 2.3 3.8.6 1.6.3 3.5-.9 4.7-.7.7-1.7 1.1-2.7 1.2-.6.1-1.2 0-1.7-.2-1.3-.5-2.2-1.7-2.3-3.1-.1-1.5.6-2.9 1.6-3.8.8-.7 1.8-1.3 2.7-2.6Z"
      fill="url(#adminAgendaFlameInner)"
    />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: String, default: 'md' },
})
</script>

<style scoped>
.admin-agenda-flame-3d {
  display: block;
  flex-shrink: 0;
}

.admin-agenda-flame-3d--sm {
  width: 0.85rem;
  height: 1rem;
}

.admin-agenda-flame-3d--md {
  width: 1.05rem;
  height: 1.25rem;
}

.admin-agenda-flame-3d--lg {
  width: 1.35rem;
  height: 1.6rem;
}
</style>
