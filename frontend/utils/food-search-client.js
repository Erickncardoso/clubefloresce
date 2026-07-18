/** Busca local de alimentos — espelha backend/src/utils/food-search.ts */

export function normalizeFoodSearchQuery(query) {
  return String(query || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s,/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const STOP_WORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'com', 'sem', 'e', 'ou', 'a', 'o', 'c', 's',
])

export const FOOD_SOURCE_SCORE_BOOST = {
  TBCA: 15,
  TACO: 0,
  CUSTOM: 25,
}

const TOKEN_SYNONYMS = {
  branco: ['branco', 'tipo 1', 'polido'],
  preto: ['preto', 'tipo 2'],
  vermelho: ['vermelho', 'tipo 3', 'roxo'],
  moido: ['moido', 'moída', 'moído', 'moida'],
  grelhado: ['grelhado', 'grelhada'],
  cozido: ['cozido', 'cozida', 'cozidos', 'cozidas'],
  cru: ['cru', 'crua', 'crus', 'cruas'],
  frito: ['frito', 'frita', 'fritos', 'fritas'],
  whey: ['whey', 'whey protein', 'proteina', 'proteico', 'suplemento', 'soro'],
  yopro: ['yopro', 'yo pro', 'danone yopro', 'iogurte yopro'],
  growth: ['growth', 'growth supplements', 'whey growth'],
  max: ['max titanium', 'max whey'],
  integralmedica: ['integralmedica', 'integral medica'],
  multigraos: ['multigraos', 'multigrãos', 'multigrain', 'integral'],
  multigrãos: ['multigraos', 'multigrãos', 'multigrain', 'integral'],
  forma: ['forma', 'fatia'],
}

export function tokenizeFoodQuery(query) {
  const normalized = normalizeFoodSearchQuery(query)
  if (!normalized) return []

  const rawTokens = normalized
    .split(/[\s,/]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token))

  return [...new Set(rawTokens)]
}

export function expandTokenSynonyms(token) {
  const synonyms = TOKEN_SYNONYMS[token]
  if (!synonyms) return [token]
  return [...new Set([token, ...synonyms.map((entry) => normalizeFoodSearchQuery(entry))])]
}

export function scoreFoodSearchResult(query, name, source) {
  const normalizedQuery = normalizeFoodSearchQuery(query)
  const normalizedName = normalizeFoodSearchQuery(name)
  const queryTokens = tokenizeFoodQuery(query)

  let score = 0

  if (normalizedName === normalizedQuery) score += 200
  else if (normalizedName.startsWith(normalizedQuery)) score += 120
  else if (normalizedName.includes(normalizedQuery)) score += 60

  if (queryTokens.length) {
    const matched = queryTokens.filter((token) => {
      const variants = expandTokenSynonyms(token)
      return variants.some((variant) => normalizedName.includes(variant))
    }).length
    score += Math.round((matched / queryTokens.length) * 70)
  }

  score += FOOD_SOURCE_SCORE_BOOST[source] ?? 0

  if (name.length > 70) score -= 25
  if (name.includes('Prato de comida')) score -= 40
  if (name.includes('c/')) score -= 15
  score -= Math.min(20, (name.match(/,/g) || []).length * 2)

  return score
}

const COMPOUND_DISH =
  /sandu[ií]che|sandwich|benedit|misto quente|hamb[uú]rguer|hot dog|pizza|lasanha|bolo\b|torta\b|estrogonofe|feijoada|prato de|salada de/i

export function scoreFoodForMealPlanSearch(query, item) {
  const name = item?.name || ''
  const source = item?.source || 'TBCA'
  const displayName = item?.displayName || name

  let score = scoreFoodSearchResult(query, name, source)
  const normalizedQuery = normalizeFoodSearchQuery(query)
  const queryTokens = tokenizeFoodQuery(query)
  const normalizedName = normalizeFoodSearchQuery(name)
  const primary = normalizeFoodSearchQuery(name.split(',')[0] || name)
  const normalizedDisplay = normalizeFoodSearchQuery(displayName)

  if (normalizedDisplay === normalizedQuery) score += 220
  else if (normalizedQuery.startsWith(normalizedDisplay) && normalizedDisplay.length >= 8) {
    score += 120
  }

  if (COMPOUND_DISH.test(name)) score -= 220
  if (/\([^)]{18,}\)/.test(name)) score -= 70

  const commaCount = (name.match(/,/g) || []).length
  if (commaCount >= 4) score -= 55
  else if (commaCount >= 3) score -= 30
  else if (commaCount <= 1) score += 18

  if (queryTokens.includes('pao') && queryTokens.includes('forma')) {
    if (/^pao\b/.test(normalizedName) && /\bforma\b/.test(normalizedName) && !COMPOUND_DISH.test(name)) {
      score += 95
    }
    if (source === 'TBCA' && /\bforma\b/.test(normalizedName) && !/sanduiche|sandwich/i.test(normalizedName)) {
      score += 35
    }
  }

  if (primary === normalizedQuery) score += 80
  else if (queryTokens.length >= 2 && queryTokens.every((token) => primary.includes(token))) {
    score += 55
  }

  if (normalizedName.includes(normalizedQuery) && !COMPOUND_DISH.test(name)) {
    score += 25
  }

  return score
}

export function countMatchingFoodTokens(query, name) {
  const tokens = tokenizeFoodQuery(query)
  if (!tokens.length) return 0
  const normalizedName = normalizeFoodSearchQuery(name)
  return tokens.filter((token) => {
    const variants = expandTokenSynonyms(token)
    return variants.some((variant) => normalizedName.includes(variant))
  }).length
}

export function minRelaxedTokenMatches(tokenCount) {
  if (tokenCount <= 1) return 1
  return Math.max(2, Math.ceil(tokenCount * 0.5))
}

export function pickBestFoodMatch(query, items, minScore = 45) {
  if (!items?.length) return null

  let best = null
  let bestScore = 0

  for (const item of items) {
    const score = scoreFoodSearchResult(query, item.name, item.source)
    if (score > bestScore) {
      bestScore = score
      best = item
    }
  }

  return bestScore >= minScore ? best : null
}

function itemMatchesTokenSearch(item, query) {
  const tokens = tokenizeFoodQuery(query)
  if (!tokens.length) return true
  const searchText = normalizeFoodSearchQuery(item.searchText || item.name)
  return tokens.every((token) => {
    const variants = expandTokenSynonyms(token)
    return variants.some((variant) => searchText.includes(variant))
  })
}

function itemMatchesPhrase(item, normalizedQuery) {
  if (!normalizedQuery) return true
  const searchText = normalizeFoodSearchQuery(item.searchText || item.name)
  return searchText.includes(normalizedQuery)
}

function itemMatchesRelaxedSearch(item, query) {
  const tokens = tokenizeFoodQuery(query)
  if (!tokens.length) return true
  const searchText = normalizeFoodSearchQuery(item.searchText || item.name)
  return tokens.some((token) => {
    const variants = expandTokenSynonyms(token)
    return variants.some((variant) => searchText.includes(variant))
  })
}

function filterRelaxedFoodMatches(query, items) {
  const tokens = tokenizeFoodQuery(query)
  if (tokens.length <= 1) return items
  const minMatches = minRelaxedTokenMatches(tokens.length)
  return items.filter((item) => countMatchingFoodTokens(query, item.name) >= minMatches)
}

export function searchLocalFoodCatalog(catalog, input = {}) {
  const limit = Math.min(Math.max(Number(input.limit) || 20, 1), 50)
  const trimmed = String(input.q || '').trim()
  const normalized = normalizeFoodSearchQuery(trimmed)
  const sourceFilter = input.source === 'TACO' || input.source === 'TBCA' ? input.source : null

  let pool = catalog
  if (sourceFilter) {
    pool = catalog.filter((item) => item.source === sourceFilter)
  }

  if (!normalized) {
    return { items: pool.slice(0, limit), total: pool.length }
  }

  const queryTokens = tokenizeFoodQuery(trimmed)
  const phraseMatches = pool.filter((item) => itemMatchesPhrase(item, normalized))
  const tokenMatches = pool.filter((item) => itemMatchesTokenSearch(item, trimmed))
  const merged = new Map()
  for (const item of [...phraseMatches, ...tokenMatches]) {
    merged.set(item.id, item)
  }

  let candidates = [...merged.values()]
  if (!candidates.length && queryTokens.length > 1) {
    candidates = pool.filter((item) => itemMatchesRelaxedSearch(item, trimmed))
  }

  const ranked = candidates
    .sort(
      (a, b) =>
        scoreFoodForMealPlanSearch(trimmed, b) - scoreFoodForMealPlanSearch(trimmed, a),
    )

  const strictItems = ranked.slice(0, limit)
  const relaxedItems =
    strictItems.length > 0
      ? strictItems
      : filterRelaxedFoodMatches(trimmed, ranked).slice(0, limit)

  return { items: relaxedItems, total: candidates.length }
}

export function findLocalFoodMatch(catalog, name, source) {
  const trimmed = String(name || '').trim()
  if (!trimmed) return null

  const normalized = normalizeFoodSearchQuery(trimmed)
  const sourceFilter = source === 'TACO' || source === 'TBCA' ? source : null
  let pool = catalog
  if (sourceFilter) {
    pool = catalog.filter((item) => item.source === sourceFilter)
  }

  const exact = pool.find(
    (item) => normalizeFoodSearchQuery(item.name) === normalized
      || normalizeFoodSearchQuery(item.displayName || '') === normalized,
  )
  if (exact) return exact

  const fuzzy = pool.find((item) => normalizeFoodSearchQuery(item.searchText || '') === normalized)
  if (fuzzy) return fuzzy

  const { items } = searchLocalFoodCatalog(catalog, { q: trimmed, source: sourceFilter, limit: 30 })
  return pickBestFoodMatch(trimmed, items)
}

/** Candidatos de busca para nomes compostos do Dietbox (espelha backend). */
export function extractFoodMatchCandidates(rawName) {
  let name = String(rawName || '').trim()
  if (!name) return []

  name = name
    .replace(/\(\s*marca\s*:[^)]*\)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const candidates = []
  const push = (value) => {
    const cleaned = String(value || '')
      .trim()
      .replace(/^[-–—]\s*/, '')
      .replace(/\([^)]{3,}\)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (cleaned.length >= 3 && !candidates.includes(cleaned)) candidates.push(cleaned)
  }

  push(name)
  push(name.replace(/[/|+]/g, ' ').replace(/\s+/g, ' ').trim())

  for (const altPart of name.split(/\s+ou\s+/i)) {
    for (const slashPart of altPart.split(/[/|+]/)) {
      push(slashPart)
    }
  }

  return [...candidates].sort((a, b) => a.length - b.length)
}

/** Match plano alimentar local: TBCA + TACO + CUSTOM, melhor score global. */
export function findMealPlanFoodMatch(catalog, name, minScore = 45) {
  const trimmed = String(name || '').trim()
  if (!trimmed || !catalog?.length) return null

  const candidates = extractFoodMatchCandidates(trimmed)
  const merged = new Map()

  for (const candidate of candidates) {
    const { items } = searchLocalFoodCatalog(catalog, { q: candidate, limit: 30 })
    for (const item of items) merged.set(item.id, item)
  }

  const pool = [...merged.values()]
  if (!pool.length) return null

  let best = null
  let bestScore = minScore - 1

  for (const item of pool) {
    let itemScore = 0
    for (const candidate of [trimmed, ...candidates]) {
      itemScore = Math.max(itemScore, scoreFoodForMealPlanSearch(candidate, item))
    }
    if (itemScore > bestScore) {
      bestScore = itemScore
      best = item
    }
  }

  return best
}
