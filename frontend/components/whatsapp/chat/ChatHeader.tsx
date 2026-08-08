'use client'
import { useState } from 'react'
import { Image } from 'lucide-react'
import { useWhatsapp } from '@/lib/whatsapp/context'
import { WallpaperPickerModal } from '../panels/WallpaperPickerModal'
import { writeWallpaperStorage } from '@/lib/whatsapp/wallpaper'

function ChatAvatar({ name, avatarUrl }: { name: string; avatarUrl: string }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="chat-header-avatar"
        style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
      />
    )
  }
  const initials = (name || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase()
  return (
    <div
      className="chat-header-avatar"
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: '#dfe5e7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#54656f',
        fontSize: 14,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  )
}

export function ChatHeader() {
  const { selectedChat } = useWhatsapp()
  const [wallpaperOpen, setWallpaperOpen] = useState(false)

  if (!selectedChat) return null

  const phone = selectedChat.chatJid.split('@')[0] || ''

  return (
    <>
      <div className="chat-header">
        <div className="chat-contact-info">
          <ChatAvatar name={selectedChat.name} avatarUrl={selectedChat.avatarUrl} />
          <div className="chat-contact-text">
            <h3>{selectedChat.name || phone}</h3>
            {phone && selectedChat.name !== phone && (
              <span style={{ fontSize: 13, color: '#667781' }}>{phone}</span>
            )}
          </div>
        </div>
        <div className="chat-actions">
          <button
            type="button"
            className="chat-header-action-btn"
            title="Papel de parede"
            aria-label="Alterar papel de parede"
            onClick={() => setWallpaperOpen(true)}
            style={{
              width: 36,
              height: 36,
              border: 'none',
              borderRadius: '50%',
              background: 'transparent',
              color: '#54656f',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Image size={18} />
          </button>
        </div>
      </div>

      <WallpaperPickerModal
        open={wallpaperOpen}
        onCancel={() => setWallpaperOpen(false)}
        onApply={(presetId, customDataUrl) => {
          writeWallpaperStorage({ presetId, customDataUrl })
          setWallpaperOpen(false)
          // Dispatch a storage event so ChatBody can pick it up
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('wa-wallpaper-changed'))
          }
        }}
      />
    </>
  )
}
