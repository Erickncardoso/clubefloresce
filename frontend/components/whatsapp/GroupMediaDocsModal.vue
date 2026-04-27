<template>
  <Teleport to="body">
    <div v-if="open" class="group-media-backdrop" @click.self="$emit('close')">
      <aside class="group-media-modal">
        <header class="group-media-header">
          <button class="group-media-back" @click="$emit('close')">←</button>
          <h3>Mídia, links e docs</h3>
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
          <div v-if="activeTab === 'media'" class="group-media-grid">
            <button
              v-for="item in mediaItems"
              :key="item.id"
              type="button"
              class="group-media-card"
              @click="$emit('open-item', item)"
            >
              <img v-if="item.previewUrl" :src="item.previewUrl" :alt="item.label || 'Mídia'" />
              <div v-else class="group-media-card-fallback">{{ item.label || 'Mídia' }}</div>
            </button>
          </div>

          <div v-else-if="activeTab === 'documents'" class="group-media-docs-feed">
            <article v-for="item in documentItems" :key="item.id" class="group-media-doc-row">
              <header class="group-media-doc-row-head">
                <strong>{{ item.senderLabel || 'Contato' }}</strong>
                <small>{{ item.dayLabel || '' }}</small>
              </header>
              <button
                type="button"
                class="group-media-doc-card"
                @click="$emit('open-item', item)"
              >
                <img
                  v-if="item.previewUrl"
                  :src="item.previewUrl"
                  :alt="item.fileName || 'Documento'"
                  class="group-media-doc-thumb"
                />
                <div v-else class="group-media-doc-thumb group-media-doc-thumb--fallback">PDF</div>
                <div class="group-media-doc-meta">
                  <span class="group-media-doc-icon">PDF</span>
                  <div class="group-media-doc-texts">
                    <strong>{{ item.fileName || 'Documento' }}</strong>
                    <small>{{ item.subtitle || 'Documento' }}</small>
                  </div>
                </div>
                <time class="group-media-doc-time">{{ item.timeLabel || item.dateLabel || '' }}</time>
              </button>
            </article>
          </div>

          <div v-else class="group-media-links-feed">
            <article v-for="item in linkItems" :key="item.id" class="group-media-link-row">
              <header class="group-media-link-row-head">
                <strong>{{ item.senderLabel || 'Contato' }}</strong>
                <small>{{ item.dayLabel || '' }}</small>
              </header>
              <a
                class="group-media-link-card"
                :href="item.href"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img v-if="item.previewImage" :src="item.previewImage" :alt="item.title || item.href" class="group-media-link-thumb" />
                <div class="group-media-link-content">
                  <strong>{{ item.title || item.href }}</strong>
                  <small v-if="item.description">{{ item.description }}</small>
                  <small v-if="item.matchedText">{{ item.matchedText }}</small>
                  <span class="group-media-link-url">{{ item.href }}</span>
                  <p v-if="item.messageText">{{ item.messageText }}</p>
                </div>
                <time v-if="item.timeLabel" class="group-media-link-time">{{ item.timeLabel }}</time>
              </a>
            </article>
          </div>

          <p
            v-if="activeTab === 'media' && !mediaItems.length"
            class="group-media-empty"
          >
            Nenhuma mídia encontrada.
          </p>
          <p
            v-if="activeTab === 'documents' && !documentItems.length"
            class="group-media-empty"
          >
            Nenhum documento encontrado.
          </p>
          <p
            v-if="activeTab === 'links' && !linkItems.length"
            class="group-media-empty"
          >
            Nenhum link encontrado.
          </p>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  open: { type: Boolean, default: false },
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
</script>

<style scoped>
.group-media-backdrop { position: fixed; inset: 0; z-index: 130; background: rgba(0, 0, 0, 0.72); display: flex; justify-content: center; align-items: stretch; }
.group-media-modal { width: min(760px, 100vw); height: 100dvh; background: #0b141a; color: #e9edef; display: flex; flex-direction: column; }
.group-media-header { min-height: 60px; display: flex; align-items: center; gap: 12px; padding: 0 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
.group-media-back { border: none; background: transparent; color: #e9edef; font-size: 1.5rem; cursor: pointer; }
.group-media-header h3 { margin: 0; font-size: 1.25rem; font-weight: 700; }
.group-media-tabs { display: grid; grid-template-columns: repeat(3, 1fr); border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
.group-media-tab { border: none; background: transparent; color: #95a4ad; height: 54px; font-size: 1rem; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; }
.group-media-tab--active { color: #e9edef; border-bottom-color: #25d366; }
.group-media-content { flex: 1; min-height: 0; overflow-y: auto; padding: 14px; }
.group-media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(145px, 1fr)); gap: 10px; }
.group-media-card { border: none; border-radius: 8px; overflow: hidden; background: #101c24; aspect-ratio: 1 / 1; cursor: pointer; }
.group-media-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
.group-media-card-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #d1d7db; padding: 8px; text-align: center; font-size: 0.85rem; }
.group-media-list { display: flex; flex-direction: column; gap: 8px; }
.group-media-list-item { border: 1px solid rgba(255, 255, 255, 0.09); border-radius: 10px; background: #101c24; color: #e9edef; text-align: left; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; text-decoration: none; cursor: pointer; }
.group-media-list-item strong { font-size: 0.95rem; font-weight: 700; }
.group-media-list-item small { color: #9fb0ba; font-size: 0.8rem; word-break: break-all; }
.group-media-list-item--link strong { color: #25d366; }
.group-media-empty { margin: 16px 0 0; color: #9fb0ba; }
.group-media-links-feed { display: flex; flex-direction: column; gap: 14px; }
.group-media-link-row { border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 10px; }
.group-media-link-row-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.group-media-link-row-head strong { font-size: 1.05rem; color: #e9edef; }
.group-media-link-row-head small { color: #9fb0ba; font-size: 0.85rem; text-transform: lowercase; }
.group-media-link-card { display: block; text-decoration: none; background: #1a2329; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.06); overflow: hidden; color: #e9edef; position: relative; }
.group-media-link-thumb { width: 100%; max-height: 220px; object-fit: cover; display: block; background: #0f172a; }
.group-media-link-content { padding: 10px 12px 8px; display: flex; flex-direction: column; gap: 4px; }
.group-media-link-content strong { font-size: 1.02rem; line-height: 1.25; }
.group-media-link-content small { color: #c3cdd4; font-size: 0.88rem; line-height: 1.2; }
.group-media-link-url { color: #25d366; font-size: 0.95rem; word-break: break-all; }
.group-media-link-content p { margin: 2px 0 0; color: #eef3f7; font-size: 0.98rem; line-height: 1.3; white-space: pre-wrap; }
.group-media-link-time { position: absolute; right: 10px; bottom: 8px; color: #9fb0ba; font-size: 0.8rem; }
.group-media-docs-feed { display: flex; flex-direction: column; gap: 14px; }
.group-media-doc-row { border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 10px; }
.group-media-doc-row-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.group-media-doc-row-head strong { font-size: 1.03rem; color: #e9edef; }
.group-media-doc-row-head small { color: #9fb0ba; font-size: 0.85rem; text-transform: lowercase; }
.group-media-doc-card { width: 100%; border: 1px solid rgba(255, 255, 255, 0.08); background: #1b252b; border-radius: 12px; overflow: hidden; color: #e9edef; text-align: left; position: relative; padding: 0; cursor: pointer; }
.group-media-doc-thumb { width: 100%; max-height: 156px; object-fit: cover; display: block; background: #101c24; }
.group-media-doc-thumb--fallback { display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: 700; color: #fda4af; }
.group-media-doc-meta { display: flex; align-items: center; gap: 10px; padding: 10px 12px 18px; }
.group-media-doc-icon { min-width: 34px; height: 34px; border-radius: 8px; background: #e11d48; color: #fff; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
.group-media-doc-texts { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.group-media-doc-texts strong { font-size: 1rem; line-height: 1.25; color: #f8fafc; word-break: break-word; }
.group-media-doc-texts small { color: #b8c4cb; font-size: 0.86rem; }
.group-media-doc-time { position: absolute; right: 10px; bottom: 7px; color: #9fb0ba; font-size: 0.8rem; }
</style>
