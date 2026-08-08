'use client'
import { useState, useCallback } from 'react'
import { Search, Tag, Archive, MessageSquare, Image } from 'lucide-react'
import { useWhatsapp } from '@/lib/whatsapp/context'
import type { WaChat } from '@/lib/whatsapp/chats'
import { jidMatchesChat } from '@/lib/whatsapp/chats'
import type { WaLabel } from '@/lib/whatsapp/labels'
import type { QuickReply, SaveQuickReplyPayload } from '@/lib/whatsapp/quick-replies'
import {
  loadLabels,
  saveLabel,
  deleteLabel,
  filterChatsByLabel,
} from '@/lib/whatsapp/labels'
import { loadArchivedChats } from '@/lib/whatsapp/archived-chats'
import {
  loadQuickReplies,
  saveQuickReply,
  deleteQuickReply,
} from '@/lib/whatsapp/quick-replies'
import { LabelsSidebarPanel } from '../panels/LabelsSidebarPanel'
import { LabelFormModal } from '../panels/LabelFormModal'
import { LabelColorPickerModal } from '../panels/LabelColorPickerModal'
import { LabelDeleteConfirmModal } from '../panels/LabelDeleteConfirmModal'
import { LabelChatsSidebarPanel } from '../panels/LabelChatsSidebarPanel'
import { ArchivedChatsSidebarPanel } from '../panels/ArchivedChatsSidebarPanel'
import { QuickRepliesSidebarPanel } from '../panels/QuickRepliesSidebarPanel'
import { QuickReplyFormModal } from '../panels/QuickReplyFormModal'
import { QuickReplyDeleteConfirmModal } from '../panels/QuickReplyDeleteConfirmModal'

// ─── Panel type ────────────────────────────────────────────────────────────

type SidePanel = 'labels' | 'labelChats' | 'archived' | 'quickReplies' | null

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatTime(tsMs: number): string {
  if (!tsMs) return ''
  const now = new Date()
  const d = new Date(tsMs)
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  if (isToday) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function ChatAvatar({ name, avatarUrl }: { name: string; avatarUrl: string }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className="avatar-img" />
  }
  const initials = (name || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase()
  return <span className="avatar-initials">{initials}</span>
}

function ChatItem({
  chat,
  isActive,
  onClick,
}: {
  chat: WaChat
  isActive: boolean
  onClick: () => void
}) {
  return (
    <div
      className={`chat-item${isActive ? ' active' : ''}${chat.unreadCount > 0 ? ' has-unread' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="chat-avatar">
        <ChatAvatar name={chat.name} avatarUrl={chat.avatarUrl} />
      </div>
      <div className="chat-info">
        <div className="chat-top">
          <div className="chat-title-row">
            <h4 className="chat-display-name">{chat.name || chat.chatJid}</h4>
          </div>
          <div className="chat-top-meta">
            <span className="chat-time">{formatTime(chat.lastMessageAt)}</span>
          </div>
        </div>
        <div className="chat-bottom">
          <p className="last-message">
            <span className="last-message-text">{chat.lastMessagePreview || '\u00a0'}</span>
          </p>
          <div className="chat-meta-right">
            {chat.unreadCount > 0 && (
              <span className="unread-badge">
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ChatSidebar ──────────────────────────────────────────────────────────

export function ChatSidebar() {
  const { chats, loadingChats, selectedChat, selectChat, searchQuery, setSearchQuery } =
    useWhatsapp()

  // ── Panel state ──────────────────────────────────────────────────────────
  const [activePanel, setActivePanel] = useState<SidePanel>(null)

  // ── Labels state ─────────────────────────────────────────────────────────
  const [labels, setLabels] = useState<WaLabel[]>([])
  const [labelsLoading, setLabelsLoading] = useState(false)
  const [labelFormOpen, setLabelFormOpen] = useState(false)
  const [labelFormSaving, setLabelFormSaving] = useState(false)
  const [labelFormError, setLabelFormError] = useState('')
  const [labelToEdit, setLabelToEdit] = useState<WaLabel | null>(null)
  const [labelColorOpen, setLabelColorOpen] = useState(false)
  const [labelColorSaving, setLabelColorSaving] = useState(false)
  const [labelToColor, setLabelToColor] = useState<WaLabel | null>(null)
  const [labelDeleteOpen, setLabelDeleteOpen] = useState(false)
  const [labelDeleteSaving, setLabelDeleteSaving] = useState(false)
  const [labelToDelete, setLabelToDelete] = useState<WaLabel | null>(null)
  const [activeLabelView, setActiveLabelView] = useState<WaLabel | null>(null)
  const [labelChatSelectedKeys, setLabelChatSelectedKeys] = useState<string[]>([])

  // ── Archived state ────────────────────────────────────────────────────────
  const [archivedChats, setArchivedChats] = useState<WaChat[]>([])
  const [archivedLoading, setArchivedLoading] = useState(false)

  // ── Quick replies state ───────────────────────────────────────────────────
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [quickRepliesLoading, setQuickRepliesLoading] = useState(false)
  const [qrFormOpen, setQrFormOpen] = useState(false)
  const [qrFormSaving, setQrFormSaving] = useState(false)
  const [qrFormError, setQrFormError] = useState('')
  const [qrToEdit, setQrToEdit] = useState<QuickReply | null>(null)
  const [qrDeleteOpen, setQrDeleteOpen] = useState(false)
  const [qrDeleteSaving, setQrDeleteSaving] = useState(false)
  const [qrToDelete, setQrToDelete] = useState<QuickReply | null>(null)

  // ── Panel openers ─────────────────────────────────────────────────────────

  const openLabels = useCallback(async () => {
    setActivePanel('labels')
    setLabelsLoading(true)
    try {
      const list = await loadLabels()
      setLabels(
        list.map((l) => ({
          ...l,
          conversationCount: filterChatsByLabel(
            chats.map((c) => c._raw),
            l.id,
          ).length,
        })),
      )
    } finally {
      setLabelsLoading(false)
    }
  }, [chats])

  const openArchived = useCallback(async () => {
    setActivePanel('archived')
    setArchivedLoading(true)
    try {
      const list = await loadArchivedChats()
      setArchivedChats(list)
    } finally {
      setArchivedLoading(false)
    }
  }, [])

  const openQuickReplies = useCallback(async () => {
    setActivePanel('quickReplies')
    setQuickRepliesLoading(true)
    try {
      const list = await loadQuickReplies()
      setQuickReplies(list)
    } finally {
      setQuickRepliesLoading(false)
    }
  }, [])

  // ── Label actions ─────────────────────────────────────────────────────────

  const reloadLabels = async () => {
    const list = await loadLabels()
    setLabels(
      list.map((l) => ({
        ...l,
        conversationCount: filterChatsByLabel(chats.map((c) => c._raw), l.id).length,
      })),
    )
  }

  const handleLabelSave = async (payload: { labelid: string; name: string; color: number }) => {
    setLabelFormSaving(true)
    setLabelFormError('')
    try {
      await saveLabel(payload)
      setLabelFormOpen(false)
      setLabelToEdit(null)
      await reloadLabels()
    } catch (err) {
      setLabelFormError((err as Error).message)
    } finally {
      setLabelFormSaving(false)
    }
  }

  const handleColorSave = async (payload: { labelid: string; name: string; color: number }) => {
    setLabelColorSaving(true)
    try {
      await saveLabel(payload)
      setLabelColorOpen(false)
      setLabelToColor(null)
      await reloadLabels()
    } catch {
      // silencioso
    } finally {
      setLabelColorSaving(false)
    }
  }

  const handleLabelDelete = async () => {
    if (!labelToDelete) return
    setLabelDeleteSaving(true)
    try {
      await deleteLabel(labelToDelete)
      setLabelDeleteOpen(false)
      setLabelToDelete(null)
      if (activeLabelView?.id === labelToDelete.id) {
        setActiveLabelView(null)
        setActivePanel('labels')
      }
      await reloadLabels()
    } catch {
      // silencioso
    } finally {
      setLabelDeleteSaving(false)
    }
  }

  // ── Quick reply actions ───────────────────────────────────────────────────

  const reloadQuickReplies = async () => {
    const list = await loadQuickReplies()
    setQuickReplies(list)
  }

  const handleQrSave = async (payload: SaveQuickReplyPayload) => {
    setQrFormSaving(true)
    setQrFormError('')
    try {
      await saveQuickReply(payload)
      setQrFormOpen(false)
      setQrToEdit(null)
      await reloadQuickReplies()
    } catch (err) {
      setQrFormError((err as Error).message)
    } finally {
      setQrFormSaving(false)
    }
  }

  const handleQrDelete = async () => {
    if (!qrToDelete) return
    setQrDeleteSaving(true)
    try {
      await deleteQuickReply(qrToDelete.id)
      setQrDeleteOpen(false)
      setQrToDelete(null)
      await reloadQuickReplies()
    } catch {
      // silencioso
    } finally {
      setQrDeleteSaving(false)
    }
  }

  // ── Filters ───────────────────────────────────────────────────────────────

  const filtered = searchQuery.trim()
    ? chats.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.chatJid.includes(searchQuery),
      )
    : chats

  const labelFilteredChats: WaChat[] = activeLabelView
    ? chats.filter((c) =>
        filterChatsByLabel([c._raw], activeLabelView.id).length > 0,
      )
    : []

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <aside className="chat-sidebar-shell">
      <div className="chat-sidebar">
        <div className="chat-sidebar-top">
          <div className="sidebar-header">
            <h2>WhatsApp</h2>
          </div>
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Pesquisar conversas"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div
          className={`chat-list-scroll${
            loadingChats && chats.length === 0 ? ' chat-list-scroll--center' : ''
          }`}
        >
          {loadingChats && chats.length === 0 ? (
            <div className="empty-state-mini">
              <span>Carregando conversas…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state-mini">
              <span>{searchQuery ? 'Nenhuma conversa encontrada' : 'Sem conversas'}</span>
            </div>
          ) : (
            filtered.map((chat) => (
              <ChatItem
                key={chat.chatJid}
                chat={chat}
                isActive={Boolean(selectedChat && jidMatchesChat(selectedChat, chat.chatJid, chat.waChatLid, chat.waChatId))}
                onClick={() => selectChat(chat)}
              />
            ))
          )}
        </div>

        {/* ── C3 icon bar ── */}
        <div className="sidebar-icon-bar">
          <button
            type="button"
            className="sidebar-icon-btn"
            title="Etiquetas"
            aria-label="Gerenciar etiquetas"
            onClick={openLabels}
          >
            <Tag size={18} />
          </button>
          <button
            type="button"
            className="sidebar-icon-btn"
            title="Arquivadas"
            aria-label="Conversas arquivadas"
            onClick={openArchived}
          >
            <Archive size={18} />
          </button>
          <button
            type="button"
            className="sidebar-icon-btn"
            title="Respostas rápidas"
            aria-label="Respostas rápidas"
            onClick={openQuickReplies}
          >
            <MessageSquare size={18} />
          </button>
        </div>
      </div>

      {/* ── Side panels (absolute overlays) ── */}

      {activePanel === 'labels' && (
        <LabelsSidebarPanel
          items={labels}
          loading={labelsLoading}
          onClose={() => setActivePanel(null)}
          onAddNew={() => {
            setLabelToEdit(null)
            setLabelFormError('')
            setLabelFormOpen(true)
          }}
          onEdit={(label) => {
            setLabelToEdit(label)
            setLabelFormError('')
            setLabelFormOpen(true)
          }}
          onChooseColor={(label) => {
            setLabelToColor(label)
            setLabelColorOpen(true)
          }}
          onDelete={(label) => {
            setLabelToDelete(label)
            setLabelDeleteOpen(true)
          }}
          onOpenChats={(label) => {
            setActiveLabelView(label)
            setLabelChatSelectedKeys([])
            setActivePanel('labelChats')
          }}
        />
      )}

      {activePanel === 'labelChats' && activeLabelView && (
        <LabelChatsSidebarPanel
          label={activeLabelView}
          chats={labelFilteredChats}
          selectedKeys={labelChatSelectedKeys}
          loading={false}
          bulkSaving={false}
          onBack={() => setActivePanel('labels')}
          onClearSelection={() => setLabelChatSelectedKeys([])}
          onToggleSelect={(chat) =>
            setLabelChatSelectedKeys((prev) =>
              prev.includes(chat.chatJid)
                ? prev.filter((k) => k !== chat.chatJid)
                : [...prev, chat.chatJid],
            )
          }
          onAddLabel={() => {
            /* TODO: assign label to selection */
          }}
          onRemoveLabel={() => {
            /* TODO: remove label from selection */
          }}
          onOpenChat={(chat) => {
            selectChat(chat)
            setActivePanel(null)
          }}
        />
      )}

      {activePanel === 'archived' && (
        <ArchivedChatsSidebarPanel
          chats={archivedChats}
          loading={archivedLoading}
          onClose={() => setActivePanel(null)}
          onSelectChat={(chat) => {
            selectChat(chat)
            setActivePanel(null)
          }}
        />
      )}

      {activePanel === 'quickReplies' && (
        <QuickRepliesSidebarPanel
          items={quickReplies}
          loading={quickRepliesLoading}
          onClose={() => setActivePanel(null)}
          onAddNew={() => {
            setQrToEdit(null)
            setQrFormError('')
            setQrFormOpen(true)
          }}
          onSelect={() => {
            /* quick replies selection from sidebar = open compose — noop here */
          }}
          onEdit={(reply) => {
            setQrToEdit(reply)
            setQrFormError('')
            setQrFormOpen(true)
          }}
          onDelete={(reply) => {
            setQrToDelete(reply)
            setQrDeleteOpen(true)
          }}
        />
      )}

      {/* ── Modals ── */}

      <LabelFormModal
        open={labelFormOpen}
        saving={labelFormSaving}
        error={labelFormError}
        label={labelToEdit}
        onCancel={() => { setLabelFormOpen(false); setLabelToEdit(null) }}
        onSave={handleLabelSave}
      />

      <LabelColorPickerModal
        open={labelColorOpen}
        saving={labelColorSaving}
        label={labelToColor}
        onCancel={() => { setLabelColorOpen(false); setLabelToColor(null) }}
        onSave={handleColorSave}
      />

      <LabelDeleteConfirmModal
        open={labelDeleteOpen}
        saving={labelDeleteSaving}
        onCancel={() => { setLabelDeleteOpen(false); setLabelToDelete(null) }}
        onConfirm={handleLabelDelete}
      />

      <QuickReplyFormModal
        open={qrFormOpen}
        saving={qrFormSaving}
        error={qrFormError}
        reply={qrToEdit}
        onCancel={() => { setQrFormOpen(false); setQrToEdit(null) }}
        onSave={handleQrSave}
      />

      <QuickReplyDeleteConfirmModal
        open={qrDeleteOpen}
        saving={qrDeleteSaving}
        reply={qrToDelete}
        onCancel={() => { setQrDeleteOpen(false); setQrToDelete(null) }}
        onConfirm={handleQrDelete}
      />
    </aside>
  )
}
