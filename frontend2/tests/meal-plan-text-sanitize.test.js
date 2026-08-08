import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cutMealPlanInlineNoise,
  looksLikeFoodPortionLine,
} from '../utils/meal-plan-text-sanitize.js'

test('rejeita bloco de rodapé/relatório como item de refeição', () => {
  const footerBlob =
    'Nutricionista CRN 66152 nutri.isabellajardim@gmail.com Página 3/4 | Paciente Isabella Jardim | Prescrito em: 16/04/2026 Relatório de nutrientes Refeição Proteínas Lipídeos Carboidratos Calorias Café da manhã 23.8g 20.9g 53.2g 489 Kcal Total das refeições 145.9g 46.1g 151.9g 1571 Kcal Vitamina E Álcool 5.2mg 0.0g'

  assert.equal(looksLikeFoodPortionLine(footerBlob), false)
})

test('corta rodapé colado após porção válida', () => {
  const glued =
    'Mix de legumes 2 colher(es) de arroz cheia(s) (140g) Nutricionista CRN 66152 Relatório de nutrientes Total das refeições 145.9g 46.1g 151.9g 1571 Kcal'

  assert.equal(
    cutMealPlanInlineNoise(glued),
    'Mix de legumes 2 colher(es) de arroz cheia(s) (140g)',
  )
  assert.equal(looksLikeFoodPortionLine(cutMealPlanInlineNoise(glued)), true)
})
