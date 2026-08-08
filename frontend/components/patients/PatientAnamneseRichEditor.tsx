'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowDown,
  ArrowUp,
  BetweenHorizontalEnd,
  BetweenHorizontalStart,
  BetweenVerticalEnd,
  BetweenVerticalStart,
  Bold,
  ChevronDown,
  Columns3,
  GripVertical,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  Paintbrush,
  Quote,
  Rows3,
  Strikethrough,
  Table,
  TableCellsMerge,
  TableCellsSplit,
  Trash2,
  Type,
  Underline,
} from 'lucide-react'
import s from './PatientAnamneseRichEditor.module.scss'
import './PatientAnamneseTableBar.scss'

const SIZE_OPTIONS = [
  { value: '3', label: 'Pequeno' },
  { value: '4', label: 'Médio' },
  { value: '5', label: 'Grande' },
]

const COLOR_OPTIONS = [
  '#2c322c',
  '#8b967c',
  '#b42318',
  '#1d4ed8',
  '#b45309',
  '#6b7280',
]

export type RichEditorHandle = {
  setHtml: (html: string) => void
  focus: () => void
  getSelectedHtml: () => string
  replaceSelectedHtml: (html: string) => void
  hasSelection: () => boolean
  appendText: (text: string) => void
}

type Props = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  ariaLabel?: string
  actions?: React.ReactNode
}

type FormatStates = {
  bold: boolean
  italic: boolean
  underline: boolean
  strikeThrough: boolean
  unorderedList: boolean
  orderedList: boolean
  blockquote: boolean
}

type TableCtx = {
  table: HTMLTableElement
  cell: HTMLTableCellElement
  row: HTMLTableRowElement
  rowIndex: number
  colIndex: number
} | null

export const PatientAnamneseRichEditor = forwardRef<RichEditorHandle, Props>(
  function PatientAnamneseRichEditor(
    { value, onChange, placeholder = 'Escreva aqui…', ariaLabel = 'Editor', actions },
    ref,
  ) {
    const editorRef = useRef<HTMLDivElement>(null)
    const imageInputRef = useRef<HTMLInputElement>(null)
    const sizeMenuRef = useRef<HTMLDivElement>(null)
    const colorMenuRef = useRef<HTMLDivElement>(null)
    const syncing = useRef(false)

    const [sizeOpen, setSizeOpen] = useState(false)
    const [colorOpen, setColorOpen] = useState(false)
    const [currentSize, setCurrentSize] = useState('3')
    const [currentColor, setCurrentColor] = useState('#2c322c')
    const [states, setStates] = useState<FormatStates>({
      bold: false,
      italic: false,
      underline: false,
      strikeThrough: false,
      unorderedList: false,
      orderedList: false,
      blockquote: false,
    })

    const [tableBar, setTableBar] = useState<{ visible: boolean; top: number; left: number }>({
      visible: false,
      top: 0,
      left: 0,
    })
    const activeTableRef = useRef<HTMLTableElement | null>(null)
    const activeCellRef = useRef<HTMLTableCellElement | null>(null)

    const sizeLabel =
      SIZE_OPTIONS.find((o) => o.value === currentSize)?.label || 'Pequeno'

    // ── Helpers ──────────────────────────────────────────────────────────────

    const focusEditor = useCallback(() => {
      editorRef.current?.focus()
    }, [])

    const emitHtml = useCallback(() => {
      if (!editorRef.current || syncing.current) return
      onChange(editorRef.current.innerHTML)
    }, [onChange])

    const refreshStates = useCallback(() => {
      try {
        setStates({
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
          strikeThrough: document.queryCommandState('strikeThrough'),
          unorderedList: document.queryCommandState('insertUnorderedList'),
          orderedList: document.queryCommandState('insertOrderedList'),
          blockquote: Boolean(
            window.getSelection()?.anchorNode?.parentElement?.closest?.('blockquote'),
          ),
        })
      } catch { /* ignore */ }
    }, [])

    // ── Table context ─────────────────────────────────────────────────────────

    const getTableContext = useCallback((): TableCtx => {
      const selection = window.getSelection?.()
      if (!selection?.rangeCount) return null
      const node = selection.anchorNode
      const element = node?.nodeType === 1 ? (node as Element) : (node as Node)?.parentElement
      const cell = element?.closest?.('td, th') as HTMLTableCellElement | null
      if (!cell) return null
      const table = cell.closest('table') as HTMLTableElement | null
      if (!table || !editorRef.current?.contains(table)) return null
      const row = cell.parentElement as HTMLTableRowElement
      if (!row) return null
      return { table, cell, row, rowIndex: row.rowIndex, colIndex: cell.cellIndex }
    }, [])

    const resolveTableContext = useCallback((): TableCtx => {
      const at = activeTableRef.current
      const ac = activeCellRef.current
      if (at && ac && at.contains(ac)) {
        const row = ac.parentElement as HTMLTableRowElement
        if (row) return { table: at, cell: ac, row, rowIndex: row.rowIndex, colIndex: ac.cellIndex }
      }
      return getTableContext()
    }, [getTableContext])

    const updateTableToolbar = useCallback(() => {
      const ctx = getTableContext()
      if (!ctx) {
        setTableBar((b) => ({ ...b, visible: false }))
        activeTableRef.current = null
        activeCellRef.current = null
        return
      }
      activeTableRef.current = ctx.table
      activeCellRef.current = ctx.cell
      const rect = ctx.table.getBoundingClientRect()
      setTableBar({
        visible: true,
        top: Math.max(8, rect.top - 46),
        left: rect.left + rect.width / 2,
      })
    }, [getTableContext])

    const selectCell = useCallback(
      (cell: HTMLTableCellElement) => {
        if (!cell || !editorRef.current?.contains(cell)) return
        activeTableRef.current = cell.closest('table') as HTMLTableElement
        activeCellRef.current = cell
        focusEditor()
        const range = document.createRange()
        range.selectNodeContents(cell)
        range.collapse(true)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      },
      [focusEditor],
    )

    // ── Table helpers ─────────────────────────────────────────────────────────

    function createTableCell(tagName = 'td'): HTMLTableCellElement {
      const cell = document.createElement(tagName) as HTMLTableCellElement
      cell.innerHTML = '&nbsp;'
      return cell
    }

    function cellTagForRow(row: HTMLTableRowElement): string {
      return row?.cells?.[0]?.tagName?.toLowerCase() === 'th' ? 'th' : 'td'
    }

    function createEmptyRow(colCount: number, tagName = 'td'): HTMLTableRowElement {
      const row = document.createElement('tr') as HTMLTableRowElement
      for (let i = 0; i < colCount; i++) row.appendChild(createTableCell(tagName))
      return row
    }

    const afterTableEdit = useCallback(
      (cell: HTMLTableCellElement | null) => {
        const nextCell = cell?.isConnected ? cell : activeCellRef.current
        emitHtml()
        setTimeout(() => {
          if (nextCell?.isConnected) selectCell(nextCell)
          updateTableToolbar()
        }, 0)
      },
      [emitHtml, selectCell, updateTableToolbar],
    )

    // ── Commands ──────────────────────────────────────────────────────────────

    function run(command: string, value?: string) {
      focusEditor()
      document.execCommand(command, false, value)
      refreshStates()
      emitHtml()
    }

    function applySize(value: string) {
      setCurrentSize(value)
      setSizeOpen(false)
      run('fontSize', value)
    }

    function applyColor(color: string) {
      setCurrentColor(color)
      setColorOpen(false)
      run('foreColor', color)
    }

    function toggleBlockquote() {
      focusEditor()
      const selection = window.getSelection?.()
      if (!selection?.rangeCount) return
      const node = selection.anchorNode
      const element = node?.nodeType === 1 ? (node as Element) : (node as Node)?.parentElement
      if (element?.closest?.('blockquote')) {
        document.execCommand('formatBlock', false, 'p')
      } else {
        document.execCommand('formatBlock', false, 'blockquote')
      }
      refreshStates()
      emitHtml()
    }

    function insertTable() {
      focusEditor()
      const html = `<table><tbody><tr><th>&nbsp;</th><th>&nbsp;</th><th>&nbsp;</th></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p><br></p>`
      document.execCommand('insertHTML', false, html)
      emitHtml()
      setTimeout(() => {
        const table = editorRef.current?.querySelector('table:last-of-type') as HTMLTableElement
        const cell = table?.querySelector('td, th') as HTMLTableCellElement
        if (table && cell) {
          selectCell(cell)
          updateTableToolbar()
        }
      }, 0)
    }

    // ── Table bar actions ─────────────────────────────────────────────────────

    function moveTableUp() {
      const ctx = resolveTableContext()
      if (!ctx) return
      const parent = ctx.table.parentElement
      if (!parent) return
      const prev = ctx.table.previousElementSibling
      if (!prev) return
      parent.insertBefore(ctx.table, prev)
      afterTableEdit(ctx.cell)
    }

    function moveTableDown() {
      const ctx = resolveTableContext()
      if (!ctx) return
      const parent = ctx.table.parentElement
      if (!parent) return
      const next = ctx.table.nextElementSibling
      if (!next) return
      parent.insertBefore(next, ctx.table)
      afterTableEdit(ctx.cell)
    }

    function insertRowAbove() {
      const ctx = resolveTableContext()
      if (!ctx?.row?.parentElement) return
      const newRow = createEmptyRow(ctx.row.cells.length)
      ctx.row.parentElement.insertBefore(newRow, ctx.row)
      afterTableEdit((newRow.cells[ctx.colIndex] || newRow.cells[0]) as HTMLTableCellElement)
    }

    function insertRowBelow() {
      const ctx = resolveTableContext()
      if (!ctx?.row?.parentElement) return
      const newRow = createEmptyRow(ctx.row.cells.length)
      ctx.row.parentElement.insertBefore(newRow, ctx.row.nextSibling)
      afterTableEdit((newRow.cells[ctx.colIndex] || newRow.cells[0]) as HTMLTableCellElement)
    }

    function insertColLeft() {
      const ctx = resolveTableContext()
      if (!ctx) return
      for (let i = 0; i < ctx.table.rows.length; i++) {
        const row = ctx.table.rows[i]
        const cell = createTableCell(cellTagForRow(row))
        row.insertBefore(cell, row.cells[ctx.colIndex] || null)
      }
      afterTableEdit((ctx.row.cells[ctx.colIndex] || ctx.cell) as HTMLTableCellElement)
    }

    function insertColRight() {
      const ctx = resolveTableContext()
      if (!ctx) return
      for (let i = 0; i < ctx.table.rows.length; i++) {
        const row = ctx.table.rows[i]
        const cell = createTableCell(cellTagForRow(row))
        row.insertBefore(cell, row.cells[ctx.colIndex + 1] || null)
      }
      afterTableEdit((ctx.row.cells[ctx.colIndex + 1] || ctx.cell) as HTMLTableCellElement)
    }

    function deleteRow() {
      const ctx = resolveTableContext()
      if (!ctx?.row?.parentElement || ctx.table.rows.length <= 1) return
      const fallbackRow =
        ctx.row.nextElementSibling as HTMLTableRowElement ||
        ctx.row.previousElementSibling as HTMLTableRowElement
      const fallbackCell = fallbackRow?.cells?.[
        Math.min(ctx.colIndex, (fallbackRow.cells.length || 1) - 1)
      ] as HTMLTableCellElement
      ctx.row.remove()
      afterTableEdit(fallbackCell || null)
    }

    function deleteCol() {
      const ctx = resolveTableContext()
      if (!ctx) return
      const colCount = ctx.table.rows[0]?.cells?.length || 0
      if (colCount <= 1) return
      for (const row of ctx.table.rows) {
        row.cells[ctx.colIndex]?.remove()
      }
      const fallback =
        ctx.row.cells[Math.min(ctx.colIndex, (ctx.row.cells.length || 1) - 1)] as HTMLTableCellElement
      afterTableEdit(fallback || null)
    }

    function mergeCellPair(
      primary: HTMLTableCellElement,
      secondary: HTMLTableCellElement,
    ): HTMLTableCellElement {
      if (!primary || !secondary || primary === secondary) return primary
      const merged = [primary.textContent, secondary.textContent]
        .map((v) => String(v || '').trim())
        .filter(Boolean)
        .join(' ')
      primary.innerHTML = merged || '&nbsp;'
      primary.colSpan = (primary.colSpan || 1) + (secondary.colSpan || 1)
      if ((primary.rowSpan || 1) < (secondary.rowSpan || 1)) {
        primary.rowSpan = secondary.rowSpan
      }
      secondary.remove()
      return primary
    }

    function mergeCells() {
      const ctx = resolveTableContext()
      if (!ctx) return
      const sel = window.getSelection?.()
      const cells = new Set<HTMLTableCellElement>()
      for (const node of [sel?.anchorNode, sel?.focusNode]) {
        const el = node?.nodeType === 1 ? (node as Element) : (node as Node)?.parentElement
        const cell = el?.closest?.('td, th') as HTMLTableCellElement | null
        if (cell && editorRef.current?.contains(cell)) cells.add(cell)
      }
      const cellArr = [...cells]
      let merged: HTMLTableCellElement | null = null
      if (cellArr.length >= 2) {
        merged = cellArr.reduce((a, b) => mergeCellPair(a, b))
      } else {
        const right = ctx.row.cells[ctx.colIndex + 1] as HTMLTableCellElement
        const belowRow = ctx.table.rows[ctx.rowIndex + 1]
        const below = belowRow?.cells?.[ctx.colIndex] as HTMLTableCellElement
        if (right) merged = mergeCellPair(ctx.cell, right)
        else if (below) merged = mergeCellPair(ctx.cell, below)
      }
      afterTableEdit(merged || ctx.cell)
    }

    function splitCell() {
      const ctx = resolveTableContext()
      if (!ctx) return
      const cell = ctx.cell
      const colspan = cell.colSpan || 1
      const rowspan = cell.rowSpan || 1
      if (colspan === 1 && rowspan === 1) return
      const tag = cell.tagName.toLowerCase()
      cell.colSpan = 1
      cell.rowSpan = 1
      for (let c = 1; c < colspan; c++) {
        const nc = createTableCell(tag)
        cell.parentElement?.insertBefore(nc, cell.nextSibling)
      }
      for (let r = 1; r < rowspan; r++) {
        const targetRow = ctx.table.rows[ctx.rowIndex + r]
        if (!targetRow) continue
        for (let c = 0; c < colspan; c++) {
          const nc = createTableCell(cellTagForRow(targetRow))
          targetRow.insertBefore(nc, targetRow.cells[ctx.colIndex + c] || null)
        }
      }
      afterTableEdit(cell)
    }

    function deleteTable() {
      const ctx = resolveTableContext()
      if (!ctx) return
      ctx.table.remove()
      setTableBar((b) => ({ ...b, visible: false }))
      activeTableRef.current = null
      activeCellRef.current = null
      emitHtml()
      focusEditor()
    }

    // ── Image upload ──────────────────────────────────────────────────────────

    function triggerImage() {
      imageInputRef.current?.click()
    }

    function onImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        focusEditor()
        document.execCommand('insertImage', false, String(reader.result || ''))
        emitHtml()
        if (imageInputRef.current) imageInputRef.current.value = ''
      }
      reader.readAsDataURL(file)
    }

    // ── Editor events ─────────────────────────────────────────────────────────

    function onEditorInput() {
      if (syncing.current) return
      emitHtml()
      refreshStates()
    }

    function onEditorInteraction() {
      refreshStates()
      setTimeout(updateTableToolbar, 0)
    }

    // ── Imperative handle ─────────────────────────────────────────────────────

    useImperativeHandle(ref, () => ({
      setHtml(html: string) {
        if (!editorRef.current) return
        syncing.current = true
        editorRef.current.innerHTML = html || ''
        setTimeout(() => { syncing.current = false }, 0)
      },
      focus() {
        focusEditor()
      },
      getSelectedHtml(): string {
        const sel = window.getSelection?.()
        if (!sel?.rangeCount || sel.isCollapsed) return ''
        const range = sel.getRangeAt(0)
        if (!editorRef.current?.contains(range.commonAncestorContainer)) return ''
        const frag = range.cloneContents()
        const div = document.createElement('div')
        div.appendChild(frag)
        return div.innerHTML.trim()
      },
      replaceSelectedHtml(html: string) {
        if (!editorRef.current) return
        focusEditor()
        document.execCommand('insertHTML', false, html || '')
        emitHtml()
        refreshStates()
      },
      hasSelection(): boolean {
        const sel = window.getSelection?.()
        return Boolean(sel?.rangeCount && !sel.isCollapsed)
      },
      appendText(text: string) {
        const value = String(text || '').trim()
        if (!value || !editorRef.current) return
        focusEditor()
        const safe = value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>')
        const current = editorRef.current.innerHTML.trim()
        document.execCommand('insertHTML', false, current ? `<p><br></p><p>${safe}</p>` : `<p>${safe}</p>`)
        emitHtml()
      },
    }))

    // ── Sync external value → editor DOM ─────────────────────────────────────

    useEffect(() => {
      const el = editorRef.current
      if (!el || syncing.current) return
      if (el.innerHTML === value) return
      syncing.current = true
      el.innerHTML = value || ''
      setTimeout(() => { syncing.current = false }, 0)
    }, [value])

    // ── Click outside for dropdowns & table bar ───────────────────────────────

    useEffect(() => {
      function onDocClick(e: MouseEvent) {
        const target = e.target as Element
        if (sizeMenuRef.current && !sizeMenuRef.current.contains(target)) setSizeOpen(false)
        if (colorMenuRef.current && !colorMenuRef.current.contains(target)) setColorOpen(false)
        if (tableBar.visible) {
          const inBar = target?.closest?.('.pare-table-bar')
          const inEditor = editorRef.current?.contains(target)
          if (!inBar && !inEditor) {
            setTableBar((b) => ({ ...b, visible: false }))
            activeTableRef.current = null
            activeCellRef.current = null
          }
        }
      }
      document.addEventListener('mousedown', onDocClick)
      window.addEventListener('resize', updateTableToolbar)
      window.addEventListener('scroll', updateTableToolbar, true)
      return () => {
        document.removeEventListener('mousedown', onDocClick)
        window.removeEventListener('resize', updateTableToolbar)
        window.removeEventListener('scroll', updateTableToolbar, true)
      }
    }, [tableBar.visible, updateTableToolbar])

    // ── Render ────────────────────────────────────────────────────────────────

    return (
      <div className={s.pare}>
        {/* Toolbar */}
        <div className={s.toolbar} role="toolbar" aria-label="Formatação de texto">
          <div className={s.toolbarLeft}>
            {/* Font size */}
            <div className={s.sizeWrap} ref={sizeMenuRef}>
              <button
                type="button"
                className={s.sizeBtn}
                aria-expanded={sizeOpen}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setSizeOpen((v) => !v)}
              >
                <Type size={14} />
                <span>{sizeLabel}</span>
                <ChevronDown size={14} />
              </button>
              {sizeOpen && (
                <div className={s.sizeMenu}>
                  {SIZE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${s.sizeOption}${currentSize === opt.value ? ` ${s.sizeOptionActive}` : ''}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applySize(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className={s.sep} aria-hidden="true" />

            <button type="button" className={`${s.iconBtn}${states.bold ? ` ${s.active}` : ''}`} title="Negrito" onMouseDown={(e) => e.preventDefault()} onClick={() => run('bold')}>
              <Bold size={15} />
            </button>
            <button type="button" className={`${s.iconBtn}${states.italic ? ` ${s.active}` : ''}`} title="Itálico" onMouseDown={(e) => e.preventDefault()} onClick={() => run('italic')}>
              <Italic size={15} />
            </button>
            <button type="button" className={`${s.iconBtn}${states.underline ? ` ${s.active}` : ''}`} title="Sublinhado" onMouseDown={(e) => e.preventDefault()} onClick={() => run('underline')}>
              <Underline size={15} />
            </button>
            <button type="button" className={`${s.iconBtn}${states.strikeThrough ? ` ${s.active}` : ''}`} title="Tachado" onMouseDown={(e) => e.preventDefault()} onClick={() => run('strikeThrough')}>
              <Strikethrough size={15} />
            </button>

            {/* Color picker */}
            <div className={s.colorWrap} ref={colorMenuRef}>
              <button
                type="button"
                className={`${s.iconBtn} ${s.colorBtn}`}
                title="Cor do texto"
                aria-expanded={colorOpen}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setColorOpen((v) => !v)}
              >
                <Paintbrush size={15} />
                <span className={s.colorSwatch} style={{ background: currentColor }} />
                <ChevronDown size={12} />
              </button>
              {colorOpen && (
                <div className={s.colorMenu}>
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={s.colorOption}
                      style={{ background: color }}
                      title={color}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyColor(color)}
                    />
                  ))}
                </div>
              )}
            </div>

            <span className={s.sep} aria-hidden="true" />

            <button type="button" className={`${s.iconBtn}${states.blockquote ? ` ${s.active}` : ''}`} title="Citação" onMouseDown={(e) => e.preventDefault()} onClick={toggleBlockquote}>
              <Quote size={15} />
            </button>
            <button type="button" className={`${s.iconBtn}${states.unorderedList ? ` ${s.active}` : ''}`} title="Lista com marcadores" onMouseDown={(e) => e.preventDefault()} onClick={() => run('insertUnorderedList')}>
              <List size={15} />
            </button>
            <button type="button" className={`${s.iconBtn}${states.orderedList ? ` ${s.active}` : ''}`} title="Lista numerada" onMouseDown={(e) => e.preventDefault()} onClick={() => run('insertOrderedList')}>
              <ListOrdered size={15} />
            </button>
            <button type="button" className={s.iconBtn} title="Inserir tabela" onMouseDown={(e) => e.preventDefault()} onClick={insertTable}>
              <Table size={15} />
            </button>
            <button type="button" className={s.iconBtn} title="Inserir imagem" onMouseDown={(e) => e.preventDefault()} onClick={triggerImage}>
              <ImageIcon size={15} />
            </button>
            <input
              ref={imageInputRef}
              className={s.fileInput}
              type="file"
              accept="image/*"
              onChange={onImageSelected}
            />
          </div>

          <div className={s.toolbarRight}>
            {actions}
          </div>
        </div>

        {/* Editor */}
        <div className={s.editorShell}>
          {/* Table toolbar portal */}
          {tableBar.visible && typeof document !== 'undefined' && createPortal(
            <div
              className="pare-table-bar"
              style={{
                position: 'fixed',
                top: tableBar.top,
                left: tableBar.left,
                transform: 'translateX(-50%)',
                zIndex: 10250,
              }}
              role="toolbar"
              aria-label="Editar tabela"
              onMouseDown={(e) => e.preventDefault()}
            >
              <button type="button" className="pare-table-btn pare-table-btn--grip" disabled aria-hidden="true"><GripVertical size={16} /></button>
              <button type="button" className="pare-table-btn" onMouseDown={(e) => e.preventDefault()} onClick={moveTableUp}><ArrowUp size={16} /><span className="pare-table-tip">Mover para cima</span></button>
              <button type="button" className="pare-table-btn" onMouseDown={(e) => e.preventDefault()} onClick={moveTableDown}><ArrowDown size={16} /><span className="pare-table-tip">Mover para baixo</span></button>
              <span className="pare-table-sep" aria-hidden="true" />
              <button type="button" className="pare-table-btn" onMouseDown={(e) => e.preventDefault()} onClick={insertRowAbove}><BetweenHorizontalStart size={16} /><span className="pare-table-tip">Adicionar linha acima</span></button>
              <button type="button" className="pare-table-btn" onMouseDown={(e) => e.preventDefault()} onClick={insertRowBelow}><BetweenHorizontalEnd size={16} /><span className="pare-table-tip">Adicionar linha abaixo</span></button>
              <button type="button" className="pare-table-btn" onMouseDown={(e) => e.preventDefault()} onClick={insertColLeft}><BetweenVerticalStart size={16} /><span className="pare-table-tip">Adicionar coluna à esquerda</span></button>
              <button type="button" className="pare-table-btn" onMouseDown={(e) => e.preventDefault()} onClick={insertColRight}><BetweenVerticalEnd size={16} /><span className="pare-table-tip">Adicionar coluna à direita</span></button>
              <button type="button" className="pare-table-btn" onMouseDown={(e) => e.preventDefault()} onClick={deleteRow}><Rows3 size={16} /><span className="pare-table-tip">Remover linha</span></button>
              <button type="button" className="pare-table-btn" onMouseDown={(e) => e.preventDefault()} onClick={deleteCol}><Columns3 size={16} /><span className="pare-table-tip">Remover coluna</span></button>
              <span className="pare-table-sep" aria-hidden="true" />
              <button type="button" className="pare-table-btn" onMouseDown={(e) => e.preventDefault()} onClick={mergeCells}><TableCellsMerge size={16} /><span className="pare-table-tip">Mesclar células</span></button>
              <button type="button" className="pare-table-btn" onMouseDown={(e) => e.preventDefault()} onClick={splitCell}><TableCellsSplit size={16} /><span className="pare-table-tip">Dividir célula</span></button>
              <span className="pare-table-sep" aria-hidden="true" />
              <button type="button" className="pare-table-btn pare-table-btn--danger" onMouseDown={(e) => e.preventDefault()} onClick={deleteTable}><Trash2 size={16} /><span className="pare-table-tip">Remover tabela</span></button>
            </div>,
            document.body,
          )}

          <div
            ref={editorRef}
            className={s.editor}
            contentEditable
            role="textbox"
            aria-multiline="true"
            aria-label={ariaLabel}
            data-placeholder={placeholder}
            onInput={onEditorInput}
            onKeyUp={onEditorInteraction}
            onMouseUp={onEditorInteraction}
            onClick={onEditorInteraction}
            onScroll={updateTableToolbar}
            onFocus={refreshStates}
            onBlur={() => setTimeout(emitHtml, 0)}
            suppressContentEditableWarning
          />
        </div>
      </div>
    )
  },
)
