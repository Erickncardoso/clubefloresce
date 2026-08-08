'use client'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { WhatsappProvider, useWhatsapp } from '@/lib/whatsapp/context'
import { ChatSidebar } from '@/components/whatsapp/chat/ChatSidebar'
import { ChatHeader } from '@/components/whatsapp/chat/ChatHeader'
import { ChatBody } from '@/components/whatsapp/chat/ChatBody'
import { ChatFooter } from '@/components/whatsapp/chat/ChatFooter'
import { WhatsappWebEmpty } from '@/components/whatsapp/chat/WhatsappWebEmpty'

const WA_PAGE_SCROLL_LOCK = 'wa-chat-page-scroll-lock'

function useWhatsappChatScrollLock() {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    html.classList.add(WA_PAGE_SCROLL_LOCK)
    body.classList.add(WA_PAGE_SCROLL_LOCK)
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.classList.remove(WA_PAGE_SCROLL_LOCK)
      body.classList.remove(WA_PAGE_SCROLL_LOCK)
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
    }
  }, [])
}

// ─── Inner shell (usa o context) ──────────────────────────────────────────────

function WhatsappChatShell() {
  const { checkingConnection, connected, selectedChat } = useWhatsapp()

  if (checkingConnection) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
          color: '#667781',
          fontSize: 14,
        }}
      >
        <Loader2 size={28} style={{ animation: 'chat-sync-spin 1.1s linear infinite', color: '#008069' }} />
        <span>Verificando conexão…</span>
      </div>
    )
  }

  if (!connected) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#667781',
          fontSize: 14,
        }}
      >
        Redirecionando…
      </div>
    )
  }

  return (
    <div className="chat-wrapper">
      <div className="chat-container">
        {/* Sidebar — lista de conversas */}
        <ChatSidebar />

        {/* Área principal */}
        <div className="chat-main">
          {selectedChat ? (
            <div className="active-chat">
              <div className="active-chat-main">
                <ChatHeader />
                <ChatBody />
                <ChatFooter />
              </div>
            </div>
          ) : (
            <WhatsappWebEmpty />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function WhatsappChatPage() {
  useWhatsappChatScrollLock()

  return (
    <div className="whatsapp-chat-page">
      <WhatsappProvider>
        <WhatsappChatShell />
      </WhatsappProvider>
    </div>
  )
}
