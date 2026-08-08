<template>
  <div
    class="cf-phone-field form-group field--float"
    :class="{ focused: focused || countryMenuOpen }"
  >
    <label :for="inputId">
      {{ label }}<span v-if="required" class="label-required"> *</span>
    </label>
    <div class="cf-phone-input cf-squircle--control">
      <div ref="countryRef" class="cf-phone-country">
        <button
          type="button"
          class="cf-phone-country-btn"
          :aria-expanded="countryMenuOpen"
          aria-haspopup="listbox"
          @click="toggleCountryMenu"
        >
          <span class="cf-phone-flag" aria-hidden="true">
            <img
              class="cf-phone-flag-img"
              :src="countryFlagUrl(selectedCountry.code)"
              :alt="selectedCountry.code"
              width="20"
              height="15"
              loading="lazy"
              decoding="async"
            >
          </span>
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
            <span class="cf-phone-flag" aria-hidden="true">
              <img
                class="cf-phone-flag-img"
                :src="countryFlagUrl(country.code)"
                :alt="country.code"
                width="20"
                height="15"
                loading="lazy"
                decoding="async"
              >
            </span>
            <span class="cf-phone-country-name">{{ country.name }}</span>
            <span class="cf-phone-dial">{{ country.dial }}</span>
          </li>
        </ul>
      </div>

      <input
        :id="inputId"
        ref="inputRef"
        type="tel"
        inputmode="numeric"
        autocomplete="tel-national"
        :value="displayValue"
        :placeholder="currentPlaceholder"
        :maxlength="inputMaxLength"
        :required="required"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
        @keydown="onKeydown"
      >
    </div>
    <p v-if="hint" class="field-hint">{{ hint }}</p>
  </div>
</template>

<script setup>
import { ChevronDown } from 'lucide-vue-next'
import {
  countryFlagUrl,
  defaultPhoneCountry,
  digitsOnly,
  formatNationalPhone,
  parseInternationalPhone,
  phoneCountries,
  phonePlaceholder,
  toInternationalPhone,
} from '~/utils/phone-countries.js'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: 'WhatsApp' },
  hint: { type: String, default: '' },
  required: { type: Boolean, default: false },
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

const currentPlaceholder = computed(() => phonePlaceholder(selectedCountry.value))
const inputMaxLength = computed(() => {
  // BR celular: (11) 99999-9999 = 15 chars
  const max = Number(selectedCountry.value?.maxDigits) || 11
  return formatNationalPhone('9'.repeat(max), selectedCountry.value).length
})

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

function applyDigits(rawDigits) {
  const max = Number(selectedCountry.value?.maxDigits) || 11
  const limited = digitsOnly(rawDigits).slice(0, max)
  nationalDigits.value = limited
  displayValue.value = formatNationalPhone(limited, selectedCountry.value)

  // Força o DOM — evita digitar além da máscara
  nextTick(() => {
    if (inputRef.value && inputRef.value.value !== displayValue.value) {
      inputRef.value.value = displayValue.value
    }
  })

  emitValue()
}

function onInput(event) {
  applyDigits(event.target.value)
  // Sync imediato no mesmo evento (antes do nextTick)
  event.target.value = displayValue.value
}

function onKeydown(event) {
  // Bloqueia digitação extra quando já atingiu o máximo de dígitos
  const max = Number(selectedCountry.value?.maxDigits) || 11
  const isDigit = event.key.length === 1 && /\d/.test(event.key)
  if (!isDigit) return
  if (nationalDigits.value.length >= max && !isSelectionReplacing()) {
    event.preventDefault()
  }
}

function isSelectionReplacing() {
  const el = inputRef.value
  if (!el) return false
  return el.selectionStart !== el.selectionEnd
}

function selectCountry(country) {
  selectedCountry.value = country
  applyDigits(nationalDigits.value)
  countryMenuOpen.value = false
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
  overflow: visible;
  transition: border-color 0.15s ease;
}

.cf-phone-field.focused .cf-phone-input {
  border-color: #b8d4b4;
  box-shadow: none;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.35rem;
  height: 1rem;
  flex-shrink: 0;
  line-height: 0;
  overflow: hidden;
  border-radius: 2px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
}

.cf-phone-flag-img {
  width: 1.35rem;
  height: 1rem;
  object-fit: cover;
  display: block;
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
  z-index: 80;
  width: min(17rem, 82vw);
  max-height: 16rem;
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
  background: rgba(139, 150, 124, 0.12);
}

.cf-phone-country-name {
  color: var(--cf-text, #141414);
  font-weight: 600;
}
</style>
