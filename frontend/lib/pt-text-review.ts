/**
 * Revisão local de português (sem IA e sem enviar texto para fora).
 * Sugestões só no clique direito — nunca auto-substitui.
 *
 * Léxico: abreviações + ~50k palavras PT-BR (FrequencyWords) carregadas sob demanda.
 * Sugestões via edits (Norvig) — não varre o dicionário inteiro (não trava).
 */

export type TextSuggestion = {
  id: string
  original: string
  suggestion: string
  reason: 'abbreviation' | 'spelling'
}

/** Abreviações informais → forma expandida. */
export const PT_ABBREVIATIONS: Record<string, string> = {
  hj: 'hoje',
  vc: 'você',
  vcs: 'vocês',
  tb: 'também',
  tbm: 'também',
  pq: 'porque',
  qndo: 'quando',
  qd: 'quando',
  blz: 'beleza',
  msg: 'mensagem',
  msgs: 'mensagens',
  mt: 'muito',
  mto: 'muito',
  qse: 'quase',
  dps: 'depois',
  agr: 'agora',
  cmg: 'comigo',
  ctg: 'contigo',
  porem: 'porém',
  voce: 'você',
  voces: 'vocês',
  tambem: 'também',
  nao: 'não',
  esta: 'está',
  eh: 'é',
  ate: 'até',
  cafe: 'café',
  acucar: 'açúcar',
  agua: 'água',
  oleo: 'óleo',
  proteina: 'proteína',
  proteinas: 'proteínas',
  alimentacao: 'alimentação',
  nutricao: 'nutrição',
  avaliacao: 'avaliação',
}

const ACCENT_FIXES: Record<string, string> = {
  voce: 'você',
  voces: 'vocês',
  tambem: 'também',
  nao: 'não',
  esta: 'está',
  ate: 'até',
  cafe: 'café',
  acucar: 'açúcar',
  agua: 'água',
  oleo: 'óleo',
  proteina: 'proteína',
  proteinas: 'proteínas',
  alimentacao: 'alimentação',
  nutricao: 'nutrição',
  avaliacao: 'avaliação',
  porem: 'porém',
  pao: 'pão',
  coracao: 'coração',
  pressao: 'pressão',
  refeicao: 'refeição',
  refeicoes: 'refeições',
  historico: 'histórico',
  clinica: 'clínica',
  medico: 'médico',
  medica: 'médica',
}

/** Typos comuns (atalho antes do fuzzy). */
const COMMON_TYPOS: Record<string, string> = {
  poruqe: 'porque',
  porqe: 'porque',
  porqeu: 'porque',
  hogje: 'hoje',
  hoge: 'hoje',
  hoej: 'hoje',
  vcoe: 'você',
  naum: 'não',
  ehsta: 'está',
  etsa: 'está',
  qunado: 'quando',
  qando: 'quando',
  coids: 'coisas',
  coias: 'coisas',
  coiss: 'coisas',
}

/** Seed síncrono (antes do fetch) + termos clínicos. */
const SEED_WORDS = Array.from(
  new Set([
    ...Object.values(PT_ABBREVIATIONS),
    ...Object.values(ACCENT_FIXES),
    ...Object.values(COMMON_TYPOS),
    'hoje',
    'ontem',
    'amanhã',
    'paciente',
    'consulta',
    'histórico',
    'anamnese',
    'alimentação',
    'nutrição',
    'água',
    'café',
    'açúcar',
    'óleo',
    'proteína',
    'refeição',
    'refeições',
    'pressão',
    'coração',
    'sintoma',
    'sintomas',
    'queixa',
    'dor',
    'peso',
    'altura',
    'medida',
    'medidas',
    'exame',
    'exames',
    'orientações',
    'orientação',
    'também',
    'você',
    'vocês',
    'porque',
    'quando',
    'depois',
    'agora',
    'muito',
    'beleza',
    'mensagem',
    'coisa',
    'coisas',
    'todas',
    'todos',
    'toda',
    'todo',
  ]),
)

type Lexicon = {
  words: Set<string>
  /** Menor = mais frequente (só para palavras do arquivo). */
  rank: Map<string, number>
}

const lexicon: Lexicon = {
  words: new Set(SEED_WORDS.map((w) => w.toLowerCase())),
  rank: new Map(),
}

let lexiconLoad: Promise<void> | null = null
let lexiconReady = false

const PT_LETTERS = 'abcdefghijklmnopqrstuvwxyzáàâãéêíóôõúç'
const suggestCache = new Map<string, string[]>()

function preserveCase(original: string, suggestion: string): string {
  if (!original) return suggestion
  if (original === original.toUpperCase()) return suggestion.toUpperCase()
  if (original[0] === original[0].toUpperCase()) {
    return suggestion.charAt(0).toUpperCase() + suggestion.slice(1)
  }
  return suggestion
}

/** Carrega ~50k palavras PT-BR (uma vez). Seguro chamar várias vezes. */
export function ensureSpellLexicon(): Promise<void> {
  if (lexiconReady) return Promise.resolve()
  if (lexiconLoad) return lexiconLoad
  if (typeof window === 'undefined') return Promise.resolve()

  lexiconLoad = fetch('/dictionaries/pt/words.txt')
    .then((res) => {
      if (!res.ok) throw new Error(`lexicon ${res.status}`)
      return res.text()
    })
    .then((text) => {
      const lines = text.split(/\n/)
      for (let i = 0; i < lines.length; i += 1) {
        const w = (lines[i] || '').trim().toLowerCase()
        if (!w) continue
        lexicon.words.add(w)
        if (!lexicon.rank.has(w)) lexicon.rank.set(w, i)
      }
      suggestCache.clear()
      lexiconReady = true
    })
    .catch(() => {
      // Seed local continua válido
      lexiconLoad = null
    })

  return lexiconLoad
}

export function isSpellLexiconReady(): boolean {
  return lexiconReady
}

function generateEdits1(word: string, opts?: { noInsert?: boolean }): Set<string> {
  const noInsert = opts?.noInsert === true
  const out = new Set<string>()
  for (let i = 0; i <= word.length; i += 1) {
    const L = word.slice(0, i)
    const R = word.slice(i)
    if (R) out.add(L + R.slice(1)) // delete
    if (R.length > 1) out.add(L + R[1] + R[0] + R.slice(2)) // transpose
    if (R) {
      for (const c of PT_LETTERS) out.add(L + c + R.slice(1)) // replace
    }
    if (!noInsert) {
      for (const c of PT_LETTERS) out.add(L + c + R) // insert
    }
  }
  return out
}

function rankSuggestion(a: string, b: string): number {
  const ra = lexicon.rank.get(a) ?? 999_999
  const rb = lexicon.rank.get(b) ?? 999_999
  return ra - rb || a.length - b.length || a.localeCompare(b, 'pt-BR')
}

function fuzzySuggestions(key: string): string[] {
  if (key.length < 2) return []
  const cached = suggestCache.get(key)
  if (cached) return cached

  const found = new Set<string>()
  const absorb = (edits: Set<string>) => {
    for (const e of edits) {
      if (e !== key && lexicon.words.has(e)) found.add(e)
    }
  }

  absorb(generateEdits1(key))

  // Distância 2 (coids → coisas): mids sem insert + edits completos
  if (key.length >= 4 && key.length <= 14) {
    const mids = generateEdits1(key, { noInsert: true })
    for (const mid of mids) {
      absorb(generateEdits1(mid))
      if (found.size >= 24) break
    }
  }

  const ranked = [...found].sort(rankSuggestion).slice(0, 5)
  if (suggestCache.size > 2000) suggestCache.clear()
  suggestCache.set(key, ranked)
  return ranked
}

/**
 * Sugestões para uma palavra sob o cursor (clique direito).
 */
export function suggestForWord(rawWord: string): TextSuggestion[] {
  const word = String(rawWord || '').trim()
  if (!word || word.length < 2) return []
  if (/^\d+([.,]\d+)?$/.test(word)) return []

  const key = word.toLowerCase()
  if (isKnownWord(key)) return []

  const out: TextSuggestion[] = []
  const seen = new Set<string>()

  const push = (suggestion: string, reason: TextSuggestion['reason'], id: string) => {
    const next = preserveCase(word, suggestion)
    if (!next || next.toLowerCase() === key) return
    if (seen.has(next.toLowerCase())) return
    seen.add(next.toLowerCase())
    out.push({ id, original: word, suggestion: next, reason })
  }

  if (PT_ABBREVIATIONS[key]) {
    push(PT_ABBREVIATIONS[key], 'abbreviation', `abbr:${key}`)
  }
  if (ACCENT_FIXES[key]) {
    push(ACCENT_FIXES[key], 'spelling', `accent:${key}`)
  }
  if (COMMON_TYPOS[key]) {
    push(COMMON_TYPOS[key], 'spelling', `typo:${key}`)
  }

  for (const candidate of fuzzySuggestions(key)) {
    push(candidate, 'spelling', `fuzzy:${key}:${candidate}`)
  }

  return out.slice(0, 5)
}

const PERSONAL_DICT_KEY = 'cf-pt-personal-dict'
const SESSION_IGNORE_KEY = 'cf-pt-session-ignore'

function readWordSet(storageKey: string, store: Storage | null): Set<string> {
  if (!store) return new Set()
  try {
    const raw = store.getItem(storageKey)
    const list = raw ? (JSON.parse(raw) as unknown) : []
    if (!Array.isArray(list)) return new Set()
    return new Set(list.map((w) => String(w).toLowerCase()).filter(Boolean))
  } catch {
    return new Set()
  }
}

function writeWordSet(storageKey: string, store: Storage | null, set: Set<string>) {
  if (!store) return
  try {
    store.setItem(storageKey, JSON.stringify([...set]))
  } catch {
    // quota / private mode
  }
}

export function getPersonalDictionary(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  return readWordSet(PERSONAL_DICT_KEY, window.localStorage)
}

export function addToPersonalDictionary(word: string): void {
  const key = String(word || '').trim().toLowerCase()
  if (!key || typeof window === 'undefined') return
  const set = getPersonalDictionary()
  set.add(key)
  writeWordSet(PERSONAL_DICT_KEY, window.localStorage, set)
}

export function ignoreWordThisSession(word: string): void {
  const key = String(word || '').trim().toLowerCase()
  if (!key || typeof window === 'undefined') return
  const set = readWordSet(SESSION_IGNORE_KEY, window.sessionStorage)
  set.add(key)
  writeWordSet(SESSION_IGNORE_KEY, window.sessionStorage, set)
}

export function isIgnoredThisSession(word: string): boolean {
  if (typeof window === 'undefined') return false
  return readWordSet(SESSION_IGNORE_KEY, window.sessionStorage).has(
    String(word || '').trim().toLowerCase(),
  )
}

export function isKnownWord(word: string): boolean {
  const key = String(word || '').trim().toLowerCase()
  if (!key) return false
  if (getPersonalDictionary().has(key)) return true
  if (isIgnoredThisSession(key)) return true
  if (lexicon.words.has(key)) return true
  return false
}

/**
 * Substitui o Range por texto.
 * `protectSpellcheck` só para ignorar/dicionário — correções usam texto puro
 * para não engolir a digitação seguinte nem quebrar o underline das outras palavras.
 */
export function replaceRangeWithText(range: Range, text: string, opts?: { protectSpellcheck?: boolean }): void {
  range.deleteContents()
  const protect = opts?.protectSpellcheck === true
  const sel = window.getSelection?.()
  if (protect) {
    const span = document.createElement('span')
    span.setAttribute('spellcheck', 'false')
    span.setAttribute('data-cf-dict', '1')
    span.textContent = text
    range.insertNode(span)
    const after = document.createRange()
    after.setStartAfter(span)
    after.collapse(true)
    sel?.removeAllRanges()
    sel?.addRange(after)
    return
  }
  const node = document.createTextNode(text)
  range.insertNode(node)
  const after = document.createRange()
  after.setStartAfter(node)
  after.collapse(true)
  sel?.removeAllRanges()
  sel?.addRange(after)
}

export type WordHit = {
  word: string
  range: Range
}

/** Localiza a palavra sob o ponto do mouse. */
export function getWordAtClientPoint(x: number, y: number): WordHit | null {
  let caret: Range | null = null

  if (typeof document.caretRangeFromPoint === 'function') {
    caret = document.caretRangeFromPoint(x, y)
  } else {
    const pos = (
      document as Document & {
        caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
      }
    ).caretPositionFromPoint?.(x, y)
    if (pos?.offsetNode) {
      caret = document.createRange()
      caret.setStart(pos.offsetNode, pos.offset)
      caret.collapse(true)
    }
  }

  if (!caret || caret.startContainer.nodeType !== Node.TEXT_NODE) return null
  const textNode = caret.startContainer as Text
  const value = textNode.nodeValue || ''
  if (!value) return null

  let start = caret.startOffset
  let end = caret.startOffset
  const isWordChar = (ch: string) => /[\p{L}\p{N}'’\-]/u.test(ch)

  while (start > 0 && isWordChar(value[start - 1] || '')) start -= 1
  while (end < value.length && isWordChar(value[end] || '')) end += 1
  if (start >= end) return null

  const word = value.slice(start, end)
  if (!word.trim()) return null

  const range = document.createRange()
  range.setStart(textNode, start)
  range.setEnd(textNode, end)
  return { word, range }
}
