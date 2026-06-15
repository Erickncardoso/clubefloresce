<template>
  <div ref="rootRef" class="cf-select" :class="{ 'cf-select--open': open, 'cf-select--disabled': disabled }">
    <button
      :id="id"
      type="button"
      class="cf-select-trigger cf-squircle cf-squircle--control"
      :disabled="disabled"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :aria-labelledby="id ? `${id}-label` : undefined"
      @click="toggle"
    >
      <span class="cf-select-value">{{ selectedLabel }}</span>
      <ChevronDown class="cf-select-chevron" aria-hidden="true" />
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="menuRef"
        class="cf-select-menu cf-squircle cf-squircle--control"
        role="listbox"
        :style="menuStyle"
      >
        <button
          v-for="option in options"
          :key="String(option.value)"
          type="button"
          role="option"
          class="cf-select-option"
          :class="{ 'cf-select-option--active': option.value === modelValue }"
          :aria-selected="option.value === modelValue"
          @click="select(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ChevronDown } from 'lucide-vue-next'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  options: {
    type: Array,
    default: () => [],
  },
  id: {
    type: String,
    default: undefined,
  },
  placeholder: {
    type: String,
    default: 'Selecionar',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const rootRef = ref(null)
const menuRef = ref(null)
const menuStyle = ref({})

const selectedLabel = computed(() => {
  const match = props.options.find((option) => option.value === props.modelValue)
  return match?.label ?? props.placeholder
})

function updateMenuPosition() {
  const root = rootRef.value
  if (!root) return

  const rect = root.getBoundingClientRect()
  menuStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 6}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    zIndex: 12000,
  }
}

function close() {
  open.value = false
}

function toggle() {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) {
    nextTick(() => updateMenuPosition())
  }
}

function select(value) {
  emit('update:modelValue', value)
  close()
}

function onDocumentClick(event) {
  if (!open.value) return
  const target = event.target
  if (rootRef.value?.contains(target) || menuRef.value?.contains(target)) return
  close()
}

function onKeydown(event) {
  if (event.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', updateMenuPosition)
  window.addEventListener('scroll', updateMenuPosition, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', updateMenuPosition)
  window.removeEventListener('scroll', updateMenuPosition, true)
})
</script>

<style scoped>
.cf-select {
  position: relative;
  width: 100%;
}

.cf-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  min-height: 3rem;
  padding: 0.85rem 0.9rem;
  border: 1.5px solid #e8ece9;
  background: #fff;
  color: #1a2e24;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.field--float .cf-select-trigger {
  padding-top: 0.95rem;
}

.cf-select-trigger:hover:not(:disabled) {
  border-color: #d4e5d1;
}

.cf-select-trigger:focus-visible {
  outline: none;
  border-color: #b8d4b4;
  box-shadow: 0 0 0 3px rgba(45, 90, 39, 0.08);
}

.cf-select--open .cf-select-trigger {
  border-color: #b8d4b4;
  box-shadow: 0 0 0 3px rgba(45, 90, 39, 0.08);
}

.cf-select-trigger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cf-select-value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cf-select-chevron {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  color: #7a8a82;
  transition: transform 0.15s ease;
}

.cf-select--open .cf-select-chevron {
  transform: rotate(180deg);
  color: #2d5a27;
}

.cf-select-menu {
  overflow: hidden;
  border: 1px solid #e2e8e4;
  background: #fff;
  box-shadow:
    0 4px 6px rgba(26, 46, 36, 0.04),
    0 12px 28px rgba(26, 46, 36, 0.1);
  padding: 0.35rem;
}

.cf-select-option {
  display: block;
  width: 100%;
  border: none;
  background: transparent;
  color: #1a2e24;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 500;
  text-align: left;
  padding: 0.65rem 0.75rem;
  border-radius: calc(var(--cf-radius-control, 1.625rem) - 0.35rem);
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}

.cf-select-option:hover {
  background: #f4f8f3;
}

.cf-select-option--active {
  background: #edf5eb;
  color: #2d5a27;
  font-weight: 700;
}

.cf-select-option:focus-visible {
  outline: 2px solid #9fc499;
  outline-offset: 1px;
}

@supports (corner-shape: squircle) {
  .cf-select-trigger.cf-squircle--control,
  .cf-select-menu.cf-squircle--control {
    corner-shape: squircle;
  }
}
</style>
