import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  INSTAGRAM_REDIRECT_STORAGE_KEY,
  buildInstagramExternalBrowserInlineScript,
  buildIosSafariEscapeUrls,
  isInstagramInAppBrowser,
  redirectFromInstagramInAppBrowser,
  shouldShowInstagramSafariEscape,
} from '../utils/instagram-external-browser.js'

describe('instagram-external-browser', () => {
  it('detecta user agent do Instagram', () => {
    assert.equal(isInstagramInAppBrowser('Mozilla Instagram 123'), true)
    assert.equal(isInstagramInAppBrowser('Mozilla/5.0 Chrome'), false)
  })

  it('detecta iPhone no Instagram para prompt Safari', () => {
    assert.equal(shouldShowInstagramSafariEscape('Instagram iPhone'), true)
    assert.equal(shouldShowInstagramSafariEscape('Instagram Android'), false)
  })

  it('monta URLs de escape para Safari no iOS', () => {
    const href = 'https://app.clubeflorescer.com/abrir'
    const urls = buildIosSafariEscapeUrls(href)
    assert.equal(urls[0], 'instagram://extbrowser?url=' + encodeURIComponent(href))
    assert.equal(urls[1], 'x-safari-https://app.clubeflorescer.com/abrir')
    assert.equal(urls[2], href)
  })

  it('gera script inline com Safari no iOS', () => {
    const script = buildInstagramExternalBrowserInlineScript()
    assert.match(script, /instagram/)
    assert.match(script, /extbrowser/)
    assert.match(script, /x-safari-https:\/\//)
    assert.match(script, new RegExp(INSTAGRAM_REDIRECT_STORAGE_KEY))
    assert.doesNotMatch(script, /googlechrome/)
  })

  it('redireciona Android via intent Chrome', () => {
    const storage = new Map()
    const originalWindow = globalThis.window
    globalThis.window = {
      location: { href: 'https://app.clubeflorescer.com/abrir' },
    }
    try {
      const result = redirectFromInstagramInAppBrowser({
        userAgent: 'Instagram Android',
        href: 'https://app.clubeflorescer.com/abrir',
        storage: {
          getItem: (key) => storage.get(key) ?? null,
          setItem: (key, value) => storage.set(key, value),
        },
      })
      assert.equal(result, true)
      assert.equal(storage.get(INSTAGRAM_REDIRECT_STORAGE_KEY), '1')
      assert.match(globalThis.window.location.href, /^intent:\/\//)
    } finally {
      globalThis.window = originalWindow
    }
  })

  it('não redireciona fora do Instagram', () => {
    const storage = new Map()
    const result = redirectFromInstagramInAppBrowser({
      userAgent: 'Mozilla/5.0 Chrome',
      href: 'https://app.clubeflorescer.com/',
      storage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
      },
    })
    assert.equal(result, false)
    assert.equal(storage.has(INSTAGRAM_REDIRECT_STORAGE_KEY), false)
  })
})
