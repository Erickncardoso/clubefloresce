import {
  bmiReferenceMeta,
  classifyBmiAdult,
  classifyBmiByAge,
  computeIdealWeightRangeByAge,
} from './antropometria-bmi-age.js'
import {
  BIOIMPEDANCE_BRANDS,
  BIOIMPEDANCE_FIELDS,
  bioimpedanceBrandOptions,
  createEmptyBioimpedance,
  getBioimpedanceBrand,
  getBioimpedanceFieldDefs,
  getBioimpedanceFieldGroups,
  normalizeBioimpedance,
  resolveBioimpedanceBrand,
} from './antropometria-bioimpedance.js'

export const ANTROPOMETRIA_LIMIT = 20

export {
  BMI_AGE_BANDS,
  ELDERLY_BMI_MIN_AGE,
  bmiReferenceHint,
  bmiReferenceMeta,
  bmiScaleSegmentsForAge,
  classifyBmiAdult,
  classifyBmiByAge,
  classifyBmiElderly,
  computeIdealWeightRangeByAge,
  resolveBmiAgeBand,
} from './antropometria-bmi-age.js'

export {
  BIOIMPEDANCE_BRANDS,
  BIOIMPEDANCE_FIELDS,
  bioimpedanceBrandOptions,
  createEmptyBioimpedance,
  getBioimpedanceBrand,
  getBioimpedanceFieldDefs,
  getBioimpedanceFieldGroups,
  normalizeBioimpedance,
  resolveBioimpedanceBrand,
}

export const SKINFOLD_METHODS = [
  { id: 'none', label: 'Nenhuma' },
  { id: 'durnin', label: 'Durnin' },
  { id: 'pollock7', label: 'Pollock 7' },
  { id: 'pollock3', label: 'Pollock 3' },
  { id: 'petroski', label: 'Petroski' },
  { id: 'guedes', label: 'Guedes' },
  { id: 'faulkner', label: 'Faulkner' },
]

export const PATIENT_APP_VIEW_OPTIONS = [
  { id: 'skinfolds', label: 'Dobras cutâneas' },
  { id: 'bioimpedance', label: 'Bioimpedância' },
  { id: 'both', label: 'Ambos' },
  { id: 'none', label: 'Nenhuma' },
]

export const PHOTO_SLOTS = [
  { id: 'front', label: 'Frente' },
  { id: 'right', label: 'Lateral Direita' },
  { id: 'left', label: 'Lateral Esquerda' },
  { id: 'back', label: 'Costas' },
]

export const CIRCUMFERENCE_GROUPS = [
  {
    id: 'upper',
    label: 'Membros Superiores',
    fields: [
      { key: 'armRelaxedLeft', label: 'Braço Relaxado Esq.', unit: 'cm', bilateral: true },
      { key: 'armRelaxedRight', label: 'Braço Relaxado Dir.', unit: 'cm', bilateral: true },
      { key: 'forearmLeft', label: 'Antebraço Esq.', unit: 'cm', bilateral: true },
      { key: 'forearmRight', label: 'Antebraço Dir.', unit: 'cm', bilateral: true },
      { key: 'armFlexedLeft', label: 'Braço Contraído Esq.', unit: 'cm', bilateral: true },
      { key: 'armFlexedRight', label: 'Braço Contraído Dir.', unit: 'cm', bilateral: true },
      { key: 'wristCircLeft', label: 'Punho Esq.', unit: 'cm', bilateral: true },
      { key: 'wristCircRight', label: 'Punho Dir.', unit: 'cm', bilateral: true },
    ],
  },
  {
    id: 'trunk',
    label: 'Tronco',
    fields: [
      { key: 'neck', label: 'Pescoço', unit: 'cm' },
      { key: 'shoulder', label: 'Ombro', unit: 'cm' },
      { key: 'chest', label: 'Peitoral', unit: 'cm' },
      { key: 'waist', label: 'Cintura', unit: 'cm' },
      { key: 'abdomen', label: 'Abdômen', unit: 'cm' },
      { key: 'hip', label: 'Quadril', unit: 'cm' },
    ],
  },
  {
    id: 'lower',
    label: 'Membros Inferiores',
    fields: [
      { key: 'calfLeft', label: 'Panturrilha Esq.', unit: 'cm', bilateral: true },
      { key: 'calfRight', label: 'Panturrilha Dir.', unit: 'cm', bilateral: true },
      { key: 'thighLeft', label: 'Coxa Esq.', unit: 'cm', bilateral: true },
      { key: 'thighRight', label: 'Coxa Dir.', unit: 'cm', bilateral: true },
      { key: 'proximalThighLeft', label: 'Coxa Proximal Esq.', unit: 'cm', bilateral: true },
      { key: 'proximalThighRight', label: 'Coxa Proximal Dir.', unit: 'cm', bilateral: true },
    ],
  },
]

export const BONE_DIAMETER_FIELDS = [
  { key: 'wrist', label: 'Punho', unit: 'cm' },
  { key: 'femur', label: 'Fêmur', unit: 'cm' },
  { key: 'humerus', label: 'Úmero', unit: 'cm' },
]

export const SKINFOLD_FIELDS = [
  { key: 'biceps', label: 'Bíceps', unit: 'mm' },
  { key: 'abdominal', label: 'Abdominal', unit: 'mm' },
  { key: 'triceps', label: 'Tríceps', unit: 'mm' },
  { key: 'suprailiac', label: 'Suprailíaca', unit: 'mm' },
  { key: 'midAxillary', label: 'Axilar Média', unit: 'mm' },
  { key: 'subscapular', label: 'Subescapular', unit: 'mm' },
  { key: 'chestSkinfold', label: 'Tórax', unit: 'mm' },
  { key: 'thighSkinfold', label: 'Coxa', unit: 'mm' },
  { key: 'calfSkinfold', label: 'Panturrilha', unit: 'mm' },
  { key: 'supraspinale', label: 'Supraespinhal', unit: 'mm' },
]

function emptyNumericMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, null]))
}

export function createEmptyAntropometria() {
  const circKeys = CIRCUMFERENCE_GROUPS.flatMap((group) => group.fields.map((field) => field.key))
  const skinfoldKeys = SKINFOLD_FIELDS.map((field) => field.key)
  const boneKeys = BONE_DIAMETER_FIELDS.map((field) => field.key)

  return {
    id: '',
    title: 'Nova Avaliação Antropométrica',
    measuredAt: new Date().toISOString().slice(0, 10),
    heightCm: null,
    weightKg: null,
    bilateralCircumferences: true,
    dominantSide: 'left',
    circumferences: emptyNumericMap(circKeys),
    boneDiameters: emptyNumericMap(boneKeys),
    skinfoldMethod: 'none',
    skinfolds: emptyNumericMap(skinfoldKeys),
    bioimpedance: createEmptyBioimpedance('generic'),
    patientAppView: 'skinfolds',
    photos: Object.fromEntries(PHOTO_SLOTS.map((slot) => [slot.id, null])),
    notes: '',
    status: 'draft',
    authorName: null,
    createdAt: '',
    updatedAt: '',
  }
}

export function normalizeAntropometria(value) {
  const base = createEmptyAntropometria()
  if (!value || typeof value !== 'object') return { ...base }

  const circumferences = { ...base.circumferences, ...(value.circumferences || {}) }
  const boneDiameters = { ...base.boneDiameters, ...(value.boneDiameters || {}) }
  const skinfolds = { ...base.skinfolds, ...(value.skinfolds || {}) }
  const bioimpedance = normalizeBioimpedance({ ...base.bioimpedance, ...(value.bioimpedance || {}) })
  const photos = { ...base.photos, ...(value.photos || {}) }

  return {
    ...base,
    ...value,
    measuredAt: String(value.measuredAt || base.measuredAt).slice(0, 10),
    bilateralCircumferences: value.bilateralCircumferences !== false,
    dominantSide: value.dominantSide === 'right' ? 'right' : 'left',
    circumferences,
    boneDiameters,
    skinfoldMethod: SKINFOLD_METHODS.some((item) => item.id === value.skinfoldMethod)
      ? value.skinfoldMethod
      : base.skinfoldMethod,
    skinfolds,
    bioimpedance,
    patientAppView: PATIENT_APP_VIEW_OPTIONS.some((item) => item.id === value.patientAppView)
      ? value.patientAppView
      : base.patientAppView,
    photos,
    notes: String(value.notes ?? base.notes),
    status: value.status === 'completed' ? 'completed' : 'draft',
  }
}

export function parseNumericInput(value) {
  if (value === '' || value == null) return null
  const normalized = String(value).replace(',', '.')
  const num = Number(normalized)
  return Number.isFinite(num) ? num : null
}

export function formatNumber(value, digits = 2) {
  if (value == null || !Number.isFinite(value)) return '—'
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

export function computePatientAge(birthDate) {
  if (!birthDate) return null
  const date = new Date(`${String(birthDate).slice(0, 10)}T12:00:00`)
  if (Number.isNaN(date.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  const monthDiff = today.getMonth() - date.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) age -= 1
  return age >= 0 ? age : null
}

export function genderLabel(gender) {
  if (gender === 'female') return 'Feminino'
  if (gender === 'male') return 'Masculino'
  if (gender === 'other') return 'Outro'
  if (gender === 'prefer_not_say') return 'Prefere não informar'
  return '—'
}

export function computeIdealWeightRange(heightCm, ageYears = null) {
  if (ageYears != null) return computeIdealWeightRangeByAge(heightCm, ageYears)
  const height = Number(heightCm)
  if (!Number.isFinite(height) || height <= 0) return null
  const h = height / 100
  const min = 18.5 * h * h
  const max = 24.9 * h * h
  return { min, max }
}

export function computeBmi(weightKg, heightCm) {
  const weight = Number(weightKg)
  const height = Number(heightCm)
  if (!Number.isFinite(weight) || !Number.isFinite(height) || weight <= 0 || height <= 0) return null
  return weight / ((height / 100) ** 2)
}

export function classifyBmi(bmi, ageYears = null) {
  if (ageYears != null) return classifyBmiByAge(bmi, ageYears)
  return classifyBmiAdult(bmi)
}

export function computeWaistHipRatio(waist, hip) {
  const w = Number(waist)
  const h = Number(hip)
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null
  return w / h
}

export function buildAntropometriaReport(assessment, options = {}) {
  const data = normalizeAntropometria(assessment)
  const ageYears = options.ageYears ?? computePatientAge(options.birthDate) ?? null
  const bmi = computeBmi(data.weightKg, data.heightCm)
  const bmiClass = classifyBmiByAge(bmi, ageYears)
  const idealWeight = computeIdealWeightRangeByAge(data.heightCm, ageYears)
  const bmiReference = bmiReferenceMeta(ageYears)
  const whr = computeWaistHipRatio(data.circumferences?.waist, data.circumferences?.hip)

  const fatPct = parseNumericInput(data.bioimpedance?.fatMassPct)
  const leanPct = parseNumericInput(data.bioimpedance?.leanMassPct)
  const weight = parseNumericInput(data.weightKg)

  let leanMassKg = parseNumericInput(data.bioimpedance?.leanMassKg)
    ?? parseNumericInput(data.bioimpedance?.skeletalMuscleMassKg)
    ?? parseNumericInput(data.bioimpedance?.muscleMassKg)
  let fatMassKg = parseNumericInput(data.bioimpedance?.fatMassKg)
  if (weight && fatPct != null && leanMassKg == null) fatMassKg = (weight * fatPct) / 100
  if (weight && leanPct != null && leanMassKg == null) leanMassKg = (weight * leanPct) / 100
  if (weight && fatMassKg != null && leanMassKg == null) leanMassKg = weight - fatMassKg

  const compositionTotal = (leanMassKg || 0) + (fatMassKg || 0)
  const leanShare = compositionTotal > 0 ? (leanMassKg / compositionTotal) * 100 : null
  const fatShare = compositionTotal > 0 ? (fatMassKg / compositionTotal) * 100 : null

  return {
    bmi,
    bmiClass,
    bmiReference,
    patientAgeYears: ageYears,
    idealWeight,
    whr,
    bodyDensity: null,
    leanMassKg,
    fatMassKg,
    leanShare,
    fatShare,
  }
}

export function antropometriaPreviewText(item, birthDate = null) {
  const report = buildAntropometriaReport(item, { birthDate })
  const parts = []
  if (item?.measuredAt) {
    parts.push(new Date(`${item.measuredAt}T12:00:00`).toLocaleDateString('pt-BR'))
  }
  if (item?.weightKg) parts.push(`${formatNumber(item.weightKg, 1)} kg`)
  if (report.bmi) {
    const label = report.bmiClass?.label ? ` (${report.bmiClass.label})` : ''
    parts.push(`IMC ${formatNumber(report.bmi, 2)}${label}`)
  }
  return parts.length ? parts.join(' · ') : 'Sem medidas registradas.'
}

export function antropometriaStatusLabel(status) {
  return status === 'completed' ? 'Concluída' : 'Rascunho'
}
