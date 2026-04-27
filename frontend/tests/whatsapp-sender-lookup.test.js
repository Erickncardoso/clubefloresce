import test from 'node:test'
import assert from 'node:assert/strict'

import { filterSenderLookupCandidates, buildLookupKeys } from '../composables/whatsapp/useWhatsappUtils.js'

test('remove chaves de grupo (@g.us) no lookup de sender', () => {
  const rawCandidates = [
    '120363160311660253@g.us',
    '5511999999999@s.whatsapp.net',
    '5511888888888@s.whatsapp.net'
  ]

  const filtered = filterSenderLookupCandidates(rawCandidates, '120363160311660253@g.us')
  const keys = buildLookupKeys(...filtered)

  assert.equal(filtered.includes('120363160311660253@g.us'), false)
  assert.equal(keys.includes('120363160311660253@g.us'), false)
  assert.equal(keys.includes('5511999999999@s.whatsapp.net'), true)
  assert.equal(keys.includes('5511888888888@s.whatsapp.net'), true)
})

test('preserva sender @lid para permitir resolução via mapa LID->JID', () => {
  const rawCandidates = [
    '5511888888888:12@lid',
    '120363160311660253@g.us'
  ]

  const filtered = filterSenderLookupCandidates(rawCandidates, '120363160311660253@g.us')
  const keys = buildLookupKeys(...filtered)

  assert.equal(filtered.includes('5511888888888:12@lid'), true)
  assert.equal(keys.some((key) => key.endsWith('@lid')), true)
})

test('preserva sender @s.whatsapp.net para resolução direta de nome e avatar', () => {
  const rawCandidates = [
    '5511777777777@s.whatsapp.net',
    '120363160311660253@g.us'
  ]

  const filtered = filterSenderLookupCandidates(rawCandidates, '120363160311660253@g.us')
  const keys = buildLookupKeys(...filtered)

  assert.equal(filtered.includes('5511777777777@s.whatsapp.net'), true)
  assert.equal(keys.includes('5511777777777@s.whatsapp.net'), true)
  assert.equal(keys.includes('120363160311660253@g.us'), false)
})
