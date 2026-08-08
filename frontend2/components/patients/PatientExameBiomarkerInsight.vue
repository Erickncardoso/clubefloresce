<template>
  <span
    class="pebi"
    :class="`pebi--${tone}`"
    @mouseenter="open = true"
    @mouseleave="open = false"
    @focusin="open = true"
    @focusout="open = false"
  >
    <slot />
    <span
      v-if="open && (insight.short || insight.extended)"
      class="pebi-popover"
      role="tooltip"
    >
      <strong>{{ statusLabel }}</strong>
      <p>{{ insight.short }}</p>
      <p v-if="insight.extended" class="pebi-popover__extended">{{ insight.extended }}</p>
      <p v-if="insight.references?.length" class="pebi-popover__refs">
        Referências: {{ insight.references.join(' · ') }}
      </p>
    </span>
  </span>
</template>

<script setup>
import { computed, ref } from 'vue'
import { biomarkerStatusLabel, biomarkerStatusTone, getBiomarkerInsight } from '~/utils/lab-exam-comparison.js'

const props = defineProps({
  markerId: { type: String, default: '' },
  status: { type: String, default: 'unknown' },
})

const open = ref(false)

const tone = computed(() => biomarkerStatusTone(props.status))
const statusLabel = computed(() => biomarkerStatusLabel(props.status))
const insight = computed(() => getBiomarkerInsight(props.markerId, props.status))
</script>

<style scoped>
.pebi {
  position: relative;
  display: inline-flex;
}

.pebi-popover {
  position: absolute;
  z-index: 30;
  left: 50%;
  bottom: calc(100% + 0.45rem);
  transform: translateX(-50%);
  width: min(18rem, 70vw);
  padding: 0.65rem 0.75rem;
  border: 1px solid #e2e8e4;
  background: #fff;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
  font-size: 0.74rem;
  line-height: 1.45;
  color: #374151;
  pointer-events: none;
}

.pebi-popover strong {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.76rem;
  color: #2c322c;
}

.pebi-popover p {
  margin: 0;
}

.pebi-popover__extended {
  margin-top: 0.35rem !important;
  color: #4b5563;
}

.pebi-popover__refs {
  margin-top: 0.4rem !important;
  font-size: 0.68rem;
  color: #8b967c;
}
</style>
