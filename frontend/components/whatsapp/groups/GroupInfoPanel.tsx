// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'
import {
  Bell, Clock3, Heart, Images, Link2, List, Lock, LogOut,
  PencilLine, Search, Settings, Shield, ShieldAlert,
  Star, Trash2, UserPlus2, UserRoundPlus,
} from 'lucide-react'
import type { WaGroupInfo, WaGroupParticipant } from '@/lib/whatsapp/groups'

interface Props {
  open: boolean
  loading?: boolean
  errorMessage?: string
  groupInfo?: WaGroupInfo | null
  chat?: Record<string, unknown> | null
  participants?: WaGroupParticipant[]
  muted?: boolean
  favorite?: boolean
  mediaCount?: number
  viewerIsAdmin?: boolean
  onClose: () => void
  onRequestMembers?: () => void
  onRequestLeaveGroup?: () => void
  onRequestGroupPermissions?: () => void
}

const MEMBER_PREVIEW_LIMIT = 8

export function GroupInfoPanel({
  open, loading, errorMessage, groupInfo, chat, participants = [],
  muted = false, favorite = false, mediaCount = 0,
  viewerIsAdmin = false,
  onClose, onRequestMembers, onRequestLeaveGroup, onRequestGroupPermissions,
}: Props) {
  const [membersExpanded, setMembersExpanded] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)

  useEffect(() => {
    if (!open) { setMembersExpanded(false); setDescExpanded(false) }
  }, [open])

  if (!open) return null

  const displayName = String(
    groupInfo?.Name || groupInfo?.name || (chat as Record<string, unknown>)?.name || 'Grupo'
  ).trim()

  const avatarUrl = String(
    (chat as Record<string, unknown>)?.avatarUrl || groupInfo?.image || groupInfo?.imagePreview || ''
  ).trim()

  const initial = displayName.charAt(0).toUpperCase() || 'G'

  const allParticipants: WaGroupParticipant[] = Array.isArray(participants) ? participants
    : Array.isArray(groupInfo?.Participants) ? groupInfo.Participants
    : Array.isArray(groupInfo?.participants) ? groupInfo.participants
    : []

  const participantCount = allParticipants.length
  const participantLabel = participantCount
    ? `${participantCount} membro${participantCount !== 1 ? 's' : ''}`
    : loading ? 'Carregando...' : 'Sem membros'

  const descriptionText = String(groupInfo?.Topic || groupInfo?.topic || '').trim()

  const visibleMembers = membersExpanded
    ? allParticipants
    : allParticipants.slice(0, MEMBER_PREVIEW_LIMIT)

  const hiddenCount = Math.max(0, participantCount - MEMBER_PREVIEW_LIMIT)

  const createdAtLabel = (() => {
    const raw = groupInfo?.GroupCreated || groupInfo?.groupCreated
    if (!raw) return ''
    const d = new Date(raw)
    return isNaN(d.getTime()) ? String(raw) : d.toLocaleString('pt-BR')
  })()

  return (
    <aside style={panelStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <button onClick={onClose} style={iconBtnStyle} aria-label="Fechar">✕</button>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 500, color: '#111b21', textAlign: 'center' }}>
          Dados do grupo
        </h3>
        <span style={{ width: 40, height: 40 }} />
      </header>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: '#fff' }}>
        {/* Hero */}
        <section style={{ padding: '28px 24px 16px', textAlign: 'center', background: '#fff' }}>
          <div style={avatarBigStyle}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '3rem', fontWeight: 400 }}>{initial}</span>
            )}
          </div>
          <h4 style={{ margin: '0 0 4px', fontSize: '1.45rem', fontWeight: 400, color: '#111b21', wordBreak: 'break-word' }}>
            {displayName}
            {viewerIsAdmin && (
              <button style={inlineEditBtnStyle} aria-label="Editar nome">
                <PencilLine size={16} />
              </button>
            )}
          </h4>
          <p style={{ margin: 0, color: '#667781', fontSize: '.95rem' }}>Grupo · {participantLabel}</p>
        </section>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 28px 16px' }}>
          {viewerIsAdmin && (
            <button onClick={onRequestMembers} style={chipBtnStyle}>
              <UserPlus2 size={18} /> Adicionar
            </button>
          )}
          <button style={chipBtnStyle}>
            <Search size={18} /> Pesquisar
          </button>
        </div>

        {/* Description */}
        {descriptionText && (
          <section style={{ padding: '0 28px 16px', borderBottom: '8px solid #f0f2f5' }}>
            <p style={{
              margin: 0, color: '#111b21', fontSize: '.98rem', lineHeight: 1.45,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              ...(descExpanded ? {} : {
                display: '-webkit-box', WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }),
            }}>
              {descriptionText}
            </p>
            {descriptionText.length > 180 && (
              <button onClick={() => setDescExpanded((v) => !v)} style={readMoreBtnStyle}>
                {descExpanded ? 'Ler menos' : 'Ler mais'}
              </button>
            )}
          </section>
        )}

        {/* Loading / error */}
        {loading && <p style={statusStyle}>Carregando dados do grupo...</p>}
        {errorMessage && <p style={{ ...statusStyle, color: '#ea0038' }}>{errorMessage}</p>}

        {/* Info rows */}
        <section style={{ borderTop: '8px solid #f0f2f5' }}>
          <InfoRow icon={<Images size={24} />} label="Mídia, links e docs" right={mediaCount > 0 ? String(mediaCount) : undefined} clickable />
          <InfoRow icon={<Star size={24} />} label="Mensagens favoritas" clickable />
          <InfoRow icon={<Bell size={24} />} label="Silenciar notificações" right={
            <span style={{ width: 36, height: 20, borderRadius: 999, background: muted ? '#008069' : '#cbd5e1', display: 'inline-block', position: 'relative', flexShrink: 0 }} />
          } clickable />
          <InfoRow icon={<Lock size={24} />} label="Criptografia" sub="As mensagens são protegidas com criptografia de ponta a ponta." />
          <InfoRow icon={<Clock3 size={24} />} label="Mensagens temporárias" sub="Desativadas" />
          <InfoRow icon={<Shield size={24} />} label="Privacidade avançada" sub="Desativada" />
          {viewerIsAdmin && (
            <InfoRow icon={<Settings size={24} />} label="Permissões do grupo" clickable onClick={onRequestGroupPermissions} isLast />
          )}
        </section>

        {/* Members section */}
        <section style={{ borderTop: '8px solid #f0f2f5' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px 8px', color: '#667781', fontSize: '.88rem' }}>
            <span>{participantLabel}</span>
            <button style={{ ...iconBtnStyle, width: 32, height: 32 }} aria-label="Pesquisar membros">
              <Search size={18} />
            </button>
          </div>

          {viewerIsAdmin && (
            <InfoRow icon={<UserRoundPlus size={24} style={{ color: '#008069' }} />} label="Adicionar membro" clickable onClick={onRequestMembers} />
          )}
          {viewerIsAdmin && (
            <InfoRow icon={<Link2 size={24} style={{ color: '#008069' }} />} label="Convidar via link" clickable />
          )}

          {visibleMembers.map((m, i) => {
            const jid = String(m.JID || m.jid || '')
            const localPart = jid.split('@')[0] || ''
            const isAdmin = Boolean(m.IsAdmin || m.isAdmin || m.isSuperAdmin)
            const initials = localPart.charAt(0).toUpperCase() || '?'
            return (
              <div key={jid || i} style={memberRowStyle}>
                <div style={memberAvatarStyle}>{initials}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '1rem', color: '#111b21', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {localPart || jid}
                  </div>
                </div>
                {isAdmin && (
                  <span style={{ background: '#f0f2f5', color: '#667781', border: '1px solid #e9edef', padding: '2px 8px', borderRadius: 6, fontSize: '.72rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Admin do grupo
                  </span>
                )}
              </div>
            )
          })}

          {hiddenCount > 0 && !membersExpanded && (
            <button onClick={() => setMembersExpanded(true)} style={showAllBtnStyle}>
              Ver tudo (mais {hiddenCount})
            </button>
          )}
          {membersExpanded && participantCount > MEMBER_PREVIEW_LIMIT && (
            <button onClick={() => setMembersExpanded(false)} style={showAllBtnStyle}>
              Mostrar menos
            </button>
          )}
        </section>

        {/* Danger actions */}
        <section style={{ borderTop: '8px solid #f0f2f5', marginBottom: 12 }}>
          <InfoRow icon={<Heart size={24} />} label={favorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'} clickable />
          <InfoRow icon={<Trash2 size={24} style={{ color: '#ea0038' }} />} label="Limpar conversa" clickable danger />
          <InfoRow icon={<LogOut size={24} style={{ color: '#ea0038' }} />} label="Sair do grupo" clickable danger onClick={onRequestLeaveGroup} />
          <InfoRow icon={<ShieldAlert size={24} style={{ color: '#ea0038' }} />} label="Denunciar grupo" clickable danger isLast />
        </section>

        {createdAtLabel && (
          <p style={{ margin: 0, padding: '8px 28px 24px', color: '#8696a0', fontSize: '.82rem' }}>
            Grupo criado em {createdAtLabel}
          </p>
        )}
      </div>
    </aside>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ icon, label, sub, right, clickable, danger, isLast, onClick }: {
  icon: React.ReactNode
  label: string
  sub?: string
  right?: React.ReactNode
  clickable?: boolean
  danger?: boolean
  isLast?: boolean
  onClick?: () => void
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

const inlineEditBtnStyle: React.CSSProperties = {
  border: 'none', background: 'transparent', color: '#54656f', cursor: 'pointer',
  padding: 4, borderRadius: '50%', display: 'inline-grid', placeItems: 'center', verticalAlign: 'middle', marginLeft: 6,
}

const chipBtnStyle: React.CSSProperties = {
  border: 'none', background: 'transparent', color: '#008069', fontSize: '.95rem', fontWeight: 500,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  gap: 8, padding: '10px 8px', borderRadius: 8,
}

const statusStyle: React.CSSProperties = {
  margin: 0, padding: '12px 28px', color: '#667781', fontSize: '.92rem',
}

const memberRowStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '49px minmax(0,1fr) auto',
  gap: 14, alignItems: 'center', padding: '10px 28px', borderBottom: '1px solid #e9edef',
}

const memberAvatarStyle: React.CSSProperties = {
  width: 49, height: 49, borderRadius: '50%', background: '#dfe5e7',
  color: '#54656f', display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '1.1rem', fontWeight: 500, flexShrink: 0,
}

const showAllBtnStyle: React.CSSProperties = {
  width: '100%', border: 'none', borderBottom: '1px solid #e9edef', background: 'transparent',
  color: '#008069', fontSize: '.95rem', fontWeight: 500, padding: '16px 28px', textAlign: 'left', cursor: 'pointer',
}

const readMoreBtnStyle: React.CSSProperties = {
  marginTop: 8, border: 'none', background: 'transparent', color: '#008069',
  fontSize: '.92rem', fontWeight: 500, cursor: 'pointer', padding: 0,
}
