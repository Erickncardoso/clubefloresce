<template>
  <div v-if="isForwarded || linkPreview" class="msg-rich-block">
    <div v-if="isForwarded" class="msg-forwarded-label" aria-label="Mensagem encaminhada">
      <Forward class="msg-forwarded-icon" aria-hidden="true" />
      <span>Encaminhada</span>
    </div>

    <a
      v-if="linkPreview"
      :href="linkPreview.url"
      target="_blank"
      rel="noopener noreferrer"
      class="msg-link-preview"
      @click.stop
    >
      <WhatsappRemoteImage
        v-if="linkPreview.imageUrl"
        :src="linkPreview.imageUrl"
        class="msg-link-preview-image-wrap"
      />
      <div class="msg-link-preview-meta">
        <strong class="msg-link-preview-title">{{ linkPreview.title }}</strong>
        <p v-if="linkPreview.description" class="msg-link-preview-desc">{{ linkPreview.description }}</p>
        <span v-if="previewSource" class="msg-link-preview-source">{{ previewSource }}</span>
      </div>
    </a>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Forward } from 'lucide-vue-next'
import WhatsappRemoteImage from './WhatsappRemoteImage.vue'

const props = defineProps({
  isForwarded: { type: Boolean, default: false },
  linkPreview: { type: Object, default: null }
})

const previewSource = computed(() => {
  const fromPreview = String(props.linkPreview?.source || '').trim()
  if (fromPreview) return fromPreview
  const url = String(props.linkPreview?.url || '').trim()
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./i, '')
  } catch {
    return ''
  }
})
</script>
