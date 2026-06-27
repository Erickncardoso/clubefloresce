<template>
  <div class="labels-sidebar">
    <header class="labels-sidebar-header">
      <button type="button" class="labels-icon-btn" aria-label="Fechar" @click="$emit('close')">
        <ArrowLeft class="labels-header-icon" />
      </button>
      <h2 class="labels-sidebar-title">Etiquetas</h2>
      <button type="button" class="labels-icon-btn" aria-label="Nova etiqueta" @click="$emit('add-new')">
        <Plus class="labels-header-icon" />
      </button>
    </header>

    <div v-if="loading" class="labels-sidebar-state">
      <Loader class="spin labels-loader" />
    </div>

    <div v-else-if="!items.length" class="labels-sidebar-state">
      <p class="labels-empty">Nenhuma etiqueta encontrada.</p>
      <button type="button" class="labels-empty-btn" @click="$emit('add-new')">
        Criar etiqueta
      </button>
    </div>

    <div v-else class="labels-sidebar-list">
      <div
        v-for="label in items"
        :key="label.id"
        class="labels-item-wrap"
        :class="{ 'is-menu-open': openMenuId === label.id }"
        role="button"
        tabindex="0"
        @click="onRowClick(label, $event)"
        @keydown.enter.prevent="onRowClick(label, $event)"
        @keydown.space.prevent="onRowClick(label, $event)"
        @mouseenter="hoveredId = label.id"
        @mouseleave="onItemMouseLeave(label)"
      >
        <div class="labels-item">
          <WhatsappLabelTagIcon :color-hex="label.colorHex" />
          <div class="labels-item-copy">
            <span class="labels-item-title">{{ label.name }}</span>
            <span class="labels-item-subtitle">{{ formatCount(label.conversationCount) }}</span>
          </div>
        </div>

        <button
          v-show="showMenuTrigger(label)"
          type="button"
          class="labels-item-menu-btn"
          :aria-expanded="openMenuId === label.id ? 'true' : 'false'"
          aria-label="Opções da etiqueta"
          @click.stop="toggleMenu(label)"
        >
          <ChevronDown class="labels-item-menu-icon" />
        </button>

        <div
          v-if="openMenuId === label.id"
          class="labels-item-menu"
          role="menu"
          @click.stop
          @mousedown.stop
        >
          <button type="button" class="labels-item-menu-action" role="menuitem" @click="onOpenChats(label)">
            <MessageSquare class="labels-item-menu-action-icon" />
            Ver conversas
          </button>
          <div class="labels-item-menu-separator" role="separator" />
          <button type="button" class="labels-item-menu-action" role="menuitem" @click="onEdit(label)">
            <Pencil class="labels-item-menu-action-icon" />
            Editar
          </button>
          <button type="button" class="labels-item-menu-action" role="menuitem" @click="onChooseColor(label)">
            <Palette class="labels-item-menu-action-icon" />
            Escolher cor
          </button>
          <div class="labels-item-menu-separator" role="separator" />
          <button
            type="button"
            class="labels-item-menu-action labels-item-menu-action--danger"
            role="menuitem"
            @click="onDelete(label)"
          >
            <Trash2 class="labels-item-menu-action-icon" />
            Apagar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ArrowLeft, Plus, Loader, ChevronDown, Pencil, Palette, Trash2, MessageSquare } from 'lucide-vue-next'
import WhatsappLabelTagIcon from './WhatsappLabelTagIcon.vue'
import { formatLabelConversationCount } from '~/composables/whatsapp/useWhatsappLabels.js'

defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'add-new', 'edit', 'choose-color', 'delete', 'open-chats'])

const hoveredId = ref('')
const openMenuId = ref('')

const formatCount = (count) => formatLabelConversationCount(count)

const labelKey = (label) => String(label?.id || label?.labelid || '')

const showMenuTrigger = (label) => {
  const key = labelKey(label)
  return hoveredId.value === key || openMenuId.value === key
}

const toggleMenu = (label) => {
  const key = labelKey(label)
  openMenuId.value = openMenuId.value === key ? '' : key
}

const onItemMouseLeave = (label) => {
  const key = labelKey(label)
  if (openMenuId.value !== key) hoveredId.value = ''
}

const onEdit = (label) => {
  openMenuId.value = ''
  emit('edit', label)
}

const onChooseColor = (label) => {
  openMenuId.value = ''
  emit('choose-color', label)
}

const onDelete = (label) => {
  openMenuId.value = ''
  emit('delete', label)
}

const onOpenChats = (label) => {
  openMenuId.value = ''
  emit('open-chats', label)
}

const onRowClick = (label, event) => {
  const target = event?.target
  if (target instanceof Element && target.closest('.labels-item-menu-btn, .labels-item-menu')) return
  onOpenChats(label)
}

const onGlobalPointerDown = (event) => {
  if (!openMenuId.value) return
  const target = event.target
  if (target instanceof Element && target.closest('.labels-item-wrap')) return
  openMenuId.value = ''
}

onMounted(() => {
  if (typeof document === 'undefined') return
  document.addEventListener('pointerdown', onGlobalPointerDown, true)
})

onUnmounted(() => {
  if (typeof document === 'undefined') return
  document.removeEventListener('pointerdown', onGlobalPointerDown, true)
})
</script>

<style scoped>
.labels-sidebar {
  position: absolute;
  inset: 0;
  z-index: 18;
  width: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  background: #fff;
}

.labels-sidebar-header {
  flex-shrink: 0;
  min-height: 59px;
  padding: 10px 12px;
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid #e9edef;
  box-sizing: border-box;
}

.labels-sidebar-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: #111b21;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.labels-icon-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #54656f;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.labels-icon-btn:hover {
  background: rgba(11, 20, 26, 0.06);
}

.labels-header-icon {
  width: 20px;
  height: 20px;
}

.labels-sidebar-list {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.labels-item-wrap {
  position: relative;
  border-bottom: 1px solid #f0f2f5;
  cursor: pointer;
}

.labels-item-wrap.is-menu-open .labels-item,
.labels-item-wrap:hover .labels-item {
  background: #f5f6f6;
}

.labels-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 52px 14px 20px;
  background: #fff;
}

.labels-item-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.labels-item-title {
  font-size: 1rem;
  font-weight: 500;
  color: #111b21;
  line-height: 1.3;
}

.labels-item-subtitle {
  font-size: 0.875rem;
  color: #667781;
  line-height: 1.3;
}

.labels-item-menu-btn {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #54656f;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.labels-item-menu-btn:hover {
  background: rgba(11, 20, 26, 0.06);
}

.labels-item-menu-icon {
  width: 18px;
  height: 18px;
}

.labels-item-menu {
  position: absolute;
  top: calc(50% + 18px);
  right: 12px;
  min-width: 210px;
  padding: 6px 0;
  border-radius: 8px;
  border: 1px solid #e9edef;
  background: #fff;
  box-shadow: 0 2px 5px rgba(11, 20, 26, 0.08), 0 4px 14px rgba(11, 20, 26, 0.12);
  z-index: 5;
}

.labels-item-menu-separator {
  height: 1px;
  margin: 6px 0;
  background: #e9edef;
}

.labels-item-menu-action {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 20px;
  border: none;
  background: transparent;
  color: #111b21;
  font: inherit;
  font-size: 0.9375rem;
  text-align: left;
  cursor: pointer;
}

.labels-item-menu-action:hover {
  background: #f5f6f6;
}

.labels-item-menu-action--danger {
  color: #111b21;
}

.labels-item-menu-action-icon {
  width: 18px;
  height: 18px;
  color: inherit;
}

.labels-sidebar-state {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 24px 16px;
}

.labels-empty {
  margin: 0;
  color: #667781;
  font-size: 0.92rem;
  text-align: center;
}

.labels-empty-btn {
  border: none;
  background: transparent;
  color: #1daa61;
  font: inherit;
  font-size: 0.92rem;
  cursor: pointer;
}

.labels-loader {
  width: 28px;
  height: 28px;
  color: #1daa61;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
