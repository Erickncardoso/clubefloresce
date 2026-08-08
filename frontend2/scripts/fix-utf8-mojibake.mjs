/**
 * Repara texto UTF-8 lido/gravado como Latin-1 (ex.: "RelatÃ³rio" → "Relatório").
 * Uso: node scripts/fix-utf8-mojibake.mjs [arquivos...]
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')

function repairLine(line) {
  if (!line.includes('Ã') && !line.includes('â€') && !line.includes('â†') && !line.includes('âŒ')) {
    return line
  }
  try {
    return Buffer.from(line, 'latin1').toString('utf8')
  } catch {
    return line
  }
}

function repairFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  const lines = raw.split(/\r?\n/)
  let changed = false
  const next = lines.map((line) => {
    const fixed = repairLine(line)
    if (fixed !== line) changed = true
    return fixed
  })
  if (!changed) return false
  fs.writeFileSync(filePath, next.join('\n'), 'utf8')
  return true
}

const args = process.argv.slice(2)
const targets = args.length
  ? args.map((p) => path.resolve(p))
  : [
      path.join(ROOT, 'pages'),
      path.join(ROOT, 'components'),
      path.join(ROOT, 'layouts'),
      path.join(ROOT, 'composables'),
    ]

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name.startsWith('.nuxt')) continue
      walk(full, out)
    } else if (/\.(vue|js|ts|mjs|css|md)$/.test(name)) {
      out.push(full)
    }
  }
  return out
}

const files = args.length ? targets : targets.flatMap((t) => (fs.statSync(t).isDirectory() ? walk(t) : [t]))
let fixedCount = 0
for (const file of files) {
  if (!fs.existsSync(file)) continue
  if (repairFile(file)) {
    fixedCount += 1
    console.log('fixed:', path.relative(ROOT, file))
  }
}
console.log(`Done. ${fixedCount} file(s) updated.`)
