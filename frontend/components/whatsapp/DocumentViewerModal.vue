<template>
  <Teleport to="body">
    <div v-if="open" class="doc-viewer-backdrop" @click.self="$emit('close')">
      <div class="doc-viewer-modal" role="dialog" aria-modal="true" aria-label="Visualização de documento">
        <header class="doc-viewer-header">
          <div class="doc-viewer-title-wrap">
            <strong class="doc-viewer-title">{{ fileName || 'Documento' }}</strong>
            <small class="doc-viewer-subtitle">{{ mimeType || 'Arquivo' }}</small>
          </div>
          <div class="doc-viewer-actions">
            <a
              class="doc-viewer-action"
              :href="url || '#'"
              target="_blank"
              rel="noopener noreferrer"
              download
              :aria-disabled="!url"
              @click.prevent="onDownload"
            >Baixar</a>
            <a
              class="doc-viewer-action"
              :href="url || '#'"
              target="_blank"
              rel="noopener noreferrer"
              :aria-disabled="!url"
              @click.prevent="onOpenExternal"
            >Abrir em nova aba</a>
            <button type="button" class="doc-viewer-close" aria-label="Fechar" @click="$emit('close')">×</button>
          </div>
        </header>
        <section class="doc-viewer-body">
          <iframe v-if="url" :src="url" class="doc-viewer-frame" title="Documento" />
          <div v-else class="doc-viewer-empty">Arquivo ainda indisponível para visualização.</div>
        </section>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  open: { type: Boolean, default: false },
  url: { type: String, default: '' },
  fileName: { type: String, default: '' },
  mimeType: { type: String, default: '' }
})

const emit = defineEmits(['close'])

const onDownload = () => {
  const href = String(props.url || '').trim()
  if (!href || typeof window === 'undefined') return
  const link = document.createElement('a')
  link.href = href
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  link.download = String(props.fileName || '').trim()
  link.click()
}

const onOpenExternal = () => {
  const href = String(props.url || '').trim()
  if (!href || typeof window === 'undefined') return
  window.open(href, '_blank', 'noopener,noreferrer')
}
</script>

<style scoped>
.doc-viewer-backdrop { position: fixed; inset: 0; z-index: 200; background: rgba(0, 0, 0, 0.72); display: flex; align-items: center; justify-content: center; }
.doc-viewer-modal { width: min(1240px, 96vw); height: min(92vh, 920px); border-radius: 12px; overflow: hidden; background: #111b21; border: 1px solid rgba(255, 255, 255, 0.12); display: flex; flex-direction: column; }
.doc-viewer-header { min-height: 56px; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px; background: #0f1a20; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
.doc-viewer-title-wrap { min-width: 0; display: flex; flex-direction: column; }
.doc-viewer-title { color: #e9edef; font-size: 0.92rem; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.doc-viewer-subtitle { color: #9fb0ba; font-size: 0.72rem; }
.doc-viewer-actions { display: flex; align-items: center; gap: 8px; }
.doc-viewer-action { height: 34px; padding: 0 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.14); color: #e9edef; text-decoration: none; display: inline-flex; align-items: center; font-size: 0.82rem; background: rgba(255, 255, 255, 0.02); }
.doc-viewer-close { width: 34px; height: 34px; border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 8px; background: transparent; color: #e9edef; font-size: 1.2rem; cursor: pointer; }
.doc-viewer-body { flex: 1; min-height: 0; background: #0b141a; }
.doc-viewer-frame { width: 100%; height: 100%; border: 0; background: #fff; }
.doc-viewer-empty { height: 100%; display: flex; align-items: center; justify-content: center; color: #9fb0ba; font-size: 0.9rem; }
</style>
