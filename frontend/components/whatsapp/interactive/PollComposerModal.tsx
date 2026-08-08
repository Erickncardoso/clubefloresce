// @ts-nocheck
'use client'
import { useState } from 'react'
import type { PollForm } from '@/lib/whatsapp/groups'
import { defaultPollForm } from '@/lib/whatsapp/groups'

interface Props {
  open: boolean
  sending?: boolean
  error?: string
  onCancel: () => void
  onConfirm: (form: PollForm) => void
}

const MESSAGE_TYPE_OPTIONS = [
  { value: 'poll', label: 'Enquete' },
  { value: 'button', label: 'Botões' },
  { value: 'list', label: 'Lista' },
  { value: 'carousel', label: 'Carrossel' },
  { value: 'request-payment', label: 'Solicitar pagamento' },
  { value: 'pix-button', label: 'Botão PIX' },
]

const PIX_TYPE_OPTIONS = ['EVP', 'CPF', 'CNPJ', 'PHONE', 'EMAIL']

export function PollComposerModal({ open, sending, error, onCancel, onConfirm }: Props) {
  const [form, setForm] = useState<PollForm>(defaultPollForm)

  const update = (key: keyof PollForm, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const canSubmit = (() => {
    const text = form.text.trim()
    const options = form.choicesText.split('\n').map((v) => v.trim()).filter(Boolean)
    if (form.type !== 'pix-button' && !text) return false
    if (form.type === 'poll') return options.length >= 2
    if (form.type === 'carousel') return form.carouselCardsText.trim().length > 0
    if (form.type === 'request-payment') return Number(form.amount) > 0 && form.pixKey.trim().length > 0
    if (form.type === 'pix-button') return form.pixKey.trim().length > 0
    return options.length >= 1
  })()

  if (!open) return null

  return (
    <div style={backdropStyle} onClick={onCancel}>
      <div style={shellStyle} onClick={(e) => e.stopPropagation()}>
        {/* Form side */}
        <section style={formSideStyle}>
          <header style={headerStyle}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#111b21' }}>Mensagem interativa</h3>
            <button onClick={onCancel} style={closeBtnStyle}>✕</button>
          </header>

          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '14px 20px 16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

              {/* Type */}
              <FloatField label="Tipo">
                <select value={form.type} onChange={(e) => update('type', e.target.value)} disabled={sending} style={selectStyle}>
                  {MESSAGE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </FloatField>

              {/* Main text */}
              {form.type !== 'pix-button' && (
                <FloatField label="Texto principal">
                  <input
                    value={form.text}
                    onChange={(e) => update('text', e.target.value)}
                    placeholder="Digite o texto principal"
                    disabled={sending}
                    style={inputStyle}
                  />
                </FloatField>
              )}

              {/* Poll choices */}
              {form.type === 'poll' && (
                <FloatField label="Opções da enquete">
                  <textarea
                    value={form.choicesText}
                    onChange={(e) => update('choicesText', e.target.value)}
                    placeholder={'Opção 1\nOpção 2'}
                    rows={4}
                    disabled={sending}
                    style={{ ...inputStyle, height: 'auto', resize: 'vertical', lineHeight: 1.45, paddingTop: '0.95rem' }}
                  />
                </FloatField>
              )}

              {/* Poll allow multiple */}
              {form.type === 'poll' && (
                <label style={toggleRowStyle}>
                  <span>Permitir várias respostas</span>
                  <input
                    type="checkbox"
                    checked={Boolean(form.allowMultiple)}
                    onChange={(e) => update('allowMultiple', e.target.checked)}
                    disabled={sending}
                    style={{ width: 18, height: 18, accentColor: '#8B967C' }}
                  />
                </label>
              )}

              {/* Buttons */}
              {form.type === 'button' && (
                <FloatField label="Botões de ação">
                  <textarea
                    value={form.choicesText}
                    onChange={(e) => update('choicesText', e.target.value)}
                    placeholder={'Botão 1\nBotão 2\nBotão 3'}
                    rows={3}
                    disabled={sending}
                    style={{ ...inputStyle, height: 'auto', resize: 'vertical', paddingTop: '0.95rem' }}
                  />
                </FloatField>
              )}

              {/* Button image */}
              {form.type === 'button' && (
                <FloatField label="Imagem do botão (opcional)">
                  <input
                    value={form.imageButton}
                    onChange={(e) => update('imageButton', e.target.value)}
                    placeholder="https://..."
                    disabled={sending}
                    style={inputStyle}
                  />
                </FloatField>
              )}

              {/* List button text */}
              {form.type === 'list' && (
                <FloatField label="Texto do botão da lista">
                  <input
                    value={form.listButton}
                    onChange={(e) => update('listButton', e.target.value)}
                    placeholder="Ver opções"
                    disabled={sending}
                    style={inputStyle}
                  />
                </FloatField>
              )}

              {/* List items */}
              {form.type === 'list' && (
                <FloatField label="Itens da lista">
                  <textarea
                    value={form.choicesText}
                    onChange={(e) => update('choicesText', e.target.value)}
                    placeholder={'Item 1\nItem 2\nItem 3'}
                    rows={4}
                    disabled={sending}
                    style={{ ...inputStyle, height: 'auto', resize: 'vertical', paddingTop: '0.95rem' }}
                  />
                </FloatField>
              )}

              {/* Footer */}
              {(form.type === 'button' || form.type === 'list') && (
                <FloatField label="Rodapé (opcional)">
                  <input
                    value={form.footerText}
                    onChange={(e) => update('footerText', e.target.value)}
                    placeholder="Texto de rodapé"
                    disabled={sending}
                    style={inputStyle}
                  />
                </FloatField>
              )}

              {/* Carousel */}
              {form.type === 'carousel' && (
                <FloatField label="Cartões do carrossel (JSON ou texto)">
                  <textarea
                    value={form.carouselCardsText}
                    onChange={(e) => update('carouselCardsText', e.target.value)}
                    placeholder="Cartão 1\nCartão 2"
                    rows={4}
                    disabled={sending}
                    style={{ ...inputStyle, height: 'auto', resize: 'vertical', paddingTop: '0.95rem' }}
                  />
                </FloatField>
              )}

              {/* PIX fields */}
              {(form.type === 'request-payment' || form.type === 'pix-button') && (
                <>
                  <FloatField label="Tipo da chave PIX">
                    <select value={form.pixType} onChange={(e) => update('pixType', e.target.value)} disabled={sending} style={selectStyle}>
                      {PIX_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </FloatField>
                  <FloatField label="Chave PIX">
                    <input value={form.pixKey} onChange={(e) => update('pixKey', e.target.value)} placeholder="Digite a chave PIX" disabled={sending} style={inputStyle} />
                  </FloatField>
                  <FloatField label="Nome do recebedor (opcional)">
                    <input value={form.pixName} onChange={(e) => update('pixName', e.target.value)} placeholder="Ex: Loja Exemplo" disabled={sending} style={inputStyle} />
                  </FloatField>
                </>
              )}

              {form.type === 'request-payment' && (
                <>
                  <FloatField label="Valor (BRL)">
                    <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => update('amount', e.target.value)} placeholder="199.90" disabled={sending} style={inputStyle} />
                  </FloatField>
                  <FloatField label="Nome do item (opcional)">
                    <input value={form.itemName} onChange={(e) => update('itemName', e.target.value)} placeholder="Assinatura Plano Ouro" disabled={sending} style={inputStyle} />
                  </FloatField>
                  <FloatField label="Número da fatura (opcional)">
                    <input value={form.invoiceNumber} onChange={(e) => update('invoiceNumber', e.target.value)} placeholder="PED-123" disabled={sending} style={inputStyle} />
                  </FloatField>
                  <FloatField label="Link de pagamento (opcional)">
                    <input value={form.paymentLink} onChange={(e) => update('paymentLink', e.target.value)} placeholder="https://pagamentos..." disabled={sending} style={inputStyle} />
                  </FloatField>
                </>
              )}

            </div>
          </div>

          <footer style={{ padding: '14px 20px 18px', background: '#f4f7f6', borderTop: '1px solid #e8ece9', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
            {error && (
              <p style={{ margin: 0, padding: '10px 12px', borderRadius: 8, background: '#fce8e6', color: '#b3261e', fontSize: '.86rem', border: '1px solid #f5c6c2' }}>
                {error}
              </p>
            )}
            <button
              onClick={() => onConfirm(form)}
              disabled={sending || !canSubmit}
              style={{ ...confirmBtnStyle, opacity: (sending || !canSubmit) ? .55 : 1 }}
            >
              {sending ? 'Enviando...' : 'Enviar mensagem interativa'}
            </button>
          </footer>
        </section>

        {/* Preview side */}
        <aside style={previewSideStyle}>
          <header style={{ flexShrink: 0, padding: '14px 16px 10px', background: '#f0f2f5', borderBottom: '1px solid #e9edef' }}>
            <h4 style={{ margin: 0, fontSize: '.9rem', fontWeight: 600, color: '#111b21' }}>Teste ao vivo</h4>
            <span style={{ display: 'block', marginTop: 2, fontSize: '.75rem', color: '#667781' }}>
              Prévia da mensagem interativa
            </span>
          </header>
          <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px 18px' }}>
            <PollPreview form={form} />
          </div>
        </aside>
      </div>
    </div>
  )
}

// ─── Preview ──────────────────────────────────────────────────────────────────

function PollPreview({ form }: { form: PollForm }) {
  const bubbleStyle: React.CSSProperties = {
    background: '#fff', borderRadius: 8, padding: '8px 10px', maxWidth: '100%',
    boxShadow: '0 1px 2px rgba(0,0,0,.12)', marginBottom: 8, fontSize: '.88rem', color: '#111b21',
  }

  if (form.type === 'poll') {
    const options = form.choicesText.split('\n').map((v) => v.trim()).filter(Boolean)
    return (
      <div>
        <div style={bubbleStyle}>
          {form.text && <p style={{ margin: '0 0 8px', fontWeight: 500 }}>{form.text}</p>}
          {options.length === 0 ? (
            <p style={{ margin: 0, color: '#8696a0', fontSize: '.82rem' }}>Adicione opções acima</p>
          ) : options.map((opt, i) => (
            <div key={i} style={{ padding: '6px 0', borderBottom: i < options.length - 1 ? '1px solid #f0f2f5' : 'none', cursor: 'pointer' }}>
              <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', border: '1.5px solid #25d366', marginRight: 8, verticalAlign: 'middle' }} />
              {opt}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (form.type === 'button') {
    const btns = form.choicesText.split('\n').map((v) => v.trim()).filter(Boolean)
    return (
      <div style={bubbleStyle}>
        {form.text && <p style={{ margin: '0 0 8px' }}>{form.text}</p>}
        {btns.map((btn, i) => (
          <div key={i} style={{ textAlign: 'center', padding: '8px 0', borderTop: '1px solid #e9edef', color: '#008069', fontWeight: 500, cursor: 'pointer' }}>{btn}</div>
        ))}
      </div>
    )
  }

  if (form.type === 'list') {
    return (
      <div style={bubbleStyle}>
        {form.text && <p style={{ margin: '0 0 8px' }}>{form.text}</p>}
        <div style={{ textAlign: 'center', padding: '8px 0', borderTop: '1px solid #e9edef', color: '#008069', fontWeight: 500, cursor: 'pointer' }}>
          {form.listButton || 'Ver opções'}
        </div>
      </div>
    )
  }

  if (form.type === 'pix-button') {
    return (
      <div style={bubbleStyle}>
        <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#008069' }}>💠 Pagamento via PIX</p>
        <p style={{ margin: 0, fontSize: '.82rem', color: '#667781' }}>Chave: {form.pixKey || '—'}</p>
      </div>
    )
  }

  if (form.type === 'request-payment') {
    return (
      <div style={bubbleStyle}>
        <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{form.text || 'Solicitação de pagamento'}</p>
        <p style={{ margin: '0 0 4px', fontSize: '.9rem', color: '#008069' }}>R$ {form.amount || '0,00'}</p>
        <p style={{ margin: 0, fontSize: '.78rem', color: '#667781' }}>Chave PIX: {form.pixKey || '—'}</p>
      </div>
    )
  }

  return (
    <div style={bubbleStyle}>
      <p style={{ margin: 0, color: '#667781', fontSize: '.86rem' }}>Tipo: {form.type}</p>
      {form.text && <p style={{ margin: '6px 0 0' }}>{form.text}</p>}
    </div>
  )
}

// ─── FloatField helper ────────────────────────────────────────────────────────

function FloatField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', marginTop: '.35rem' }}>
      <span style={{
        position: 'absolute', top: '-.42rem', left: '.78rem', background: '#fff',
        zIndex: 2, fontSize: '.76rem', fontWeight: 700, color: '#444',
        lineHeight: 1, padding: '0 .4rem', pointerEvents: 'none',
      }}>
        {label}
      </span>
      {children}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const backdropStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 10080, background: 'rgba(17,27,33,.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box',
}

const shellStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px', alignItems: 'stretch',
  width: 'min(1040px,calc(100vw - 48px))', maxHeight: 'min(90vh,820px)', minHeight: 0,
  borderRadius: 14, overflow: 'hidden', border: '1px solid #e9edef',
  boxShadow: '0 12px 40px rgba(11,20,26,.18)', background: '#fff',
}

const formSideStyle: React.CSSProperties = {
  minWidth: 0, minHeight: 0, maxHeight: 'inherit', background: '#fff',
  color: '#111b21', display: 'flex', flexDirection: 'column', overflow: 'hidden',
  borderRight: '1px solid #e9edef',
}

const previewSideStyle: React.CSSProperties = {
  width: 380, minWidth: 0, minHeight: 0, maxHeight: 'inherit',
  display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#e5ddd5',
}

const headerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  padding: '16px 20px', background: '#f0f2f5', borderBottom: '1px solid #e9edef', flexShrink: 0,
}

const closeBtnStyle: React.CSSProperties = {
  border: 'none', background: 'transparent', color: '#667781', cursor: 'pointer', fontSize: '1.15rem', padding: '4px 6px', borderRadius: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '.85rem .9rem', border: '1.5px solid #e8ece9', borderRadius: 8,
  fontFamily: 'inherit', fontSize: '.9rem', boxSizing: 'border-box',
  background: '#fff', color: '#1a2e24', outline: 'none',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle, height: 48, padding: '.85rem .9rem',
}

const toggleRowStyle: React.CSSProperties = {
  marginTop: '.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  fontWeight: 600, fontSize: '.9rem', color: '#333d3b', padding: '12px 14px',
  background: '#f4f7f6', borderRadius: 8, border: '1.5px solid #e8ece9', cursor: 'pointer',
}

const confirmBtnStyle: React.CSSProperties = {
  width: '100%', height: 44, border: 'none', borderRadius: 8, fontWeight: 600,
  fontSize: '.95rem', cursor: 'pointer', background: '#25d366', color: '#04130a',
}
