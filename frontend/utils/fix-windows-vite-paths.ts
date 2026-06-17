/**
 * No Windows, URLs do Vite como /_nuxt/C:/Users/... quebram em alguns browsers
 * (o ":" após C é interpretado como protocolo). Reescreve para /@fs/C:/...
 */
function rewriteWinAssetPaths(value: string) {
  return value.replace(/\/_nuxt\/C:(?=\/)/g, '/_nuxt/@fs/C:')
}

function isDocumentRequest(url: string, acceptHeader?: string) {
  const path = (url.split('?')[0] || '').toLowerCase()
  if (!acceptHeader?.includes('text/html')) return false
  if (path.startsWith('/api') || path.startsWith('/_nuxt') || path.startsWith('/__')) return false
  if (/\.[a-z0-9]+$/.test(path)) return false
  return true
}

export function fixWindowsVitePaths() {
  return {
    name: 'fix-windows-vite-paths',
    apply: 'serve' as const,
    configureServer(server: {
      middlewares: {
        use: (fn: (req: any, res: any, next: () => void) => void) => void
      }
    }) {
      if (process.platform !== 'win32') return

      server.middlewares.use((req, res, next) => {
        if (req.url?.includes('/_nuxt/C:')) {
          req.url = rewriteWinAssetPaths(req.url)
        }
        next()
      })

      server.middlewares.use((req, res, next) => {
        if (!isDocumentRequest(req.url || '', req.headers.accept)) {
          next()
          return
        }

        const write = res.write.bind(res)
        const end = res.end.bind(res)
        const chunks: Buffer[] = []

        res.write = (chunk: any, ...args: any[]) => {
          if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
          return true
        }

        res.end = (chunk: any, ...args: any[]) => {
          if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
          const html = rewriteWinAssetPaths(Buffer.concat(chunks).toString('utf8'))
          res.setHeader('Content-Length', Buffer.byteLength(html))
          return end(html)
        }

        next()
      })
    },
    transformIndexHtml: {
      order: 'post' as const,
      handler(html: string) {
        if (process.platform !== 'win32') return html
        return rewriteWinAssetPaths(html)
      },
    },
  }
}
