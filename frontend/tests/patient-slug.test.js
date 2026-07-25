import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assignPatientSlugs,
  getPatientUrlSlug,
  buildPatientPath,
} from '../utils/patient-slug.js'

test('assignPatientSlugs disambiguates duplicate names', () => {
  const patients = [
    { id: '1', name: 'Maria Silva' },
    { id: '2', name: 'Maria Silva' },
  ]
  const slugs = assignPatientSlugs(patients)
  assert.equal(slugs.get('1'), 'maria-silva')
  assert.equal(slugs.get('2'), 'maria-silva-2')
})

test('getPatientUrlSlug prefers urlSlug from API', () => {
  assert.equal(getPatientUrlSlug({ id: '1', name: 'João', urlSlug: 'joao-custom' }), 'joao-custom')
})

test('buildPatientPath uses slug and suffix', () => {
  assert.equal(
    buildPatientPath({ id: '1', name: 'Ana Costa', urlSlug: 'ana-costa' }, { suffix: '/documentos/novo' }),
    '/pacientes/ana-costa/documentos/novo',
  )
})
