'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { DocumentoTemplate } from '@/lib/documento-templates'
import { DOCUMENTO_TEMPLATES } from '@/lib/documento-templates'
import s from './PatientDocumentoTemplatePicker.module.scss'

type Props = {
  value: string
  templates?: DocumentoTemplate[]
  onChange: (id: string) => void
}

export function PatientDocumentoTemplatePicker({
  value,
  templates = DOCUMENTO_TEMPLATES,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const selectedLabel = templates.find((t) => t.id === value)?.label ?? 'Em branco'

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className={s.picker}>
      <button
        type="button"
        className={s.trigger}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={s.triggerText}>{selectedLabel}</span>
        <ChevronDown
          className={`${s.triggerIcon}${open ? ` ${s.triggerIconOpen}` : ''}`}
          size={16}
        />
      </button>

      {open ? (
        <div className={s.menu} role="listbox">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              className={`${s.item}${template.id === value ? ` ${s.itemActive}` : ''}`}
              role="option"
              aria-selected={template.id === value}
              onClick={() => {
                onChange(template.id)
                setOpen(false)
              }}
            >
              <span className={s.itemLabel}>{template.label}</span>
              <span className={s.itemCategory}>{template.category}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
