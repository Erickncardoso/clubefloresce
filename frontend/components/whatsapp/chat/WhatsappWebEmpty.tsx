'use client'
import { MessageSquare } from 'lucide-react'

export function WhatsappWebEmpty() {
  return (
    <div className="wa-empty-state">
      <div className="wa-empty-inner">
        <div className="wa-empty-icon">
          <MessageSquare size={64} strokeWidth={1} />
        </div>
        <h2 className="wa-empty-title">WhatsApp Web</h2>
        <p className="wa-empty-desc">
          Selecione uma conversa na lista para ler e responder mensagens.
        </p>
      </div>
    </div>
  )
}
