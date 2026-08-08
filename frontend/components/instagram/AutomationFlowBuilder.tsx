'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  Panel,
  MarkerType,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type OnConnect,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Check,
  Loader2,
  MessageCircle,
  Plus,
  StickyNote,
  Timer,
  X,
  Zap,
} from 'lucide-react'
import type { InstagramMatchType, InstagramMediaItem } from '@/lib/instagram/api'
import styles from './AutomationFlowBuilder.module.scss'

export type AutomationFormState = {
  name: string
  active: boolean
  triggerComment: boolean
  triggerStory: boolean
  triggerDm: boolean
  matchType: InstagramMatchType
  targetMediaId: string
  welcomeMessage: string
  quickReplyLabel: string
  linkText: string
  linkButtonLabel: string
  linkUrl: string
  reminderText: string
  reminderDelayMinutes: number
}

type IgNodeKind = 'when' | 'welcome' | 'link' | 'reminder' | 'note'

type IgNodeData = {
  kind: IgNodeKind
  note?: string
}

type Props = {
  editingId: string | null
  form: AutomationFormState
  keywordsText: string
  publicRepliesText: string
  media: InstagramMediaItem[]
  saving: boolean
  onPatch: <K extends keyof AutomationFormState>(key: K, value: AutomationFormState[K]) => void
  onKeywordsChange: (value: string) => void
  onPublicRepliesChange: (value: string) => void
  onCancel: () => void
  onSave: () => void
}

function kindTitle(kind: IgNodeKind) {
  switch (kind) {
    case 'when':
      return 'Quando…'
    case 'welcome':
      return 'Instagram · DM'
    case 'link':
      return 'Depois do clique'
    case 'reminder':
      return 'Lembrete'
    case 'note':
      return 'Nota'
  }
}

function FlowIgNode({ data, selected }: NodeProps<Node<IgNodeData>>) {
  const kind = data.kind
  return (
    <div
      className={`${styles.rfNode} ${selected ? styles.rfNodeSelected : ''} ${
        kind === 'when' ? styles.rfNodeWhen : ''
      } ${kind === 'reminder' ? styles.rfNodeDelay : ''} ${kind === 'note' ? styles.rfNodeNote : ''}`}
    >
      {kind !== 'when' ? <Handle type="target" position={Position.Left} className={styles.rfHandle} /> : null}
      <div className={styles.rfNodeHeader}>
        {kind === 'when' ? <Zap size={13} /> : null}
        {kind === 'welcome' || kind === 'link' ? <MessageCircle size={13} /> : null}
        {kind === 'reminder' ? <Timer size={13} /> : null}
        {kind === 'note' ? <StickyNote size={13} /> : null}
        <span>{kindTitle(kind)}</span>
      </div>
      <div className={styles.rfNodeBody} data-preview={kind}>
        {/* filled by parent via CSS content replacement below through attributes - actually we need live preview from form. Custom nodes don't see form. Pass preview text in data. */}
        <span className={styles.rfPreview}>{data.note || '…'}</span>
      </div>
      {kind !== 'note' ? (
        <div className={styles.rfNext}>
          Next Step
          <Handle type="source" position={Position.Right} className={styles.rfHandle} />
        </div>
      ) : null}
    </div>
  )
}

const nodeTypes = { ig: FlowIgNode }

function makePreview(kind: IgNodeKind, form: AutomationFormState, keywordsText: string, note = ''): string {
  if (kind === 'when') {
    const keys = keywordsText.split(',').map((k) => k.trim()).filter(Boolean)
    const channels = [
      form.triggerComment ? 'comentários' : '',
      form.triggerStory ? 'stories' : '',
      form.triggerDm ? 'DMs' : '',
    ].filter(Boolean)
    if (!keys.length) return '+ Novo gatilho'
    return `${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '…' : ''}\n${channels.join(' · ') || 'sem canal'}`
  }
  if (kind === 'welcome') {
    return form.welcomeMessage.trim() || 'Mensagem de boas-vindas…'
  }
  if (kind === 'link') {
    return form.linkText.trim() || form.linkUrl.trim() || 'Mensagem com o link…'
  }
  if (kind === 'reminder') {
    if (!form.reminderText.trim()) return 'Opcional · Smart Delay'
    return `Após ${form.reminderDelayMinutes || 0} min\n${form.reminderText.trim()}`
  }
  return note || 'Nota no fluxo…'
}

function initialGraph(form: AutomationFormState, keywordsText: string): { nodes: Node<IgNodeData>[]; edges: Edge[] } {
  const nodes: Node<IgNodeData>[] = [
    {
      id: 'when',
      type: 'ig',
      position: { x: 40, y: 160 },
      data: { kind: 'when', note: makePreview('when', form, keywordsText) },
      deletable: false,
    },
    {
      id: 'welcome',
      type: 'ig',
      position: { x: 340, y: 140 },
      data: { kind: 'welcome', note: makePreview('welcome', form, keywordsText) },
    },
    {
      id: 'link',
      type: 'ig',
      position: { x: 660, y: 140 },
      data: { kind: 'link', note: makePreview('link', form, keywordsText) },
    },
    {
      id: 'reminder',
      type: 'ig',
      position: { x: 980, y: 160 },
      data: { kind: 'reminder', note: makePreview('reminder', form, keywordsText) },
    },
  ]
  const edges: Edge[] = [
    { id: 'e-when-welcome', source: 'when', target: 'welcome', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e-welcome-link', source: 'welcome', target: 'link', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e-link-reminder', source: 'link', target: 'reminder', markerEnd: { type: MarkerType.ArrowClosed } },
  ]
  return { nodes, edges }
}

export function AutomationFlowBuilder({
  editingId,
  form,
  keywordsText,
  publicRepliesText,
  media,
  saving,
  onPatch,
  onKeywordsChange,
  onPublicRepliesChange,
  onCancel,
  onSave,
}: Props) {
  const seed = useMemo(() => initialGraph(form, keywordsText), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [nodes, setNodes, onNodesChange] = useNodesState(seed.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(seed.edges)
  const [selectedId, setSelectedId] = useState<string | null>('when')
  const [addOpen, setAddOpen] = useState(false)

  const selectedNode = nodes.find((n) => n.id === selectedId) || null
  const selectedKind = selectedNode?.data.kind || null

  // Keep preview text in sync with form
  useEffect(() => {
    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        data: {
          ...n.data,
          note:
            n.data.kind === 'note'
              ? n.data.note
              : makePreview(n.data.kind, form, keywordsText, n.data.note),
        },
      })),
    )
  }, [form, keywordsText, setNodes])

  const mediaOptions = useMemo(
    () => [
      { value: '', label: 'Qualquer post ou reels' },
      ...media.map((item) => ({
        value: item.id,
        label: `${item.media_type === 'VIDEO' ? '🎬' : '📷'} ${(item.caption || 'Sem legenda').slice(0, 48)}`,
      })),
    ],
    [media],
  )

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          eds,
        ),
      )
    },
    [setEdges],
  )

  const hasKind = useCallback(
    (kind: IgNodeKind) => nodes.some((n) => n.data.kind === kind),
    [nodes],
  )

  function addNode(kind: IgNodeKind) {
    if (kind !== 'note' && hasKind(kind)) {
      const existing = nodes.find((n) => n.data.kind === kind)
      if (existing) setSelectedId(existing.id)
      setAddOpen(false)
      return
    }
    const id = `${kind}-${Date.now()}`
    const baseX = 200 + nodes.length * 40
    const baseY = 80 + (nodes.length % 4) * 50
    const newNode: Node<IgNodeData> = {
      id,
      type: 'ig',
      position: { x: baseX, y: baseY },
      data: {
        kind,
        note: kind === 'note' ? 'Nova nota…' : makePreview(kind, form, keywordsText),
      },
    }
    setNodes((nds) => [...nds, newNode])
    // Auto-connect from last non-note if possible
    const source = [...nodes].reverse().find((n) => n.data.kind !== 'note')
    if (source && kind !== 'when') {
      setEdges((eds) =>
        addEdge(
          {
            id: `e-${source.id}-${id}`,
            source: source.id,
            target: id,
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          eds,
        ),
      )
    }
    setSelectedId(id)
    setAddOpen(false)
  }

  function removeSelected() {
    if (!selectedNode) return
    if (selectedNode.data.kind === 'when') return
    const id = selectedNode.id
    setNodes((nds) => nds.filter((n) => n.id !== id))
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
    setSelectedId('when')
  }

  return (
    <div className={styles.builder}>
      <div className={styles.builderTop}>
        <div className={styles.builderTopLeft}>
          <input
            className={styles.builderName}
            value={form.name}
            onChange={(e) => onPatch('name', e.target.value)}
            placeholder="Nome da automação"
            aria-label="Nome da automação"
          />
          <span className={styles.builderBreadcrumb}>
            Automações › {editingId ? 'Editar' : 'Nova'} · arraste os blocos
          </span>
        </div>
        <div className={styles.builderTopRight}>
          <button
            type="button"
            className={`${styles.liveToggle} ${form.active ? styles.liveToggleOn : ''}`}
            onClick={() => onPatch('active', !form.active)}
          >
            {form.active ? 'Ativa' : 'Pausada'}
          </button>
          <button type="button" className="btn-secondary" disabled={saving} onClick={onCancel}>
            Fechar
          </button>
          <button type="button" className="btn-primary" disabled={saving} onClick={onSave}>
            {saving ? <Loader2 className={styles.spin} size={16} /> : <Check size={16} />}
            {editingId ? 'Salvar' : 'Publicar'}
          </button>
        </div>
      </div>

      <div className={styles.builderBody}>
        <aside className={`${styles.sidePanel} admin-form-fields`}>
          {!selectedKind ? (
            <p className={styles.sidePanelDesc}>Toque em um bloco para editar.</p>
          ) : null}

          {selectedKind === 'when' ? (
            <>
              <div className={styles.sidePanelHead}>
                <p className={styles.sidePanelKicker}>Gatilho</p>
                <h3>Quando…</h3>
                <p className={styles.sidePanelDesc}>
                  Palavra-chave no comentário, story ou DM dispara o fluxo.
                </p>
              </div>
              <div className="field field--float">
                <label htmlFor="iga-keywords">Palavras-chave (vírgula)</label>
                <input
                  id="iga-keywords"
                  value={keywordsText}
                  onChange={(e) => onKeywordsChange(e.target.value)}
                  type="text"
                  placeholder="EBOOK, QUERO, RECEITA"
                />
              </div>
              <div className="field field--float">
                <label htmlFor="iga-match">Correspondência</label>
                <select
                  id="iga-match"
                  className={styles.select}
                  value={form.matchType}
                  onChange={(e) =>
                    onPatch('matchType', e.target.value === 'EXACT' ? 'EXACT' : 'CONTAINS')
                  }
                >
                  <option value="CONTAINS">Contém a palavra</option>
                  <option value="EXACT">Exatamente igual</option>
                </select>
              </div>
              <div className="field field--float">
                <label htmlFor="iga-media">Post/reels (opcional)</label>
                <select
                  id="iga-media"
                  className={styles.select}
                  value={form.targetMediaId}
                  onChange={(e) => onPatch('targetMediaId', e.target.value)}
                >
                  {mediaOptions.map((opt) => (
                    <option key={opt.value || 'any'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className={styles.sideSectionLabel}>Canais</p>
              <div className={styles.triggerGrid}>
                {(
                  [
                    ['triggerComment', 'Comentários', 'Posts / reels'],
                    ['triggerStory', 'Stories', 'Respostas'],
                    ['triggerDm', 'DM', 'Mensagens'],
                  ] as const
                ).map(([key, title, sub]) => (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.triggerCard} ${form[key] ? styles.triggerCardOn : ''}`}
                    onClick={() => onPatch(key, !form[key])}
                  >
                    <span className={styles.triggerCheck}>{form[key] ? '✓' : ''}</span>
                    <span className={styles.triggerText}>
                      <strong>{title}</strong>
                      <span>{sub}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {selectedKind === 'welcome' ? (
            <>
              <div className={styles.sidePanelHead}>
                <p className={styles.sidePanelKicker}>Content · Instagram</p>
                <h3>Mensagem inicial</h3>
              </div>
              <div className="field field--float">
                <label htmlFor="iga-welcome">Mensagem (DM)</label>
                <textarea
                  id="iga-welcome"
                  value={form.welcomeMessage}
                  onChange={(e) => onPatch('welcomeMessage', e.target.value)}
                  rows={5}
                />
              </div>
              <div className="field field--float">
                <label htmlFor="iga-quick">Botão rápido</label>
                <input
                  id="iga-quick"
                  value={form.quickReplyLabel}
                  onChange={(e) => onPatch('quickReplyLabel', e.target.value)}
                  maxLength={20}
                />
              </div>
              <div className="field field--float">
                <label htmlFor="iga-public">Respostas públicas</label>
                <textarea
                  id="iga-public"
                  value={publicRepliesText}
                  onChange={(e) => onPublicRepliesChange(e.target.value)}
                  rows={3}
                />
              </div>
            </>
          ) : null}

          {selectedKind === 'link' ? (
            <>
              <div className={styles.sidePanelHead}>
                <p className={styles.sidePanelKicker}>Content · Instagram</p>
                <h3>Depois do clique</h3>
              </div>
              <div className="field field--float">
                <label htmlFor="iga-link-text">Texto</label>
                <textarea
                  id="iga-link-text"
                  value={form.linkText}
                  onChange={(e) => onPatch('linkText', e.target.value)}
                  rows={3}
                />
              </div>
              <div className="field field--float">
                <label htmlFor="iga-link-url">URL</label>
                <input
                  id="iga-link-url"
                  value={form.linkUrl}
                  onChange={(e) => onPatch('linkUrl', e.target.value)}
                  type="url"
                />
              </div>
              <div className="field field--float">
                <label htmlFor="iga-link-btn">Label do botão</label>
                <input
                  id="iga-link-btn"
                  value={form.linkButtonLabel}
                  onChange={(e) => onPatch('linkButtonLabel', e.target.value)}
                  maxLength={20}
                />
              </div>
            </>
          ) : null}

          {selectedKind === 'reminder' ? (
            <>
              <div className={styles.sidePanelHead}>
                <p className={styles.sidePanelKicker}>Logic · Smart Delay</p>
                <h3>Lembrete</h3>
              </div>
              <div className="field field--float">
                <label htmlFor="iga-reminder">Mensagem</label>
                <textarea
                  id="iga-reminder"
                  value={form.reminderText}
                  onChange={(e) => onPatch('reminderText', e.target.value)}
                  rows={4}
                />
              </div>
              <div className="field field--float">
                <label htmlFor="iga-delay">Aguardar (minutos)</label>
                <input
                  id="iga-delay"
                  value={form.reminderDelayMinutes}
                  onChange={(e) =>
                    onPatch('reminderDelayMinutes', Number(e.target.value) || 0)
                  }
                  type="number"
                  min={1}
                />
              </div>
            </>
          ) : null}

          {selectedKind === 'note' && selectedNode ? (
            <>
              <div className={styles.sidePanelHead}>
                <p className={styles.sidePanelKicker}>Canvas</p>
                <h3>Nota</h3>
                <p className={styles.sidePanelDesc}>Só visual — não é enviado à API.</p>
              </div>
              <div className="field field--float">
                <label htmlFor="iga-note">Texto</label>
                <textarea
                  id="iga-note"
                  value={selectedNode.data.note || ''}
                  onChange={(e) => {
                    const text = e.target.value
                    setNodes((nds) =>
                      nds.map((n) =>
                        n.id === selectedNode.id
                          ? { ...n, data: { ...n.data, note: text } }
                          : n,
                      ),
                    )
                  }}
                  rows={4}
                />
              </div>
            </>
          ) : null}

          {selectedKind && selectedKind !== 'when' ? (
            <button type="button" className={styles.removeBtn} onClick={removeSelected}>
              <X size={14} /> Remover bloco
            </button>
          ) : null}
        </aside>

        <div className={styles.rfCanvasWrap}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onPaneClick={() => setAddOpen(false)}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.4}
            maxZoom={1.6}
            deleteKeyCode={['Backspace', 'Delete']}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={18} size={1} color="#d6dbe3" />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable />
            <Panel position="top-right" className={styles.rfPanel}>
              <div className={styles.addWrap}>
                <button
                  type="button"
                  className={styles.addFab}
                  onClick={() => setAddOpen((v) => !v)}
                  aria-label="Adicionar bloco"
                >
                  <Plus size={22} />
                </button>
                {addOpen ? (
                  <div className={styles.addMenu}>
                    <p className={styles.addMenuLabel}>Content</p>
                    <button type="button" onClick={() => addNode('welcome')} disabled={hasKind('welcome')}>
                      <MessageCircle size={14} /> Instagram · DM inicial
                    </button>
                    <button type="button" onClick={() => addNode('link')} disabled={hasKind('link')}>
                      <MessageCircle size={14} /> Instagram · Após clique
                    </button>
                    <p className={styles.addMenuLabel}>Logic</p>
                    <button type="button" onClick={() => addNode('reminder')} disabled={hasKind('reminder')}>
                      <Timer size={14} /> Smart Delay
                    </button>
                    <p className={styles.addMenuLabel}>Canvas</p>
                    <button type="button" onClick={() => addNode('note')}>
                      <StickyNote size={14} /> Nota
                    </button>
                    <button type="button" onClick={() => addNode('when')} disabled={hasKind('when')}>
                      <Zap size={14} /> Gatilho
                    </button>
                  </div>
                ) : null}
              </div>
            </Panel>
            <Panel position="top-center">
              <div className={styles.tipBanner}>⚡ Arraste os blocos · conecte pelas bolinhas</div>
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </div>
  )
}
