<template>
  <div
    class="cf-phone-field form-group field--float"
    :class="{ focused: focused || countryMenuOpen }"
  >
    <label :for="inputId">{{ label }}</label>
    <div class="cf-phone-input cf-squircle--control">
      <div ref="countryRef" class="cf-phone-country">
        <button
          type="button"
          class="cf-phone-country-btn"
          :aria-expanded="countryMenuOpen"
          aria-haspopup="listbox"
          @click="toggleCountryMenu"
        >
          <span class="cf-phone-flag" aria-hidden="true">{{ selectedCountry.flag }}</span>
          <span class="cf-phone-dial">{{ selectedCountry.dial }}</span>
          <ChevronDown class="cf-phone-chevron" aria-hidden="true" />
        </button>

        <ul v-if="countryMenuOpen" class="cf-phone-country-menu" role="listbox">
          <li
            v-for="country in phoneCountries"
            :key="country.code"
            role="option"
            :aria-selected="country.code === selectedCountry.code"
            @click="selectCountry(country)"
          >
            <span class="cf-phone-flag" aria-hidden="true">{{ country.flag }}</span>
            <span class="cf-phone-country-name">{{ country.name }}</span>
            <span class="cf-phone-dial">{{ country.dial }}</span>
          </li>
        </ul>
      </div>

      <input
        :id="inputId"
        ref="inputRef"
        type="tel"
        inputmode="tel"
        autocomplete="tel"
        :value="displayValue"
        :placeholder="selectedCountry.mask.replace(/#/g, '0')"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
      >
    </div>
    <p v-if="hint" class="field-hint">{{ hint }}</p>
  </div>
</template>

<script setup>
import { ChevronDown } from 'lucide-vue-next'
import {
  defaultPhoneCountry,
  digitsOnly,
  formatNationalPhone,
  parseInternationalPhone,
  phoneCountries,
  toInternationalPhone,
} from '~/utils/phone-countries.js'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: 'WhatsApp' },
  hint: { type: String, default: '' },
  focused: { type: Boolean, default: false },
  inputId: { type: String, default: 'cf-phone-input' },
})

const emit = defineEmits(['update:modelValue', 'focus', 'blur'])

const countryRef = ref(null)
const inputRef = ref(null)
const countryMenuOpen = ref(false)
const selectedCountry = ref(defaultPhoneCountry)
const nationalDigits = ref('')
const displayValue = ref('')

function syncFromModel(value) {
  const parsed = parseInternationalPhone(value)
  selectedCountry.value = parsed.country
  nationalDigits.value = parsed.nationalDigits
  displayValue.value = parsed.display
}

watch(() => props.modelValue, (value) => {
  const international = toInternationalPhone(nationalDigits.value, selectedCountry.value)
  if ((value || '') !== international) {
    syncFromModel(value)
  }
}, { immediate: true })

function emitValue() {
  emit('update:modelValue', toInternationalPhone(nationalDigits.value, selectedCountry.value))
}

function onInput(event) {
  nationalDigits.value = digitsOnly(event.target.value).slice(0, selectedCountry.value.maxDigits)
  displayValue.value = formatNationalPhone(nationalDigits.value, selectedCountry.value)
  emitValue()
}

function selectCountry(country) {
  selectedCountry.value = country
  nationalDigits.value = nationalDigits.value.slice(0, country.maxDigits)
  displayValue.value = formatNationalPhone(nationalDigits.value, country)
  countryMenuOpen.value = false
  emitValue()
  nextTick(() => inputRef.value?.focus())
}

function toggleCountryMenu() {
  countryMenuOpen.value = !countryMenuOpen.value
}

function onFocus() {
  emit('focus')
}

function onBlur() {
  window.setTimeout(() => {
    countryMenuOpen.value = false
    emit('blur')
  }, 120)
}

function onDocumentClick(event) {
  if (!countryRef.value?.contains(event.target)) {
    countryMenuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>

<style scoped>
.cf-phone-field {
  position: relative;
}

.cf-phone-input {
  display: flex;
  align-items: stretch;
  min-height: 3.1rem;
  border: 1.5px solid #e8ece9;
  background: var(--cf-surface, #fff);
  overflow: hidden;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.cf-phone-field.focused .cf-phone-input {
  border-color: #d4a8ac;
  box-shadow: 0 0 0 3px rgba(201, 137, 142, 0.1);
}

.cf-phone-country {
  position: relative;
  flex-shrink: 0;
  border-right: 1px solid #e8ece9;
}

.cf-phone-country-btn {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  height: 100%;
  padding: 0 0.65rem;
  border: none;
  background: #f8faf9;
  cursor: pointer;
  font-family: inherit;
  color: var(--cf-text, #141414);
}

.cf-phone-flag {
  font-size: 1.05rem;
  line-height: 1;
}

.cf-phone-dial {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--cf-text-muted, #525252);
}

.cf-phone-chevron {
  width: 0.9rem;
  height: 0.9rem;
  color: #9ca3af;
}

.cf-phone-input input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  padding: 0.95rem 0.85rem 0.85rem 0.7rem;
  font-family: inherit;
  font-size: 0.95rem;
  color: var(--cf-text, #141414);
  outline: none;
}

.cf-phone-country-menu {
  position: absolute;
  top: calc(100% + 0.35rem);
  left: 0;
  z-index: 30;
  width: min(16rem, 78vw);
  max-height: 14rem;
  overflow-y: auto;
  margin: 0;
  padding: 0.35rem;
  list-style: none;
  border: 1px solid #e8ece9;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(20, 20, 20, 0.12);
}

.cf-phone-country-menu li {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.55rem;
  padding: 0.55rem 0.6rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.82rem;
}

.cf-phone-country-menu li:hover,
.cf-phone-country-menu li[aria-selected='true'] {
  background: #faf5f6;
}

.cf-phone-country-name {
  color: var(--cf-text, #141414);
  font-weight: 600;
}
</style>
