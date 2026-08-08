// @ts-nocheck
'use client'
import { useState } from 'react'
import { Loader2, User } from 'lucide-react'

interface BusinessProfile {
  description?: string
  openNow?: boolean
  address?: string
  email?: string
  websites?: string[]
  categories?: Array<{ displayValue?: string; id?: string }>
  businessHours?: Record<string, unknown>
}

interface Props {
  open: boolean
  loading?: boolean
  profile?: BusinessProfile | null
  catalog?: Array<{ id?: string; name?: string; imageUrl?: string }>
  avatarUrl?: string
  displayName?: string
  phoneLabel?: string
  primaryCategory?: string
  primaryWebsite?: string
  openingLabel?: string
  hoursLabel?: string
  weeklySchedule?: Array<{ dayLabel: string; value: string }>
  addressLine?: string
  emailLabel?: string
  categoriesLabel?: string
  onClose: () => void
}

export function BusinessProfileModal({
  open, loading, profile, catalog = [], avatarUrl, displayName = 'Empresa',
  phoneLabel = '', primaryCategory = '', primaryWebsite = '', openingLabel = '',
  hoursLabel = '', weeklySchedule = [], addressLine = '', emailLabel = '',
  categoriesLabel = '', onClose,
}: Props) {
  const [hoursExpanded, setHoursExpanded] = useState(false)

  if (!open) return null

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e9edef', background: '#f0f2f5' }}>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#111b21' }}>Dados do contato</h4>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 32, color: '#667781' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#008069' }} />
              <span>Carregando dados da empresa...</span>
            </div>
          )}

          {!loading && profile && (
            <>
              {/* Hero */}
              <div style={{ background: '#f0f2f5', height: 80, position: 'relative', marginBottom: 50 }}>
                <div style={{
                  position: 'absolute', bottom: -44, left: 24,
                  width: 88, height: 88, borderRadius: '50%', overflow: 'hidden',
                  background: '#dfe5e7', border: '3px solid #fff',
                  display: 'grid', placeItems: 'center',
                }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <User size={40} style={{ color: '#54656f' }} />
                  }
                </div>
              </div>

              {/* Identity */}
              <div style={{ padding: '12px 24px 20px' }}>
                <h5 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 600, color: '#111b21' }}>{displayName}</h5>
                {phoneLabel && <p style={{ margin: '0 0 4px', color: '#667781', fontSize: '.9rem' }}>{phoneLabel}</p>}
                {primaryCategory && <p style={{ margin: '0 0 8px', color: '#008069', fontSize: '.88rem' }}>{primaryCategory}</p>}
                {profile.description && (
                  <p style={{ margin: '0 0 16px', color: '#111b21', fontSize: '.95rem', lineHeight: 1.45 }}>{profile.description}</p>
                )}

                {/* Hours */}
                {(openingLabel || hoursLabel) && (
                  <div style={{ marginBottom: 12 }}>
                    <button onClick={() => setHoursExpanded((v) => !v)} style={hoursBtnStyle}>
                      {openingLabel && (
                        <span style={{ color: profile.openNow ? '#25d366' : '#ea0038', fontWeight: 600, marginRight: 8 }}>
                          {openingLabel}
                        </span>
                      )}
                      {hoursLabel && <span style={{ color: '#667781' }}>{hoursLabel}</span>}
                      <span style={{ marginLeft: 'auto', color: '#8696a0' }}>{hoursExpanded ? '▲' : '▼'}</span>
                    </button>
                    {hoursExpanded && weeklySchedule.length > 0 && (
                      <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none' }}>
                        {weeklySchedule.map((row) => (
                          <li key={row.dayLabel} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '.88rem', color: '#111b21', borderBottom: '1px solid #f0f2f5' }}>
                            <span>{row.dayLabel}</span>
                            <span style={{ color: '#667781' }}>{row.value}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {addressLine && <p style={{ margin: '0 0 6px', color: '#667781', fontSize: '.9rem' }}>📍 {addressLine}</p>}
              </div>

              {/* Details section */}
              <div style={{ padding: '0 24px 20px', borderTop: '8px solid #f0f2f5' }}>
                <h6 style={{ margin: '16px 0 10px', fontSize: '.88rem', fontWeight: 600, color: '#667781', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  Conta comercial
                </h6>
                {openingLabel && <p style={{ margin: '0 0 4px', fontSize: '.9rem', color: '#111b21' }}><strong>Status:</strong> {openingLabel}</p>}
                {hoursLabel && <p style={{ margin: '0 0 4px', fontSize: '.9rem', color: '#111b21' }}><strong>Horário:</strong> {hoursLabel}</p>}
                {addressLine && <p style={{ margin: '0 0 4px', fontSize: '.9rem', color: '#111b21' }}><strong>Endereço:</strong> {addressLine}</p>}
                {emailLabel && <p style={{ margin: '0 0 4px', fontSize: '.9rem', color: '#111b21' }}><strong>Email:</strong> {emailLabel}</p>}
                {primaryWebsite && <p style={{ margin: '0 0 4px', fontSize: '.9rem', color: '#111b21' }}><strong>Site:</strong> <a href={primaryWebsite} target="_blank" rel="noopener noreferrer" style={{ color: '#008069' }}>{primaryWebsite}</a></p>}
                {categoriesLabel && <p style={{ margin: '0 0 4px', fontSize: '.9rem', color: '#111b21' }}><strong>Categoria:</strong> {categoriesLabel}</p>}
                {!openingLabel && !hoursLabel && !addressLine && !emailLabel && !primaryWebsite && !categoriesLabel && !profile.description && (
                  <p style={{ margin: 0, color: '#8696a0', fontSize: '.86rem' }}>
                    Esta conta não retornou detalhes comerciais adicionais.
                  </p>
                )}
              </div>

              {/* Catalog */}
              {catalog.length > 0 && (
                <div style={{ padding: '0 24px 20px', borderTop: '8px solid #f0f2f5' }}>
                  <h6 style={{ margin: '16px 0 10px', fontSize: '.88rem', fontWeight: 600, color: '#667781', textTransform: 'uppercase' }}>Catálogo</h6>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(80px,1fr))', gap: 10 }}>
                    {catalog.map((product, i) => (
                      <div key={product.id || i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 72, height: 72, borderRadius: 8, overflow: 'hidden', background: '#dfe5e7', display: 'grid', placeItems: 'center' }}>
                          {product.imageUrl
                            ? <img src={product.imageUrl} alt={product.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: '.72rem', color: '#667781' }}>Sem imagem</span>
                          }
                        </div>
                        <span style={{ fontSize: '.72rem', color: '#111b21', textAlign: 'center', lineHeight: 1.2 }}>
                          {product.name || 'Produto'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {!loading && !profile && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, color: '#667781', fontSize: '.9rem' }}>
              Não foi possível carregar o perfil comercial.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const backdropStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 10080, background: 'rgba(17,27,33,.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box',
}

const modalStyle: React.CSSProperties = {
  width: 'min(480px,calc(100vw - 32px))', maxHeight: 'min(88vh,700px)', background: '#fff',
  borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(11,20,26,.2)',
  display: 'flex', flexDirection: 'column',
}

const closeBtnStyle: React.CSSProperties = {
  border: 'none', background: 'transparent', color: '#54656f', cursor: 'pointer', fontSize: '1.15rem',
}

const hoursBtnStyle: React.CSSProperties = {
  width: '100%', border: 'none', background: '#f0f2f5', color: '#111b21',
  padding: '8px 12px', borderRadius: 8, fontSize: '.9rem', cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 6, textAlign: 'left',
}
