export const BIOIMPEDANCE_BRANDS = [
  {
    id: 'generic',
    label: 'Genérica',
    description: 'Campos padrão para qualquer balança de bioimpedância.',
  },
  {
    id: 'avanutri',
    label: 'Avanutri',
    description: 'Padrão AVA-Bio 380 — composição corporal, água intra/extracelular e segmentos.',
  },
  {
    id: 'inbody',
    label: 'InBody',
    description: 'Campos usuais dos laudos InBody (270, 120, H20N).',
  },
  {
    id: 'tanita',
    label: 'Tanita',
    description: 'Campos dos relatórios Tanita (BC-545N, BC-601).',
  },
  {
    id: 'biodynamics',
    label: 'Biodynamics',
    description: 'Campos dos laudos Biodynamics.',
  },
]

const FIELD = (key, label, type = 'number', extra = {}) => ({ key, label, type, ...extra })

const GENERIC_FIELDS = [
  FIELD('scaleScore', 'Pontuação da Balança'),
  FIELD('fatMassKg', 'Massa Gorda (Kg)'),
  FIELD('fatMassPct', 'Massa Gorda (%)'),
  FIELD('leanMassKg', 'Massa Magra (Kg)'),
  FIELD('leanMassPct', 'Massa Magra (%)'),
  FIELD('fatFreeMassKg', 'Massa Livre de Gordura (Kg)'),
  FIELD('boneWeightKg', 'Peso Ósseo (Kg)'),
  FIELD('metabolicAge', 'Idade Metabólica (Anos)'),
  FIELD('visceralFat', 'Gordura Visceral'),
  FIELD('bodyWaterL', 'Água Corporal (L)'),
  FIELD('intracellularWaterL', 'Água Intracelular (L)'),
  FIELD('extracellularWaterL', 'Água Extracelular (L)'),
]

const AVANUTRI_FIELDS = [
  FIELD('fatMassPct', '% Gordura (PCG)'),
  FIELD('fatMassKg', 'Massa Gorda (Kg)'),
  FIELD('leanMassKg', 'Massa Magra (Kg)'),
  FIELD('leanMassPct', 'Massa Magra (%)'),
  FIELD('fatFreeMassKg', 'Massa Livre de Gordura (Kg)'),
  FIELD('skeletalMuscleMassKg', 'Massa Muscular Esquelética (Kg)'),
  FIELD('bodyWaterL', 'Água Corporal Total (L)'),
  FIELD('intracellularWaterL', 'Água Intracelular (L)'),
  FIELD('extracellularWaterL', 'Água Extracelular (L)'),
  FIELD('proteinKg', 'Proteína (Kg)'),
  FIELD('boneWeightKg', 'Conteúdo Mineral Ósseo (Kg)'),
  FIELD('visceralFatLevel', 'Gordura Visceral (nível)'),
  FIELD('basalMetabolicRateKcal', 'Taxa Metabólica Basal (kcal)'),
  FIELD('metabolicAge', 'Idade Metabólica (Anos)'),
  FIELD('appendicularIndex', 'Índice Apendicular'),
  FIELD('scaleScore', 'Pontuação da Balança'),
]

const AVANUTRI_SEGMENTAL_FIELDS = [
  FIELD('leanMassArmRightKg', 'Massa Magra — Braço Dir. (Kg)'),
  FIELD('leanMassArmLeftKg', 'Massa Magra — Braço Esq. (Kg)'),
  FIELD('leanMassTrunkKg', 'Massa Magra — Tronco (Kg)'),
  FIELD('leanMassLegRightKg', 'Massa Magra — Perna Dir. (Kg)'),
  FIELD('leanMassLegLeftKg', 'Massa Magra — Perna Esq. (Kg)'),
  FIELD('fatMassArmRightKg', 'Massa Gorda — Braço Dir. (Kg)'),
  FIELD('fatMassArmLeftKg', 'Massa Gorda — Braço Esq. (Kg)'),
  FIELD('fatMassTrunkKg', 'Massa Gorda — Tronco (Kg)'),
  FIELD('fatMassLegRightKg', 'Massa Gorda — Perna Dir. (Kg)'),
  FIELD('fatMassLegLeftKg', 'Massa Gorda — Perna Esq. (Kg)'),
]

const INBODY_FIELDS = [
  FIELD('fatMassPct', 'Gordura Corporal (%)'),
  FIELD('fatMassKg', 'Massa Gorda (Kg)'),
  FIELD('leanMassKg', 'Massa Magra (Kg)'),
  FIELD('skeletalMuscleMassKg', 'Massa Muscular Esquelética (Kg)'),
  FIELD('bodyWaterL', 'Água Corporal Total (L)'),
  FIELD('visceralFatLevel', 'Gordura Visceral (nível)'),
  FIELD('basalMetabolicRateKcal', 'Taxa Metabólica Basal (kcal)'),
  FIELD('boneWeightKg', 'Mineral Ósseo (Kg)'),
  FIELD('proteinKg', 'Proteína (Kg)'),
]

const TANITA_FIELDS = [
  FIELD('fatMassPct', 'Gordura Corporal (%)'),
  FIELD('fatMassKg', 'Massa Gorda (Kg)'),
  FIELD('muscleMassKg', 'Massa Muscular (Kg)'),
  FIELD('bodyWaterPct', 'Água Corporal (%)'),
  FIELD('bodyWaterL', 'Água Corporal (L)'),
  FIELD('visceralFatLevel', 'Gordura Visceral (nível)'),
  FIELD('basalMetabolicRateKcal', 'Taxa Metabólica Basal (kcal)'),
  FIELD('metabolicAge', 'Idade Metabólica (Anos)'),
  FIELD('boneWeightKg', 'Massa Óssea (Kg)'),
]

const BIODYNAMICS_FIELDS = [
  FIELD('fatMassPct', 'Gordura Corporal (%)'),
  FIELD('fatMassKg', 'Massa Gorda (Kg)'),
  FIELD('leanMassKg', 'Massa Magra (Kg)'),
  FIELD('leanMassPct', 'Massa Magra (%)'),
  FIELD('bodyWaterL', 'Água Corporal (L)'),
  FIELD('metabolicAge', 'Idade Metabólica (Anos)'),
]

const BRAND_FIELDS = {
  generic: GENERIC_FIELDS,
  avanutri: AVANUTRI_FIELDS,
  inbody: INBODY_FIELDS,
  tanita: TANITA_FIELDS,
  biodynamics: BIODYNAMICS_FIELDS,
}

const BRAND_LABELS = Object.fromEntries(BIOIMPEDANCE_BRANDS.map((brand) => [brand.id, brand.label]))

export function getBioimpedanceBrand(brandId) {
  return BIOIMPEDANCE_BRANDS.find((brand) => brand.id === brandId) || BIOIMPEDANCE_BRANDS[0]
}

export function resolveBioimpedanceBrand(value) {
  const deviceBrand = String(value?.deviceBrand || '').trim()
  if (deviceBrand && BRAND_FIELDS[deviceBrand]) return deviceBrand

  const legacy = String(value?.scaleBrand || '').trim().toLowerCase()
  if (legacy.includes('avanutri') || legacy.includes('ava-bio') || legacy.includes('avabio')) return 'avanutri'
  if (legacy.includes('inbody')) return 'inbody'
  if (legacy.includes('tanita')) return 'tanita'
  if (legacy.includes('biodynamics') || legacy.includes('bio dynamics')) return 'biodynamics'
  return 'generic'
}

export function getBioimpedanceFieldDefs(deviceBrand) {
  return BRAND_FIELDS[deviceBrand] || GENERIC_FIELDS
}

export function getBioimpedanceFieldGroups(deviceBrand) {
  const mainFields = getBioimpedanceFieldDefs(deviceBrand)
  if (deviceBrand === 'avanutri') {
    return [
      { id: 'main', label: 'Composição corporal', fields: mainFields },
      { id: 'segmental', label: 'Composição segmentada', fields: AVANUTRI_SEGMENTAL_FIELDS },
    ]
  }
  return [{ id: 'main', label: null, fields: mainFields }]
}

export function createEmptyBioimpedance(deviceBrand = 'generic') {
  const brand = resolveBioimpedanceBrand({ deviceBrand })
  const groups = getBioimpedanceFieldGroups(brand)
  const data = {
    deviceBrand: brand,
    scaleBrand: BRAND_LABELS[brand] || 'Genérica',
  }

  for (const group of groups) {
    for (const field of group.fields) {
      data[field.key] = field.type === 'text' ? '' : null
    }
  }

  return data
}

export function normalizeBioimpedance(value) {
  const brand = resolveBioimpedanceBrand(value)
  const empty = createEmptyBioimpedance(brand)
  if (!value || typeof value !== 'object') return empty

  return {
    ...empty,
    ...value,
    deviceBrand: brand,
    scaleBrand: BRAND_LABELS[brand] || empty.scaleBrand,
  }
}

/** Compatibilidade com imports antigos. */
export const BIOIMPEDANCE_FIELDS = [
  { key: 'scaleBrand', label: 'Marca da Balança', type: 'text' },
  ...GENERIC_FIELDS,
]

export function bioimpedanceBrandOptions() {
  return BIOIMPEDANCE_BRANDS.map((brand) => ({ value: brand.id, label: brand.label }))
}
