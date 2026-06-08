/**
 * Separa o texto do PDF em nome do alimento e porção (g, ml, etc.).
 */
export function splitMealItemDisplay(label = '') {
  const trimmed = String(label).trim()
  if (!trimmed) return { name: '', portion: '' }

  const measureMatch = trimmed.match(/^(.+?)\s*\((\d+(?:\.\d+)?)\s*(g|ml)\)\s*$/i)
  if (measureMatch) {
    return {
      name: measureMatch[1].trim(),
      portion: `${measureMatch[2]} ${measureMatch[3].toLowerCase()}`,
    }
  }

  if (/à vontade/i.test(trimmed)) {
    const name = trimmed.replace(/\s*à vontade.*$/i, '').trim()
    return {
      name: name || trimmed,
      portion: 'À vontade',
    }
  }

  return { name: trimmed, portion: '' }
}
