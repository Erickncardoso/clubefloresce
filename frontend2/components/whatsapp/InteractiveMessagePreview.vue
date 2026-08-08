<template>
  <section class="interactive-preview" :class="{ 'interactive-preview--playground': playground }">
    <div v-if="playground" class="interactive-playground-bar">
      <p class="interactive-playground-step">{{ playgroundStepText }}</p>
      <button
        v-if="hasSimulationState"
        type="button"
        class="interactive-playground-reset"
        @click="resetSimulation"
      >
        Testar de novo
      </button>
    </div>

    <div v-if="!playground" class="interactive-preview-header">Pré-visualização</div>

    <article class="interactive-chat-preview">
      <div class="interactive-bubble interactive-bubble--out">
        <div class="interactive-menu-card">
          <header v-if="previewType !== 'pix-button' && previewType !== 'request-payment'" class="interactive-menu-top">
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
              Mídia indisponível no preview.
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
              @click="selectPoll(idx)"
            >
              <span class="interactive-poll-radio" aria-hidden="true" />
              <span>{{ opt.label }}</span>
            </button>
            <p v-if="!pollPreviewOptions.length" class="interactive-preview-empty">Adicione opções para visualizar a enquete.</p>
          </div>

          <button
            v-else-if="previewType === 'list'"
            type="button"
            class="interactive-list-btn"
            :class="{ 'is-disabled': !hasListOptions }"
            :disabled="!hasListOptions"
            @click="openListPicker"
          >
            <span class="interactive-list-btn-ico" aria-hidden="true">≡</span>
            <span>{{ previewListButtonLabel }}</span>
          </button>

          <div v-else-if="previewType === 'carousel'" class="interactive-carousel">
            <article v-for="(card, cardIdx) in previewCarouselCards" :key="`preview-carousel-card-${cardIdx}`" class="interactive-carousel-card">
              <div class="interactive-carousel-media">
                <img v-if="card.image" :src="card.image" alt="Imagem do cartão" class="interactive-carousel-img" />
              </div>
              <p class="interactive-carousel-title">{{ card.title }}</p>
              <button
                v-for="(action, actionIdx) in card.actions"
                :key="`preview-carousel-action-${cardIdx}-${actionIdx}`"
                type="button"
                class="interactive-carousel-action"
                :class="{ 'is-selected': selectedCarouselActionKey === `${cardIdx}-${actionIdx}` }"
                @click="selectCarousel(`${cardIdx}-${actionIdx}`)"
              >
                <span v-if="action.type === 'COPY'" class="interactive-copy-ico" aria-hidden="true" />
                <img v-else src="/icons/curva-seta-para-a-esquerda.svg" alt="" aria-hidden="true" class="interactive-menu-arrow" />
                <span class="interactive-menu-label" :class="{ 'is-copy-label': action.type === 'COPY' }">{{ action.label }}</span>
                <small v-if="playground" class="interactive-type-tag interactive-type-tag--on-btn">{{ action.type }}</small>
              </button>
            </article>
          </div>

          <div v-else-if="previewType !== 'request-payment' && previewType !== 'pix-button'" class="interactive-menu-actions">
            <div v-for="(opt, idx) in parsedOptions" :key="`preview-opt-${idx}`" class="interactive-menu-action-row" :class="{ 'is-section': opt.isSection }">
              <template v-if="opt.isSection">
                <span class="interactive-menu-section">{{ opt.label }}</span>
              </template>
              <button
                v-else
                type="button"
                class="interactive-menu-action-btn"
                :class="{ 'is-selected': selectedButtonIdx === idx }"
                @click="selectButton(idx)"
              >
                <span v-if="opt.buttonType === 'COPY'" class="interactive-copy-ico" aria-hidden="true" />
                <img v-else src="/icons/curva-seta-para-a-esquerda.svg" alt="" aria-hidden="true" class="interactive-menu-arrow" />
                <span class="interactive-menu-label" :class="{ 'is-copy-label': opt.buttonType === 'COPY' }">{{ opt.label }}</span>
                <small v-if="playground" class="interactive-type-tag interactive-type-tag--on-btn">{{ opt.buttonType }}</small>
              </button>
            </div>
            <p v-if="previewType === 'button' && !parsedOptions.length" class="interactive-preview-empty interactive-preview-empty--actions">
              Adicione botões para visualizar as ações.
            </p>
          </div>

          <WhatsappPixMessageCard
            v-else-if="previewType === 'request-payment' || previewType === 'pix-button'"
            :variant="previewType"
            :pix-name="previewPixName"
            :pix-type="previewPixType"
            :pix-key="previewPixKey"
            :amount="props.form?.amount"
            @action="simulatePixAction"
          >
            <template #meta>
              <span class="interactive-menu-time">20:20 ✓✓</span>
            </template>
          </WhatsappPixMessageCard>

          <div v-if="previewFooterText" class="interactive-menu-footer">{{ previewFooterText }}</div>
        </div>
      </div>

      <div v-if="simulationFeedback" class="interactive-bubble interactive-bubble--in">
        <p class="interactive-reply-title">{{ simulationFeedback.title }}</p>
        <small class="interactive-reply-type">{{ simulationFeedback.typeLabel }}</small>
        <p v-if="simulationFeedback.detail" class="interactive-reply-payload">{{ simulationFeedback.detail }}</p>
      </div>
      <div v-else class="interactive-bubble interactive-bubble--hint">
        <small>{{ playgroundHintText }}</small>
      </div>
    </article>

    <WhatsappListPickerModal
      v-if="previewType === 'list'"
      :open="listPickerOpen"
      :title="previewListButtonLabel"
      :options="listPickerOptions"
      @close="listPickerOpen = false"
      @select="onListPickerSelect"
    />
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import WhatsappListPickerModal from '~/components/whatsapp/WhatsappListPickerModal.vue'
import WhatsappPixMessageCard from '~/components/whatsapp/WhatsappPixMessageCard.vue'
import { formatPixKeyDisplay, handleInteractiveMenuOptionClick, pixTypeDisplayLabel } from '~/composables/whatsapp/useWhatsappInteractive.js'

const props = defineProps({
  form: {
    type: Object,
    default: () => ({ type: 'button', text: '', choicesText: '' })
  },
  playground: {
    type: Boolean,
    default: false
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
  return custom || 'Ver opções'
})
const previewPixType = computed(() => String(props.form?.pixType || 'EVP').trim().toUpperCase())
const previewPixName = computed(() => String(props.form?.pixName || 'Pix').trim() || 'Pix')
const previewPixKey = computed(() => String(props.form?.pixKey || '').trim())
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
const previewMediaLoadError = ref(false)
const listPickerOpen = ref(false)
const selectedButtonIdx = ref(-1)
const selectedListKey = ref('')
const selectedCarouselActionKey = ref('')
const selectedPollIdx = ref(-1)
const paymentSimulated = ref(false)

const parseLine = (line, idx) => {
  if (line.startsWith('[') && line.endsWith(']')) {
    return { isSection: true, label: line.slice(1, -1).trim(), key: `section-${idx}` }
  }
  const parts = line.split('|').map((v) => String(v || '').trim())
  const label = String(parts[0] || '').trim()
  if (!label) return null
  const id = parts[1] || ''
  const type = String(parts[2] || 'REPLY').toUpperCase()
  const description = parts[3] || ''
  const allowed = ['REPLY', 'URL', 'COPY', 'CALL']
  return {
    isSection: false,
    label,
    id,
    description,
    buttonType: allowed.includes(type) ? type : 'REPLY',
    key: `action-${idx}`
  }
}

const parsedOptions = computed(() => {
  const lines = String(props.form?.choicesText || '')
    .split('\n')
    .map((line) => String(line || '').trim())
    .filter(Boolean)

  const normalized = lines
    .map((line, idx) => parseLine(line, idx))
    .filter(Boolean)

  if (normalized.length > 0) return normalized
  return []
})

const listPreviewRows = computed(() => parsedOptions.value)

const listPickerOptions = computed(() => {
  return listPreviewRows.value
    .filter((row) => !row.isSection)
    .map((row) => ({
      id: String(row.id || row.label || '').trim(),
      label: String(row.label || '').trim(),
      description: String(row.description || '').trim()
    }))
    .filter((opt) => opt.label)
})

const hasListOptions = computed(() => listPickerOptions.value.length > 0)

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

const pollPreviewOptions = computed(() => {
  const lines = String(props.form?.choicesText || '')
    .split('\n')
    .map((line) => String(line || '').trim())
    .filter(Boolean)
    .map((line) => ({ label: String(line.split('|')[0] || '').trim() }))
    .filter((opt) => opt.label)
  if (lines.length > 0) return lines
  return []
})

const selectedAction = computed(() => {
  if (previewType.value === 'poll') return pollPreviewOptions.value[selectedPollIdx.value] || null
  if (previewType.value === 'list') {
    return listPreviewRows.value.find((row) => row.key === selectedListKey.value && !row.isSection) || null
  }
  if (previewType.value === 'carousel') {
    const key = String(selectedCarouselActionKey.value || '')
    if (!key.includes('-')) return null
    const [cardIdxRaw, actionIdxRaw] = key.split('-')
    const card = previewCarouselCards.value[Number(cardIdxRaw)]
    return card?.actions?.[Number(actionIdxRaw)] || null
  }
  const opt = parsedOptions.value[selectedButtonIdx.value]
  return opt?.isSection ? null : opt
})

const actionTypeLabel = (type) => {
  const safe = String(type || 'REPLY').toUpperCase()
  if (safe === 'URL') return 'Abre link no navegador'
  if (safe === 'COPY') return 'Copia texto para a área de transferência'
  if (safe === 'CALL') return 'Inicia chamada telefônica'
  return 'Envia resposta no chat'
}

const buildFeedback = (action) => {
  if (!action) return null
  const label = String(action.label || '').trim()
  const type = String(action.buttonType || action.type || 'REPLY').toUpperCase()
  const id = String(action.id || '').trim()

  if (previewType.value === 'poll') {
    return {
      title: `Voto registrado: "${label}"`,
      typeLabel: props.form?.allowMultiple ? 'Enquete · múltipla escolha' : 'Enquete · voto único',
      detail: 'No WhatsApp, a opção escolhida é enviada como resposta.'
    }
  }

  if (type === 'URL') {
    return {
      title: `Clicou em "${label}"`,
      typeLabel: actionTypeLabel(type),
      detail: id ? `URL: ${id}` : 'Nenhuma URL informada no builder.'
    }
  }
  if (type === 'COPY') {
    return {
      title: `Clicou em "${label}"`,
      typeLabel: actionTypeLabel(type),
      detail: id ? `Texto copiado: ${id}` : `Copiaria o rótulo: ${label}`
    }
  }
  if (type === 'CALL') {
    return {
      title: `Clicou em "${label}"`,
      typeLabel: actionTypeLabel(type),
      detail: id ? `Telefone: ${id}` : 'Nenhum número informado no builder.'
    }
  }
  return {
    title: `Resposta enviada: "${label}"`,
    typeLabel: actionTypeLabel(type),
    detail: id ? `ID da resposta: ${id}` : 'Resposta rápida enviada ao chat.'
  }
}

const simulationFeedback = computed(() => {
  if (paymentSimulated.value) {
    if (previewType.value === 'pix-button') {
      const key = formatPixKeyDisplay(previewPixType.value, previewPixKey.value)
      return {
        title: 'Chave Pix copiada',
        typeLabel: 'Ação COPY',
        detail: key ? `${pixTypeDisplayLabel(previewPixType.value)}: ${key}` : previewPixKey.value || 'Nenhuma chave informada'
      }
    }
    return {
      title: previewType.value === 'request-payment' ? 'Pagamento simulado' : 'PIX simulado',
      typeLabel: 'Fluxo de pagamento WhatsApp',
      detail: `Chave ${previewPixType.value} · ${previewPixName.value}`
    }
  }
  return buildFeedback(selectedAction.value)
})

const hasSimulationState = computed(() => Boolean(simulationFeedback.value))

const playgroundStepText = computed(() => {
  const type = previewType.value
  if (type === 'list') {
    if (!hasListOptions.value) return 'Adicione opções na lista para testar o modal'
    if (listPickerOpen.value) return 'Escolha um item no modal (igual ao WhatsApp)'
    if (!selectedListKey.value) return `1. Toque em "${previewListButtonLabel.value}" · 2. Escolha no modal`
    return 'Item selecionado — veja a resposta simulada abaixo'
  }
  if (type === 'poll') {
    if (!pollPreviewOptions.value.length) return 'Adicione opções para visualizar a enquete'
    return 'Toque em uma opção da enquete'
  }
  if (type === 'carousel') return 'Toque em um botão de um cartão'
  if (type === 'request-payment') return 'Toque em "Revisar e pagar"'
  if (type === 'pix-button') return 'Toque em "Copiar chave Pix"'
  if (type === 'button' && !parsedOptions.value.length) return 'Adicione botões para visualizar as ações'
  return 'Toque em um botão da mensagem'
})

const playgroundHintText = computed(() => {
  if (!props.playground) return 'Clique em um botão acima para simular a conversa.'
  return playgroundStepText.value
})

const resetSimulation = () => {
  listPickerOpen.value = false
  selectedButtonIdx.value = -1
  selectedListKey.value = ''
  selectedCarouselActionKey.value = ''
  selectedPollIdx.value = -1
  paymentSimulated.value = false
}

const openListPicker = () => {
  if (!hasListOptions.value) return
  listPickerOpen.value = true
}

const onListPickerSelect = (opt) => {
  listPickerOpen.value = false
  const label = String(opt?.label || '').trim()
  const id = String(opt?.id || '').trim()
  if (!label) return
  const row = listPreviewRows.value.find((item) => {
    if (item.isSection) return false
    if (id && item.id === id) return true
    return item.label === label
  })
  selectedListKey.value = row?.key || ''
}

const selectButton = (idx) => {
  selectedButtonIdx.value = idx
}

const selectPoll = (idx) => {
  selectedPollIdx.value = idx
}

const selectCarousel = (key) => {
  selectedCarouselActionKey.value = key
}

const simulatePixAction = () => {
  if (previewType.value === 'pix-button' && props.playground) {
    handleInteractiveMenuOptionClick({
      buttonType: 'COPY',
      id: previewPixKey.value,
      label: 'Copiar chave Pix'
    })
  }
  paymentSimulated.value = true
}

watch(previewType, resetSimulation)
watch(
  () => props.form?.choicesText,
  () => {
    selectedButtonIdx.value = -1
    selectedListKey.value = ''
    selectedPollIdx.value = -1
    listPickerOpen.value = false
  }
)
watch(
  () => props.form?.carouselCardsText,
  () => {
    selectedCarouselActionKey.value = ''
  }
)
watch(previewButtonMediaUrl, () => {
  previewMediaLoadError.value = false
})
</script>

<style scoped>
.interactive-preview {
  margin-top: 0;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.interactive-playground-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #d1d7db;
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(11, 20, 26, 0.06);
}
.interactive-playground-step {
  margin: 0;
  flex: 1;
  font-size: 0.8rem;
  line-height: 1.4;
  color: #111b21;
  font-weight: 600;
}
.interactive-playground-reset {
  flex-shrink: 0;
  border: 0;
  background: transparent;
  color: #008069;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
  padding: 2px 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.interactive-preview-header {
  font-size: 0.78rem;
  font-weight: 600;
  color: #667781;
  margin-bottom: 8px;
}
.interactive-chat-preview {
  display: grid;
  gap: 8px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.interactive-bubble {
  border-radius: 8px;
  background: #d9fdd3;
  padding: 0;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(11, 20, 26, 0.08);
  max-width: 100%;
  box-sizing: border-box;
}
.interactive-bubble--out {
  margin-left: auto;
  width: 100%;
  max-width: 100%;
}
.interactive-bubble--in {
  margin-right: auto;
  width: 100%;
  background: #fff;
  padding: 10px 12px;
  border: 1px solid #e9edef;
}
.interactive-bubble--hint {
  margin-right: auto;
  width: 100%;
  max-width: 100%;
  background: #fff;
  padding: 10px 12px;
  color: #54656f;
  border-radius: 8px;
  border: 1px dashed #c5ccd1;
  box-sizing: border-box;
}
.interactive-bubble--hint small {
  display: block;
  line-height: 1.4;
  font-size: 0.8rem;
}
.interactive-reply-title {
  margin: 0;
  color: #111b21;
  font-weight: 600;
  font-size: 0.88rem;
  line-height: 1.35;
}
.interactive-reply-type {
  display: block;
  margin-top: 4px;
  color: #008069;
  font-size: 0.74rem;
  font-weight: 600;
}
.interactive-reply-payload {
  margin: 6px 0 0;
  color: #54656f;
  font-size: 0.82rem;
  line-height: 1.35;
  word-break: break-word;
}
.interactive-menu-card {
  width: 100%;
  background: #d9fdd3;
}
.interactive-button-media {
  border-top: 1px solid rgba(11, 20, 26, 0.06);
  border-bottom: 1px solid rgba(11, 20, 26, 0.06);
  background: #eef7eb;
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
  color: #54656f;
  font-size: 0.78rem;
}
.interactive-menu-top {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 12px 6px;
  border-bottom: 1px solid rgba(11, 20, 26, 0.06);
}
.interactive-menu-title {
  margin: 0;
  flex: 1;
  min-width: 0;
  color: #111b21;
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1.35;
  word-break: break-word;
}
.interactive-menu-time {
  color: #667781;
  font-size: 0.72rem;
  white-space: nowrap;
  flex-shrink: 0;
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
  color: #54656f;
}
.interactive-poll-option {
  width: 100%;
  min-height: 42px;
  border: 1px solid #c5ccd1;
  border-radius: 8px;
  background: #fff;
  color: #111b21;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  cursor: pointer;
  text-align: left;
}
.interactive-poll-option.is-selected {
  border-color: #008069;
  background: #f0faf5;
}
.interactive-poll-radio {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid #8696a0;
  flex-shrink: 0;
}
.interactive-poll-option.is-selected .interactive-poll-radio {
  border-color: #008069;
  background: radial-gradient(circle at center, #008069 0 45%, transparent 50%);
}
.interactive-list-btn {
  width: 100%;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-top: 1px solid rgba(11, 20, 26, 0.06);
  background: transparent;
  color: #008069;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  box-sizing: border-box;
}
.interactive-list-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.45);
}
.interactive-list-btn.is-disabled,
.interactive-list-btn:disabled {
  color: #8696a0;
  cursor: default;
  opacity: 0.72;
}
.interactive-preview-empty {
  margin: 0;
  padding: 10px 12px 12px;
  font-size: 0.82rem;
  color: #8696a0;
  line-height: 1.35;
  text-align: center;
}
.interactive-preview-empty--actions {
  border-top: 1px solid rgba(11, 20, 26, 0.06);
}
.interactive-list-btn-ico {
  font-size: 0.96rem;
  line-height: 1;
}
.interactive-carousel {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 8px 8px 10px;
}
.interactive-carousel-card {
  min-width: 180px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(11, 20, 26, 0.08);
  background: #fff;
  flex-shrink: 0;
}
.interactive-carousel-media {
  height: 96px;
  background: linear-gradient(160deg, #e8f5e9, #f0f2f5);
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
  color: #111b21;
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.3;
}
.interactive-carousel-action {
  width: 100%;
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-top: 1px solid #e9edef;
  background: transparent;
  cursor: pointer;
  padding: 0 8px;
}
.interactive-carousel-action.is-selected {
  background: #f0faf5;
}
.interactive-menu-action-row {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 10px;
  border-top: 1px solid rgba(11, 20, 26, 0.06);
  max-width: 100%;
  box-sizing: border-box;
}
.interactive-menu-action-btn {
  min-height: 44px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  background: transparent;
  cursor: pointer;
  box-sizing: border-box;
  padding: 0 4px;
}
.interactive-menu-action-btn.is-selected {
  background: rgba(255, 255, 255, 0.5);
}
.interactive-menu-card :deep(.wa-pix-meta .interactive-menu-time) {
  font-size: 0.72rem;
  color: #667781;
  white-space: nowrap;
}
.interactive-menu-footer {
  border-top: 1px solid rgba(11, 20, 26, 0.06);
  padding: 8px 12px 10px;
  font-size: 0.82rem;
  color: #54656f;
  line-height: 1.35;
  word-break: break-word;
}
.interactive-menu-action-row:first-child { border-top: 0; }
.interactive-menu-action-row.is-section {
  min-height: 34px;
  justify-content: flex-start;
  background: rgba(255, 255, 255, 0.35);
}
.interactive-menu-section {
  color: #008069;
  font-size: 0.72rem;
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
  color: #008069;
  font-size: 0.9rem;
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.interactive-menu-label.is-copy-label {
  color: #027eb5;
}
.interactive-copy-ico {
  width: 13px;
  height: 13px;
  border: 2px solid #027eb5;
  border-radius: 2px;
  position: relative;
  display: inline-block;
  flex-shrink: 0;
}
.interactive-copy-ico::after {
  content: '';
  position: absolute;
  width: 9px;
  height: 9px;
  border: 2px solid #027eb5;
  border-radius: 2px;
  left: 5px;
  top: -5px;
  background: transparent;
}
.interactive-type-tag {
  color: #667781;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  flex-shrink: 0;
}
.interactive-type-tag--on-btn {
  background: #f0f2f5;
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
