<template>
  <div class="quick-replies-sidebar">
    <header class="quick-replies-sidebar-header">
      <button type="button" class="quick-replies-icon-btn" aria-label="Fechar" @click="$emit('close')">
        <ArrowLeft class="quick-replies-header-icon" />
      </button>
      <h2 class="quick-replies-sidebar-title">Respostas rápidas</h2>
      <button type="button" class="quick-replies-icon-btn" aria-label="Nova resposta" @click="$emit('add-new')">
        <Plus class="quick-replies-header-icon" />
      </button>
    </header>

    <div v-if="loading" class="quick-replies-sidebar-state">
      <Loader class="spin quick-replies-loader" />
    </div>

    <div v-else-if="!items.length" class="quick-replies-sidebar-state">
      <p class="quick-replies-empty">Nenhuma resposta rápida encontrada.</p>
    </div>

    <div v-else class="quick-replies-sidebar-list">
      <div
        v-for="reply in items"
        :key="reply.id || reply.shortCut"
        class="quick-replies-item-wrap"
        @mouseenter="hoveredId = reply.id || reply.shortCut"
        @mouseleave="onItemMouseLeave(reply)"
      >
        <button
          type="button"
          class="quick-replies-item"
          @click="$emit('select', reply)"
        >
          <span class="quick-replies-item-title">{{ reply.shortCut }}</span>
          <span class="quick-replies-item-preview">{{ preview(reply) }}</span>
        </button>

        <button
          v-show="showMenuTrigger(reply)"
          type="button"
          class="quick-replies-item-menu-btn"
          :aria-expanded="openMenuId === (reply.id || reply.shortCut) ? 'true' : 'false'"
          aria-label="Opções da resposta rápida"
          @click.stop="toggleMenu(reply)"
        >
          <ChevronDown class="quick-replies-item-menu-icon" />
        </button>

        <div
          v-if="openMenuId === (reply.id || reply.shortCut)"
          class="quick-replies-item-menu"
          role="menu"
          @click.stop
          @mousedown.stop
        >
          <button
            type="button"
            class="quick-replies-item-menu-action"
            role="menuitem"
            :disabled="Boolean(reply.onWhatsApp)"
            @click="onEdit(reply)"
          >
            <Pencil class="quick-replies-item-menu-action-icon" />
            Editar
          </button>
          <button
            type="button"
            class="quick-replies-item-menu-action quick-replies-item-menu-action--danger"
            role="menuitem"
            :disabled="Boolean(reply.onWhatsApp)"
            @click="onDelete(reply)"
          >
            <Trash2 class="quick-replies-item-menu-action-icon" />
            Apagar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ArrowLeft, Plus, Loader, ChevronDown, Pencil, Trash2 } from 'lucide-vue-next'
import { quickReplyPreviewText } from '~/composables/whatsapp/useWhatsappQuickReplies.js'

defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'select', 'add-new', 'edit', 'delete'])

const hoveredId = ref('')
const openMenuId = ref('')

const preview = (reply) => quickReplyPreviewText(reply)

const replyKey = (reply) => String(reply?.id || reply?.shortCut || '')

const showMenuTrigger = (reply) => {
  if (reply?.onWhatsApp) return false
  const key = replyKey(reply)
  return hoveredId.value === key || openMenuId.value === key
}

const toggleMenu = (reply) => {
  const key = replyKey(reply)
  openMenuId.value = openMenuId.value === key ? '' : key
}

const onItemMouseLeave = (reply) => {
  const key = replyKey(reply)
  if (openMenuId.value !== key) hoveredId.value = ''
}

const onEdit = (reply) => {
  openMenuId.value = ''
  emit('edit', reply)
}

const onDelete = (reply) => {
  openMenuId.value = ''
  emit('delete', reply)
}

const onGlobalPointerDown = (event) => {
  if (!openMenuId.value) return
  const target = event.target
  if (target instanceof Element && target.closest('.quick-replies-item-wrap')) return
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
.quick-replies-sidebar {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  background: #fff;
}

.quick-replies-sidebar-header {
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

.quick-replies-sidebar-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: #111b21;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quick-replies-icon-btn {
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

.quick-replies-icon-btn:hover {
  background: rgba(11, 20, 26, 0.06);
}

.quick-replies-header-icon {
  width: 20px;
  height: 20px;
}

.quick-replies-sidebar-list {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.quick-replies-item-wrap {
  position: relative;
  border-bottom: 1px solid #f0f2f5;
}

.quick-replies-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 14px 52px 14px 20px;
  border: 0;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.quick-replies-item-wrap:hover .quick-replies-item,
.quick-replies-item:hover {
  background: #f5f6f6;
}

.quick-replies-item-title {
  font-size: 1rem;
  font-weight: 600;
  color: #111b21;
  line-height: 1.3;
}

.quick-replies-item-preview {
  font-size: 0.875rem;
  color: #667781;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: pre-wrap;
}

.quick-replies-item-menu-btn {
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

.quick-replies-item-menu-btn:hover {
  background: rgba(11, 20, 26, 0.06);
}

.quick-replies-item-menu-icon {
  width: 18px;
  height: 18px;
}

.quick-replies-item-menu {
  position: absolute;
  top: calc(50% + 18px);
  right: 12px;
  min-width: 180px;
  padding: 6px 0;
  border-radius: 8px;
  border: 1px solid #e9edef;
  background: #fff;
  box-shadow: 0 2px 5px rgba(11, 20, 26, 0.08), 0 4px 14px rgba(11, 20, 26, 0.12);
  z-index: 5;
}

.quick-replies-item-menu-action {
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

.quick-replies-item-menu-action:hover:not(:disabled) {
  background: #f5f6f6;
}

.quick-replies-item-menu-action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.quick-replies-item-menu-action--danger {
  color: #ea0038;
}

.quick-replies-item-menu-action-icon {
  width: 18px;
  height: 18px;
  color: inherit;
}

.quick-replies-sidebar-state {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
}

.quick-replies-empty {
  margin: 0;
  color: #667781;
  font-size: 0.92rem;
  text-align: center;
}

.quick-replies-loader {
  width: 28px;
  height: 28px;
  color: #00a884;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
