import { htmlToPlainTextWithTables } from '~/utils/html-table.js'

export const ORIENTACAO_LIMIT = 5

export const ORIENTACAO_PREVIEW_MODELS = [
  { id: 'florescer', label: 'Modelo Clube Florescer' },
]

export const ORIENTACAO_TEMPLATES = [
  {
    id: 'blank',
    label: 'Em branco',
    title: 'Nova Orientação',
    content: '',
  },
  {
    id: 'anemia-ferropriva',
    label: 'Anemia Ferropriva',
    title: 'Orientação para Paciente com Anemia Ferropriva',
    content: [
      '<p><strong>Objetivo</strong></p>',
      '<p>Corrigir a deficiência de ferro com alimentação adequada e hábitos que favoreçam a absorção.</p>',
      '<p><br></p>',
      '<p><strong>O que comer</strong></p>',
      '<ul>',
      '<li>Carnes magras (boi, frango, peixe) e vísceras (fígado) 3–4x/semana</li>',
      '<li>Feijão, lentilha, grão-de-bico e ervilha com arroz ou farinha de mandioca</li>',
      '<li>Vegetais verde-escuros: couve, espinafre, brócolis</li>',
      '<li>Combine ferro de origem vegetal com vitamina C (laranja, limão, acerola)</li>',
      '</ul>',
      '<p><br></p>',
      '<p><strong>O que NÃO comer / evitar</strong></p>',
      '<ul>',
      '<li>Chá preto, mate e café junto das refeições principais</li>',
      '<li>Excesso de leite e derivados nas refeições ricas em ferro</li>',
      '<li>Alimentos ultraprocessados em excesso</li>',
      '</ul>',
      '<p><br></p>',
      '<p><strong>Hidratação</strong></p>',
      '<p>Manter boa ingestão de água ao longo do dia.</p>',
      '<p><br></p>',
      '<p><strong>Horários e refeições</strong></p>',
      '<p>Priorize refeições regulares a cada 3–4 horas.</p>',
      '<p><br></p>',
      '<p><strong>Dicas extras</strong></p>',
      '<p>Utilize frigideira de ferro quando possível e siga a suplementação prescrita, se houver.</p>',
    ].join(''),
  },
  {
    id: 'refluxo',
    label: 'Refluxo / Dispepsia',
    title: 'Orientação para Refluxo Gastroesofágico',
    content: [
      '<p><strong>Objetivo</strong></p>',
      '<p>Reduzir sintomas de queimação, empachamento e desconforto digestivo.</p>',
      '<p><br></p>',
      '<p><strong>O que comer</strong></p>',
      '<ul>',
      '<li>Refeições menores e mais frequentes</li>',
      '<li>Carnes magras, peixes, ovos, legumes cozidos e frutas não ácidas</li>',
      '<li>Grãos integrais em porções moderadas</li>',
      '</ul>',
      '<p><br></p>',
      '<p><strong>O que evitar</strong></p>',
      '<ul>',
      '<li>Frituras, embutidos, molhos cremosos e alimentos muito condimentados</li>',
      '<li>Refrigerantes, café, chocolate e bebidas alcoólicas</li>',
      '<li>Deitar logo após comer</li>',
      '</ul>',
      '<p><br></p>',
      '<p><strong>Dicas extras</strong></p>',
      '<p>Eleve a cabeceira da cama e evite jantar muito tarde.</p>',
    ].join(''),
  },
]

export function findOrientacaoTemplate(id) {
  return ORIENTACAO_TEMPLATES.find((item) => item.id === id) || ORIENTACAO_TEMPLATES[0]
}

export function htmlToPlainText(html) {
  return htmlToPlainTextWithTables(html)
}

export function orientacaoPreviewText(item) {
  const value = htmlToPlainText(item?.content)
  if (!value) return 'Sem conteúdo ainda.'
  return value.length > 140 ? `${value.slice(0, 140)}…` : value
}

export function orientacaoStatusLabel(status) {
  if (status === 'published') return 'Publicada'
  return 'Rascunho'
}
