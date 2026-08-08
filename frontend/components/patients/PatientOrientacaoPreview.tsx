'use client'

import { forwardRef } from 'react'
import s from './PatientOrientacaoPreview.module.scss'

const LOGO_SRC = '/icons/logovetorcarregamento.svg'

function htmlToPlainText(html: string): string {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

type Props = {
  title?: string | null
  content?: string | null
  patientName?: string | null
  patientCpf?: string | null
  authorName?: string | null
}

export const PatientOrientacaoPreview = forwardRef<HTMLElement, Props>(
  function PatientOrientacaoPreview({ title, content, patientName, patientCpf, authorName }, ref) {
    const hasContent = Boolean(htmlToPlainText(content || ''))

    return (
      <div className={s.wrap}>
        <article ref={ref as React.Ref<HTMLElement>} className={s.page}>
          <header className={s.head}>
            <div className={s.headCopy}>
              <p className={s.kicker}>Orientações</p>
              <h3>{title || 'Nova Orientação'}</h3>
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
              <img className={s.logo} src={LOGO_SRC} alt="" />
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
              <img className={`${s.logo} ${s.logoFoot}`} src={LOGO_SRC} alt="" />
            </div>
            <div className={s.footSign}>
              <p>Nutricionista: {authorName || '—'}</p>
              <span className={s.signLine}>{authorName || 'Assinatura'}</span>
            </div>
            <span className={s.pageNo}>Página 1</span>
          </footer>
        </article>
      </div>
    )
  },
)
