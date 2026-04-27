<template>
  <section class="interactive-preview">
    <div class="interactive-preview-header">Pré-visualização</div>
    <article class="interactive-chat-preview">
      <div class="interactive-bubble interactive-bubble--out">
        <div class="interactive-menu-card">
          <header class="interactive-menu-top">
            <p class="interactive-menu-title">{{ previewTitle }}</p>
            <span class="interactive-menu-time">20:20 ✓✓</span>
          </header>
          <div v-if="previewType === 'button' && previewButtonMediaUrl" class="interactive-button-media">
            <video
              v-if="previewButtonMediaKind === 'video' && !previewMediaLoadError"
              class="interactive-button-media-video"
              :src="previewButtonMediaUrl"
              controls
              muted
              playsinline
              @error="previewMediaLoadError = true"
            />
            <img
              v-else-if="!previewMediaLoadError"
              class="interactive-button-media-image"
              :src="previewButtonMediaUrl"
              alt="Prévia da mídia do botão"
              @error="previewMediaLoadError = true"
            />
            <div v-else class="interactive-button-media-fallback">
              Midia indisponivel no preview. URL detectada: {{ previewButtonMediaUrl }}
            </div>
          </div>
          <div v-if="previewType === 'poll'" class="interactive-poll-preview">
            <p class="interactive-poll-subtitle">Selecione uma opção</p>
            <button
              v-for="(opt, idx) in pollPreviewOptions"
              :key="`preview-poll-opt-${idx}`"
              type="button"
              class="interactive-poll-option"
              :class="{ 'is-selected': selectedPollIdx === idx }"
              @click="selectedPollIdx = idx"
            >
              <span class="interactive-poll-radio" aria-hidden="true" />
              <span>{{ opt.label }}</span>
            </button>
          </div>
          <button v-else-if="previewType === 'list'" type="button" class="interactive-list-btn" :class="{ 'is-active': listPanelOpen }" @click="listPanelOpen = !listPanelOpen">
            <span class="interactive-list-btn-ico" aria-hidden="true">≣</span>
            <span>{{ previewListButtonLabel }}</span>
          </button>
          <div v-if="previewType === 'list' && listPanelOpen" class="interactive-list-panel">
            <button v-for="(opt, idx) in listPreviewOptions" :key="`preview-list-opt-${idx}`" type="button" class="interactive-list-panel-item" :class="{ 'is-selected': selectedListIdx === idx }" @click="selectedListIdx = idx">
              <span>{{ opt.label }}</span>
              <small class="interactive-type-tag">{{ opt.buttonType }}</small>
            </button>
          </div>
          <div v-else-if="previewType === 'carousel'" class="interactive-carousel">
            <article v-for="(card, cardIdx) in previewCarouselCards" :key="`preview-carousel-card-${cardIdx}`" class="interactive-carousel-card">
              <div class="interactive-carousel-media">
                <img v-if="card.image" :src="card.image" alt="Imagem do cartão" class="interactive-carousel-img" />
              </div>
              <p class="interactive-carousel-title">{{ card.title }}</p>
              <button v-for="(action, actionIdx) in card.actions" :key="`preview-carousel-action-${cardIdx}-${actionIdx}`" type="button" class="interactive-carousel-action" :class="{ 'is-selected': selectedCarouselActionKey === `${cardIdx}-${actionIdx}` }" @click="selectedCarouselActionKey = `${cardIdx}-${actionIdx}`">
                <span v-if="action.type === 'COPY'" class="interactive-copy-ico" aria-hidden="true" />
                <img v-else src="/icons/curva-seta-para-a-esquerda.svg" alt="" aria-hidden="true" class="interactive-menu-arrow" />
                <span class="interactive-menu-label" :class="{ 'is-copy-label': action.type === 'COPY' }">{{ action.label }}</span>
                <small class="interactive-type-tag">{{ action.type }}</small>
              </button>
            </article>
          </div>
          <div v-else-if="previewType !== 'request-payment' && previewType !== 'pix-button'" class="interactive-menu-actions">
            <div v-for="(opt, idx) in parsedOptions" :key="`preview-opt-${idx}`" class="interactive-menu-action-row" :class="{ 'is-section': opt.isSection }">
              <template v-if="opt.isSection">
                <span class="interactive-menu-section">{{ opt.label }}</span>
              </template>
              <button v-else type="button" class="interactive-menu-action-btn" :class="{ 'is-selected': selectedButtonIdx === idx }" @click="selectedButtonIdx = idx">
                <span v-if="opt.buttonType === 'COPY'" class="interactive-copy-ico" aria-hidden="true" />
                <img v-else src="/icons/curva-seta-para-a-esquerda.svg" alt="" aria-hidden="true" class="interactive-menu-arrow" />
                <span class="interactive-menu-label" :class="{ 'is-copy-label': opt.buttonType === 'COPY' }">{{ opt.label }}</span>
                <small class="interactive-type-tag">{{ opt.buttonType }}</small>
              </button>
            </div>
          </div>
          <div v-else-if="previewType === 'request-payment'" class="interactive-payment-preview">
            <p class="interactive-payment-amount">R$ {{ previewAmount }}</p>
            <p class="interactive-payment-meta">PIX {{ previewPixType }} {{ previewPixName }}</p>
            <button type="button" class="interactive-payment-action">Revisar e pagar</button>
          </div>
          <div v-else-if="previewType === 'pix-button'" class="interactive-payment-preview">
            <p class="interactive-payment-meta">PIX {{ previewPixType }} {{ previewPixName }}</p>
            <button type="button" class="interactive-payment-action">Pagar com PIX</button>
          </div>
          <div v-if="previewFooterText" class="interactive-menu-footer">{{ previewFooterText }}</div>
        </div>
      </div>

      <div v-if="selectedActionLabel" class="interactive-bubble interactive-bubble--in">
        <p class="interactive-reply-title">Usuário clicou em "{{ selectedActionLabel }}"</p>
        <small class="interactive-reply-type">Tipo {{ selectedActionType }}</small>
        <p v-if="selectedActionPayload" class="interactive-reply-payload">{{ selectedActionPayload }}</p>
      </div>
      <div v-else class="interactive-bubble interactive-bubble--hint">
        <small>Clique em um botão acima para simular a conversa em tempo real.</small>
      </div>
    </article>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  form: {
    type: Object,
    default: () => ({ type: 'button', text: '', choicesText: '' })
  }
})

const previewTitle = computed(() => {
  const text = String(props.form?.text || '').trim()
  if (text) return text
  const type = String(props.form?.type || 'button')
  if (type === 'poll') return 'Enquete de exemplo'
  if (type === 'list') return 'Lista de exemplo'
  if (type === 'carousel') return 'Carrossel de exemplo'
  return 'Botões de exemplo'
})
const previewType = computed(() => String(props.form?.type || 'button').trim().toLowerCase())
const previewListButtonLabel = computed(() => {
  const custom = String(props.form?.listButton || '').trim()
  return custom || 'Abrir lista de opções'
})
const previewPixType = computed(() => String(props.form?.pixType || 'EVP').trim().toUpperCase())
const previewPixName = computed(() => String(props.form?.pixName || 'Pix').trim() || 'Pix')
const previewFooterText = computed(() => String(props.form?.footerText || '').trim())
const previewButtonMediaUrl = computed(() => String(props.form?.imageButton || '').trim())
const previewButtonMediaKind = computed(() => {
  const url = previewButtonMediaUrl.value.toLowerCase()
  if (!url) return ''
  if (url.startsWith('data:video/')) return 'video'
  if (url.startsWith('data:image/')) return 'image'
  if (/\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url)) return 'video'
  return 'image'
})
const previewAmount = computed(() => {
  const value = Number(props.form?.amount || 0)
  if (!Number.isFinite(value) || value <= 0) return '0,00'
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
})
const previewMediaLoadError = ref(false)
const listPanelOpen = ref(false)
const selectedButtonIdx = ref(-1)
const selectedListIdx = ref(-1)
const selectedCarouselActionKey = ref('')
const selectedPollIdx = ref(-1)

const parsedOptions = computed(() => {
  const lines = String(props.form?.choicesText || '')
    .split('\n')
    .map((line) => String(line || '').trim())
    .filter(Boolean)

  const normalized = lines
    .map((line, idx) => {
      if (line.startsWith('[') && line.endsWith(']')) {
        return { isSection: true, label: line.slice(1, -1).trim(), key: `section-${idx}` }
      }
      const [labelRaw, , typeRaw] = line.split('|').map((v) => String(v || '').trim())
      const label = String(labelRaw || '').trim()
      if (!label) return null
      const type = String(typeRaw || 'REPLY').toUpperCase()
      const allowed = ['REPLY', 'URL', 'COPY', 'CALL']
      return { isSection: false, label, buttonType: allowed.includes(type) ? type : 'REPLY', key: `action-${idx}` }
    })
    .filter(Boolean)

  if (normalized.length > 0) return normalized
  return [
    { isSection: false, label: 'Opção 1', key: 'fallback-1' },
    { isSection: false, label: 'Opção 2', key: 'fallback-2' }
  ]
})
const previewCarouselCards = computed(() => {
  const raw = String(props.form?.carouselCardsText || '')
  const blocks = raw.split(/\n\s*\n/g).map((block) => block.trim()).filter(Boolean)
  const cards = blocks.map((block) => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
    const title = String(lines[0] || '').trim() || 'Texto do cartão'
    const image = String(lines[1] || '').trim()
    const actions = lines.slice(2).map((line) => {
      const [btnTextRaw, btnIdRaw, btnTypeRaw] = line.split('|').map((v) => String(v || '').trim())
      const type = String(btnTypeRaw || 'REPLY').toUpperCase()
      const allowed = ['REPLY', 'URL', 'COPY', 'CALL']
      return {
        label: btnTextRaw || 'Nome do botão',
        id: btnIdRaw || '',
        type: allowed.includes(type) ? type : 'REPLY'
      }
    }).filter(Boolean)
    return {
      title,
      image,
      actions: actions.length ? actions : [{ label: 'Nome do botão', id: '', type: 'REPLY' }]
    }
  }).filter(Boolean)
  if (cards.length > 0) return cards.slice(0, 6)
  return [{ title: 'Texto do cartão', image: '', actions: [{ label: 'Nome do botão', id: '', type: 'REPLY' }, { label: 'Nome do botão', id: '', type: 'REPLY' }] }]
})
const listPreviewOptions = computed(() => parsedOptions.value.filter((opt) => !opt?.isSection))
const pollPreviewOptions = computed(() => {
  const lines = String(props.form?.choicesText || '')
    .split('\n')
    .map((line) => String(line || '').trim())
    .filter(Boolean)
    .map((line) => ({ label: String(line.split('|')[0] || '').trim() }))
    .filter((opt) => opt.label)
  if (lines.length > 0) return lines
  return [{ label: 'Opção 1' }, { label: 'Opção 2' }]
})
const selectedAction = computed(() => {
  if (previewType.value === 'poll') return pollPreviewOptions.value[selectedPollIdx.value] || null
  if (previewType.value === 'list') return listPreviewOptions.value[selectedListIdx.value] || null
  if (previewType.value === 'carousel') {
    const key = String(selectedCarouselActionKey.value || '')
    if (!key.includes('-')) return null
    const [cardIdxRaw, actionIdxRaw] = key.split('-')
    const card = previewCarouselCards.value[Number(cardIdxRaw)]
    return card?.actions?.[Number(actionIdxRaw)] || null
  }
  return parsedOptions.value[selectedButtonIdx.value] || null
})
const selectedActionLabel = computed(() => String(selectedAction.value?.label || '').trim())
const selectedActionType = computed(() => String(selectedAction.value?.buttonType || selectedAction.value?.type || '').trim())
const selectedActionPayload = computed(() => {
  const action = selectedAction.value
  if (!action) return ''
  if (previewType.value === 'poll') return `Voto enviado: ${action.label}`
  const type = String(action.buttonType || action.type || '').toUpperCase()
  const id = String(action.id || '').trim()
  if (type === 'URL') return `Abrira URL: ${id || '(nao informado)'}`
  if (type === 'CALL') return `Iniciara chamada para: ${id || '(nao informado)'}`
  if (type === 'COPY') return `Copiara: ${id || action.label || '(nao informado)'}`
  return `Resposta enviada: ${id || action.label || '(nao informado)'}`
})

watch(previewType, () => {
  listPanelOpen.value = false
  selectedButtonIdx.value = -1
  selectedListIdx.value = -1
  selectedCarouselActionKey.value = ''
  selectedPollIdx.value = -1
})
watch(previewButtonMediaUrl, () => {
  previewMediaLoadError.value = false
})
</script>

<style scoped>
.interactive-preview { margin-top: 18px; }
.interactive-preview-header {
  font-size: 0.8rem;
  font-weight: 700;
  color: #94a3b8;
  margin-bottom: 8px;
}
.interactive-chat-preview {
  border-radius: 16px;
  background: linear-gradient(180deg, #0b1220 0%, #07101c 100%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 10px;
  display: grid;
  gap: 8px;
}
.interactive-bubble {
  border-radius: 16px;
  background: #005c4b;
  padding: 0;
  overflow: hidden;
}
.interactive-bubble--out {
  margin-left: auto;
  width: min(100%, 480px);
}
.interactive-bubble--in {
  margin-right: auto;
  width: min(92%, 420px);
  background: #111827;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.interactive-bubble--hint {
  margin-right: auto;
  width: min(92%, 420px);
  background: rgba(148, 163, 184, 0.12);
  padding: 8px 10px;
  color: #cbd5e1;
}
.interactive-reply-title { margin: 0; color: #d1fae5; font-weight: 700; font-size: 0.9rem; }
.interactive-reply-type { color: #86efac; font-size: 0.72rem; }
.interactive-reply-payload { margin: 6px 0 0; color: #93c5fd; font-size: 0.84rem; }
.interactive-menu-card {
  width: 100%;
  background: linear-gradient(180deg, #0f5c4f 0%, #0c5145 100%);
}
.interactive-button-media {
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(15, 23, 32, 0.25);
}
.interactive-button-media-image,
.interactive-button-media-video {
  width: 100%;
  max-height: 180px;
  display: block;
  object-fit: cover;
}
.interactive-button-media-fallback {
  padding: 10px 12px;
  color: #cbd5e1;
  font-size: 0.78rem;
}
.interactive-menu-top {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
}
.interactive-menu-title {
  margin: 0;
  flex: 1;
  min-width: 0;
  color: #f8fafc;
  font-size: 1.02rem;
  font-weight: 700;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.interactive-menu-time {
  color: rgba(233, 237, 237, 0.72);
  font-size: 0.78rem;
  white-space: nowrap;
}
.interactive-menu-actions { display: flex; flex-direction: column; }
.interactive-poll-preview {
  display: grid;
  gap: 8px;
  padding: 10px 12px 12px;
}
.interactive-poll-subtitle {
  margin: 0;
  font-size: 0.86rem;
  color: rgba(233, 237, 237, 0.82);
}
.interactive-poll-option {
  width: 100%;
  min-height: 42px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 10px;
  background: rgba(15, 23, 32, 0.28);
  color: #e9edef;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
}
.interactive-poll-option.is-selected {
  border-color: rgba(34, 197, 94, 0.65);
}
.interactive-poll-radio {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid rgba(233, 237, 237, 0.86);
}
.interactive-poll-option.is-selected .interactive-poll-radio {
  border-color: #22c55e;
  background: radial-gradient(circle at center, #22c55e 0 45%, transparent 50%);
}
.interactive-list-btn {
  width: 100%;
  min-height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: #53bdeb;
  font-size: 1.06rem;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.interactive-list-btn.is-active {
  background: rgba(255, 255, 255, 0.08);
}
.interactive-list-btn-ico {
  font-size: 0.96rem;
  line-height: 1;
}
.interactive-list-panel {
  display: grid;
  gap: 1px;
  background: rgba(255, 255, 255, 0.12);
}
.interactive-list-panel-item {
  border: 0;
  min-height: 44px;
  text-align: left;
  padding: 0 14px;
  background: rgba(7, 34, 29, 0.96);
  color: #d1fae5;
  font-size: 0.92rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.interactive-list-panel-item.is-selected {
  color: #22c55e;
}
.interactive-carousel {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 8px 8px 10px;
}
.interactive-carousel-card {
  min-width: 215px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(15, 23, 32, 0.3);
}
.interactive-carousel-media {
  height: 106px;
  background: linear-gradient(160deg, rgba(25, 54, 138, 0.25), rgba(12, 25, 42, 0.4));
}
.interactive-carousel-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.interactive-carousel-title {
  margin: 0;
  padding: 10px 12px 8px;
  color: #f8fafc;
  font-size: 1.03rem;
  font-weight: 700;
}
.interactive-carousel-action {
  width: 100%;
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  cursor: pointer;
}
.interactive-carousel-action.is-selected {
  background: rgba(255, 255, 255, 0.08);
}
.interactive-menu-action-row {
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}
.interactive-menu-action-btn {
  min-height: 52px;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.interactive-menu-action-btn.is-selected {
  background: rgba(255, 255, 255, 0.08);
}
.interactive-payment-preview {
  display: grid;
  gap: 8px;
  padding: 10px 12px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}
.interactive-payment-amount {
  margin: 0;
  color: #d1fae5;
  font-size: 1.26rem;
  font-weight: 800;
}
.interactive-payment-meta {
  margin: 0;
  color: rgba(233, 237, 237, 0.78);
  font-size: 0.9rem;
}
.interactive-payment-action {
  border: 0;
  min-height: 42px;
  border-radius: 999px;
  font-weight: 700;
  color: #052e16;
  background: #22c55e;
}
.interactive-menu-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  padding: 8px 12px 10px;
  font-size: 0.82rem;
  color: rgba(233, 237, 237, 0.82);
}
.interactive-menu-action-row:first-child { border-top: 0; }
.interactive-menu-action-row.is-section {
  min-height: 34px;
  justify-content: flex-start;
  background: rgba(0, 0, 0, 0.12);
}
.interactive-menu-section {
  color: rgba(232, 245, 241, 0.82);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.interactive-menu-arrow {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}
.interactive-menu-label {
  color: #22c55e;
  font-size: 1.08rem;
  font-weight: 700;
}
.interactive-menu-label.is-copy-label {
  color: #53bdeb;
}
.interactive-copy-ico {
  width: 13px;
  height: 13px;
  border: 2px solid #53bdeb;
  border-radius: 2px;
  position: relative;
  display: inline-block;
}
.interactive-copy-ico::after {
  content: '';
  position: absolute;
  width: 9px;
  height: 9px;
  border: 2px solid #53bdeb;
  border-radius: 2px;
  left: 5px;
  top: -5px;
  background: transparent;
}
.interactive-type-tag {
  color: rgba(233, 237, 237, 0.72);
  font-size: 0.66rem;
  letter-spacing: 0.04em;
}
</style>
