'use client'

import { useState } from 'react'
import { Bell, BookOpen, Link2, MessageSquare, Save } from 'lucide-react'
import styles from './personalizar.module.scss'

type PortalSettings = {
  logo: string
  primaryColor: string
  welcomeTitle: string
  welcomeText: string
  supportLink: string
  enableCommunity: boolean
  enableEbooks: boolean
  enableNotifications: boolean
}

const INITIAL: PortalSettings = {
  logo: '',
  primaryColor: '#8B967C',
  welcomeTitle: 'Que bom ter você aqui!',
  welcomeText: 'Continue sua jornada rumo a uma vida mais saudável e equilibrada.',
  supportLink: '',
  enableCommunity: true,
  enableEbooks: true,
  enableNotifications: true,
}

export default function PersonalizarPage() {
  const [settings, setSettings] = useState<PortalSettings>(INITIAL)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  function patch<K extends keyof PortalSettings>(key: K, value: PortalSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setSavedMsg('')
  }

  async function handleSave() {
    setSaving(true)
    setSavedMsg('')
    await new Promise((r) => setTimeout(r, 800))
    setSaving(false)
    setSavedMsg('Configurações salvas com sucesso!')
  }

  return (
    <div className={styles.page}>
      <header className="admin-shell-header">
        <div>
          <h1>Personalizar portal</h1>
          <p>Ajuste a identidade visual e as configurações globais da sua área de membros.</p>
        </div>
        <button type="button" className="btn-primary" disabled={saving} onClick={() => void handleSave()}>
          <Save size={16} aria-hidden />
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </header>

      {savedMsg ? <p className={styles.toast}>{savedMsg}</p> : null}

      <div className={styles.grid}>
        <section className={`admin-shell-card ${styles.section}`}>
          <span className={styles.badge}>Visual</span>
          <h3>Identidade de Marca</h3>
          <p className={styles.sectionLead}>Configure como seus pacientes enxergam o seu portal.</p>

          <div className={styles.field}>
            <label>Logotipo do Portal</label>
            <div className={styles.logoRow}>
              <div className={styles.logoBox}>
                {settings.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={settings.logo} alt="Logo do portal" />
                ) : (
                  <span>Seu Logo</span>
                )}
              </div>
              <button type="button" className={styles.uploadText} disabled>
                Alterar logomarca
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="primaryColor">Cor Primária (Identidade)</label>
            <div className={styles.colorRow}>
              <input
                id="primaryColor"
                type="color"
                value={settings.primaryColor}
                onChange={(e) => patch('primaryColor', e.target.value)}
              />
              <span className={styles.colorHex}>{settings.primaryColor.toUpperCase()}</span>
            </div>
            <p className={styles.hint}>Esta cor será usada em botões, ícones ativos e destaques.</p>
          </div>
        </section>

        <section className={`admin-shell-card ${styles.section}`}>
          <span className={styles.badge}>Conteúdo</span>
          <h3>Experiência do Paciente</h3>
          <p className={styles.sectionLead}>Personalize as mensagens de boas-vindas do Dashboard.</p>

          <div className={`field field--float ${styles.floatField}`}>
            <label htmlFor="welcomeTitle">Título de Boas-Vindas</label>
            <input
              id="welcomeTitle"
              value={settings.welcomeTitle}
              onChange={(e) => patch('welcomeTitle', e.target.value)}
              placeholder="Ex: Que bom ver você de novo!"
            />
          </div>

          <div className={`field field--float ${styles.floatField}`}>
            <label htmlFor="welcomeText">Mensagem de Destaque</label>
            <textarea
              id="welcomeText"
              rows={3}
              value={settings.welcomeText}
              onChange={(e) => patch('welcomeText', e.target.value)}
              placeholder="Sua próxima aula te espera..."
            />
          </div>

          <div className={`field field--float ${styles.floatField}`}>
            <label htmlFor="supportLink">Link de Suporte (WhatsApp/E-mail)</label>
            <div className={styles.inputIcon}>
              <Link2 size={16} aria-hidden />
              <input
                id="supportLink"
                value={settings.supportLink}
                onChange={(e) => patch('supportLink', e.target.value)}
                placeholder="https://wa.me/..."
              />
            </div>
          </div>
        </section>

        <section className={`admin-shell-card ${styles.section} ${styles.full}`}>
          <span className={styles.badge}>Configurações</span>
          <h3>Recursos Ativos</h3>
          <p className={styles.sectionLead}>Habilite ou desabilite módulos específicos para seus pacientes.</p>

          <div className={styles.toggles}>
            <div className={styles.toggleCard}>
              <div className={styles.toggleInfo}>
                <div className={styles.toggleIcon}>
                  <MessageSquare size={18} aria-hidden />
                </div>
                <div>
                  <h4>Comunidade de Pacientes</h4>
                  <p>Permite que os pacientes postem e comentem entre si.</p>
                </div>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={settings.enableCommunity}
                  onChange={(e) => patch('enableCommunity', e.target.checked)}
                />
                <span className={styles.slider} />
              </label>
            </div>

            <div className={styles.toggleCard}>
              <div className={styles.toggleInfo}>
                <div className={styles.toggleIcon}>
                  <BookOpen size={18} aria-hidden />
                </div>
                <div>
                  <h4>Biblioteca de Ebooks</h4>
                  <p>Habilita a aba de materiais e guias para download.</p>
                </div>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={settings.enableEbooks}
                  onChange={(e) => patch('enableEbooks', e.target.checked)}
                />
                <span className={styles.slider} />
              </label>
            </div>

            <div className={styles.toggleCard}>
              <div className={styles.toggleInfo}>
                <div className={styles.toggleIcon}>
                  <Bell size={18} aria-hidden />
                </div>
                <div>
                  <h4>Notificações em Tempo Real</h4>
                  <p>Alertas no navegador para novas aulas e posts.</p>
                </div>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={settings.enableNotifications}
                  onChange={(e) => patch('enableNotifications', e.target.checked)}
                />
                <span className={styles.slider} />
              </label>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
