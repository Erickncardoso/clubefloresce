<template>
  <div class="pare">
    <div class="pare-toolbar" role="toolbar" aria-label="Formatação de texto">
      <div class="pare-toolbar-left">
        <div class="pare-size" ref="sizeMenuRef">
          <button
            type="button"
            class="pare-size-btn"
            :aria-expanded="sizeOpen"
            @mousedown.prevent
            @click="sizeOpen = !sizeOpen"
          >
            <Type :size="14" />
            <span>{{ sizeLabel }}</span>
            <ChevronDown :size="14" />
          </button>
          <div v-if="sizeOpen" class="pare-size-menu">
            <button
              v-for="option in SIZE_OPTIONS"
              :key="option.value"
              type="button"
              class="pare-size-option"
              :class="{ active: currentSize === option.value }"
              @mousedown.prevent
              @click="applySize(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <span class="pare-sep" aria-hidden="true" />

        <button
          type="button"
          class="pare-icon-btn"
          :class="{ active: states.bold }"
          title="Negrito"
          @mousedown.prevent
          @click="run('bold')"
        >
          <Bold :size="15" />
        </button>
        <button
          type="button"
          class="pare-icon-btn"
          :class="{ active: states.italic }"
          title="Itálico"
          @mousedown.prevent
          @click="run('italic')"
        >
          <Italic :size="15" />
        </button>
        <button
          type="button"
          class="pare-icon-btn"
          :class="{ active: states.underline }"
          title="Sublinhado"
          @mousedown.prevent
          @click="run('underline')"
        >
          <Underline :size="15" />
        </button>
        <button
          type="button"
          class="pare-icon-btn"
          :class="{ active: states.strikeThrough }"
          title="Tachado"
          @mousedown.prevent
          @click="run('strikeThrough')"
        >
          <Strikethrough :size="15" />
        </button>

        <div class="pare-color" ref="colorMenuRef">
          <button
            type="button"
            class="pare-icon-btn pare-color-btn"
            title="Cor do texto"
            :aria-expanded="colorOpen"
            @mousedown.prevent
            @click="colorOpen = !colorOpen"
          >
            <Paintbrush :size="15" />
            <span class="pare-color-swatch" :style="{ background: currentColor }" />
            <ChevronDown :size="12" />
          </button>
          <div v-if="colorOpen" class="pare-color-menu">
            <button
              v-for="color in COLOR_OPTIONS"
              :key="color"
              type="button"
              class="pare-color-option"
              :style="{ background: color }"
              :title="color"
              @mousedown.prevent
              @click="applyColor(color)"
            />
          </div>
        </div>

        <span class="pare-sep" aria-hidden="true" />

        <button
          type="button"
          class="pare-icon-btn"
          :class="{ active: states.blockquote }"
          title="Citação"
          @mousedown.prevent
          @click="toggleBlockquote"
        >
          <Quote :size="15" />
        </button>
        <button
          type="button"
          class="pare-icon-btn"
          :class="{ active: states.unorderedList }"
          title="Lista com marcadores"
          @mousedown.prevent
          @click="run('insertUnorderedList')"
        >
          <List :size="15" />
        </button>
        <button
          type="button"
          class="pare-icon-btn"
          :class="{ active: states.orderedList }"
          title="Lista numerada"
          @mousedown.prevent
          @click="run('insertOrderedList')"
        >
          <ListOrdered :size="15" />
        </button>
        <button
          type="button"
          class="pare-icon-btn"
          title="Inserir tabela"
          @mousedown.prevent
          @click="insertTable"
        >
          <Table :size="15" />
        </button>
        <button
          type="button"
          class="pare-icon-btn"
          title="Inserir imagem"
          @mousedown.prevent
          @click="triggerImage"
        >
          <ImageIcon :size="15" />
        </button>
        <input
          ref="imageInputRef"
          class="pare-file"
          type="file"
          accept="image/*"
          @change="onImageSelected"
        >
      </div>

      <div class="pare-toolbar-right">
        <slot name="actions" />
      </div>
    </div>

    <div ref="editorShellRef" class="pare-editor-shell">
      <ClientOnly>
      <Teleport to="body">
        <div
          v-if="tableToolbar.visible"
          class="pare-table-bar"
          :style="tableToolbarStyle"
          role="toolbar"
          aria-label="Editar tabela"
          @mousedown.prevent
        >
          <button type="button" class="pare-table-btn pare-table-btn--grip" disabled aria-hidden="true">
            <GripVertical :size="16" />
          </button>
          <button type="button" class="pare-table-btn" @mousedown.prevent @click="moveTableUp">
            <ArrowUp :size="16" />
            <span class="pare-table-tip">Mover para cima</span>
          </button>
          <button type="button" class="pare-table-btn" @mousedown.prevent @click="moveTableDown">
            <ArrowDown :size="16" />
            <span class="pare-table-tip">Mover para baixo</span>
          </button>
          <span class="pare-table-sep" aria-hidden="true" />
          <button type="button" class="pare-table-btn" @mousedown.prevent @click="insertRowAbove">
            <BetweenHorizontalStart :size="16" />
            <span class="pare-table-tip">Adicionar linha acima</span>
          </button>
          <button type="button" class="pare-table-btn" @mousedown.prevent @click="insertRowBelow">
            <BetweenHorizontalEnd :size="16" />
            <span class="pare-table-tip">Adicionar linha abaixo</span>
          </button>
          <button type="button" class="pare-table-btn" @mousedown.prevent @click="insertColLeft">
            <BetweenVerticalStart :size="16" />
            <span class="pare-table-tip">Adicionar coluna à esquerda</span>
          </button>
          <button type="button" class="pare-table-btn" @mousedown.prevent @click="insertColRight">
            <BetweenVerticalEnd :size="16" />
            <span class="pare-table-tip">Adicionar coluna à direita</span>
          </button>
          <button type="button" class="pare-table-btn" @mousedown.prevent @click="deleteRow">
            <Rows3 :size="16" />
            <span class="pare-table-tip">Remover linha</span>
          </button>
          <button type="button" class="pare-table-btn" @mousedown.prevent @click="deleteCol">
            <Columns3 :size="16" />
            <span class="pare-table-tip">Remover coluna</span>
          </button>
          <span class="pare-table-sep" aria-hidden="true" />
          <button type="button" class="pare-table-btn" @mousedown.prevent @click="mergeCells">
            <TableCellsMerge :size="16" />
            <span class="pare-table-tip">Mesclar células</span>
          </button>
          <button type="button" class="pare-table-btn" @mousedown.prevent @click="splitCell">
            <TableCellsSplit :size="16" />
            <span class="pare-table-tip">Dividir célula</span>
          </button>
          <span class="pare-table-sep" aria-hidden="true" />
          <button type="button" class="pare-table-btn pare-table-btn--danger" @mousedown.prevent @click="deleteTable">
            <Trash2 :size="16" />
            <span class="pare-table-tip">Remover tabela</span>
          </button>
        </div>
      </Teleport>
      </ClientOnly>

      <div
        ref="editorRef"
        class="pare-editor"
        contenteditable="true"
        role="textbox"
        aria-multiline="true"
        :aria-label="ariaLabel"
        :data-placeholder="placeholder"
        @input="onInput"
        @keyup="onEditorInteraction"
        @mouseup="onEditorInteraction"
        @click="onEditorInteraction"
        @scroll="updateTableToolbar"
        @focus="refreshStates"
        @blur="onEditorBlur"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
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
} from 'lucide-vue-next'

const SIZE_OPTIONS = [
  { value: '3', label: 'Pequeno', px: '14px' },
  { value: '4', label: 'Médio', px: '16px' },
  { value: '5', label: 'Grande', px: '20px' },
]

const COLOR_OPTIONS = [
  '#2c322c',
  '#8b967c',
  '#b42318',
  '#1d4ed8',
  '#b45309',
  '#6b7280',
]

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Escreva a anamnese clínica aqui…' },
  ariaLabel: { type: String, default: 'Conteúdo da anamnese' },
})

const emit = defineEmits(['update:modelValue'])

const editorRef = ref(null)
const editorShellRef = ref(null)
const imageInputRef = ref(null)
const sizeMenuRef = ref(null)
const colorMenuRef = ref(null)
const sizeOpen = ref(false)
const colorOpen = ref(false)
const currentSize = ref('3')
const currentColor = ref('#2c322c')
const syncing = ref(false)
const activeTable = ref(null)
const activeCell = ref(null)
const tableToolbar = reactive({
  visible: false,
  top: 0,
  left: 0,
})

const states = reactive({
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  unorderedList: false,
  orderedList: false,
  blockquote: false,
})

const sizeLabel = computed(() => (
  SIZE_OPTIONS.find((option) => option.value === currentSize.value)?.label || 'Pequeno'
))

const tableToolbarStyle = computed(() => ({
  top: `${tableToolbar.top}px`,
  left: `${tableToolbar.left}px`,
  transform: 'translateX(-50%)',
}))

function getTableContext() {
  const selection = window.getSelection?.()
  if (!selection?.rangeCount) return null
  const node = selection.anchorNode
  const element = node?.nodeType === 1 ? node : node?.parentElement
  const cell = element?.closest?.('td, th')
  if (!cell) return null
  const table = cell.closest('table')
  if (!table || !editorRef.value?.contains(table)) return null
  const row = cell.parentElement
  if (!row) return null
  return {
    table,
    cell,
    row,
    rowIndex: row.rowIndex,
    colIndex: cell.cellIndex,
  }
}

function resolveTableContext() {
  if (activeTable.value && activeCell.value && activeTable.value.contains(activeCell.value)) {
    const row = activeCell.value.parentElement
    if (row) {
      return {
        table: activeTable.value,
        cell: activeCell.value,
        row,
        rowIndex: row.rowIndex,
        colIndex: activeCell.value.cellIndex,
      }
    }
  }
  return getTableContext()
}

function selectCell(cell) {
  if (!cell || !editorRef.value?.contains(cell)) return
  activeTable.value = cell.closest('table')
  activeCell.value = cell
  focusEditor()
  const range = document.createRange()
  range.selectNodeContents(cell)
  range.collapse(true)
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
}

function cellTagForRow(row) {
  return row?.cells?.[0]?.tagName?.toLowerCase() === 'th' ? 'th' : 'td'
}

function createTableCell(tagName = 'td') {
  const cell = document.createElement(tagName)
  cell.innerHTML = '&nbsp;'
  return cell
}

function getSelectedTableCells() {
  const selection = window.getSelection?.()
  if (!selection?.rangeCount) return []
  const cells = new Set()
  for (const node of [selection.anchorNode, selection.focusNode]) {
    const element = node?.nodeType === 1 ? node : node?.parentElement
    const cell = element?.closest?.('td, th')
    if (cell && editorRef.value?.contains(cell)) cells.add(cell)
  }
  try {
    const range = selection.getRangeAt(0)
    const root = range.commonAncestorContainer
    const table = (root.nodeType === 1 ? root : root.parentElement)?.closest?.('table')
    if (table && editorRef.value?.contains(table)) {
      table.querySelectorAll('td, th').forEach((cell) => {
        if (selection.containsNode(cell, true)) cells.add(cell)
      })
    }
  } catch { /* ignore */ }
  return [...cells]
}

function mergeCellPair(primary, secondary) {
  if (!primary || !secondary || primary === secondary) return primary
  const mergedText = [primary.textContent, secondary.textContent]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ')
  primary.innerHTML = mergedText || '&nbsp;'
  primary.colSpan = (primary.colSpan || 1) + (secondary.colSpan || 1)
  if ((primary.rowSpan || 1) < (secondary.rowSpan || 1)) {
    primary.rowSpan = secondary.rowSpan
  }
  secondary.remove()
  return primary
}

function mergeCellRange(cells) {
  if (cells.length < 2) return cells[0] || null
  const table = cells[0]?.closest?.('table')
  if (!table) return cells[0] || null

  const positions = cells.map((cell) => {
    const row = cell.parentElement
    return {
      cell,
      rowIndex: row?.rowIndex ?? 0,
      colIndex: cell.cellIndex,
    }
  })

  positions.sort((a, b) => (a.rowIndex - b.rowIndex) || (a.colIndex - b.colIndex))
  let target = positions[0].cell
  for (let i = 1; i < positions.length; i += 1) {
    const next = positions[i].cell
    if (!next.isConnected) continue
    target = mergeCellPair(target, next)
  }
  return target
}

function updateTableToolbar() {
  if (!import.meta.client) return
  const ctx = getTableContext()
  if (!ctx) {
    tableToolbar.visible = false
    activeTable.value = null
    activeCell.value = null
    return
  }
  activeTable.value = ctx.table
  activeCell.value = ctx.cell
  const rect = ctx.table.getBoundingClientRect()
  tableToolbar.visible = true
  tableToolbar.top = Math.max(8, rect.top - 46)
  tableToolbar.left = rect.left + rect.width / 2
}

function onEditorInteraction() {
  refreshStates()
  nextTick(updateTableToolbar)
}

function onEditorBlur() {
  window.setTimeout(() => emitHtml(), 0)
}

function createEmptyRow(colCount, tagName = 'td') {
  const row = document.createElement('tr')
  for (let i = 0; i < colCount; i += 1) {
    row.appendChild(createTableCell(tagName))
  }
  return row
}

function afterTableEdit(cell) {
  const nextCell = cell?.isConnected ? cell : activeCell.value
  emitHtml()
  nextTick(() => {
    if (nextCell?.isConnected) selectCell(nextCell)
    updateTableToolbar()
  })
}

function moveTableUp() {
  const ctx = resolveTableContext()
  if (!ctx) return
  const parent = ctx.table.parentElement
  if (!parent) return
  let prev = ctx.table.previousElementSibling
  while (prev && prev.nodeType === 3 && !prev.textContent?.trim()) {
    prev = prev.previousElementSibling
  }
  if (!prev) return
  parent.insertBefore(ctx.table, prev)
  afterTableEdit(ctx.cell)
}

function moveTableDown() {
  const ctx = resolveTableContext()
  if (!ctx) return
  const parent = ctx.table.parentElement
  if (!parent) return
  let next = ctx.table.nextElementSibling
  while (next && next.nodeType === 3 && !next.textContent?.trim()) {
    next = next.nextElementSibling
  }
  if (!next) return
  parent.insertBefore(next, ctx.table)
  afterTableEdit(ctx.cell)
}

function insertRowAbove() {
  const ctx = resolveTableContext()
  if (!ctx?.row?.parentElement) return
  const newRow = createEmptyRow(ctx.row.cells.length)
  ctx.row.parentElement.insertBefore(newRow, ctx.row)
  afterTableEdit(newRow.cells[ctx.colIndex] || newRow.cells[0])
}

function insertRowBelow() {
  const ctx = resolveTableContext()
  if (!ctx?.row?.parentElement) return
  const newRow = createEmptyRow(ctx.row.cells.length)
  ctx.row.parentElement.insertBefore(newRow, ctx.row.nextSibling)
  afterTableEdit(newRow.cells[ctx.colIndex] || newRow.cells[0])
}

function insertColLeft() {
  const ctx = resolveTableContext()
  if (!ctx) return
  for (let i = 0; i < ctx.table.rows.length; i += 1) {
    const row = ctx.table.rows[i]
    const cell = createTableCell(cellTagForRow(row))
    row.insertBefore(cell, row.cells[ctx.colIndex] || null)
  }
  afterTableEdit(ctx.row.cells[ctx.colIndex] || ctx.cell)
}

function insertColRight() {
  const ctx = resolveTableContext()
  if (!ctx) return
  for (let i = 0; i < ctx.table.rows.length; i += 1) {
    const row = ctx.table.rows[i]
    const cell = createTableCell(cellTagForRow(row))
    const ref = row.cells[ctx.colIndex + 1] || null
    row.insertBefore(cell, ref)
  }
  afterTableEdit(ctx.row.cells[ctx.colIndex + 1] || ctx.cell)
}

function deleteRow() {
  const ctx = resolveTableContext()
  if (!ctx?.row?.parentElement || ctx.table.rows.length <= 1) return
  const fallbackRow = ctx.row.nextElementSibling || ctx.row.previousElementSibling
  const fallbackCell = fallbackRow?.cells?.[Math.min(ctx.colIndex, (fallbackRow.cells.length || 1) - 1)]
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
  const fallbackCell = ctx.row.cells[Math.min(ctx.colIndex, (ctx.row.cells.length || 1) - 1)]
    || ctx.row.cells[ctx.colIndex - 1]
  afterTableEdit(fallbackCell || null)
}

function mergeCells() {
  const ctx = resolveTableContext()
  if (!ctx) return

  const selected = getSelectedTableCells()
  let mergedCell = null

  if (selected.length >= 2) {
    mergedCell = mergeCellRange(selected)
  } else {
    const rightCell = ctx.row.cells[ctx.colIndex + 1]
    const belowRow = ctx.table.rows[ctx.rowIndex + 1]
    const belowCell = belowRow?.cells?.[ctx.colIndex]
    if (rightCell) {
      mergedCell = mergeCellPair(ctx.cell, rightCell)
    } else if (belowCell) {
      mergedCell = mergeCellPair(ctx.cell, belowCell)
    }
  }

  afterTableEdit(mergedCell || ctx.cell)
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

  for (let c = 1; c < colspan; c += 1) {
    const newCell = createTableCell(tag)
    cell.parentElement?.insertBefore(newCell, cell.nextSibling)
  }

  for (let r = 1; r < rowspan; r += 1) {
    const targetRow = ctx.table.rows[ctx.rowIndex + r]
    if (!targetRow) continue
    for (let c = 0; c < colspan; c += 1) {
      const newCell = createTableCell(cellTagForRow(targetRow))
      const ref = targetRow.cells[ctx.colIndex + c] || null
      targetRow.insertBefore(newCell, ref)
    }
  }

  afterTableEdit(cell)
}

function deleteTable() {
  const ctx = resolveTableContext()
  if (!ctx) return
  ctx.table.remove()
  tableToolbar.visible = false
  activeTable.value = null
  activeCell.value = null
  emitHtml()
  focusEditor()
}

function focusEditor() {
  editorRef.value?.focus?.()
}

function run(command, value = null) {
  focusEditor()
  document.execCommand(command, false, value)
  refreshStates()
  emitHtml()
}

function applySize(value) {
  currentSize.value = value
  sizeOpen.value = false
  run('fontSize', value)
}

function applyColor(color) {
  currentColor.value = color
  colorOpen.value = false
  run('foreColor', color)
}

function toggleBlockquote() {
  focusEditor()
  const selection = window.getSelection?.()
  if (!selection?.rangeCount) return
  const node = selection.anchorNode
  const element = node?.nodeType === 1 ? node : node?.parentElement
  const quote = element?.closest?.('blockquote')
  if (quote) {
    document.execCommand('formatBlock', false, 'p')
  } else {
    document.execCommand('formatBlock', false, 'blockquote')
  }
  refreshStates()
  emitHtml()
}

function insertTable() {
  focusEditor()
  const html = `
    <table>
      <tbody>
        <tr><th>&nbsp;</th><th>&nbsp;</th><th>&nbsp;</th></tr>
        <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
        <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
      </tbody>
    </table>
    <p><br></p>
  `
  document.execCommand('insertHTML', false, html)
  emitHtml()
  nextTick(() => {
    const table = editorRef.value?.querySelector('table:last-of-type')
    const cell = table?.querySelector('td, th')
    if (table && cell) {
      selectCell(cell)
      updateTableToolbar()
    }
  })
}

function triggerImage() {
  imageInputRef.value?.click?.()
}

function onImageSelected(event) {
  const file = event?.target?.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    focusEditor()
    document.execCommand('insertImage', false, String(reader.result || ''))
    emitHtml()
    if (imageInputRef.value) imageInputRef.value.value = ''
  }
  reader.readAsDataURL(file)
}

function refreshStates() {
  if (!import.meta.client) return
  try {
    states.bold = document.queryCommandState('bold')
    states.italic = document.queryCommandState('italic')
    states.underline = document.queryCommandState('underline')
    states.strikeThrough = document.queryCommandState('strikeThrough')
    states.unorderedList = document.queryCommandState('insertUnorderedList')
    states.orderedList = document.queryCommandState('insertOrderedList')
  } catch { /* ignore */ }

  const selection = window.getSelection?.()
  const node = selection?.anchorNode
  const element = node?.nodeType === 1 ? node : node?.parentElement
  states.blockquote = Boolean(element?.closest?.('blockquote'))
}

function onInput() {
  if (syncing.value) return
  emitHtml()
  refreshStates()
}

function emitHtml() {
  if (!editorRef.value || syncing.value) return
  emit('update:modelValue', editorRef.value.innerHTML)
}

function setHtml(html) {
  if (!editorRef.value) return
  syncing.value = true
  editorRef.value.innerHTML = html || ''
  nextTick(() => {
    syncing.value = false
  })
}

function appendTranscript(text) {
  const value = String(text || '').trim()
  if (!value || !editorRef.value) return
  focusEditor()
  const lines = value.split(/\n+/).filter(Boolean)
  const blocks = lines.map((line) => {
    const match = line.match(/^\[(Paciente|Nutricionista)\]:\s*(.*)$/i)
    if (match) {
      const role = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase()
      const label = role === 'Nutricionista' ? 'Nutricionista' : 'Paciente'
      const body = escapeHtml(match[2].trim()) || '<br>'
      return `<p><strong>[${label}]:</strong> ${body}</p>`
    }
    return `<p>${escapeHtml(line)}</p>`
  }).join('')
  const prefix = editorRef.value.innerHTML.trim() ? '<p><br></p>' : ''
  document.execCommand('insertHTML', false, prefix + blocks)
  emitHtml()
}

function appendText(text) {
  const value = String(text || '').trim()
  if (!value || !editorRef.value) return
  focusEditor()
  const safe = value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
  const current = editorRef.value.innerHTML.trim()
  const block = current
    ? `<p><br></p><p>${safe}</p>`
    : `<p>${safe}</p>`
  document.execCommand('insertHTML', false, block)
  emitHtml()
}

function focus() {
  focusEditor()
}

watch(
  () => props.modelValue,
  (next) => {
    if (!editorRef.value) return
    if (editorRef.value.innerHTML === next) return
    setHtml(next)
  },
)

function onDocumentClick(event) {
  if (sizeOpen.value && !sizeMenuRef.value?.contains(event.target)) sizeOpen.value = false
  if (colorOpen.value && !colorMenuRef.value?.contains(event.target)) colorOpen.value = false
  if (tableToolbar.visible) {
    const target = event.target
    const inBar = target?.closest?.('.pare-table-bar')
    const inEditor = editorRef.value?.contains(target)
    if (!inBar && !inEditor) {
      tableToolbar.visible = false
      activeTable.value = null
      activeCell.value = null
    }
  }
}

onMounted(() => {
  setHtml(props.modelValue)
  if (import.meta.client) {
    document.addEventListener('mousedown', onDocumentClick)
    window.addEventListener('resize', updateTableToolbar)
    window.addEventListener('scroll', updateTableToolbar, true)
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.removeEventListener('mousedown', onDocumentClick)
    window.removeEventListener('resize', updateTableToolbar)
    window.removeEventListener('scroll', updateTableToolbar, true)
  }
})

function hasSelection() {
  const selection = window.getSelection?.()
  return Boolean(selection?.rangeCount && !selection.isCollapsed)
}

function getSelectedHtml() {
  if (!import.meta.client) return ''
  const selection = window.getSelection?.()
  if (!selection?.rangeCount || selection.isCollapsed) return ''
  const range = selection.getRangeAt(0)
  if (!editorRef.value?.contains(range.commonAncestorContainer)) return ''
  const fragment = range.cloneContents()
  const wrapper = document.createElement('div')
  wrapper.appendChild(fragment)
  return wrapper.innerHTML.trim()
}

function replaceSelectedHtml(html) {
  if (!import.meta.client || !editorRef.value) return
  focusEditor()
  document.execCommand('insertHTML', false, html || '')
  emitHtml()
  refreshStates()
}

defineExpose({
  focus,
  appendText,
  appendTranscript,
  setHtml,
  getSelectedHtml,
  replaceSelectedHtml,
  hasSelection,
})
</script>

<style scoped>
.pare {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 20rem;
  background: #fff;
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-radius-md, 1.25rem);
  overflow: hidden;
}

.pare-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.55rem 0.7rem;
  border-bottom: 1px solid #e8ece9;
  background: #fff;
}

.pare-toolbar-left,
.pare-toolbar-right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.2rem;
}

.pare-sep {
  width: 1px;
  height: 1.35rem;
  margin: 0 0.3rem;
  background: #e5e9e5;
}

.pare-icon-btn,
.pare-size-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  min-height: 2rem;
  border: none;
  border-radius: 0.5rem;
  background: transparent;
  color: #3f4a3a;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
}

.pare-icon-btn {
  width: 2rem;
  padding: 0;
}

.pare-icon-btn:hover,
.pare-size-btn:hover {
  background: #f3f5f3;
}

.pare-icon-btn.active {
  background: rgba(139, 150, 124, 0.16);
  color: #5f6b55;
}

.pare-size {
  position: relative;
}

.pare-size-btn {
  padding: 0 0.55rem;
}

.pare-size-menu,
.pare-color-menu {
  position: absolute;
  top: calc(100% + 0.35rem);
  left: 0;
  z-index: 5;
  display: grid;
  gap: 0.15rem;
  min-width: 7.5rem;
  padding: 0.3rem;
  background: #fff;
  border: 1px solid #e8ece9;
  border-radius: 0.625rem;
  box-shadow: 0 10px 28px rgba(28, 32, 28, 0.12);
}

.pare-size-option {
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  padding: 0.45rem 0.6rem;
  text-align: left;
  font: inherit;
  font-size: 0.8rem;
  color: #2c322c;
  cursor: pointer;
}

.pare-size-option:hover,
.pare-size-option.active {
  background: #f3f5f3;
}

.pare-color {
  position: relative;
}

.pare-color-btn {
  width: auto;
  gap: 0.2rem;
  padding: 0 0.35rem;
}

.pare-color-swatch {
  width: 0.7rem;
  height: 0.2rem;
  border-radius: 999px;
  margin-top: 0.55rem;
}

.pare-color-menu {
  grid-template-columns: repeat(3, 1.5rem);
  min-width: unset;
  gap: 0.3rem;
  padding: 0.4rem;
  border-radius: 0.625rem;
}

.pare-color-option {
  width: 1.5rem;
  height: 1.5rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 0.375rem;
  cursor: pointer;
}

.pare-file {
  display: none;
}

.pare-editor-shell {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.pare-editor {
  min-height: 18rem;
  max-height: none;
  flex: 1 1 auto;
  padding: 1.15rem 1.25rem 1.4rem;
  overflow: auto;
  background: #fff;
  font: inherit;
  font-size: 0.95rem;
  font-weight: 400;
  line-height: 1.85;
  color: #2c322c;
  outline: none;
}

.pare-editor:empty::before {
  content: attr(data-placeholder);
  color: #9aa39a;
  pointer-events: none;
}

.pare-editor :deep(p),
.pare-editor p {
  margin: 0 0 0.85rem;
}

.pare-editor :deep(strong),
.pare-editor :deep(b),
.pare-editor strong,
.pare-editor b {
  font-weight: 700;
}

.pare-editor :deep(ul),
.pare-editor :deep(ol),
.pare-editor ul,
.pare-editor ol {
  margin: 0 0 0.85rem;
  padding-left: 1.35rem;
}

.pare-editor :deep(blockquote),
.pare-editor blockquote {
  margin: 0 0 0.85rem;
  padding: 0.35rem 0 0.35rem 0.85rem;
  border-left: 3px solid #8b967c;
  color: #5f675f;
}

.pare-editor :deep(table),
.pare-editor table {
  width: 100%;
  margin: 0 0 0.85rem;
  border-collapse: collapse;
  table-layout: fixed;
}

.pare-editor :deep(tr:first-child td),
.pare-editor :deep(tr:first-child th),
.pare-editor tr:first-child td,
.pare-editor tr:first-child th {
  background: #f3f5f3;
}

.pare-editor :deep(td),
.pare-editor :deep(th),
.pare-editor td,
.pare-editor th {
  border: 1px solid #dfe4df;
  padding: 0.45rem 0.55rem;
  min-width: 4rem;
}

.pare-editor :deep(img),
.pare-editor img {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  margin: 0.35rem 0;
}

@media (max-width: 720px) {
  .pare-editor {
    min-height: 18rem;
  }
}
</style>

<style>
.pare-table-bar {
  position: fixed;
  z-index: 10250;
  display: flex;
  align-items: center;
  gap: 0.1rem;
  max-width: min(36rem, calc(100vw - 24px));
  padding: 0.35rem 0.45rem;
  background: #fff;
  border: 1px solid #e8ece9;
  border-radius: 0.625rem;
  box-shadow: 0 8px 24px rgba(28, 32, 28, 0.14);
  flex-wrap: wrap;
  justify-content: center;
}

.pare-table-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: #4b5563;
  cursor: pointer;
}

.pare-table-btn:hover:not(:disabled) {
  background: #f3f5f3;
}

.pare-table-btn--grip {
  color: #9aa39a;
  cursor: default;
}

.pare-table-btn--danger {
  color: #e57373;
}

.pare-table-btn--danger:hover {
  background: rgba(229, 115, 115, 0.12);
}

.pare-table-sep {
  width: 1px;
  height: 1.25rem;
  margin: 0 0.15rem;
  background: #e5e9e5;
}

.pare-table-tip {
  position: absolute;
  bottom: calc(100% + 0.4rem);
  left: 50%;
  transform: translateX(-50%);
  padding: 0.28rem 0.55rem;
  border: 1px solid #e8ece9;
  border-radius: 0.375rem;
  background: #fff;
  color: #2c322c;
  font-size: 0.72rem;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 6px 18px rgba(28, 32, 28, 0.1);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s ease;
}

.pare-table-btn:hover .pare-table-tip {
  opacity: 1;
}
</style>
