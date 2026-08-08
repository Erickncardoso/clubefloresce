import { jsPDF } from 'jspdf'

const MARGIN = 16

function sanitizeFilename(value) {
  return String(value || 'receita')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'receita'
}

async function loadImageDataUrl(url) {
  if (!url || typeof window === 'undefined') return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function splitLines(doc, text, maxWidth) {
  return doc.splitTextToSize(String(text || ''), maxWidth)
}

export async function downloadMealPlanRecipePdf({ recipe, includeMacros = true } = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const maxWidth = pageWidth - MARGIN * 2
  let y = MARGIN

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(String(recipe?.title || 'Receita'), MARGIN, y)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(95, 103, 95)
  const meta = [
    recipe?.servingsLabel ? `Porção: ${recipe.servingsLabel}` : null,
    recipe?.prepMinutes ? `Preparo: ${recipe.prepMinutes} min` : null,
  ].filter(Boolean)
  if (meta.length) {
    doc.text(meta.join(' · '), MARGIN, y)
    y += 6
  }

  if (recipe?.imageUrl) {
    const dataUrl = await loadImageDataUrl(recipe.imageUrl)
    if (dataUrl) {
      const imgW = maxWidth
      const imgH = 52
      doc.addImage(dataUrl, 'JPEG', MARGIN, y, imgW, imgH, undefined, 'FAST')
      y += imgH + 6
    }
  }

  if (includeMacros && recipe?.macros?.caloriesKcal) {
    doc.setTextColor(44, 50, 44)
    doc.setFont('helvetica', 'bold')
    doc.text('Informação nutricional (por porção)', MARGIN, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.text(
      `${recipe.macros.caloriesKcal} kcal · Carboidratos ${recipe.macros.carbsG}g · Proteínas ${recipe.macros.proteinG}g · Gorduras ${recipe.macros.fatG}g`,
      MARGIN,
      y,
    )
    y += 8
  }

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(44, 50, 44)
  doc.text('Ingredientes', MARGIN, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  for (const ingredient of recipe?.ingredients || []) {
    const line = `• ${ingredient.amount || '1'} ${ingredient.unit || ''} ${ingredient.name || ''}`.trim()
    const lines = splitLines(doc, line, maxWidth - 4)
    doc.text(lines, MARGIN + 2, y)
    y += lines.length * 5 + 1
    if (y > 270) {
      doc.addPage()
      y = MARGIN
    }
  }

  y += 4
  doc.setFont('helvetica', 'bold')
  doc.text('Modo de preparo', MARGIN, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  const steps = splitLines(doc, recipe?.steps || '', maxWidth)
  doc.text(steps, MARGIN, y)

  doc.setFontSize(8)
  doc.setTextColor(138, 146, 136)
  doc.text('Clube Florescer', pageWidth - MARGIN, doc.internal.pageSize.getHeight() - 8, { align: 'right' })

  doc.save(`${sanitizeFilename(recipe?.title)}.pdf`)
}
