import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assignPatientSlugs,
  buildPatientLegacySlug,
  getPatientUrlSlug,
  buildPatientPath,
} from '../utils/patient-slug.js'

test('getPatientUrlSlug always uses patient id', () => {
  assert.equal(
    getPatientUrlSlug({ id: 'uuid-1', name: 'Maria Silva', urlSlug: 'maria-silva' }),
    'uuid-1',
  )
})

test('buildPatientPath uses patient id in URL', () => {
  assert.equal(
    buildPatientPath({ id: 'uuid-abc', name: 'Ana Costa' }, { suffix: '/documentos/novo' }),
    '/pacientes/uuid-abc/documentos/novo',
  )
})

test('buildPatientLegacySlug disambiguates duplicate names with email', () => {
  const patients = [
    { id: '1', name: 'Maria Silva', email: 'erickpsncardoso@outlook.com', createdAt: '2024-01-01' },
    { id: '2', name: 'Maria Silva', email: 'mregiane.souza@icloud.com', createdAt: '2024-02-01' },
  ]

  assert.equal(
    buildPatientLegacySlug(patients[0], patients),
    'maria-silva-erickpsncardoso',
  )
  assert.equal(
    buildPatientLegacySlug(patients[1], patients),
    'maria-silva-mregiane-souza',
  )
})

test('assignPatientSlugs maps each patient to a unique legacy slug', () => {
  const patients = [
    { id: '1', name: 'Maria Silva', email: 'a@test.com', createdAt: '2024-01-01' },
    { id: '2', name: 'Maria Silva', email: 'b@test.com', createdAt: '2024-02-01' },
  ]
  const slugs = assignPatientSlugs(patients)
  assert.equal(slugs.get('1'), 'maria-silva-a')
  assert.equal(slugs.get('2'), 'maria-silva-b')
})
