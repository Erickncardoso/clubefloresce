export default defineNitroPlugin((nitroApp) => {
  if (process.platform !== 'win32') return

  nitroApp.hooks.hook('render:html', (html) => {
    const fix = (chunk: string) => chunk.replaceAll('/_nuxt/C:/', '/_nuxt/@fs/C:/')
    html.head = html.head.map(fix)
    html.body = html.body.map(fix)
  })
})
