<template>
  <Teleport to="body">
    <Transition name="pex-pop">
      <div v-if="open" class="modal-overlay pex-overlay" @click.self="close">
        <div
          class="modal-card pex-modal admin-shell admin-shell-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pex-title"
          @click.stop
        >
          <header class="pex-head">
            <h2 id="pex-title">{{ editingId ? 'Editar registro de exame' : 'Registro de exame' }}</h2>
            <button type="button" class="pex-close" aria-label="Fechar" @click="close">
              <X aria-hidden="true" />
            </button>
          </header>

          <div class="pex-body">
            <div class="pex-grid">
              <div class="field field--float">
                <label for="pex-title-input">Título</label>
                <input id="pex-title-input" v-model="draft.title" type="text" maxlength="120">
              </div>
              <div class="field field--float">
                <label for="pex-date">Data da coleta</label>
                <SharedCfDateInput id="pex-date" v-model="draft.collectedAt" />
              </div>
              <div class="field field--float">
                <label for="pex-lab">Laboratório</label>
                <input id="pex-lab" v-model="draft.labName" type="text" maxlength="120" placeholder="Opcional">
              </div>
            </div>

            <div class="pex-biomarkers">
              <div class="pex-biomarkers-head">
                <strong>Biomarcadores</strong>
                <button type="button" class="btn-secondary pex-btn-sm" @click="addRow">
                  + Adicionar
                </button>
              </div>

              <div v-if="!draft.biomarkers.length" class="pex-empty-rows">
                Adicione biomarcadores manualmente ou pelo catálogo.
              </div>

              <div v-for="(row, index) in draft.biomarkers" :key="row.id" class="pex-row">
                <div class="field field--float pex-row-field">
                  <label :for="`pex-marker-${row.id}`">Biomarcador</label>
                  <select
                    :id="`pex-marker-${row.id}`"
                    v-model="row.markerId"
                    @change="onMarkerChange(row)"
                  >
                    <option value="">Personalizado</option>
                    <optgroup
                      v-for="category in markerGroups"
                      :key="category.id"
                      :label="category.label"
                    >
                      <option
                        v-for="option in category.options"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </option>
                    </optgroup>
                  </select>
                </div>
                <div class="field field--float pex-row-field">
                  <label :for="`pex-name-${row.id}`">Nome</label>
                  <input :id="`pex-name-${row.id}`" v-model="row.name" type="text" maxlength="120">
                </div>
                <div class="field field--float pex-row-field pex-row-field--value">
                  <label :for="`pex-value-${row.id}`">Valor</label>
                  <input
                    :id="`pex-value-${row.id}`"
                    v-model="row.value"
                    type="number"
                    step="any"
                    inputmode="decimal"
                  >
                </div>
                <div class="field field--float pex-row-field pex-row-field--unit">
                  <label :for="`pex-unit-${row.id}`">Unidade</label>
                  <input :id="`pex-unit-${row.id}`" v-model="row.unit" type="text" maxlength="24">
                </div>
                <div class="field field--float pex-row-field pex-row-field--ref">
                  <label :for="`pex-refmin-${row.id}`">Ref. mín</label>
                  <input
                    :id="`pex-refmin-${row.id}`"
                    v-model="row.refMin"
                    type="number"
                    step="any"
                    inputmode="decimal"
                  >
                </div>
                <div class="field field--float pex-row-field pex-row-field--ref">
                  <label :for="`pex-refmax-${row.id}`">Ref. máx</label>
                  <input
                    :id="`pex-refmax-${row.id}`"
                    v-model="row.refMax"
                    type="number"
                    step="any"
                    inputmode="decimal"
                  >
                </div>
                <button
                  type="button"
                  class="pex-row-remove"
                  aria-label="Remover biomarcador"
                  @click="removeRow(index)"
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
            </div>

            <div class="field field--float">
              <label for="pex-notes">Observações clínicas</label>
              <textarea id="pex-notes" v-model="draft.notes" rows="3" maxlength="4000" />
            </div>

            <p v-if="error" class="pex-error">{{ error }}</p>
          </div>

          <footer class="pex-foot">
            <button type="button" class="btn-secondary pex-btn" @click="close">Cancelar</button>
            <button type="button" class="btn-secondary pex-btn" :disabled="saving" @click="submit('draft')">
              Salvar rascunho
            </button>
            <button type="button" class="btn-primary pex-btn" :disabled="saving" @click="submit('completed')">
              {{ saving ? 'Salvando…' : 'Salvar registro' }}
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Trash2, X } from 'lucide-vue-next'
import {
  BIOMARKER_CATEGORIES,
  catalogOptionsForSelect,
  createEmptyBiomarkerRow,
  findBiomarkerCatalogEntry,
  normalizeExame,
} from '~/utils/lab-exams.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  seed: { type: Object, default: null },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'save'])

const editingId = ref('')
const error = ref('')

const draft = reactive({
  title: 'Registro de exame',
  collectedAt: new Date().toISOString().slice(0, 10),
  labName: '',
  notes: '',
  status: 'completed',
  biomarkers: [],
})

const markerGroups = computed(() => {
  const options = catalogOptionsForSelect()
  return BIOMARKER_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    options: options.filter((item) => item.category === category.id),
  })).filter((group) => group.options.length)
})

watch(() => props.open, (isOpen) => {
  if (!isOpen) return
  error.value = ''
  if (props.seed?.item) {
    editingId.value = props.seed.item.id
    const normalized = normalizeExame(props.seed.item)
    draft.title = normalized.title
    draft.collectedAt = normalized.collectedAt
    draft.labName = normalized.labName || ''
    draft.notes = normalized.notes || ''
    draft.status = normalized.status
    draft.biomarkers = normalized.biomarkers.map((row) => ({
      ...row,
      value: String(row.value),
      refMin: row.refMin ?? '',
      refMax: row.refMax ?? '',
    }))
  } else {
    editingId.value = ''
    draft.title = 'Registro de exame'
    draft.collectedAt = new Date().toISOString().slice(0, 10)
    draft.labName = ''
    draft.notes = ''
    draft.status = 'completed'
    draft.biomarkers = []
  }
})

function onMarkerChange(row) {
  const catalog = findBiomarkerCatalogEntry(row.markerId)
  if (!catalog) return
  row.name = catalog.name
  row.unit = catalog.unit
  row.category = catalog.category
  row.refMin = catalog.defaultRefMin ?? ''
  row.refMax = catalog.defaultRefMax ?? ''
}

function addRow() {
  draft.biomarkers.push(createEmptyBiomarkerRow())
}

function removeRow(index) {
  draft.biomarkers.splice(index, 1)
}

function close() {
  emit('update:open', false)
}

function submit(status) {
  const payload = normalizeExame({
    id: editingId.value || undefined,
    title: draft.title,
    collectedAt: draft.collectedAt,
    labName: draft.labName,
    notes: draft.notes,
    status,
    biomarkers: draft.biomarkers.map((row) => ({
      ...row,
      refMin: row.refMin === '' ? null : row.refMin,
      refMax: row.refMax === '' ? null : row.refMax,
    })),
  })
  if (!payload) {
    error.value = 'Preencha ao menos um biomarcador com valor numérico.'
    return
  }
  if (status === 'completed' && !payload.biomarkers.length) {
    error.value = 'Adicione ao menos um biomarcador para registrar o exame.'
    return
  }
  error.value = ''
  emit('save', payload)
}
</script>

<style scoped>
.modal-overlay.pex-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(6px);
}

.pex-modal {
  width: min(100%, 52rem);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
}

.pex-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.pex-head h2 {
  margin: 0;
  font-size: 1rem;
  color: #2c322c;
}

.pex-close {
  width: 2rem;
  height: 2rem;
  border: 1px solid #e8ece9;
  background: #fff;
  cursor: pointer;
}

.pex-body {
  overflow: auto;
  padding-right: 0.15rem;
}

.pex-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
  margin-bottom: 0.85rem;
}

.pex-biomarkers-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.pex-biomarkers-head strong {
  font-size: 0.84rem;
  color: #2c322c;
}

.pex-btn-sm {
  min-height: 1.9rem !important;
  padding: 0.25rem 0.55rem !important;
  font-size: 0.72rem !important;
}

.pex-empty-rows {
  padding: 0.75rem;
  border: 1px dashed #e2e8e4;
  font-size: 0.78rem;
  color: #6b7368;
  margin-bottom: 0.65rem;
}

.pex-row {
  display: grid;
  grid-template-columns: minmax(8rem, 1fr) minmax(8rem, 1fr) 5rem 4.5rem 4.5rem 4.5rem auto;
  gap: 0.35rem;
  align-items: end;
  margin-bottom: 0.45rem;
}

.pex-row-remove {
  width: 2rem;
  height: 2rem;
  border: 1px solid #e2e8e4;
  background: #fff;
  color: #b42318;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.pex-row-remove svg {
  width: 0.9rem;
  height: 0.9rem;
}

.pex-error {
  margin: 0.65rem 0 0;
  color: #b42318;
  font-size: 0.82rem;
}

.pex-foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.45rem;
  margin-top: 0.85rem;
  padding-top: 0.75rem;
  border-top: 1px solid #eef1ee;
}

.pex-btn {
  min-height: 2.5rem !important;
}

@media (max-width: 900px) {
  .pex-grid {
    grid-template-columns: 1fr;
  }

  .pex-row {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
