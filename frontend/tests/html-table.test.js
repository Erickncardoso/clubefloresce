import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildAutoTableDataFromRows,
  htmlToPlainTextWithTables,
  replaceHtmlTablesWithPlainText,
} from '../utils/html-table.js'

describe('html table utils', () => {
  it('monta head e body quando a primeira linha usa th', () => {
    const data = buildAutoTableDataFromRows([
      {
        cells: [
          { content: 'Horário', isHeader: true },
          { content: 'Suplemento', isHeader: true },
        ],
      },
      {
        cells: [
          { content: '08:00' },
          { content: 'Vitamina D' },
        ],
      },
    ])
    assert.deepEqual(data.head, [['Horário', 'Suplemento']])
    assert.equal(data.body.length, 1)
    assert.equal(data.body[0][0].content, '08:00')
  })

  it('preserva colspan na grade', () => {
    const data = buildAutoTableDataFromRows([
      {
        cells: [
          { content: 'Resumo', colSpan: 2 },
        ],
      },
      {
        cells: [
          { content: 'A' },
          { content: 'B' },
        ],
      },
    ])
    assert.equal(data.body[0][0].content, 'Resumo')
    assert.equal(data.body[0][0].colSpan, 2)
    assert.equal(data.body[1][0].content, 'A')
  })

  it('converte tabela HTML em texto legível', () => {
    const html = '<p>Intro</p><table><tr><th>Dia</th><th>Refeição</th></tr><tr><td>Seg</td><td>Salada</td></tr></table>'
    const plain = htmlToPlainTextWithTables(html)
    assert.match(plain, /Intro/)
    assert.match(plain, /Dia \| Refeição/)
    assert.match(plain, /Seg \| Salada/)
  })

  it('substitui tabela por parágrafos intermediários', () => {
    const replaced = replaceHtmlTablesWithPlainText('<table><tr><td>A</td><td>B</td></tr></table>')
    assert.match(replaced, /<p>A \| B<\/p>/)
  })
})
