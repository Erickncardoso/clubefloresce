<template>
  <div class="paeditor">
    <header class="paeditor-head">
      <div>
        <p class="paeditor-kicker">Nova Avaliação Antropométrica</p>
        <div class="paeditor-meta">
          <span><strong>Nome:</strong> {{ user?.name || '—' }}</span>
          <span><strong>Idade:</strong> {{ ageLabel }}</span>
          <span><strong>Sexo:</strong> {{ genderText }}</span>
        </div>
      </div>
      <div class="field field--float paeditor-date">
        <label for="pa-measured-at">Data de Medição</label>
        <input id="pa-measured-at" v-model="form.measuredAt" type="date">
      </div>
    </header>

    <div class="paeditor-layout">
      <div class="paeditor-main">
        <section class="paeditor-card">
          <div class="paeditor-core">
            <div class="field field--float">
              <label for="pa-height">Altura</label>
              <input
                id="pa-height"
                :value="form.heightCm ?? ''"
                type="number"
                min="50"
                max="250"
                step="0.1"
                inputmode="decimal"
                placeholder="cm"
                @input="form.heightCm = parseNumericInput($event.target.value)"
              >
            </div>
            <div class="field field--float">
              <label for="pa-weight">Peso Atual</label>
              <input
                id="pa-weight"
                :value="form.weightKg ?? ''"
                type="number"
                min="20"
                max="500"
                step="0.1"
                inputmode="decimal"
                placeholder="kg"
                @input="form.weightKg = parseNumericInput($event.target.value)"
              >
            </div>
            <div class="paeditor-ideal">
              <span class="paeditor-ideal__label">Peso Ideal</span>
              <p class="paeditor-ideal__value">
                <template v-if="idealWeight">
                  {{ formatNumber(idealWeight.min, 1) }} kg a {{ formatNumber(idealWeight.max, 1) }} kg
                </template>
                <template v-else>—</template>
              </p>
            </div>
            <button type="button" class="paeditor-ai-btn" disabled title="Em breve">
              <Sparkles :size="14" />
              Importar com IA
            </button>
          </div>
        </section>

        <section class="paeditor-card">
          <button type="button" class="paeditor-section-head" @click="openSections.circ = !openSections.circ">
            <ChevronDown :class="{ 'paeditor-chevron--open': openSections.circ }" />
            <span>Circunferências</span>
          </button>
          <div v-if="openSections.circ" class="paeditor-section-body">
            <div class="paeditor-toggles">
              <div class="paeditor-toggle-group">
                <span>Circunferências Bilaterais</span>
                <div class="paeditor-pills">
                  <button type="button" class="paeditor-pill" :class="{ 'paeditor-pill--active': form.bilateralCircumferences }" @click="form.bilateralCircumferences = true">Sim</button>
                  <button type="button" class="paeditor-pill" :class="{ 'paeditor-pill--active': !form.bilateralCircumferences }" @click="form.bilateralCircumferences = false">Não</button>
                </div>
              </div>
              <div class="paeditor-toggle-group">
                <span>Lado Dominante</span>
                <div class="paeditor-pills">
                  <button type="button" class="paeditor-pill" :class="{ 'paeditor-pill--active': form.dominantSide === 'left' }" @click="form.dominantSide = 'left'">Esquerda</button>
                  <button type="button" class="paeditor-pill" :class="{ 'paeditor-pill--active': form.dominantSide === 'right' }" @click="form.dominantSide = 'right'">Direita</button>
                </div>
              </div>
            </div>

            <div v-for="group in visibleCircumferenceGroups" :key="group.id" class="paeditor-subsection">
              <h4>{{ group.label }}</h4>
              <div class="paeditor-grid">
                <div
                  v-for="field in group.fields"
                  :key="field.key"
                  class="field field--float"
                >
                  <label :for="`pa-circ-${field.key}`">{{ field.label }}</label>
                  <input
                    :id="`pa-circ-${field.key}`"
                    :value="form.circumferences[field.key] ?? ''"
                    type="number"
                    min="0"
                    step="0.1"
                    inputmode="decimal"
                    :placeholder="field.unit"
                    @input="form.circumferences[field.key] = parseNumericInput($event.target.value)"
                  >
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="paeditor-card">
          <button type="button" class="paeditor-section-head" @click="openSections.bones = !openSections.bones">
            <ChevronDown :class="{ 'paeditor-chevron--open': openSections.bones }" />
            <span>Diâmetros Ósseos</span>
          </button>
          <div v-if="openSections.bones" class="paeditor-section-body">
            <div class="paeditor-grid paeditor-grid--compact">
              <div v-for="field in BONE_DIAMETER_FIELDS" :key="field.key" class="field field--float">
                <label :for="`pa-bone-${field.key}`">{{ field.label }}</label>
                <input
                  :id="`pa-bone-${field.key}`"
                  :value="form.boneDiameters[field.key] ?? ''"
                  type="number"
                  min="0"
                  step="0.1"
                  inputmode="decimal"
                  :placeholder="field.unit"
                  @input="form.boneDiameters[field.key] = parseNumericInput($event.target.value)"
                >
              </div>
            </div>
          </div>
        </section>

        <section class="paeditor-card">
          <button type="button" class="paeditor-section-head" @click="openSections.comp = !openSections.comp">
            <ChevronDown :class="{ 'paeditor-chevron--open': openSections.comp }" />
            <span>Composição Corporal</span>
          </button>
          <div v-if="openSections.comp" class="paeditor-section-body">
            <div class="paeditor-method-row">
              <span>Pregas Cutâneas</span>
              <div class="paeditor-methods">
                <button
                  v-for="method in SKINFOLD_METHODS"
                  :key="method.id"
                  type="button"
                  class="paeditor-method"
                  :class="{ 'paeditor-method--active': form.skinfoldMethod === method.id }"
                  @click="form.skinfoldMethod = method.id"
                >
                  {{ method.label }}
                </button>
              </div>
            </div>
            <div v-if="form.skinfoldMethod !== 'none'" class="paeditor-grid">
              <div v-for="field in SKINFOLD_FIELDS" :key="field.key" class="field field--float">
                <label :for="`pa-skin-${field.key}`">{{ field.label }}</label>
                <input
                  :id="`pa-skin-${field.key}`"
                  :value="form.skinfolds[field.key] ?? ''"
                  type="number"
                  min="0"
                  step="0.1"
                  inputmode="decimal"
                  :placeholder="field.unit"
                  @input="form.skinfolds[field.key] = parseNumericInput($event.target.value)"
                >
              </div>
            </div>

            <button type="button" class="paeditor-section-head paeditor-section-head--nested" @click="openSections.bio = !openSections.bio">
              <ChevronDown :class="{ 'paeditor-chevron--open': openSections.bio }" />
              <span>Bioimpedância</span>
            </button>
            <div v-if="openSections.bio" class="paeditor-section-body paeditor-section-body--nested">
              <div class="field field--float paeditor-bio-brand">
                <label for="pa-bio-brand">Aparelho</label>
                <SharedCfSelect
                  id="pa-bio-brand"
                  v-model="form.bioimpedance.deviceBrand"
                  :options="bioBrandOptions"
                  placeholder="Selecione o aparelho"
                  @update:model-value="onBioBrandChange"
                />
              </div>
              <p v-if="activeBioBrand.description" class="paeditor-bio-hint">
                {{ activeBioBrand.description }}
              </p>

              <div
                v-for="group in bioFieldGroups"
                :key="group.id"
                class="paeditor-bio-group"
              >
                <h5 v-if="group.label" class="paeditor-bio-group__title">{{ group.label }}</h5>
                <div class="paeditor-grid">
                  <div v-for="field in group.fields" :key="field.key" class="field field--float">
                    <label :for="`pa-bio-${field.key}`">{{ field.label }}</label>
                    <input
                      v-if="field.type === 'text'"
                      :id="`pa-bio-${field.key}`"
                      v-model="form.bioimpedance[field.key]"
                      type="text"
                    >
                    <input
                      v-else
                      :id="`pa-bio-${field.key}`"
                      :value="form.bioimpedance[field.key] ?? ''"
                      type="number"
                      min="0"
                      step="0.1"
                      inputmode="decimal"
                      @input="form.bioimpedance[field.key] = parseNumericInput($event.target.value)"
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="paeditor-card">
          <h4 class="paeditor-subtitle">O que o paciente vê no app:</h4>
          <div class="paeditor-radio-row">
            <label v-for="option in PATIENT_APP_VIEW_OPTIONS" :key="option.id" class="paeditor-radio">
              <input v-model="form.patientAppView" type="radio" :value="option.id">
              <span>{{ option.label }}</span>
            </label>
          </div>
        </section>

        <section class="paeditor-card">
          <h4 class="paeditor-subtitle">Fotos</h4>
          <div class="paeditor-photos">
            <div v-for="slot in PHOTO_SLOTS" :key="slot.id" class="paeditor-photo">
              <div class="paeditor-photo__box" title="Em breve">
                <ImageIcon :size="22" />
              </div>
              <span>{{ slot.label }}</span>
            </div>
          </div>
        </section>

        <section class="paeditor-card">
          <h4 class="paeditor-subtitle">Anexos</h4>
          <div class="paeditor-attach" title="Em breve">
            <FilePlus2 :size="22" />
          </div>
        </section>

        <section class="paeditor-card">
          <div class="field field--float">
            <label for="pa-notes">Observações</label>
            <textarea id="pa-notes" v-model="form.notes" rows="4" maxlength="4000" />
          </div>
        </section>

        <footer class="paeditor-foot">
          <p v-if="draftSavedAt" class="paeditor-draft">Rascunho salvo</p>
          <p v-if="errorMessage" class="paeditor-error">{{ errorMessage }}</p>
          <div class="paeditor-foot-actions">
            <button type="button" class="btn-secondary" @click="$emit('cancel')">Cancelar</button>
            <button type="button" class="btn-primary" :disabled="saving" @click="save">
              {{ saving ? 'Salvando…' : 'Salvar Antropometria' }}
            </button>
          </div>
        </footer>
      </div>

      <PatientAntropometriaMetricsPanel
        :assessment="form"
        :birth-date="profile?.birthDate || ''"
        @print="printReport"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ChevronDown, FilePlus2, Image as ImageIcon, Sparkles } from 'lucide-vue-next'
import PatientAntropometriaMetricsPanel from '~/components/patients/PatientAntropometriaMetricsPanel.vue'
import {
  BONE_DIAMETER_FIELDS,
  CIRCUMFERENCE_GROUPS,
  PATIENT_APP_VIEW_OPTIONS,
  PHOTO_SLOTS,
  SKINFOLD_FIELDS,
  SKINFOLD_METHODS,
  bioimpedanceBrandOptions,
  computeIdealWeightRangeByAge,
  computePatientAge,
  createEmptyAntropometria,
  formatNumber,
  genderLabel,
  getBioimpedanceBrand,
  getBioimpedanceFieldGroups,
  normalizeAntropometria,
  normalizeBioimpedance,
  parseNumericInput,
} from '~/utils/antropometria.js'

const props = defineProps({
  user: { type: Object, default: null },
  profile: { type: Object, default: () => ({}) },
  seed: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' },
  draftSavedAt: { type: String, default: '' },
})

const emit = defineEmits(['save', 'cancel'])

const form = reactive(createEmptyAntropometria())
const openSections = reactive({
  circ: true,
  bones: true,
  comp: true,
  bio: false,
})

const ageLabel = computed(() => {
  const age = computePatientAge(props.profile?.birthDate)
  return age != null ? `${age} anos` : '—'
})

const patientAgeYears = computed(() => computePatientAge(props.profile?.birthDate))
const genderText = computed(() => genderLabel(props.profile?.gender))
const idealWeight = computed(() => computeIdealWeightRangeByAge(form.heightCm, patientAgeYears.value))

const bioBrandOptions = bioimpedanceBrandOptions()
const activeBioBrand = computed(() => getBioimpedanceBrand(form.bioimpedance?.deviceBrand))
const bioFieldGroups = computed(() => getBioimpedanceFieldGroups(form.bioimpedance?.deviceBrand || 'generic'))

function onBioBrandChange(brandId) {
  const current = { ...form.bioimpedance }
  form.bioimpedance = normalizeBioimpedance({ ...current, deviceBrand: brandId })
}

const visibleCircumferenceGroups = computed(() => {
  if (form.bilateralCircumferences) return CIRCUMFERENCE_GROUPS
  const sideSuffix = form.dominantSide === 'right' ? 'Right' : 'Left'
  return CIRCUMFERENCE_GROUPS.map((group) => ({
    ...group,
    fields: group.fields.filter((field) => {
      if (!field.bilateral) return true
      return field.key.endsWith(sideSuffix)
    }),
  }))
})

function applySeed() {
  const seed = props.seed
  const base = createEmptyAntropometria()
  if (!seed || seed.type === 'new') {
    Object.assign(form, normalizeAntropometria({
      ...base,
      heightCm: props.profile?.heightCm ?? null,
      weightKg: props.profile?.weightKg ?? null,
    }))
    return
  }
  if (seed.type === 'edit' && seed.item) {
    Object.assign(form, normalizeAntropometria(seed.item))
  }
}

watch(() => props.seed, applySeed, { immediate: true, deep: true })

function save() {
  emit('save', normalizeAntropometria(form))
}

function printReport() {
  if (!import.meta.client) return
  window.print()
}
</script>

<style scoped>
.paeditor {
  display: grid;
  gap: 1rem;
}

.paeditor-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.paeditor-kicker {
  margin: 0 0 0.35rem;
  font-size: 1.05rem;
  font-weight: 500;
  color: #9aa39a;
}

.paeditor-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem 1rem;
  font-size: 0.8125rem;
  color: #5f675f;
}

.paeditor-meta strong {
  font-weight: 600;
  color: #374151;
}

.paeditor-date {
  min-width: 11rem;
}

.paeditor-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 20rem;
  gap: 1rem;
  align-items: start;
}

.paeditor-main {
  display: grid;
  gap: 0.75rem;
}

.paeditor-card {
  padding: 0.85rem;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  background: #fff;
}

.paeditor-core {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
  gap: 0.65rem;
  align-items: end;
}

.paeditor-ideal__label {
  display: block;
  font-size: 0.68rem;
  font-weight: 500;
  color: #8a9288;
  margin-bottom: 0.2rem;
}

.paeditor-ideal__value {
  margin: 0;
  min-height: 2rem;
  display: flex;
  align-items: center;
  font-size: 0.8125rem;
  color: #374151;
}

.paeditor-ai-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 2.35rem;
  padding: 0.35rem 0.75rem;
  border: 1px solid transparent;
  border-radius: var(--cf-radius-control);
  background:
    linear-gradient(#fff, #fff) padding-box,
    linear-gradient(90deg, #fbbf24, #a78bfa, #60a5fa) border-box;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 500;
  color: #374151;
  cursor: not-allowed;
  opacity: 0.72;
  white-space: nowrap;
}

.paeditor-section-head {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  color: #5f7560;
  cursor: pointer;
  text-align: left;
}

.paeditor-section-head--nested {
  margin-top: 0.75rem;
}

.paeditor-section-head svg {
  width: 1rem;
  height: 1rem;
  transition: transform 0.15s ease;
}

.paeditor-chevron--open {
  transform: rotate(180deg);
}

.paeditor-section-body {
  margin-top: 0.75rem;
}

.paeditor-section-body--nested {
  margin-top: 0.55rem;
}

.paeditor-toggles {
  display: grid;
  gap: 0.65rem;
  margin-bottom: 0.85rem;
}

.paeditor-toggle-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  font-size: 0.78rem;
  color: #5f675f;
}

.paeditor-pills {
  display: inline-flex;
  gap: 0.3rem;
}

.paeditor-pill {
  min-height: 2rem;
  padding: 0.3rem 0.75rem;
  border: 1px solid #e2e8e4;
  border-radius: var(--cf-radius-control);
  background: #fff;
  font: inherit;
  font-size: 0.78rem;
  color: #5f675f;
  cursor: pointer;
}

.paeditor-pill--active {
  border-color: #8b967c;
  background: #f4f7f3;
  color: #4a5f48;
  font-weight: 500;
}

.paeditor-subsection h4,
.paeditor-subtitle {
  margin: 0 0 0.65rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #5f7560;
}

.paeditor-subsection + .paeditor-subsection {
  margin-top: 0.85rem;
}

.paeditor-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
}

.paeditor-grid--compact {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.paeditor-method-row {
  display: grid;
  gap: 0.45rem;
  margin-bottom: 0.75rem;
  font-size: 0.78rem;
  color: #5f675f;
}

.paeditor-methods {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.paeditor-method {
  min-height: 2rem;
  padding: 0.3rem 0.65rem;
  border: 1px solid #e2e8e4;
  border-radius: var(--cf-radius-control);
  background: #fff;
  font: inherit;
  font-size: 0.75rem;
  color: #5f675f;
  cursor: pointer;
}

.paeditor-method--active {
  border-color: #8b967c;
  background: #8b967c;
  color: #fff;
}

.paeditor-radio-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
}

.paeditor-radio {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  color: #374151;
  cursor: pointer;
}

.paeditor-radio input {
  accent-color: #8b967c;
}

.paeditor-photos {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.65rem;
}

.paeditor-photo {
  display: grid;
  gap: 0.35rem;
  justify-items: center;
  text-align: center;
  font-size: 0.72rem;
  color: #6b7368;
}

.paeditor-photo__box,
.paeditor-attach {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 5.5rem;
  border: 1px dashed #d1d5db;
  border-radius: var(--cf-radius-control);
  color: #9aa39a;
  background: #fafbfa;
}

.paeditor-attach {
  max-width: 8rem;
}

.paeditor-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.paeditor-draft {
  margin: 0;
  font-size: 0.75rem;
  color: #8b967c;
}

.paeditor-section-body--nested {
  padding-left: 0.35rem;
}

.paeditor-bio-brand {
  max-width: 18rem;
}

.paeditor-bio-hint {
  margin: 0 0 0.65rem;
  font-size: 0.74rem;
  line-height: 1.45;
  color: #6b7280;
}

.paeditor-bio-group {
  display: grid;
  gap: 0.55rem;
}

.paeditor-bio-group + .paeditor-bio-group {
  margin-top: 0.85rem;
  padding-top: 0.85rem;
  border-top: 1px solid #eef1ee;
}

.paeditor-bio-group__title {
  margin: 0;
  font-size: 0.76rem;
  font-weight: 600;
  color: #5f7560;
}

.paeditor-error {
  margin: 0;
  font-size: 0.78rem;
  color: #b42318;
}

.paeditor-foot-actions {
  display: inline-flex;
  gap: 0.5rem;
  margin-left: auto;
}

@media (max-width: 1100px) {
  .paeditor-layout {
    grid-template-columns: 1fr;
  }

  .paeditor-core {
    grid-template-columns: 1fr 1fr;
  }

  .paeditor-ai-btn {
    grid-column: 1 / -1;
    justify-self: start;
  }

  .paeditor-grid,
  .paeditor-photos {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .paeditor-core,
  .paeditor-grid,
  .paeditor-photos {
    grid-template-columns: 1fr;
  }
}
</style>
