import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyBmiByAge,
  classifyBmiElderly,
  computeIdealWeightRangeByAge,
  resolveBmiAgeBand,
} from '../utils/antropometria-bmi-age.js'
import { buildAntropometriaReport, computePatientAge } from '../utils/antropometria.js'

describe('antropometria bmi by age', () => {
  it('usa referência OMS para adultos', () => {
    assert.equal(classifyBmiByAge(24, 45)?.label, 'Normal')
    assert.equal(classifyBmiByAge(26, 45)?.label, 'Sobrepeso')
    assert.equal(resolveBmiAgeBand(59), 'adult')
  })

  it('usa referência Lipschitz/NSI para idosos', () => {
    assert.equal(classifyBmiElderly(21)?.label, 'Baixo peso')
    assert.equal(classifyBmiElderly(24)?.label, 'Eutrofia')
    assert.equal(classifyBmiElderly(26)?.label, 'Eutrofia')
    assert.equal(classifyBmiElderly(28)?.label, 'Sobrepeso')
    assert.equal(classifyBmiByAge(26, 68)?.label, 'Eutrofia')
    assert.equal(classifyBmiByAge(26, 40)?.label, 'Sobrepeso')
    assert.equal(resolveBmiAgeBand(60), 'elderly')
  })

  it('ajusta faixa de peso ideal conforme idade', () => {
    const adult = computeIdealWeightRangeByAge(170, 45)
    const elderly = computeIdealWeightRangeByAge(170, 70)
    assert.ok(elderly.min > adult.min)
    assert.ok(elderly.max > adult.max)
  })

  it('monta relatório antropométrico com classificação etária automática', () => {
    const birthDate = '1950-01-15'
    const age = computePatientAge(birthDate)
    assert.ok(age >= 60)

    const report = buildAntropometriaReport(
      { weightKg: 70, heightCm: 165 },
      { birthDate },
    )
    assert.equal(report.bmiClass?.label, 'Eutrofia')
    assert.equal(report.bmiReference?.reference, 'Lipschitz / NSI')
  })
})
