<template>
  <div
    v-if="visible"
    class="wa-notif-stack"
    :class="{ 'wa-notif-stack--expanded': expanded }"
    :style="stackStyle"
    @mouseenter="expanded = true"
    @mouseleave="expanded = false"
  >
    <article
      v-for="(item, index) in notifications"
      :key="item.id"
      class="wa-notif-card"
      :class="{
        'wa-notif-card--layered': !expanded && index > 0,
        'wa-notif-card--dragging': drag.id === item.id && drag.dragging,
      }"
      :style="cardStyle(item, index)"
      role="status"
      @pointerdown="onCardPointerDown($event, item, index)"
      @pointermove="onCardPointerMove"
      @pointerup="onCardPointerUp($event, item)"
      @pointercancel="onCardPointerCancel(item)"
    >
      <button
        type="button"
        class="wa-notif-card__close"
        aria-label="Fechar notificação"
        @click.stop="dismissWhatsappToast(item.id)"
        @pointerdown.stop
      >
        <X class="wa-notif-card__close-icon" aria-hidden="true" />
      </button>

      <div
        class="wa-notif-card__avatar"
        :style="{ backgroundColor: item.avatarColor }"
      >
        <img
          v-if="item.avatarUrl"
          :src="item.avatarUrl"
          :alt="item.displayName"
          class="wa-notif-card__avatar-img"
        >
        <span v-else class="wa-notif-card__avatar-letter">{{ item.avatarInitial }}</span>
      </div>

      <div class="wa-notif-card__body">
        <p class="wa-notif-card__title">{{ item.displayName }}</p>
        <p class="wa-notif-card__meta">
          {{ item.preview }} • {{ formatWhatsappToastRelativeTime(item.createdAt) }}
        </p>
      </div>
    </article>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { X } from 'lucide-vue-next'
import {
  dismissWhatsappToast,
  expandedState,
  formatWhatsappToastRelativeTime,
  notificationsState,
  openWhatsappToastChat,
} from '~/composables/whatsapp/useWhatsappToastNotifications.js'

const route = useRoute()
const notifications = notificationsState()
const expanded = expandedState()
const nowTick = ref(Date.now())
let tickTimer = null

const drag = reactive({
  id: null,
  startX: 0,
  startY: 0,
  deltaX: 0,
  dragging: false,
})

const SWIPE_DISMISS_PX = 96
const CLICK_SLOP_PX = 8

const visible = computed(() => {
  if (String(route.path || '') === '/whatsapp/chat') return false
  return notifications.value.length > 0
})

onMounted(() => {
  tickTimer = setInterval(() => {
    nowTick.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer)
})

const CARD_HEIGHT = 56
const STAIR_STEP = 14
const SIDE_INSET = 6
const MAX_PEEK_LAYERS = 3
const EXPANDED_GAP = 64

const stackStyle = computed(() => {
  void nowTick.value
  const count = notifications.value.length
  if (count <= 1) return { height: `${CARD_HEIGHT}px` }

  if (expanded.value) {
    return { height: `${CARD_HEIGHT + (count - 1) * EXPANDED_GAP}px` }
  }

  const layers = Math.min(count, MAX_PEEK_LAYERS)
  return { height: `${CARD_HEIGHT + (layers - 1) * STAIR_STEP}px` }
})

const canInteractWithCard = (index) => expanded.value || index === 0

const resetDrag = () => {
  drag.id = null
  drag.startX = 0
  drag.startY = 0
  drag.deltaX = 0
  drag.dragging = false
}

const onCardPointerDown = (event, item, index) => {
  if (!canInteractWithCard(index)) return
  if (event.button !== 0) return

  drag.id = item.id
  drag.startX = event.clientX
  drag.startY = event.clientY
  drag.deltaX = 0
  drag.dragging = false

  event.currentTarget.setPointerCapture(event.pointerId)
}

const onCardPointerMove = (event) => {
  if (!drag.id) return

  const deltaX = event.clientX - drag.startX
  const deltaY = event.clientY - drag.startY

  if (!drag.dragging && (Math.abs(deltaX) > CLICK_SLOP_PX || Math.abs(deltaY) > CLICK_SLOP_PX)) {
    drag.dragging = true
  }

  drag.deltaX = drag.dragging ? Math.max(0, deltaX) : 0
}

const onCardPointerUp = (event, item) => {
  if (drag.id !== item.id) return

  try {
    event.currentTarget.releasePointerCapture(event.pointerId)
  } catch {
    /* ignore */
  }

  if (drag.dragging && drag.deltaX >= SWIPE_DISMISS_PX) {
    dismissWhatsappToast(item.id)
    resetDrag()
    return
  }

  if (!drag.dragging) {
    openWhatsappToastChat(item)
  }

  resetDrag()
}

const onCardPointerCancel = (item) => {
  if (drag.id !== item.id) return
  resetDrag()
}

const cardStyle = (item, index) => {
  void nowTick.value

  let style = {}

  if (expanded.value) {
    style = {
      bottom: `${index * EXPANDED_GAP}px`,
      right: '0',
      width: '100%',
      zIndex: String(1000 - index),
    }
  } else if (index >= MAX_PEEK_LAYERS) {
    style = {
      bottom: `${(MAX_PEEK_LAYERS - 1) * STAIR_STEP}px`,
      right: `${(MAX_PEEK_LAYERS - 1) * SIDE_INSET}px`,
      width: `calc(100% - ${(MAX_PEEK_LAYERS - 1) * SIDE_INSET * 2}px)`,
      zIndex: String(1000 - index),
      opacity: '0',
      visibility: 'hidden',
      pointerEvents: 'none',
    }
  } else {
    const layer = index
    const inset = layer * SIDE_INSET
    style = {
      bottom: `${layer * STAIR_STEP}px`,
      right: `${inset}px`,
      width: `calc(100% - ${inset * 2}px)`,
      zIndex: String(1000 - index),
    }
  }

  if (drag.id === item.id && drag.deltaX > 0) {
    style.transform = `translateX(${drag.deltaX}px)`
    style.opacity = String(Math.max(0.4, 1 - drag.deltaX / 240))
    style.transition = 'none'
  }

  return style
}
</script>
