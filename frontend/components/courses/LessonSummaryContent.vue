<template>
  <div
    v-if="html"
    class="resumo-prose"
    :class="{ 'resumo-prose--compact': compact }"
    v-html="html"
  />
  <p v-else class="resumo-prose__empty">{{ emptyText }}</p>
</template>

<script setup>
import { formatLessonSummaryHtml } from '~/utils/lesson-summary-format'

const props = defineProps({
  content: { type: String, default: '' },
  compact: { type: Boolean, default: false },
  emptyText: { type: String, default: 'Nenhuma descrição disponível para esta aula.' },
})

const html = computed(() => formatLessonSummaryHtml(props.content))
</script>
