<template>
  <div
    class="patient-avatar"
    :class="[
      `patient-avatar--${size}`,
      { 'patient-avatar--ring': ring, 'patient-avatar--interactive': interactive },
    ]"
    :aria-label="label"
    role="img"
  >
    <div class="patient-avatar__shape">
      <img
        v-if="showPhoto"
        :src="src"
        :alt="name ? `Foto de ${name}` : 'Foto do perfil'"
        class="patient-avatar__media patient-avatar__media--photo"
        loading="lazy"
        @error="onImageError"
      />
      <img
        v-else
        :src="DEFAULT_PATIENT_AVATAR"
        alt=""
        class="patient-avatar__media patient-avatar__media--default"
        aria-hidden="true"
      />
    </div>
  </div>
</template>

<script setup>
import { DEFAULT_PATIENT_AVATAR } from '~/config/patient-avatar'

const props = defineProps({
  src: { type: String, default: '' },
  name: { type: String, default: '' },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg', 'xl'].includes(v),
  },
  ring: { type: Boolean, default: true },
  interactive: { type: Boolean, default: false },
})

const imageFailed = ref(false)

const showPhoto = computed(() => Boolean(props.src?.trim()) && !imageFailed.value)

const label = computed(() => {
  if (props.name) return `Avatar de ${props.name}`
  return 'Avatar do paciente'
})

watch(() => props.src, () => {
  imageFailed.value = false
})

function onImageError() {
  imageFailed.value = true
}
</script>

<style scoped>
.patient-avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  aspect-ratio: 1;
  user-select: none;
}

.patient-avatar__shape {
  width: 100%;
  height: 100%;
  -webkit-mask-image: var(--cf-avatar-mask);
  mask-image: var(--cf-avatar-mask);
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
}

.patient-avatar__media {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: center top;
}

.patient-avatar__media--default {
  object-fit: contain;
}

.patient-avatar--interactive {
  transition: transform 0.15s ease;
}

.patient-avatar--interactive:active {
  transform: scale(0.97);
}

.patient-avatar--sm {
  width: 2.25rem;
}

.patient-avatar--md {
  width: 2.75rem;
}

.patient-avatar--lg {
  width: 3.25rem;
}

.patient-avatar--xl {
  width: 5.25rem;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.08));
}

@media (prefers-reduced-motion: reduce) {
  .patient-avatar--interactive {
    transition: none;
  }
}
</style>
