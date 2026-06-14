<template>
  <div class="resumo-editor" :class="{ 'resumo-editor--compact': compact }">
    <div class="resumo-editor__head">
      <div>
        <h3 class="resumo-editor__title">{{ compact ? 'Resumo da aula' : 'Resumo didático' }}</h3>
        <p v-if="!compact" class="resumo-editor__hint">
          Escreva manualmente ou gere com IA a partir da transcrição do vídeo no Cloudinary.
        </p>
      </div>
      <div class="resumo-editor__actions">
        <button
          type="button"
          class="resumo-editor__btn resumo-editor__btn--ghost"
          :disabled="generating || saving || !canUseAi"
          :title="aiDisabledReason"
          @click="generateWithAi"
        >
          <Sparkles :size="15" />
          {{ generating ? 'Gerando…' : 'Gerar com IA' }}
        </button>
        <button
          type="button"
          class="resumo-editor__btn resumo-editor__btn--primary"
          :disabled="saving || generating || !hasChanges"
          @click="saveSummary"
        >
          {{ saving ? 'Salvando…' : 'Salvar resumo' }}
        </button>
      </div>
    </div>

    <p v-if="statusMessage" class="resumo-editor__status" :class="`resumo-editor--${statusTone}`">
      {{ statusMessage }}
    </p>

    <textarea
      v-model="draft"
      class="resumo-editor__textarea"
      :rows="compact ? 4 : 10"
      placeholder="Descreva o que a aluna vai aprender nesta aula…"
      maxlength="8000"
    />

    <p v-if="!compact && transcriptionLines > 0" class="resumo-editor__meta">
      Transcrição disponível: {{ transcriptionLines }} trechos sincronizados.
    </p>
  </div>
</template>

<script setup>
import { Sparkles } from 'lucide-vue-next'
import { isCloudinaryVideoUrl } from '~/utils/cloudinary-video'

const props = defineProps({
  lessonId: { type: String, required: true },
  lessonTitle: { type: String, default: '' },
  videoUrl: { type: String, default: '' },
  content: { type: String, default: '' },
  transcription: { type: Array, default: () => [] },
  compact: { type: Boolean, default: false },
})

const emit = defineEmits(['saved'])

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const { showToast } = useAppToast()

const draft = ref(props.content || '')
const saving = ref(false)
const generating = ref(false)
const statusMessage = ref('')
const statusTone = ref('info')
const transcriptionLines = ref(Array.isArray(props.transcription) ? props.transcription.length : 0)

const canUseAi = computed(() => isCloudinaryVideoUrl(props.videoUrl))
const aiDisabledReason = computed(() => {
  if (canUseAi.value) return 'Gera o resumo a partir da transcrição do vídeo'
  return 'Disponível apenas para vídeos enviados pelo upload (Cloudinary)'
})
const hasChanges = computed(() => draft.value.trim() !== String(props.content || '').trim())

watch(
  () => [props.lessonId, props.content, props.transcription],
  () => {
    draft.value = props.content || ''
    transcriptionLines.value = Array.isArray(props.transcription) ? props.transcription.length : 0
    statusMessage.value = ''
  },
)

function authHeaders() {
  const token = localStorage.getItem('auth_token')
  return { Authorization: `Bearer ${token}` }
}

async function syncTranscription() {
  const result = await $fetch(`${apiBase}/courses/lessons/${props.lessonId}/sync-transcription`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (Array.isArray(result?.transcription)) {
    transcriptionLines.value = result.transcription.length
  }
  return result
}

async function generateWithAi() {
  if (!canUseAi.value) {
    showToast({
      type: 'info',
      title: 'Transcrição indisponível',
      message: aiDisabledReason.value,
    })
    return
  }

  generating.value = true
  statusMessage.value = ''
  try {
    await syncTranscription().catch(() => null)

    const result = await $fetch(`${apiBase}/courses/lessons/${props.lessonId}/generate-summary`, {
      method: 'POST',
      headers: authHeaders(),
    })

    draft.value = result.content || ''
    transcriptionLines.value = result.transcriptionLines || transcriptionLines.value
    statusTone.value = 'success'
    statusMessage.value = 'Resumo gerado. Revise o texto e clique em Salvar resumo.'
    showToast({ type: 'success', title: 'Resumo gerado com IA' })
  } catch (err) {
    const message = err?.data?.message || err?.message || 'Não foi possível gerar o resumo.'
    statusTone.value = 'warn'
    statusMessage.value = message
    showToast({ type: 'error', title: 'Erro ao gerar resumo', message })
  } finally {
    generating.value = false
  }
}

async function saveSummary() {
  saving.value = true
  statusMessage.value = ''
  try {
    const lesson = await $fetch(`${apiBase}/courses/lessons/${props.lessonId}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: { content: draft.value.trim() || null },
    })
    statusTone.value = 'success'
    statusMessage.value = 'Resumo salvo com sucesso.'
    emit('saved', lesson)
    showToast({ type: 'success', title: 'Resumo salvo' })
  } catch (err) {
    const message = err?.data?.message || err?.message || 'Erro ao salvar resumo.'
    statusTone.value = 'warn'
    statusMessage.value = message
    showToast({ type: 'error', title: 'Erro ao salvar', message })
  } finally {
    saving.value = false
  }
}
</script>
