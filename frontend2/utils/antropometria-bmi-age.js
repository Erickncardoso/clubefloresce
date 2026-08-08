export const ELDERLY_BMI_MIN_AGE = 60

export const BMI_AGE_BANDS = {
  adult: {
    id: 'adult',
    label: 'Adultos (< 60 anos)',
    reference: 'OMS',
    idealRange: { min: 18.5, max: 24.9 },
  },
  elderly: {
    id: 'elderly',
    label: 'Idosos (60+ anos)',
    reference: 'Lipschitz / NSI',
    idealRange: { min: 22, max: 27 },
  },
}

export function resolveBmiAgeBand(ageYears) {
  if (ageYears == null || !Number.isFinite(Number(ageYears))) return 'adult'
  return Number(ageYears) >= ELDERLY_BMI_MIN_AGE ? 'elderly' : 'adult'
}

export function classifyBmiAdult(bmi) {
  if (bmi == null || !Number.isFinite(bmi)) return null
  if (bmi < 18.5) return { label: 'Baixo peso', tone: 'blue', index: 0 }
  if (bmi < 25) return { label: 'Normal', tone: 'green', index: 1 }
  if (bmi < 30) return { label: 'Sobrepeso', tone: 'amber', index: 2 }
  if (bmi < 35) return { label: 'Obesidade I', tone: 'orange', index: 3 }
  if (bmi < 40) return { label: 'Obesidade II', tone: 'red', index: 4 }
  return { label: 'Obesidade III', tone: 'red-dark', index: 5 }
}

export function classifyBmiElderly(bmi) {
  if (bmi == null || !Number.isFinite(bmi)) return null
  if (bmi < 22) return { label: 'Baixo peso', tone: 'blue', index: 0 }
  if (bmi <= 27) return { label: 'Eutrofia', tone: 'green', index: 1 }
  return { label: 'Sobrepeso', tone: 'amber', index: 2 }
}

export function classifyBmiByAge(bmi, ageYears) {
  if (resolveBmiAgeBand(ageYears) === 'elderly') return classifyBmiElderly(bmi)
  return classifyBmiAdult(bmi)
}

export function bmiScaleSegmentsForAge(ageYears) {
  if (resolveBmiAgeBand(ageYears) === 'elderly') {
    return [
      { label: 'Baixo peso', tone: 'blue' },
      { label: 'Eutrofia', tone: 'green' },
      { label: 'Sobrepeso', tone: 'amber' },
    ]
  }
  return [
    { label: 'Baixo peso', tone: 'blue' },
    { label: 'Normal', tone: 'green' },
    { label: 'Sobrepeso', tone: 'amber' },
    { label: 'Obesidade I', tone: 'orange' },
    { label: 'Obesidade II', tone: 'red' },
    { label: 'Obesidade III', tone: 'red-dark' },
  ]
}

export function computeIdealWeightRangeByAge(heightCm, ageYears) {
  const height = Number(heightCm)
  if (!Number.isFinite(height) || height <= 0) return null
  const band = BMI_AGE_BANDS[resolveBmiAgeBand(ageYears)]
  const meters = height / 100
  return {
    min: band.idealRange.min * meters * meters,
    max: band.idealRange.max * meters * meters,
  }
}

export function bmiReferenceMeta(ageYears) {
  const bandId = resolveBmiAgeBand(ageYears)
  return {
    bandId,
    ...BMI_AGE_BANDS[bandId],
  }
}

export function bmiReferenceHint(ageYears) {
  const meta = bmiReferenceMeta(ageYears)
  if (meta.bandId === 'elderly') {
    return 'Referência Lipschitz/NSI para idosos (60+): eutrofia entre 22 e 27 kg/m².'
  }
  return 'Referência OMS para adultos: normal entre 18,5 e 24,9 kg/m².'
}
