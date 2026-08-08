import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CDN_HOST =
  process.env.BUNNY_STREAM_CDN_HOSTNAME?.trim().replace(/^https?:\/\//, '').replace(/\/$/, '') ||
  'vz-f53bb416-a11.b-cdn.net'

/** Host já liberado no Pull Zone Bunny (admin Nuxt). */
const UPSTREAM_REFERER =
  process.env.BUNNY_UPSTREAM_REFERER?.trim() || 'http://localhost:3000/'

function joinPath(parts: string[]) {
  return parts.map((p) => encodeURIComponent(decodeURIComponent(p))).join('/')
}

function rewritePlaylist(text: string, proxyOrigin: string, playlistPath: string[]) {
  const proxyBase = `${proxyOrigin}/bunny-cdn`
  const dir = playlistPath.slice(0, -1)
  const dirPrefix = dir.length ? `${proxyBase}/${joinPath(dir)}/` : `${proxyBase}/`

  const rewriteUri = (uri: string) => {
    const value = uri.trim()
    if (!value) return value
    if (/^https?:\/\//i.test(value)) {
      try {
        const parsed = new URL(value)
        if (parsed.host === CDN_HOST) {
          return `${proxyBase}${parsed.pathname}${parsed.search}`
        }
      } catch {
        /* keep */
      }
      return value
    }
    if (value.startsWith('/')) {
      return `${proxyBase}${value}`
    }
    return `${dirPrefix}${value.split('/').map(encodeURIComponent).join('/')}`
  }

  return text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return line

      if (trimmed.startsWith('#')) {
        return line.replace(/URI="([^"]+)"/gi, (_m, uri: string) => `URI="${rewriteUri(uri)}"`)
      }

      return rewriteUri(trimmed)
    })
    .join('\n')
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: pathParts } = await context.params
  if (!pathParts?.length) {
    return NextResponse.json({ message: 'Path obrigatório' }, { status: 400 })
  }

  const upstreamPath = joinPath(pathParts)
  const upstreamUrl = `https://${CDN_HOST}/${upstreamPath}${request.nextUrl.search}`

  const headers: HeadersInit = {
    Referer: UPSTREAM_REFERER,
    'User-Agent': request.headers.get('user-agent') || 'ClubeFlorescerBunnyProxy/1.0',
  }
  const range = request.headers.get('range')
  if (range) headers.Range = range

  let upstream: Response
  try {
    upstream = await fetch(upstreamUrl, {
      headers,
      redirect: 'follow',
      cache: 'no-store',
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Falha ao buscar vídeo no Bunny', detail: String(error) },
      { status: 502 },
    )
  }

  const contentType = upstream.headers.get('content-type') || ''
  const isPlaylist =
    /\.m3u8(?:\?|$)/i.test(upstreamUrl) || /mpegurl|m3u8/i.test(contentType)

  const responseHeaders = new Headers()
  responseHeaders.set('Access-Control-Allow-Origin', '*')
  responseHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges')
  responseHeaders.set('Cache-Control', isPlaylist ? 'public, max-age=15' : 'public, max-age=120')

  const acceptRanges = upstream.headers.get('accept-ranges')
  if (acceptRanges) responseHeaders.set('Accept-Ranges', acceptRanges)
  const contentRange = upstream.headers.get('content-range')
  if (contentRange) responseHeaders.set('Content-Range', contentRange)
  const contentLength = upstream.headers.get('content-length')
  if (contentLength && !isPlaylist) responseHeaders.set('Content-Length', contentLength)

  if (isPlaylist) {
    const text = await upstream.text()
    if (!upstream.ok) {
      return new NextResponse(text, {
        status: upstream.status,
        headers: responseHeaders,
      })
    }
    const rewritten = rewritePlaylist(text, request.nextUrl.origin, pathParts)
    responseHeaders.set('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8')
    return new NextResponse(rewritten, {
      status: 200,
      headers: responseHeaders,
    })
  }

  responseHeaders.set(
    'Content-Type',
    contentType || (upstreamUrl.endsWith('.ts') ? 'video/mp2t' : 'application/octet-stream'),
  )

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}
