/**
 * No Windows, URLs do Vite como /_nuxt/C:/Users/... quebram no Simple Browser
 * do Cursor (o ":" é interpretado como protocolo). Reescreve para /@fs/C:/...
 */
export function fixWindowsVitePaths() {
  return {
    name: 'fix-windows-vite-paths',
    configureServer(server: { middlewares: { use: (fn: (req: any, res: any, next: () => void) => void) => void } }) {
      if (process.platform !== 'win32') return
      server.middlewares.use((req, _res, next) => {
        if (req.url?.startsWith('/_nuxt/C:')) {
          req.url = req.url.replace('/_nuxt/C:', '/_nuxt/@fs/C:')
        }
        next()
      })
    },
    transformIndexHtml(html: string) {
      if (process.platform !== 'win32') return html
      return html
        .replace(/\/_nuxt\/C:\//g, '/_nuxt/@fs/C:/')
        .replace(/href="\/_nuxt\/C:\//g, 'href="/_nuxt/@fs/C:/')
        .replace(/src="\/_nuxt\/C:\//g, 'src="/_nuxt/@fs/C:/')
    },
  }
}
