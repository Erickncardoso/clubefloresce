function rewriteWinAssetPaths(value: string) {
  return value.replace(/\/_nuxt\/C:(?=\/)/g, '/_nuxt/@fs/C:')
}

export default defineNitroPlugin((nitroApp) => {
  if (process.platform !== 'win32') return

  nitroApp.hooks.hook('render:response', (response) => {
    const contentType = String(response.headers?.['content-type'] || '')
    if (!contentType.includes('text/html')) return

    if (typeof response.body === 'string') {
      response.body = rewriteWinAssetPaths(response.body)
      return
    }

    if (response.body instanceof Uint8Array) {
      const html = rewriteWinAssetPaths(new TextDecoder().decode(response.body))
      response.body = html
    }
  })
})
