<template>
  <div class="cf-tile-carousel-wrap">
    <div
      ref="trackRef"
      class="cf-tile-carousel"
      data-h-scroll
      role="list"
      :aria-label="ariaLabel"
      @scroll="onScroll"
    >
      <div
        v-for="item in items"
        :key="item.id"
        class="cf-tile-card-shell"
        role="listitem"
      >
        <article
          class="cf-tile-card-entry"
          tabindex="0"
          :aria-label="item.ariaLabel || item.label"
          @click="emit('select', item)"
          @keydown.enter.prevent="emit('select', item)"
          @keydown.space.prevent="emit('select', item)"
        >
          <div class="cf-tile-card-media">
            <div
              class="cf-tile-card cf-squircle cf-squircle--tile"
              :class="[`cf-tile-card--${item.tone || 'blue'}`, item.className]"
            >
              <img
                v-if="item.cover"
                :src="item.cover"
                alt=""
                class="cf-tile-card-cover-img"
                loading="lazy"
                decoding="async"
              />
              <div
                v-else
                class="cf-tile-card-cover-empty"
                :class="[`cf-tile-card-cover-empty--${item.tone || 'blue'}`, { 'cf-tile-card-cover-empty--add': item.isAdd }]"
              >
                <component :is="item.icon || BookOpen" class="cf-tile-card-cover-icon" />
              </div>
            </div>

            <div
              v-if="$slots.actions && !item.isAdd"
              class="cf-tile-card-actions"
              @pointerdown.stop
              @mousedown.stop
              @click.stop
            >
              <slot name="actions" :item="item" />
            </div>
          </div>

          <div class="cf-tile-card-body">
            <span class="cf-tile-card-label">{{ item.label }}</span>
            <strong class="cf-tile-card-value">{{ item.value }}</strong>
            <span v-if="item.meta" class="cf-tile-card-meta">{{ item.meta }}</span>
          </div>
        </article>
      </div>

      <slot name="trailing" />
    </div>

    <div v-if="showDots && items.length > 1" class="cf-tile-carousel-dots" aria-hidden="true">
      <span
        v-for="(_, index) in items"
        :key="index"
        class="cf-tile-carousel-dot"
        :class="{ 'cf-tile-carousel-dot--active': activeIndex === index }"
      />
    </div>
  </div>
</template>

<script setup>
import { BookOpen } from 'lucide-vue-next'

defineProps({
  items: { type: Array, default: () => [] },
  ariaLabel: { type: String, default: 'Carrossel de conteúdos' },
  showDots: { type: Boolean, default: true },
  inset: { type: String, default: '1.25rem' },
})

const emit = defineEmits(['select'])

const trackRef = ref(null)
const activeIndex = ref(0)

useVerticalWheelPassthrough(trackRef)

function onScroll() {
  const track = trackRef.value
  if (!track) return
  const card = track.querySelector('.cf-tile-card-shell')
  if (!card) return
  const gap = Number.parseFloat(getComputedStyle(track).gap) || 10
  activeIndex.value = Math.max(0, Math.round(track.scrollLeft / (card.offsetWidth + gap)))
}
</script>

<style scoped>
.cf-tile-carousel-wrap {
  margin-bottom: 0.5rem;
}

.cf-tile-carousel {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  overflow-y: visible;
  overscroll-behavior-x: contain;
  overscroll-behavior-y: auto;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: v-bind(inset);
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  margin-inline: calc(-1 * v-bind(inset));
  padding-inline: v-bind(inset);
  padding-bottom: 0.35rem;
  --cf-tile-card-w: 9.75rem;
}

.cf-tile-carousel::-webkit-scrollbar {
  display: none;
}

.cf-tile-card-shell {
  position: relative;
  flex: 0 0 var(--cf-tile-card-w);
  width: var(--cf-tile-card-w);
  scroll-snap-align: start;
}

.cf-tile-card-entry {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: transform 0.16s ease;
}

.cf-tile-card-entry:active {
  transform: scale(0.98);
}

.cf-tile-card-entry:focus-visible {
  outline: none;
}

.cf-tile-card-entry:focus-visible .cf-tile-card {
  box-shadow: 0 0 0 2px var(--cf-pink);
}

.cf-tile-card {
  width: 100%;
  aspect-ratio: 3 / 4;
  box-sizing: border-box;
  overflow: hidden;
  border: 1px solid var(--cf-border, #e4e4e0);
  background: var(--cf-green-soft, #edf3eb);
  box-shadow: var(--cf-shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.06));
}

.cf-tile-card.cf-squircle.cf-squircle--tile {
  --cf-squircle-r: var(--cf-tile-squircle-r, var(--cf-radius-squircle-tile, min(3rem, 42%)));
  border-radius: var(--cf-squircle-r);
}

@supports (corner-shape: squircle) {
  .cf-tile-card.cf-squircle.cf-squircle--tile {
    corner-shape: squircle;
  }
}

.cf-tile-card-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cf-tile-card-cover-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cf-tile-card-cover-empty--orange {
  background: #fff3e6;
  color: #c4842e;
}

.cf-tile-card-cover-empty--blue {
  background: #e8f2fa;
  color: #4a8fc7;
}

.cf-tile-card-cover-empty--yellow {
  background: #fff8e8;
  color: #c4842e;
}

.cf-tile-card-cover-empty--purple {
  background: #f0ebf8;
  color: #7c5fad;
}

.cf-tile-card-cover-empty--pink {
  background: var(--cf-pink-soft);
  color: var(--cf-pink-dark);
}

.cf-tile-card-cover-empty--green {
  background: var(--cf-green-soft);
  color: var(--cf-green-dark);
}

.cf-tile-card-cover-empty--add {
  background: var(--cf-surface, #ffffff);
  border: 1.5px dashed var(--cf-border, #e4e4e0);
  box-shadow: none;
}

.cf-tile-card-cover-icon {
  width: 1.75rem;
  height: 1.75rem;
  opacity: 0.75;
}

.cf-tile-card-body {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  padding: 0.55rem 0.1rem 0;
}

.cf-tile-card-label {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--cf-text-muted);
  line-height: 1.2;
}

.cf-tile-card-value {
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--cf-text, #141414);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cf-tile-card-meta {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--cf-text-muted, #525252);
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cf-tile-carousel-dots {
  display: flex;
  justify-content: center;
  gap: 0.35rem;
  margin-top: 0.55rem;
}

.cf-tile-carousel-dot {
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 50%;
  background: var(--cf-track);
  transition: background 0.2s ease, transform 0.2s ease;
}

.cf-tile-carousel-dot--active {
  background: var(--cf-pink);
  transform: scale(1.15);
}

.cf-tile-card-media {
  position: relative;
  width: 100%;
  /* Raio efetivo do card — compartilhado com menu ⋮ */
  --cf-tile-squircle-r: min(3rem, calc(var(--cf-tile-card-w, 9.75rem) * 0.42));
}

.cf-tile-card-actions {
  position: absolute;
  top: clamp(0.3rem, 4%, 0.5rem);
  right: clamp(0.3rem, 4%, 0.5rem);
  z-index: 5;
  pointer-events: auto;
  --cf-radius-squircle-tile: var(--cf-tile-squircle-r);
}

@media (min-width: 768px) {
  .cf-tile-carousel {
    --cf-tile-card-w: 11rem;
  }
}

@media (max-width: 380px) {
  .cf-tile-carousel {
    --cf-tile-card-w: 8.75rem;
  }
}

:deep(.cf-tile-card--add) {
  border-style: dashed;
  box-shadow: var(--cf-shadow);
}

@media (prefers-reduced-motion: reduce) {
  .cf-tile-card-entry,
  .cf-tile-carousel-dot {
    transition: none;
  }

  .cf-tile-card-entry:active {
    transform: none;
  }
}
</style>
