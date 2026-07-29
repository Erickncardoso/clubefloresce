import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { clearDietaLocalStorage, DIETA_PLAN_SYNC_KEY, syncDietaPlanIdentity } from '../utils/dieta-local-state.js'

function createLocalStorageMock() {
  const store = new Map()
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null
    },
    setItem(key, value) {
      store.set(key, String(value))
    },
    removeItem(key) {
      store.delete(key)
    },
    key(index) {
      return [...store.keys()][index] ?? null
    },
    get length() {
      return store.size
    },
  }
}

describe('dieta local state', () => {
  beforeEach(() => {
    globalThis.localStorage = createLocalStorageMock()
    globalThis.import = { meta: { server: false } }
  })
  it('limpa chaves de overrides, checks e extras', () => {
    localStorage.setItem('dieta_overrides_2026-07-29_cafe', '{"a":1}')
    localStorage.setItem('dieta_checks_2026-07-29_cafe', '[true]')
    localStorage.setItem('dieta_extras_2026-07-29_cafe', '[]')
    localStorage.setItem('other_key', 'keep')

    clearDietaLocalStorage()

    assert.equal(localStorage.getItem('dieta_overrides_2026-07-29_cafe'), null)
    assert.equal(localStorage.getItem('dieta_checks_2026-07-29_cafe'), null)
    assert.equal(localStorage.getItem('dieta_extras_2026-07-29_cafe'), null)
    assert.equal(localStorage.getItem('other_key'), 'keep')
  })

  it('sincroniza id do plano e limpa ao trocar', () => {
    localStorage.setItem('dieta_overrides_2026-07-29_almoco', '{"x":1}')
    localStorage.setItem(DIETA_PLAN_SYNC_KEY, 'plan-a')

    const first = syncDietaPlanIdentity('plan-a')
    assert.equal(first, false)
    assert.equal(localStorage.getItem('dieta_overrides_2026-07-29_almoco'), '{"x":1}')

    const second = syncDietaPlanIdentity('plan-b')
    assert.equal(second, true)
    assert.equal(localStorage.getItem('dieta_overrides_2026-07-29_almoco'), null)
    assert.equal(localStorage.getItem(DIETA_PLAN_SYNC_KEY), 'plan-b')
  })

  it('forceClear limpa mesmo com mesmo id', () => {
    localStorage.setItem('dieta_checks_2026-07-29_jantar', '[false]')
    localStorage.setItem(DIETA_PLAN_SYNC_KEY, 'plan-a')

    const cleared = syncDietaPlanIdentity('plan-a', { forceClear: true })
    assert.equal(cleared, true)
    assert.equal(localStorage.getItem('dieta_checks_2026-07-29_jantar'), null)
  })
})
