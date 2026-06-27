<template>
  <Teleport to="body">
    <div v-if="open" class="wa-list-picker-overlay" @click.self="emit('close')">
      <section class="wa-list-picker-modal" role="dialog" aria-modal="true" :aria-label="title">
        <header class="wa-list-picker-header">
          <button type="button" class="wa-list-picker-close" aria-label="Fechar" @click="emit('close')">
            <X class="wa-list-picker-close-ico" />
          </button>
          <h3 class="wa-list-picker-title">{{ title }}</h3>
        </header>
        <div v-if="options.length" class="wa-list-picker-body">
          <button
            v-for="(opt, idx) in options"
            :key="`${opt.id || opt.label}-${idx}`"
            type="button"
            class="wa-list-picker-item"
            :class="{ 'is-selected': selectedIndex === idx }"
            @click="selectOption(idx, opt)"
          >
            <span class="wa-list-picker-item-copy">
              <span class="wa-list-picker-item-label">{{ opt.label }}</span>
              <span v-if="opt.description" class="wa-list-picker-item-desc">{{ opt.description }}</span>
            </span>
            <span class="wa-list-picker-radio" aria-hidden="true" />
          </button>
        </div>
        <p v-else class="wa-list-picker-empty">As opções desta lista não estão disponíveis no preview.</p>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Selecionar opção' },
  options: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'select'])

const selectedIndex = ref(-1)

const selectOption = (idx, opt) => {
  selectedIndex.value = idx
  emit('select', opt)
}

watch(() => props.open, (isOpen) => {
  if (!isOpen) selectedIndex.value = -1
})
</script>

<style scoped>
.wa-list-picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 10100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: rgba(17, 27, 33, 0.45);
  backdrop-filter: blur(2px);
}
.wa-list-picker-modal {
  width: min(100%, 420px);
  max-height: min(82vh, 560px);
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.22);
}
.wa-list-picker-header {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 0 16px;
  border-bottom: 1px solid #e9edef;
}
.wa-list-picker-close {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #54656f;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.wa-list-picker-close:hover {
  background: rgba(15, 23, 42, 0.06);
}
.wa-list-picker-close-ico {
  width: 20px;
  height: 20px;
}
.wa-list-picker-title {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: #111b21;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wa-list-picker-body {
  overflow: auto;
}
.wa-list-picker-item {
  width: 100%;
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 18px;
  border: 0;
  border-bottom: 1px solid #f0f2f5;
  background: #fff;
  text-align: left;
  cursor: pointer;
}
.wa-list-picker-item:hover {
  background: #f5f6f6;
}
.wa-list-picker-item-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.wa-list-picker-item-label {
  color: #111b21;
  font-size: 0.98rem;
  line-height: 1.35;
}
.wa-list-picker-item-desc {
  color: #667781;
  font-size: 0.82rem;
  line-height: 1.3;
}
.wa-list-picker-radio {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  border: 2px solid #8696a0;
}
.wa-list-picker-item.is-selected .wa-list-picker-radio {
  border-color: #00a884;
  box-shadow: inset 0 0 0 4px #00a884;
}
.wa-list-picker-empty {
  margin: 0;
  padding: 24px 18px;
  color: #667781;
  font-size: 0.92rem;
  line-height: 1.45;
  text-align: center;
}
</style>
