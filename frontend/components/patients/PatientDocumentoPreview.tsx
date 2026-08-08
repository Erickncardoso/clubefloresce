'use client'

import { forwardRef } from 'react'
import { DOCUMENTO_LOGO_SRC, htmlToPlainText } from '@/lib/documento-templates'
import s from './PatientDocumentoPreview.module.scss'

type Props = {
  title?: string | null
  content?: string | null
  kicker?: string | null
  patientName?: string | null
  patientCpf?: string | null
  authorName?: string | null
  authorCrn?: string | null
  variant?: 'default' | 'large'
}

export const PatientDocumentoPreview = forwardRef<HTMLElement, Props>(
  function PatientDocumentoPreview(
    { title, content, kicker, patientName, patientCpf, authorName, authorCrn, variant = 'default' },
    ref,
  ) {
    const hasContent = Boolean(htmlToPlainText(content || ''))
    const crn = String(authorCrn || '').trim()
    const authorLine = crn
      ? `${String(authorName || '—').trim()} — CRN ${crn}`
      : String(authorName || '—').trim()

    return (
      <div className={`${s.wrap}${variant === 'large' ? ` ${s.wrapLarge}` : ''}`}>
        <article
          ref={ref as React.Ref<HTMLElement>}
          className={`${s.page}${variant === 'large' ? ` ${s.pageLarge}` : ''}`}
        >
          <div className={s.bg} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={s.bgLogo} src={DOCUMENTO_LOGO_SRC} alt="" />
          </div>

          <header className={s.head}>
            <div className={s.headCopy}>
              <p className={s.kicker}>{kicker || 'Documento'}</p>
              <h3>{title || 'Novo Documento'}</h3>
              <dl className={s.meta}>
                <div>
                  <dt>Paciente</dt>
                  <dd>{patientName || '—'}</dd>
                </div>
                <div>
                  <dt>CPF</dt>
                  <dd>{patientCpf || '—'}</dd>
                </div>
              </dl>
            </div>
            <div className={s.brand} aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={s.logo} src={DOCUMENTO_LOGO_SRC} alt="" />
            </div>
          </header>

          <div className={s.body}>
            {hasContent ? (
              <div className={s.content} dangerouslySetInnerHTML={{ __html: content! }} />
            ) : (
              <p className={s.empty}>Preencha o conteúdo para visualizar</p>
            )}
          </div>

          <footer className={s.foot}>
            <div className={s.footBrand} aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={`${s.logo} ${s.logoFoot}`} src={DOCUMENTO_LOGO_SRC} alt="" />
            </div>
            <div className={s.footSign}>
              <p>Nutricionista: {authorLine}</p>
              <span className={s.signLine}>{authorName || 'Assinatura'}</span>
            </div>
            <span className={s.pageNo}>Página 1</span>
          </footer>
        </article>
      </div>
    )
  },
)
