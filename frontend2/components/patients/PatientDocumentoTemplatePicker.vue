<template>
  <div ref="rootRef" class="pdoc-picker">
    <button
      type="button"
      class="pdoc-picker-trigger"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="open = !open"
    >
      <span class="pdoc-picker-trigger__text">{{ selectedLabel }}</span>
      <ChevronDown class="pdoc-picker-trigger__icon" :class="{ 'pdoc-picker-trigger__icon--open': open }" />
    </button>

    <div v-if="open" class="pdoc-picker-menu" role="listbox">
      <button
        v-for="template in templates"
        :key="template.id"
        type="button"
        class="pdoc-picker-item"
        :class="{ 'pdoc-picker-item--active': template.id === modelValue }"
        role="option"
        :aria-selected="template.id === modelValue"
        @click="selectTemplate(template.id)"
      >
        <span class="pdoc-picker-item__label">{{ template.label }}</span>
        <span class="pdoc-picker-item__category">{{ template.category }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import { DOCUMENTO_TEMPLATES } from '~/utils/documento-templates.js'

const props = defineProps({
  modelValue: { type: String, default: 'blank' },
  templates: { type: Array, default: () => DOCUMENTO_TEMPLATES },
})

const emit = defineEmits(['update:modelValue', 'change'])

const open = ref(false)
const rootRef = ref(null)

const selectedLabel = computed(() => {
  const item = props.templates.find((template) => template.id === props.modelValue)
  return item?.label || 'Em branco'
})

function selectTemplate(id) {
  emit('update:modelValue', id)
  emit('change', id)
  open.value = false
}

function onClickOutside(event) {
  if (!rootRef.value?.contains(event.target)) open.value = false
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
})
</script>

<style scoped>
.pdoc-picker {
  position: relative;
  min-width: min(100%, 18rem);
}

.pdoc-picker-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  width: 100%;
  min-height: 2.5rem;
  padding: 0.45rem 0.75rem;
  border: 1px solid #e2e8e4;
  border-radius: var(--cf-radius-control);
  background: #fff;
  font: inherit;
  color: #2c322c;
  cursor: pointer;
  text-align: left;
}

.pdoc-picker-trigger__text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
  font-weight: 500;
}

.pdoc-picker-trigger__icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  color: #8a9288;
  transition: transform 0.15s ease;
}

.pdoc-picker-trigger__icon--open {
  transform: rotate(180deg);
}

.pdoc-picker-menu {
  position: absolute;
  top: calc(100% + 0.35rem);
  left: 0;
  z-index: 40;
  width: min(100%, 22rem);
  max-height: 18rem;
  overflow: auto;
  padding: 0.35rem;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  background: #fff;
  box-shadow: 0 12px 32px rgba(28, 32, 28, 0.12);
}

.pdoc-picker-item {
  display: grid;
  gap: 0.1rem;
  width: 100%;
  padding: 0.55rem 0.65rem;
  border: none;
  border-radius: calc(var(--cf-radius-control) - 0.15rem);
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.pdoc-picker-item:hover,
.pdoc-picker-item--active {
  background: #f3f5f3;
}

.pdoc-picker-item__label {
  font-size: 0.84rem;
  font-weight: 600;
  color: #2c322c;
  line-height: 1.35;
}

.pdoc-picker-item__category {
  font-size: 0.72rem;
  color: #8a9288;
}
</style>
