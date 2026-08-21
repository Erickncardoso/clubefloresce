'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import type { Anamnese, PatientUser } from '@/lib/types'
import { AppModal } from '@/components/overlays'
import { AnamneseEditorModal } from '@/components/patients/AnamneseEditorModal'

const ANAMNESE_LIMIT = 5

type OpenArgs = {
  user: PatientUser
  seed: Anamnese | null
  anamneses: Anamnese[]
  onPatientUpdated?: (user: PatientUser) => void
}

type AnamneseBackgroundContextValue = {
  activePatientId: string | null
  isOpen: boolean
  isMinimized: boolean
  openEditor: (args: OpenArgs) => void
  restoreEditor: () => boolean
  setMinimized: (value: boolean) => void
  closeEditor: () => void
  registerPatientSync: (patientId: string, onUpdated: (user: PatientUser) => void) => () => void
}

const AnamneseBackgroundContext = createContext<AnamneseBackgroundContextValue | null>(null)

function extractPatientIdFromPath(path: string): string | null {
  try {
    const url = path.startsWith('http') ? new URL(path) : new URL(path, 'http://local')
    const match = url.pathname.match(/^\/pacientes\/([^/]+)\/?/)
    if (!match?.[1]) return null
    const id = decodeURIComponent(match[1])
    if (!id || id === 'novo') return null
    return id
  } catch {
    return null
  }
}

function nextAnamneseList(
  source: Anamnese[],
  nextItem: Anamnese | null,
  removeId = '',
): Anamnese[] {
  const current = [...source]
  if (removeId) return current.filter((item) => item.id !== removeId)
  if (!nextItem) return current
  const idx = current.findIndex((item) => item.id === nextItem.id)
  if (idx >= 0) {
    current[idx] = nextItem
    return current
  }
  return [nextItem, ...current].slice(0, ANAMNESE_LIMIT)
}

export function AnamneseBackgroundProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [user, setUser] = useState<PatientUser | null>(null)
  const [seed, setSeed] = useState<Anamnese | null>(null)
  const [anamneses, setAnamneses] = useState<Anamnese[]>([])
  const [editorKey, setEditorKey] = useState(0)
  const [blockOpen, setBlockOpen] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  const patientId = user?.id || null
  const syncRef = useRef<{ patientId: string; onUpdated: (user: PatientUser) => void } | null>(null)
  const sessionRef = useRef({ open, minimized, patientId })
  sessionRef.current = { open, minimized, patientId }

  const registerPatientSync = useCallback(
    (id: string, onUpdated: (updated: PatientUser) => void) => {
      syncRef.current = { patientId: id, onUpdated }
      return () => {
        if (syncRef.current?.patientId === id) syncRef.current = null
      }
    },
    [],
  )

  const openEditor = useCallback((args: OpenArgs) => {
    setUser(args.user)
    setSeed(args.seed)
    setAnamneses(args.anamneses)
    setEditorKey((k) => k + 1)
    setMinimized(false)
    setOpen(true)
    if (args.onPatientUpdated) {
      syncRef.current = { patientId: args.user.id, onUpdated: args.onPatientUpdated }
    }
  }, [])

  const closeEditor = useCallback(() => {
    setOpen(false)
    setMinimized(false)
    setUser(null)
    setSeed(null)
    setAnamneses([])
    setBlockOpen(false)
    setPendingHref(null)
  }, [])

  const restoreEditor = useCallback(() => {
    if (!sessionRef.current.open) return false
    setMinimized(false)
    return true
  }, [])

  const handleSave = useCallback(
    async (item: Anamnese) => {
      if (!user?.id) return
      const list = nextAnamneseList(anamneses, item)
      const updated = await apiFetch<PatientUser>(`/users/${encodeURIComponent(user.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ patientProfile: { anamneses: list } }),
      })
      setAnamneses(
        Array.isArray(updated.patientProfileData?.anamneses)
          ? (updated.patientProfileData!.anamneses as Anamnese[])
          : list,
      )
      setUser(updated)
      if (syncRef.current?.patientId === updated.id) {
        syncRef.current.onUpdated(updated)
      }
    },
    [anamneses, user?.id],
  )

  const blockOtherPatientNav = useCallback((href: string) => {
    setPendingHref(href)
    setBlockOpen(true)
  }, [])

  // Clique em links para outro paciente
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const { open: isOpen, patientId: activeId } = sessionRef.current
      if (!isOpen || !activeId) return
      if (e.defaultPrevented) return
      if (e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

      const anchor = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#')) return
      if (anchor.target === '_blank') return

      const targetPatientId = extractPatientIdFromPath(href)
      if (!targetPatientId || targetPatientId === activeId) return

      e.preventDefault()
      e.stopPropagation()
      blockOtherPatientNav(href)
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [blockOtherPatientNav])

  // Navegação programática / URL já mudou para outro paciente
  useEffect(() => {
    if (!open || !patientId) return
    const current = extractPatientIdFromPath(pathname || '')
    if (!current || current === patientId) return
    // Volta ao paciente da anamnese e mostra aviso
    router.replace(`/pacientes/${encodeURIComponent(patientId)}?tab=anamnese`)
    setBlockOpen(true)
    setPendingHref(pathname)
  }, [pathname, open, patientId, router])

  const value = useMemo<AnamneseBackgroundContextValue>(
    () => ({
      activePatientId: patientId,
      isOpen: open,
      isMinimized: minimized,
      openEditor,
      restoreEditor,
      setMinimized,
      closeEditor,
      registerPatientSync,
    }),
    [
      patientId,
      open,
      minimized,
      openEditor,
      restoreEditor,
      closeEditor,
      registerPatientSync,
    ],
  )

  return (
    <AnamneseBackgroundContext.Provider value={value}>
      {children}

      {open && user ? (
        <AnamneseEditorModal
          key={editorKey}
          anamnese={seed}
          user={user}
          minimized={minimized}
          onMinimizedChange={setMinimized}
          onClose={closeEditor}
          onSave={handleSave}
        />
      ) : null}

      <AppModal
        open={blockOpen}
        onOpenChange={(next) => {
          if (!next) {
            setBlockOpen(false)
            setPendingHref(null)
          }
        }}
        title="Anamnese em edição"
        description="Salve ou feche a anamnese em segundo plano antes de abrir outro paciente."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ margin: 0, color: '#5c5d66', fontSize: '0.9rem', lineHeight: 1.45 }}>
            Você pode navegar por outras páginas do sistema, mas para trocar de paciente precisa
            salvar ou fechar a anamnese atual.
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setBlockOpen(false)
                setPendingHref(null)
                setMinimized(false)
                if (patientId) {
                  router.push(`/pacientes/${encodeURIComponent(patientId)}?tab=anamnese`)
                }
              }}
            >
              Voltar à anamnese
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                const href = pendingHref
                closeEditor()
                setBlockOpen(false)
                setPendingHref(null)
                if (href) router.push(href)
              }}
            >
              Fechar anamnese e continuar
            </button>
          </div>
        </div>
      </AppModal>
    </AnamneseBackgroundContext.Provider>
  )
}

export function useAnamneseBackground() {
  const ctx = useContext(AnamneseBackgroundContext)
  if (!ctx) {
    throw new Error('useAnamneseBackground deve ser usado dentro de AnamneseBackgroundProvider')
  }
  return ctx
}
