const { PrismaClient } = require('@prisma/client')
const jwt = require('jsonwebtoken')

require('dotenv').config()

function normalizeBunnyStoragePath(storagePath) {
  const trimmed = String(storagePath || '').trim().replace(/^\/+/, '')
  if (!trimmed) return ''
  try {
    return decodeURIComponent(trimmed)
  } catch {
    return trimmed
  }
}

function parseStoragePath(fileUrl) {
  const value = String(fileUrl || '').trim()
  if (!value) return null

  if (value.includes('/upload/document')) {
    try {
      const token = new URL(value, 'http://local.invalid').searchParams.get('token')
      if (!token) return null
      const decoded = jwt.decode(token)
      if (decoded?.kind === 'document' && decoded.path) {
        return normalizeBunnyStoragePath(decoded.path)
      }
    } catch {
      return null
    }
  }

  if (/\.b-cdn\.net\//i.test(value)) {
    try {
      const pathname = new URL(value).pathname.replace(/^\/+/, '')
      return pathname ? normalizeBunnyStoragePath(pathname) : null
    } catch {
      return null
    }
  }

  return null
}

function toPermanentUrl(fileUrl) {
  const storagePath = parseStoragePath(fileUrl)
  const host = String(process.env.BUNNY_STORAGE_CDN_HOSTNAME || '')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')

  if (storagePath && host) {
    return `https://${host}/${storagePath}`
  }

  return fileUrl
}

async function main() {
  const prisma = new PrismaClient()
  const ebooks = await prisma.ebook.findMany({
    select: { id: true, title: true, fileUrl: true },
  })

  let updated = 0
  for (const ebook of ebooks) {
    const nextUrl = toPermanentUrl(ebook.fileUrl)
    if (!nextUrl || nextUrl === ebook.fileUrl) continue

    await prisma.ebook.update({
      where: { id: ebook.id },
      data: { fileUrl: nextUrl },
    })
    updated += 1
    console.log(`[fix] ${ebook.title}`)
    console.log(`  -> ${nextUrl}`)
  }

  console.log(`\nConcluído: ${updated}/${ebooks.length} ebook(s) corrigido(s).`)
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
