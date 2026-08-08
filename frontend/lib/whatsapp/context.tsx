'use client'
/**
 * WhatsappContext — estado compartilhado do módulo WhatsApp no Next.js.
 * Provider envolve a página /whatsapp/chat e gerencia:
 *  - lista de chats (com polling + realtime)
 *  - chat selecionado e suas mensagens
 *  - envio de texto
 *  - conexão SSE + Pusher
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import { fetchWhatsappSessionConnected, whatsappHasAuth } from './api'
import { verifyAuthSession } from '@/lib/auth'
import {
  fetchChats,
  dedupeWaChatList,
  enrichMissingChatAvatars,
  mergeChatUpdate,
  clearUnread,
  markChatAsRead,
  applyMessageToChatList,
  extractMessageChatJidCandidates,
  jidMatchesChat,
  type WaChat,
} from './chats'
import {
  fetchMessages,
  sendTextMessage,
  sendMediaMessage,
  createOptimisticMessage,
  mergeMessageUpdate,
  mergePolledMessages,
  type WaMessage,
  type SendMediaOptions,
} from './messages'
import { subscribeWhatsappRealtime } from './realtime-bus'
import { connectWhatsappPusher, disconnectWhatsappPusher } from './pusher'
import { connectWhatsappSse, disconnectWhatsappSse } from './sse'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReplyTarget {
  id: string
  messageid?: string
  preview: string
  authorLabel: string
  kind: 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker'
  mediaLine?: string
  thumbUrl?: string
}

interface WhatsappContextValue {
  // Connection
  connected: boolean
  checkingConnection: boolean
  // Chat list
  chats: WaChat[]
  loadingChats: boolean
  searchQuery: string
  setSearchQuery: (q: string) => void
  // Active chat
  selectedChat: WaChat | null
  selectChat: (chat: WaChat) => void
  messages: WaMessage[]
  loadingMessages: boolean
  // Compose
  draftText: string
  setDraftText: (t: string) => void
  sending: boolean
  sendText: () => Promise<void>
  sendMedia: (opts: Pick<SendMediaOptions, 'file' | 'caption'>) => Promise<void>
  // Reply
  replyTarget: ReplyTarget | null
  setReplyTarget: (target: ReplyTarget | null) => void
  clearReply: () => void
  // Reload
  reloadChats: () => Promise<void>
}

const WhatsappContext = createContext<WhatsappContextValue | null>(null)

export function useWhatsapp(): WhatsappContextValue {
  const ctx = useContext(WhatsappContext)
  if (!ctx) throw new Error('useWhatsapp deve ser usado dentro de WhatsappProvider')
  return ctx
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHATS_POLL_MS = 15_000
const MESSAGES_POLL_MS = 8_000

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WhatsappProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const [connected, setConnected] = useState(false)
  const [checkingConnection, setCheckingConnection] = useState(true)

  const [chats, setChats] = useState<WaChat[]>([])
  const [loadingChats, setLoadingChats] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const [selectedChat, setSelectedChat] = useState<WaChat | null>(null)
  const [messages, setMessages] = useState<WaMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  const [draftText, setDraftText] = useState('')
  const [sending, setSending] = useState(false)
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null)
  const clearReply = useCallback(() => setReplyTarget(null), [])

  // refs para timers e valores atuais sem causar re-renders
  const chatsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const messagesTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const selectedChatRef = useRef<WaChat | null>(null)
  const messagesRef = useRef<WaMessage[]>([])
  const chatsRef = useRef<WaChat[]>([])

  selectedChatRef.current = selectedChat
  messagesRef.current = messages
  chatsRef.current = chats

  // ─── Connection check ───────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setCheckingConnection(true)
      // Reload direto em /whatsapp/chat — garante sessão antes do gate
      if (!whatsappHasAuth()) {
        await verifyAuthSession({ requiredRole: 'NUTRICIONISTA' }).catch(() => null)
      }
      if (cancelled) return
      if (!whatsappHasAuth()) {
        setCheckingConnection(false)
        router.push('/whatsapp/conexao')
        return
      }
      let ok = await fetchWhatsappSessionConnected()
      if (!ok) {
        // retry curto — status pode oscilar logo após o deploy/reconnect
        await new Promise((r) => setTimeout(r, 600))
        if (cancelled) return
        ok = await fetchWhatsappSessionConnected()
      }
      if (cancelled) return
      if (!ok) {
        setCheckingConnection(false)
        router.push('/whatsapp/conexao')
        return
      }
      setConnected(true)
      setCheckingConnection(false)
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Load chats ─────────────────────────────────────────────────────────────

  const reloadChats = useCallback(async () => {
    setLoadingChats(true)
    try {
      const list = dedupeWaChatList(await fetchChats({ limit: 60 }))
      const sorted = list.sort((a, b) => b.lastMessageAt - a.lastMessageAt)
      setChats(sorted)
      // Avatares em background — não bloqueia a lista; sincroniza o chat aberto
      void enrichMissingChatAvatars(sorted).then((enriched) => {
        if (enriched === sorted) return
        setChats(dedupeWaChatList(enriched))
        setSelectedChat((prev) => {
          if (!prev) return prev
          const hit = enriched.find((c) =>
            c.chatJid === prev.chatJid
            || (prev.waChatLid && c.waChatLid === prev.waChatLid)
            || (prev.waChatId && c.waChatId === prev.waChatId)
            || (prev.phone && c.phone === prev.phone),
          )
          if (!hit) return prev
          return {
            ...prev,
            avatarUrl: hit.avatarUrl || prev.avatarUrl,
            phone: hit.phone || prev.phone,
            waChatId: hit.waChatId || prev.waChatId,
            waChatLid: hit.waChatLid || prev.waChatLid,
          }
        })
      })
    } catch (err) {
      console.warn('[WA] fetchChats error', err)
    } finally {
      setLoadingChats(false)
    }
  }, [])

  // ─── Load messages ──────────────────────────────────────────────────────────

  const loadMessages = useCallback(async (chat: WaChat) => {
    setLoadingMessages(true)
    setMessages([])
    try {
      // Preferência: LID (histórico WuzAPI) → chatJid → PN
      const fetchJid = chat.waChatLid || chat.chatJid || chat.waChatId
      const msgs = await fetchMessages({ chatJid: fetchJid, limit: 40 })
      setMessages(msgs)
      // Mark read no provider depois de carregar IDs inbound
      void markChatAsRead(chat, msgs)
    } catch (err) {
      console.warn('[WA] fetchMessages error', err)
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  // ─── Select chat ────────────────────────────────────────────────────────────

  const selectChat = useCallback((chat: WaChat) => {
    setSelectedChat(chat)
    setChats((prev) => clearUnread(prev, chat.chatJid))
    // Feedback local imediato + API /chat/read (sem IDs ainda)
    void markChatAsRead(chat, [])
    loadMessages(chat)
  }, [loadMessages])

  // ─── Send text ──────────────────────────────────────────────────────────────

  const sendText = useCallback(async () => {
    const chat = selectedChatRef.current
    if (!chat || !draftText.trim() || sending) return

    const text = draftText.trim()
    const quotedId = replyTarget?.messageid || replyTarget?.id
    setDraftText('')
    setReplyTarget(null)
    setSending(true)

    // Otimista: adiciona localmente antes da resposta
    const optimistic = createOptimisticMessage(chat.chatJid, text)
    setMessages((prev) => [...prev, optimistic])

    try {
      const result = await sendTextMessage({ chatJid: chat.chatJid, text, quotedId })
      if (!result.ok) {
        // Remove otimista e restaura draft
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
        setDraftText(text)
        console.warn('[WA] sendText falhou:', result.error)
      } else {
        // Marca enviado (substitui otimista pelo ID real se vier)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimistic.id
              ? { ...m, id: result.messageId || m.id, status: 'sent' }
              : m
          )
        )
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setDraftText(text)
      console.warn('[WA] sendText exception:', err)
    } finally {
      setSending(false)
    }
  }, [draftText, sending, replyTarget])

  const sendMedia = useCallback(async (opts: Pick<SendMediaOptions, 'file' | 'caption'>) => {
    const chat = selectedChatRef.current
    if (!chat || sending) return
    setSending(true)
    try {
      const result = await sendMediaMessage({ chatJid: chat.chatJid, ...opts })
      if (!result.ok) {
        console.warn('[WA] sendMedia falhou:', result.error)
      } else {
        // Reload das mensagens para exibir a nova mídia
        setTimeout(() => void loadMessages(chat), 1200)
      }
    } catch (err) {
      console.warn('[WA] sendMedia exception:', err)
    } finally {
      setSending(false)
    }
  }, [sending, loadMessages])

  // ─── Realtime handler ───────────────────────────────────────────────────────

  const handleRealtimeEvent = useCallback((payload: Record<string, unknown>) => {
    const eventType = String(payload.eventType || payload.event || '').toLowerCase()

    // Reconnect → reload chats + messages (eventos podem ter se perdido)
    if (eventType === 'sse.reconnected') {
      void reloadChats()
      const active = selectedChatRef.current
      if (active) {
        void fetchMessages({ chatJid: active.chatJid, limit: 40 }).then((msgs) => {
          setMessages((prev) => mergePolledMessages(prev, msgs))
        }).catch(() => {})
      }
      return
    }

    const active = selectedChatRef.current

    // Evento de chat: atualiza lista (com match LID↔PN)
    if (eventType.includes('chat') || payload.chat) {
      const chatRaw = (payload.chat ?? payload.data ?? payload) as Record<string, unknown>
      if (chatRaw && typeof chatRaw === 'object' && !Array.isArray(chatRaw)) {
        const looksLikeChat = Boolean(
          chatRaw.wa_chatid || chatRaw.chatid || chatRaw.chatJid || chatRaw.wa_chatlid || chatRaw.name,
        )
        if (looksLikeChat) {
          setChats((prev) => dedupeWaChatList(mergeChatUpdate(prev, chatRaw)))
        }
      }
    }

    // Evento de mensagem: merge no thread aberto + sidebar
    if (eventType.includes('message') || payload.message) {
      const msgRaw = (payload.message ?? payload.data ?? payload) as Record<string, unknown>
      if (!msgRaw || typeof msgRaw !== 'object' || Array.isArray(msgRaw)) return

      const candidates = extractMessageChatJidCandidates(payload, msgRaw)
      const matchesOpen = Boolean(active && jidMatchesChat(active, ...candidates))

      if (matchesOpen && active) {
        setMessages((prev) => mergeMessageUpdate(prev, msgRaw, active.chatJid))
        setChats((prev) => clearUnread(prev, active.chatJid))
      }

      // Preview/unread/ordem na sidebar — sintetiza chat se a lista ainda não tem a linha
      setChats((prev) =>
        dedupeWaChatList(
          applyMessageToChatList(prev, msgRaw, candidates[0] || '', {
            isActiveChat: matchesOpen,
          }),
        ),
      )
    }
  }, [reloadChats])

  // ─── Realtime subscription ──────────────────────────────────────────────────

  useEffect(() => {
    if (!connected) return
    const unsub = subscribeWhatsappRealtime(handleRealtimeEvent)
    connectWhatsappPusher()
    connectWhatsappSse()
    return () => {
      unsub()
      disconnectWhatsappPusher()
      disconnectWhatsappSse()
    }
  }, [connected, handleRealtimeEvent])

  // ─── Polling chats ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!connected) return
    void reloadChats()
    chatsTimerRef.current = setInterval(reloadChats, CHATS_POLL_MS)
    return () => {
      if (chatsTimerRef.current) clearInterval(chatsTimerRef.current)
    }
  }, [connected, reloadChats])

  // ─── Polling messages ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedChat || !connected) return
    if (messagesTimerRef.current) clearInterval(messagesTimerRef.current)
    messagesTimerRef.current = setInterval(async () => {
      const chat = selectedChatRef.current
      if (!chat) return
      try {
        const msgs = await fetchMessages({ chatJid: chat.chatJid, limit: 40 })
        // Merge suave: não apaga otimistas / realtime entre polls
        setMessages((prev) => mergePolledMessages(prev, msgs))
      } catch {
        // silencioso
      }
    }, MESSAGES_POLL_MS)
    return () => {
      if (messagesTimerRef.current) clearInterval(messagesTimerRef.current)
    }
  }, [selectedChat, connected])

  // ─── Value ──────────────────────────────────────────────────────────────────

  const value: WhatsappContextValue = {
    connected,
    checkingConnection,
    chats,
    loadingChats,
    searchQuery,
    setSearchQuery,
    selectedChat,
    selectChat,
    messages,
    loadingMessages,
    draftText,
    setDraftText,
    sending,
    sendText,
    sendMedia,
    replyTarget,
    setReplyTarget,
    clearReply,
    reloadChats,
  }

  return (
    <WhatsappContext.Provider value={value}>
      {children}
    </WhatsappContext.Provider>
  )
}
