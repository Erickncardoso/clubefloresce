<template>
  <div class="group-media-shell" :class="{ 'group-media-shell--embedded': embedded }">
    <header class="group-media-header">
      <button type="button" class="group-media-back" aria-label="Voltar" @click="$emit('close')">←</button>
      <h3 :class="{ 'group-media-embedded-title': embedded }">Mídia, links e docs</h3>
    </header>

    <nav class="group-media-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="group-media-tab"
        :class="{ 'group-media-tab--active': activeTab === tab.id }"
        @click="$emit('update:active-tab', tab.id)"
      >
        {{ tab.label }}
      </button>
    </nav>

    <div class="group-media-content">
      <template v-if="activeTab === 'media'">
        <section v-for="section in mediaSections" :key="section.label" class="group-media-section">
          <h4 class="group-media-section-label">{{ section.label }}</h4>
          <div class="group-media-grid">
            <button
              v-for="item in section.items"
              :key="item.id"
              type="button"
              class="group-media-card"
              @click="$emit('open-item', item)"
            >
              <img
                v-if="item.previewUrl"
                :src="item.previewUrl"
                :alt="item.label || 'Mídia'"
                loading="lazy"
                decoding="async"
              />
              <div v-else class="group-media-card-fallback">{{ item.label || 'Mídia' }}</div>
              <span v-if="item.mediaType?.includes('video')" class="group-media-card-badge" aria-hidden="true">▶</span>
            </button>
          </div>
        </section>
        <div v-if="!mediaItems.length" class="group-media-empty-state">
          <p class="group-media-empty-title">Nenhuma mídia</p>
          <p class="group-media-empty-sub">As mídias compartilhadas na conversa aparecerão aqui.</p>
        </div>
      </template>

      <template v-else-if="activeTab === 'documents'">
        <article v-for="item in documentItems" :key="item.id" class="group-media-doc-row">
          <header class="group-media-doc-row-head">
            <strong>{{ item.senderLabel || 'Contato' }}</strong>
            <small>{{ item.dayLabel || '' }}</small>
          </header>
          <button type="button" class="group-media-doc-card" @click="$emit('open-item', item)">
            <img
              v-if="item.previewUrl"
              :src="item.previewUrl"
              :alt="item.fileName || 'Documento'"
              class="group-media-doc-thumb"
              loading="lazy"
              decoding="async"
            />
            <div class="group-media-doc-meta">
              <span class="group-media-doc-icon">{{ docIconLabel(item) }}</span>
              <div class="group-media-doc-texts">
                <strong>{{ item.fileName || 'Documento' }}</strong>
                <small>{{ item.subtitle || 'Documento' }}</small>
              </div>
            </div>
            <time class="group-media-doc-time">{{ item.timeLabel || item.dateLabel || '' }}</time>
          </button>
        </article>
        <div v-if="!documentItems.length" class="group-media-empty-state">
          <p class="group-media-empty-title">Nenhum documento</p>
          <p class="group-media-empty-sub">Os documentos compartilhados na conversa aparecerão aqui.</p>
        </div>
      </template>

      <template v-else>
        <article v-for="item in linkItems" :key="item.id" class="group-media-link-row">
          <header class="group-media-link-row-head">
            <strong>{{ item.senderLabel || 'Contato' }}</strong>
            <small>{{ item.dayLabel || '' }}</small>
          </header>
          <a class="group-media-link-card" :href="item.href" target="_blank" rel="noopener noreferrer">
            <WhatsappRemoteImage
              v-if="item.previewImage"
              :src="item.previewImage"
              :alt="item.title || item.href"
              class="group-media-link-preview-image"
            />
            <div class="group-media-link-meta">
              <strong class="group-media-link-title">{{ item.title }}</strong>
              <p v-if="item.description" class="group-media-link-desc">{{ item.description }}</p>
              <span class="group-media-link-source">{{ item.source || displayLinkHost(item.href) }}</span>
            </div>
            <p v-if="item.caption" class="group-media-link-caption">{{ item.caption }}</p>
            <time v-if="item.timeLabel" class="group-media-link-time">{{ item.timeLabel }}</time>
          </a>
        </article>
        <div v-if="!linkItems.length" class="group-media-empty-state">
          <p class="group-media-empty-title">Nenhum link</p>
          <p class="group-media-empty-sub">Os links compartilhados na conversa aparecerão aqui.</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import WhatsappRemoteImage from './WhatsappRemoteImage.vue'

const props = defineProps({
  embedded: { type: Boolean, default: false },
  activeTab: { type: String, default: 'media' },
  mediaItems: { type: Array, default: () => [] },
  documentItems: { type: Array, default: () => [] },
  linkItems: { type: Array, default: () => [] }
})

defineEmits(['close', 'update:active-tab', 'open-item'])

const tabs = [
  { id: 'media', label: 'Mídia' },
  { id: 'documents', label: 'Documentos' },
  { id: 'links', label: 'Links' }
]

const formatMonthLabel = (timestamp) => {
  const ts = Number(timestamp || 0)
  if (!ts) return 'MÍDIA'
  const date = new Date(ts)
  const now = new Date()
  if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
    return 'NESTE MÊS'
  }
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()
}

const mediaSections = computed(() => {
  const sections = new Map()
  for (const item of props.mediaItems) {
    const label = formatMonthLabel(item.timestamp)
    if (!sections.has(label)) sections.set(label, [])
    sections.get(label).push(item)
  }
  return Array.from(sections.entries()).map(([label, items]) => ({ label, items }))
})

const docIconLabel = (item) => {
  const name = String(item?.fileName || '').toLowerCase()
  if (name.endsWith('.pdf')) return 'PDF'
  if (name.endsWith('.doc') || name.endsWith('.docx')) return 'DOC'
  if (name.endsWith('.xls') || name.endsWith('.xlsx')) return 'XLS'
  if (name.endsWith('.ppt') || name.endsWith('.pptx')) return 'PPT'
  return 'DOC'
}

const displayLinkHost = (href) => {
  try {
    return new URL(String(href || '')).hostname.replace(/^www\./, '')
  } catch {
    return String(href || '').trim()
  }
}
</script>

<style scoped>
.group-media-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: #e9edef;
  background: #0b141a;
}
.group-media-shell--embedded {
  color: #111b21;
  background: #ffffff;
}
.group-media-header {
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}
.group-media-shell--embedded .group-media-header {
  border-bottom-color: #e9edef;
  background: #f0f2f5;
  min-height: 60px;
  padding: 0 8px;
}
.group-media-back {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 1.35rem;
  cursor: pointer;
  line-height: 1;
  padding: 4px 8px 4px 0;
}
.group-media-shell--embedded .group-media-back { color: #64748b; }
.group-media-shell--embedded .group-media-back:hover { color: #334155; }
.group-media-header h3 { margin: 0; font-size: 1.15rem; font-weight: 700; }
.group-media-embedded-title {
  flex: 1;
  text-align: center;
  font-size: 1rem !important;
  font-weight: 500 !important;
  padding-right: 36px;
}
.group-media-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
  background: inherit;
}
.group-media-shell--embedded .group-media-tabs {
  border-bottom-color: #e2e8f0;
  background: #ffffff;
}
.group-media-tab {
  border: none;
  background: transparent;
  color: #95a4ad;
  height: 48px;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}
.group-media-shell--embedded .group-media-tab { color: #94a3b8; }
.group-media-tab--active { color: #e9edef; border-bottom-color: #25d366; }
.group-media-shell--embedded .group-media-tab--active {
  color: #1e293b;
  border-bottom-color: #111b21;
}
.group-media-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0;
  background: inherit;
}
.group-media-shell--embedded .group-media-content { background: #ffffff; }
.group-media-section { padding: 12px 8px 4px; }
.group-media-section-label {
  margin: 0 0 8px;
  padding: 0 6px;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #8696a0;
}
.group-media-shell--embedded .group-media-section-label { color: #667781; }
.group-media-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 2px;
}
.group-media-card {
  border: none;
  border-radius: 0;
  overflow: hidden;
  background: #101c24;
  aspect-ratio: 1 / 1;
  cursor: pointer;
  padding: 0;
  position: relative;
}
.group-media-shell--embedded .group-media-card { background: #dfe5e7; }
.group-media-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  image-rendering: auto;
}
.group-media-card-badge {
  position: absolute;
  left: 6px;
  bottom: 6px;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 0.62rem;
  display: grid;
  place-items: center;
}
.group-media-card-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d1d7db;
  padding: 8px;
  text-align: center;
  font-size: 0.85rem;
}
.group-media-shell--embedded .group-media-card-fallback { color: #64748b; }
.group-media-empty-state {
  padding: 48px 16px;
  text-align: center;
}
.group-media-empty-title {
  margin: 0 0 8px;
  font-size: 1rem;
  font-weight: 600;
  color: inherit;
}
.group-media-shell--embedded .group-media-empty-title { color: #334155; }
.group-media-empty-sub {
  margin: 0;
  font-size: 0.88rem;
  color: #9fb0ba;
  line-height: 1.45;
}
.group-media-shell--embedded .group-media-empty-sub { color: #64748b; }
.group-media-links-feed,
.group-media-docs-feed {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 8px 0;
}
.group-media-link-row,
.group-media-doc-row {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding: 12px 16px 0;
}
.group-media-shell--embedded .group-media-link-row,
.group-media-shell--embedded .group-media-doc-row { border-top-color: #e9edef; }
.group-media-link-row-head,
.group-media-doc-row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 8px;
}
.group-media-link-row-head strong,
.group-media-doc-row-head strong {
  font-size: 0.82rem;
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.group-media-shell--embedded .group-media-link-row-head strong,
.group-media-shell--embedded .group-media-doc-row-head strong { color: #1e293b; }
.group-media-link-row-head small,
.group-media-doc-row-head small {
  color: #9fb0ba;
  font-size: 0.75rem;
  text-transform: lowercase;
  flex-shrink: 0;
}
.group-media-shell--embedded .group-media-link-row-head small,
.group-media-shell--embedded .group-media-doc-row-head small { color: #8696a0; }
.group-media-link-card {
  display: block;
  text-decoration: none;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e9edef;
  overflow: hidden;
  color: #111b21;
  position: relative;
}
.group-media-shell:not(.group-media-shell--embedded) .group-media-link-card {
  background: #1a2329;
  border-color: rgba(255, 255, 255, 0.06);
  color: #e9edef;
}
.group-media-link-preview-image {
  display: block;
  width: 100%;
  max-height: 160px;
  background: #f0f2f5;
}
.group-media-link-preview-image :deep(.msg-remote-image-img) {
  width: 100%;
  max-height: 160px;
  object-fit: cover;
}
.group-media-link-preview-image :deep(.msg-remote-image-fallback) {
  min-height: 96px;
}
.group-media-link-meta {
  padding: 8px 10px 10px;
  background: #f0f2f5;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
}
.group-media-shell:not(.group-media-shell--embedded) .group-media-link-meta {
  background: #202c33;
  border-top-color: rgba(255, 255, 255, 0.06);
}
.group-media-link-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
  font-size: 0.84rem;
  font-weight: 700;
  line-height: 1.35;
  color: #111b21;
}
.group-media-shell:not(.group-media-shell--embedded) .group-media-link-title { color: #e9edef; }
.group-media-link-desc {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 4px 0 0;
  font-size: 0.76rem;
  line-height: 1.35;
  color: #667781;
}
.group-media-shell:not(.group-media-shell--embedded) .group-media-link-desc { color: #aebac1; }
.group-media-link-source {
  display: block;
  margin-top: 4px;
  font-size: 0.72rem;
  line-height: 1.3;
  color: #008069;
  text-transform: lowercase;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.group-media-link-caption {
  margin: 6px 2px 0;
  padding: 0 2px 16px;
  font-size: 0.78rem;
  line-height: 1.35;
  color: #667781;
  white-space: pre-wrap;
  word-break: break-word;
}
.group-media-shell:not(.group-media-shell--embedded) .group-media-link-caption { color: #aebac1; }
.group-media-link-time {
  position: absolute;
  right: 10px;
  bottom: 8px;
  color: #8696a0;
  font-size: 0.72rem;
}
.group-media-doc-card {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: #1b252b;
  border-radius: 8px;
  overflow: hidden;
  color: #e9edef;
  text-align: left;
  position: relative;
  padding: 0;
  cursor: pointer;
}
.group-media-shell--embedded .group-media-doc-card {
  background: #ffffff;
  border-color: #e9edef;
  color: #1e293b;
}
.group-media-doc-thumb {
  width: 100%;
  max-height: 160px;
  object-fit: cover;
  display: block;
  background: #101c24;
}
.group-media-shell--embedded .group-media-doc-thumb { background: #f1f5f9; }
.group-media-doc-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 18px;
}
.group-media-doc-icon {
  min-width: 34px;
  height: 34px;
  border-radius: 8px;
  background: #e11d48;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.group-media-doc-texts {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.group-media-doc-texts strong {
  font-size: 0.95rem;
  line-height: 1.25;
  word-break: break-word;
}
.group-media-doc-texts small { color: #b8c4cb; font-size: 0.84rem; }
.group-media-shell--embedded .group-media-doc-texts small { color: #64748b; }
.group-media-doc-time {
  position: absolute;
  right: 10px;
  bottom: 7px;
  color: #9fb0ba;
  font-size: 0.78rem;
}
</style>
