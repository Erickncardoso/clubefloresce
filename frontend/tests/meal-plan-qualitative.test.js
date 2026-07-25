import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  htmlToQualitativeText,
  syncQualitativeEditorContent,
  textToQualitativeHtml,
  hasQualitativeContent,
} from '../utils/meal-plan-qualitative-html.js'
import {
  applyQualitativeTemplate,
  filterQualitativeTemplates,
  mergeQualitativeTemplates,
  normalizeQualitativeTemplate,
} from '../utils/meal-plan-qualitative-templates.js'
import {
  buildParsedMealPlanFromPrescription,
  parseQualitativeEditorText,
} from '../utils/meal-plan-prescription.js'

describe('meal plan qualitative writing', () => {
  it('converte HTML do editor em texto plano com quebras', () => {
    const text = htmlToQualitativeText('<p>08:30 - Café</p><p>Banana - 1 un</p>')
    assert.match(text, /08:30 - Café/)
    assert.match(text, /Banana - 1 un/)
  })

  it('sincroniza editorHtml para editorText ao salvar', () => {
    const form = {
      methodology: 'qualitative',
      editorHtml: '<p><strong>Almoço</strong></p><ul><li>Salada verde</li></ul>',
      editorText: '',
    }
    syncQualitativeEditorContent(form)
    assert.match(form.editorText, /Almoço/)
    assert.match(form.editorText, /Salada verde/)
  })

  it('hidrata HTML legado a partir de editorText', () => {
    const html = textToQualitativeHtml('08:30 - Café\nBanana - 1 un')
    assert.match(html, /08:30 - Café/)
    assert.match(html, /Banana - 1 un/)
  })

  it('detecta conteúdo qualitativo', () => {
    assert.equal(hasQualitativeContent({ editorHtml: '<p>Olá</p>' }), true)
    assert.equal(hasQualitativeContent({ editorText: 'Linha' }), true)
    assert.equal(hasQualitativeContent({ editorHtml: '<p></p>' }), false)
  })

  it('filtra modelos qualitativos por nome', () => {
    const merged = mergeQualitativeTemplates([
      { id: 'custom-1', title: 'Plano gestante', editorHtml: '<p>Texto</p>' },
    ])
    const filtered = filterQualitativeTemplates('gestante', merged)
    assert.equal(filtered.some((item) => item.title === 'Plano gestante'), true)
  })

  it('aplica modelo qualitativo no formulário', () => {
    const form = { editorHtml: '', editorText: '', finalNotes: '' }
    const template = normalizeQualitativeTemplate({
      title: 'Teste',
      editorHtml: '<p>Linha A</p>',
      finalNotes: 'Obs',
    })
    applyQualitativeTemplate(form, template)
    assert.match(form.editorHtml, /Linha A/)
    assert.match(form.editorText, /Linha A/)
    assert.equal(form.finalNotes, 'Obs')
  })

  it('converte tabela HTML em texto plano com colunas', () => {
    const text = htmlToQualitativeText(
      '<table><tr><th>Horário</th><th>Item</th></tr><tr><td>08:00</td><td>Whey</td></tr></table>',
    )
    assert.match(text, /Horário \| Item/)
    assert.match(text, /08:00 \| Whey/)
  })

  it('publica plano qualitativo rico como refeições parseadas', () => {
    const prescription = {
      title: 'Plano livre',
      methodology: 'qualitative',
      editorHtml: '<p>08:30 - Café</p><p>Iogurte natural</p>',
      editorText: '',
      nutritionTotals: null,
    }
    const parsed = buildParsedMealPlanFromPrescription(prescription)
    assert.ok(parsed.meals.length >= 1)
    assert.ok(parsed.meals[0].items.length >= 1)
    const fromText = parseQualitativeEditorText('08:30 - Café\nIogurte natural')
    assert.equal(fromText.length, 1)
    assert.equal(fromText[0].items.length, 1)
  })
})
