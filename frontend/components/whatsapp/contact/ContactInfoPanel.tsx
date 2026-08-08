// @ts-nocheck
'use client'
import {
  Ban, Bell, ChevronRight, CircleMinus, Clock3, Heart, Images,
  Lock, Pencil, Search, Shield, Star, ThumbsDown, Trash2, Users,
} from 'lucide-react'
import { formatJidAsPhoneLine } from '@/lib/whatsapp/utils'

interface CommonGroup {
  jid?: string
  name?: string
}

interface ContactDetails {
  displayName?: string
  avatarUrl?: string
  phone?: string
  chatJid?: string
  about?: string
  muteEndTime?: number
  ephemeralExpiration?: number
  isBlocked?: boolean
  commonGroups?: CommonGroup[]
}

interface Props {
  open: boolean
  loading?: boolean
  errorMessage?: string
  details?: ContactDetails | null
  chat?: Record<string, unknown> | null
  muted?: boolean
  favorite?: boolean
  mediaCount?: number
  previewItems?: Array<{ id: string; previewUrl?: string; label?: string }>
  onClose: () => void
  onRequestToggleBlock?: () => void
  onRequestToggleFavorite?: () => void
  onRequestClearChat?: () => void
  onRequestDeleteChat?: () => void
  onRequestMediaDocs?: () => void
  onRequestSearch?: () => void
}

export function ContactInfoPanel({
  open, loading, errorMessage, details, chat,
  muted = false, favorite = false, mediaCount = 0, previewItems = [],
  onClose, onRequestToggleBlock, onRequestToggleFavorite, onRequestClearChat, onRequestDeleteChat,
  onRequestMediaDocs, onRequestSearch,
}: Props) {
  if (!open) return null

  const displayName = String(
    details?.displayName || (chat as Record<string, unknown>)?.name || (chat as Record<string, unknown>)?.pushName || 'Contato'
  ).trim()

  const avatarUrl = String(details?.avatarUrl || (chat as Record<string, unknown>)?.avatarUrl || '').trim()
  const initial = displayName.charAt(0).toUpperCase() || '?'

  const phoneLabel = (() => {
    const phone = String(details?.phone || '').trim()
    if (phone) return formatJidAsPhoneLine(phone) || phone
    const jid = String(details?.chatJid || (chat as Record<string, unknown>)?.chatJid || '').trim()
    return formatJidAsPhoneLine(jid) || jid.replace(/@[^@]+$/, '')
  })()

  const aboutLabel = String(details?.about || '').trim()
  const commonGroups: CommonGroup[] = Array.isArray(details?.commonGroups) ? details.commonGroups : []

  const isMutedByApi = (() => {
    const end = Number(details?.muteEndTime || 0)
    if (end === -1) return true
    if (!Number.isFinite(end) || end <= 0) return false
    const ms = end > 1e12 ? end : end * 1000
    return ms > Date.now()
  })()
  const isMuted = muted || isMutedByApi

  const isBlocked = Boolean(details?.isBlocked)

  return (
    <aside style={panelStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <button onClick={onClose} style={iconBtnStyle}>✕</button>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 500, color: '#111b21', textAlign: 'center' }}>
          Dados do contato
        </h3>
        <button style={iconBtnStyle} aria-label="Editar notas">
          <Pencil size={20} />
        </button>
      </header>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: '#fff' }}>
        {/* Hero */}
        <section style={{ padding: '28px 24px 20px', textAlign: 'center' }}>
          <div style={avatarBigStyle}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '3rem' }}>{initial}</span>
            )}
          </div>
          <h4 style={{ margin: '0 0 4px', fontSize: '1.45rem', fontWeight: 400, color: '#111b21' }}>{displayName}</h4>
          {phoneLabel && <p style={{ margin: '0 0 18px', color: '#667781', fontSize: '.95rem' }}>{phoneLabel}</p>}
          <button onClick={onRequestSearch} style={searchChipStyle}>
            <Search size={18} /> Pesquisar
          </button>
        </section>

        {/* About */}
        {aboutLabel && (
          <section style={{ padding: '16px 28px 20px', borderTop: '1px solid #e9edef' }}>
            <p style={{ margin: '0 0 6px', color: '#008069', fontSize: '.88rem', fontWeight: 500 }}>Recado</p>
            <p style={{ margin: 0, color: '#111b21', fontSize: '1rem', lineHeight: 1.4, wordBreak: 'break-word' }}>{aboutLabel}</p>
          </section>
        )}

        {/* Info rows */}
        <section style={{ borderTop: '8px solid #f0f2f5' }}>
          <InfoRow icon={<Images size={24} />} label="Mídia, links e docs" right={mediaCount > 0 ? String(mediaCount) : undefined} clickable onClick={onRequestMediaDocs} />
          {previewItems.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, padding: '0 28px 14px', borderBottom: '1px solid #e9edef' }}>
              {previewItems.slice(0, 4).map((item) => (
                <div key={item.id} style={{ aspectRatio: '1', overflow: 'hidden', borderRadius: 4, background: '#dfe5e7', cursor: 'pointer' }}>
                  {item.previewUrl
                    ? <img src={item.previewUrl} alt={item.label || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    : <div style={{ display: 'grid', placeItems: 'center', height: '100%', fontSize: '.72rem', color: '#54656f', padding: 4, textAlign: 'center' }}>{item.label || 'Mídia'}</div>
                  }
                </div>
              ))}
            </div>
          )}
          <InfoRow icon={<Star size={24} />} label="Mensagens favoritas" clickable />
          <InfoRow
            icon={<Bell size={24} />}
            label="Silenciada"
            right={<Toggle on={isMuted} />}
            clickable
          />
          <InfoRow icon={<Clock3 size={24} />} label="Mensagens temporárias" sub="Desativadas" />
          <InfoRow icon={<Shield size={24} />} label="Privacidade avançada" sub="Desativada" />
          <InfoRow icon={<Lock size={24} />} label="Criptografia" sub="As mensagens são protegidas com criptografia de ponta a ponta." isLast />
        </section>

        {/* Common groups */}
        {commonGroups.length > 0 && (
          <section style={{ borderTop: '8px solid #f0f2f5' }}>
            <p style={{ margin: 0, padding: '14px 28px 6px', color: '#008069', fontSize: '.82rem', fontWeight: 600 }}>Grupos em comum</p>
            {commonGroups.map((g, i) => (
              <InfoRow
                key={g.jid || i}
                icon={<Users size={24} />}
                label={g.name || g.jid || 'Grupo'}
                right={<ChevronRight size={18} style={{ color: '#8696a0' }} />}
                clickable
                isLast={i === commonGroups.length - 1}
              />
            ))}
          </section>
        )}

        {/* Actions */}
        <section style={{ borderTop: '8px solid #f0f2f5', marginBottom: 24 }}>
          <InfoRow icon={<Heart size={24} />} label={favorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'} clickable onClick={onRequestToggleFavorite} />
          <InfoRow icon={<CircleMinus size={24} style={{ color: '#ea0038' }} />} label="Limpar conversa" clickable danger onClick={onRequestClearChat} />
          <InfoRow
            icon={<Ban size={24} style={{ color: '#ea0038' }} />}
            label={isBlocked ? `Desbloquear ${displayName}` : `Bloquear ${displayName}`}
            clickable danger
            onClick={onRequestToggleBlock}
          />
          <InfoRow icon={<ThumbsDown size={24} style={{ color: '#ea0038' }} />} label={`Denunciar ${displayName}`} clickable danger />
          <InfoRow icon={<Trash2 size={24} style={{ color: '#ea0038' }} />} label="Apagar conversa" clickable danger isLast onClick={onRequestDeleteChat} />
        </section>

        {loading && <p style={{ margin: 0, padding: '12px 28px 24px', color: '#667781', fontSize: '.82rem' }}>Carregando detalhes...</p>}
        {errorMessage && <p style={{ margin: 0, padding: '12px 28px 24px', color: '#ea0038', fontSize: '.82rem' }}>{errorMessage}</p>}
      </div>
    </aside>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ icon, label, sub, right, clickable, danger, isLast, onClick }: {
  icon: React.ReactNode; label: string; sub?: string; right?: React.ReactNode
  clickable?: boolean; danger?: boolean; isLast?: boolean; onClick?: () => void
}) {
  return (
    <div
      onClick={clickable ? onClick : undefined}
      style={{
        minHeight: 60, display: 'grid', gridTemplateColumns: '24px minmax(0,1fr) auto',
        gap: 28, alignItems: 'center', padding: '0 28px',
        borderBottom: isLast ? 'none' : '1px solid #e9edef',
        cursor: clickable ? 'pointer' : 'default',
      }}
    >
      <span style={{ color: danger ? '#ea0038' : '#54656f', display: 'flex', alignItems: 'center' }}>{icon}</span>
      <div style={{ minWidth: 0, padding: '14px 0' }}>
        <span style={{ display: 'block', fontSize: '1rem', color: danger ? '#ea0038' : '#111b21', lineHeight: 1.3 }}>{label}</span>
        {sub && <small style={{ display: 'block', marginTop: 3, color: '#667781', fontSize: '.82rem' }}>{sub}</small>}
      </div>
      {right !== undefined && <span style={{ color: '#667781', fontSize: '.88rem', padding: '14px 0' }}>{right}</span>}
    </div>
  )
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span style={{
      width: 36, height: 20, borderRadius: 999, background: on ? '#008069' : '#cbd5e1',
      display: 'inline-block', position: 'relative', flexShrink: 0, verticalAlign: 'middle',
    }} />
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  width: 'min(420px,42vw)', minWidth: 320, flexShrink: 0, height: '100%',
  background: '#fff', color: '#111b21', borderLeft: '1px solid #e9edef',
  display: 'flex', flexDirection: 'column', overflow: 'hidden',
}

const headerStyle: React.CSSProperties = {
  minHeight: 60, display: 'grid', gridTemplateColumns: '40px 1fr 40px',
  alignItems: 'center', padding: '0 8px', background: '#f0f2f5', flexShrink: 0,
}

const iconBtnStyle: React.CSSProperties = {
  border: 'none', background: 'transparent', color: '#54656f', cursor: 'pointer',
  width: 40, height: 40, display: 'grid', placeItems: 'center', borderRadius: '50%', fontSize: '1.15rem',
}

const avatarBigStyle: React.CSSProperties = {
  width: 200, height: 200, maxWidth: '55%', aspectRatio: '1', margin: '0 auto 16px',
  borderRadius: '50%', overflow: 'hidden', background: '#dfe5e7', color: '#54656f',
  display: 'grid', placeItems: 'center',
}

const searchChipStyle: React.CSSProperties = {
  border: 'none', background: 'transparent', color: '#008069', fontSize: '.95rem', fontWeight: 500,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8,
}
