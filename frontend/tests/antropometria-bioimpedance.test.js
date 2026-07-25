import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  createEmptyBioimpedance,
  getBioimpedanceFieldGroups,
  normalizeBioimpedance,
  resolveBioimpedanceBrand,
} from '../utils/antropometria-bioimpedance.js'

describe('antropometria bioimpedance brands', () => {
  it('resolve Avanutri a partir de scaleBrand legado', () => {
    assert.equal(resolveBioimpedanceBrand({ scaleBrand: 'Avanutri AVA-Bio 380' }), 'avanutri')
  })

  it('cria campos específicos da Avanutri', () => {
    const data = createEmptyBioimpedance('avanutri')
    assert.equal(data.deviceBrand, 'avanutri')
    assert.equal(data.scaleBrand, 'Avanutri')
    assert.ok('skeletalMuscleMassKg' in data)
    assert.ok('proteinKg' in data)
    assert.ok('appendicularIndex' in data)
  })

  it('inclui grupo segmentado para Avanutri', () => {
    const groups = getBioimpedanceFieldGroups('avanutri')
    assert.equal(groups.length, 2)
    assert.equal(groups[1].id, 'segmental')
    assert.ok(groups[1].fields.some((field) => field.key === 'leanMassTrunkKg'))
  })

  it('preserva valores ao normalizar troca de marca', () => {
    const normalized = normalizeBioimpedance({
      deviceBrand: 'avanutri',
      fatMassPct: 28.5,
      leanMassKg: 52.4,
      skeletalMuscleMassKg: 24.1,
    })
    assert.equal(normalized.fatMassPct, 28.5)
    assert.equal(normalized.leanMassKg, 52.4)
    assert.equal(normalized.skeletalMuscleMassKg, 24.1)
  })
})
