<template>
  <div v-if="modelValue" class="broadcast-modal-overlay" @click.self="$emit('update:modelValue', false)">
    <div class="broadcast-modal modal-card" role="dialog" aria-labelledby="broadcast-modal-title">
      <header class="broadcast-modal__header">
        <h2 id="broadcast-modal-title">Criar Transmissão</h2>
        <button type="button" class="broadcast-modal__close" aria-label="Fechar" @click="$emit('update:modelValue', false)">
          <X class="broadcast-modal__close-icon" />
        </button>
      </header>

      <form class="broadcast-modal__body" @submit.prevent="onSubmit">
        <div class="broadcast-modal__columns">
          <section class="broadcast-modal__panel broadcast-modal__panel--settings">
            <div class="modal-fields">
              <div class="field field--float">
                <label for="broadcast-name">Nome</label>
                <input
                  id="broadcast-name"
                  v-model="form.info"
                  type="text"
                  class="cf-squircle cf-squircle--control"
                  placeholder="Nome"
                  required
                >
              </div>

              <div class="field field--float">
                <label for="broadcast-flow">Fluxo</label>
                <SharedCfSelect
                  id="broadcast-flow"
                  v-model="form.flowId"
                  :options="flowSelectOptions"
                />
              </div>

              <div v-if="form.flowId === 'text'" class="field field--float">
                <label for="broadcast-message">Mensagem</label>
                <textarea
                  id="broadcast-message"
                  v-model="form.text"
                  class="cf-squircle cf-squircle--control"
                  rows="3"
                  placeholder="Digite a mensagem da transmissão..."
                  required
                />
              </div>

              <div class="field broadcast-delay-field">
                <span class="broadcast-delay-field__title">Atraso</span>

                <div class="broadcast-radio-row broadcast-delay-mode-row">
                  <label class="broadcast-radio">
                    <input v-model="form.delayMode" type="radio" value="smart">
                    <span>Atraso inteligente</span>
                  </label>
                  <label class="broadcast-radio">
                    <input v-model="form.delayMode" type="radio" value="manual">
                    <span>Atraso manual</span>
                  </label>
                </div>

                <p class="broadcast-help">
                  Defina o atraso de tempo com o qual sua transmissão funcionará. Quanto maior o atraso,
                  menos provável que sua transmissão seja confundida com spam, mas transmissões grandes
                  podem levar muito tempo.
                </p>

                <div v-if="form.delayMode === 'smart'" class="broadcast-delay-list">
                  <label v-for="preset in delayPresets" :key="preset.id" class="broadcast-radio broadcast-radio--block">
                    <input v-model="form.delayPreset" type="radio" :value="preset.id">
                    <span>{{ preset.label }}</span>
                  </label>
                </div>

                <div v-else class="broadcast-manual-delay">
                  <input
                    id="broadcast-delay-seconds"
                    v-model.number="form.manualDelaySeconds"
                    type="number"
                    min="1"
                    max="600"
                    class="cf-squircle cf-squircle--control broadcast-manual-delay__input"
                    required
                  >
                  <span class="broadcast-manual-delay__suffix">Segundos</span>
                </div>
              </div>
            </div>
          </section>

          <section class="broadcast-modal__panel broadcast-modal__panel--segment">
            <div class="broadcast-segment__head">
              <h3>Segmentação</h3>
              <button type="button" class="broadcast-link" @click="showUsersPanel = !showUsersPanel">
                {{ showUsersPanel ? 'Ocultar usuários' : 'Mostrar usuários' }}
              </button>
            </div>

            <p class="broadcast-segment__count">
              Usuários que receberão esta transmissão: <strong>{{ recipientCount }}</strong>
            </p>

            <div v-if="segmentFilters.length" class="broadcast-segment__toolbar">
              <div ref="filterMenuRootAlt" class="broadcast-filter-menu-wrap">
                <button type="button" class="broadcast-filter-add" @click.stop="toggleFilterMenu">
                  Adicionar filtro
                </button>
                <div v-if="filterMenuOpen" class="broadcast-filter-menu">
                  <p class="broadcast-filter-menu__section">Adicionar filtros</p>
                  <button type="button" class="broadcast-filter-menu__item" @click.stop="openLabelPicker">
                    Etiqueta
                    <ChevronRight class="broadcast-filter-menu__chev" />
                  </button>
                  <div v-if="labelPickerOpen" class="broadcast-filter-submenu broadcast-filter-submenu--open">
                    <button
                      v-for="label in labelOptions"
                      :key="label.id"
                      type="button"
                      class="broadcast-filter-submenu__item"
                      @click.stop="addLabelFilter(label)"
                    >
                      <span class="broadcast-filter-submenu__dot" :style="{ background: label.colorHex }" />
                      {{ label.name }}
                    </button>
                    <p v-if="!labelOptions.length" class="broadcast-filter-submenu__empty">Nenhuma etiqueta cadastrada.</p>
                  </div>
                </div>
              </div>

              <label class="broadcast-toggle">
                <input v-model="applyFiltersTogether" type="checkbox">
                <span class="broadcast-toggle__track" aria-hidden="true" />
                <span>Aplicar filtros juntos</span>
              </label>

              <button type="button" class="broadcast-reset" @click="resetFilters">
                <X class="broadcast-reset__icon" aria-hidden="true" />
                Redefinir tudo
              </button>
            </div>

            <div v-if="segmentFilters.length" class="broadcast-filter-tags">
              <span v-for="filter in segmentFilters" :key="filter.id" class="broadcast-filter-tag">
                {{ filterLabel(filter) }}
                <button type="button" aria-label="Remover filtro" @click="removeFilter(filter.id)">×</button>
              </span>
            </div>

            <div v-if="showUsersPanel" class="broadcast-users-panel">
              <WhatsappContactPicker
                :contacts="filteredPickerContacts"
                :selected-ids="selectedIds"
                :search-query="searchQuery"
                :loading="loadingContacts"
                @toggle="$emit('toggle-contact', $event)"
                @update:search-query="$emit('update:search-query', $event)"
                @search="applyPickerSearch"
              />
            </div>

            <div v-else-if="!segmentFilters.length" class="broadcast-segment__empty">
              <p>Adicionar filtros para refinar seu público</p>
              <div ref="filterMenuRoot" class="broadcast-filter-menu-wrap">
                <button type="button" class="broadcast-filter-add broadcast-filter-add--dashed" @click.stop="toggleFilterMenu">
                  Adicionar filtro
                </button>

                <div v-if="filterMenuOpen" class="broadcast-filter-menu">
                  <button type="button" class="broadcast-filter-menu__item is-disabled" disabled>
                    Pesquisas salvas
                    <ChevronRight class="broadcast-filter-menu__chev" />
                  </button>
                  <p class="broadcast-filter-menu__section">Adicionar filtros</p>
                  <button
                    type="button"
                    class="broadcast-filter-menu__item"
                    @mouseenter="hoveredFilter = 'label'"
                    @click.stop="openLabelPicker"
                  >
                    Etiqueta
                    <ChevronRight class="broadcast-filter-menu__chev" />
                  </button>
                  <button
                    v-for="item in disabledFilterItems"
                    :key="item"
                    type="button"
                    class="broadcast-filter-menu__item is-disabled"
                    disabled
                  >
                    {{ item }}
                    <ChevronRight class="broadcast-filter-menu__chev" />
                  </button>

                  <div
                    v-if="hoveredFilter === 'label' || labelPickerOpen"
                    class="broadcast-filter-submenu"
                  >
                    <button
                      v-for="label in labelOptions"
                      :key="label.id"
                      type="button"
                      class="broadcast-filter-submenu__item"
                      @click.stop="addLabelFilter(label)"
                    >
                      <span class="broadcast-filter-submenu__dot" :style="{ background: label.colorHex }" />
                      {{ label.name }}
                    </button>
                    <p v-if="!labelOptions.length" class="broadcast-filter-submenu__empty">Nenhuma etiqueta cadastrada.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <footer class="broadcast-modal__footer">
          <label class="broadcast-schedule-check">
            <input v-model="form.scheduleLater" type="checkbox">
            <span>Definir hora e executar depois</span>
          </label>

          <div class="broadcast-modal__footer-right">
            <div v-if="form.scheduleLater" class="field field--float broadcast-schedule-field">
              <label for="broadcast-scheduled-at">Agendar para</label>
              <SharedCfDateTimeInput
                id="broadcast-scheduled-at"
                v-model="form.scheduledAt"
                :min="scheduleMinValue"
                placeholder="dd/mm/aaaa às hh:mm"
              />
            </div>
            <button type="submit" class="btn btn-primary" :disabled="submitting || recipientCount === 0">
              <Loader v-if="submitting" class="spin icon-small" />
              Iniciar agora
            </button>
          </div>
        </footer>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ChevronRight, Loader, X } from 'lucide-vue-next'
import WhatsappContactPicker from '~/components/whatsapp/WhatsappContactPicker.vue'
import {
  BROADCAST_DELAY_PRESETS,
  BROADCAST_FLOW_OPTIONS,
  filterDispatchContactsBySearch,
  filterDispatchContactsBySegment,
} from '~/composables/whatsapp/useWhatsappDispatchContacts.js'
import { loadWhatsappLabels, whatsappLabelsById, whatsappLabelsOrder } from '~/composables/whatsapp/useWhatsappLabels.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  contacts: { type: Array, default: () => [] },
  selectedIds: { type: Array, default: () => [] },
  searchQuery: { type: String, default: '' },
  loadingContacts: { type: Boolean, default: false },
  submitting: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update:modelValue',
  'submit',
  'toggle-contact',
  'update:search-query',
  'reset-selection',
])

const delayPresets = BROADCAST_DELAY_PRESETS
const flowSelectOptions = BROADCAST_FLOW_OPTIONS.map(({ id, label }) => ({ value: id, label }))

const disabledFilterItems = [
  'Sequências',
  'Telefone',
  'Primeiro nome',
  'Sobrenome',
  'Nome completo',
  'Campanha',
  'Data criação',
  'Código de Área',
  'ID do Usuário',
  'Campo personalizado',
]

const form = ref({
  info: '',
  flowId: 'text',
  text: '',
  delayMode: 'smart',
  delayPreset: 'very_short',
  manualDelaySeconds: 20,
  scheduleLater: false,
  scheduledAt: '',
})

const segmentFilters = ref([])
const applyFiltersTogether = ref(true)
const showUsersPanel = ref(false)
const appliedPickerSearch = ref('')
const filterMenuOpen = ref(false)
const labelPickerOpen = ref(false)
const hoveredFilter = ref('')
const filterMenuRoot = ref(null)
const filterMenuRootAlt = ref(null)

const scheduleMinValue = computed(() => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}`
})

const labelOptions = computed(() =>
  whatsappLabelsOrder.value
    .map((id) => whatsappLabelsById.value?.[id])
    .filter(Boolean),
)

const segmentedContacts = computed(() =>
  filterDispatchContactsBySegment(props.contacts, segmentFilters.value, applyFiltersTogether.value),
)

const segmentContactsForPicker = computed(() => {
  if (segmentFilters.value.length) return segmentedContacts.value
  return props.contacts
})

const filteredPickerContacts = computed(() =>
  filterDispatchContactsBySearch(segmentContactsForPicker.value, appliedPickerSearch.value),
)

const recipientCount = computed(() => {
  const allowed = new Set(segmentContactsForPicker.value.map((item) => item.id))
  return props.selectedIds.filter((id) => allowed.has(id)).length
})

const applyPickerSearch = () => {
  appliedPickerSearch.value = props.searchQuery.trim()
}

const filterLabel = (filter) => {
  if (filter.type === 'label') return `Etiqueta: ${filter.labelName}`
  return filter.labelName || 'Filtro'
}

const resolveDelayRange = () => {
  if (form.value.delayMode === 'manual') {
    const seconds = Math.max(1, Number(form.value.manualDelaySeconds) || 1)
    return { delayMin: seconds, delayMax: seconds }
  }
  const preset = delayPresets.find((item) => item.id === form.value.delayPreset) || delayPresets[0]
  return { delayMin: preset.min, delayMax: preset.max }
}

const toggleFilterMenu = () => {
  filterMenuOpen.value = !filterMenuOpen.value
  labelPickerOpen.value = false
}

const openLabelPicker = () => {
  labelPickerOpen.value = true
  filterMenuOpen.value = true
  hoveredFilter.value = 'label'
}

const addLabelFilter = (label) => {
  if (!label?.id) return
  const exists = segmentFilters.value.some((item) => item.type === 'label' && item.labelId === label.id)
  if (exists) return
  segmentFilters.value.push({
    id: `label-${label.id}-${Date.now()}`,
    type: 'label',
    labelId: label.id,
    labelName: label.name,
  })
  filterMenuOpen.value = false
  labelPickerOpen.value = false
  hoveredFilter.value = ''
  emit('reset-selection')
}

const removeFilter = (id) => {
  segmentFilters.value = segmentFilters.value.filter((item) => item.id !== id)
  emit('reset-selection')
}

const resetFilters = () => {
  segmentFilters.value = []
  filterMenuOpen.value = false
  labelPickerOpen.value = false
  emit('reset-selection')
}

const buildRecipientJids = () => {
  const pool = segmentContactsForPicker.value
  const selected = new Set(props.selectedIds)
  return pool.filter((item) => selected.has(item.id)).map((item) => item.jid).filter(Boolean)
}

const onSubmit = () => {
  const { delayMin, delayMax } = resolveDelayRange()
  emit('submit', {
    info: form.value.info.trim(),
    text: form.value.text.trim(),
    flowId: form.value.flowId,
    delayMin,
    delayMax,
    scheduleLater: form.value.scheduleLater,
    scheduledAt: form.value.scheduledAt,
    segmentFilters: [...segmentFilters.value],
    applyFiltersTogether: applyFiltersTogether.value,
    recipientJids: buildRecipientJids(),
  })
}

const resetForm = () => {
  form.value = {
    info: '',
    flowId: 'text',
    text: '',
    delayMode: 'smart',
    delayPreset: 'very_short',
    manualDelaySeconds: 20,
    scheduleLater: false,
    scheduledAt: '',
  }
  segmentFilters.value = []
  applyFiltersTogether.value = true
  showUsersPanel.value = false
  appliedPickerSearch.value = ''
  filterMenuOpen.value = false
  labelPickerOpen.value = false
}

const onDocumentClick = (event) => {
  const roots = [filterMenuRoot.value, filterMenuRootAlt.value].filter(Boolean)
  if (roots.some((root) => root.contains(event.target))) return
  filterMenuOpen.value = false
  labelPickerOpen.value = false
  hoveredFilter.value = ''
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      resetForm()
      void loadWhatsappLabels({ force: false })
    }
  },
)

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>
