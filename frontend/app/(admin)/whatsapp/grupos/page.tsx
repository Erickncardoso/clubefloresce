'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Globe,
  Link2,
  Loader2,
  LogOut,
  MousePointer2,
  Plus,
  RefreshCw,
  Search,
  Settings,
  User,
  Users,
  X,
} from 'lucide-react'
import { whatsappHasAuth } from '@/lib/whatsapp/api'
import {
  createWhatsappGroup,
  leaveWhatsappGroup,
  listWhatsappGroups,
  resetGroupInviteCode,
  updateGroupAnnounce,
  updateGroupLocked,
  type WaGroupListItem,
} from '@/lib/whatsapp/groups'
import styles from './grupos.module.scss'

function toParticipantJid(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (trimmed.includes('@')) return trimmed
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return ''
  return `${digits}@s.whatsapp.net`
}

function isParticipantAdmin(admin: WaGroupListItem['participants'][number]['admin']): boolean {
  if (admin === true) return true
  if (typeof admin === 'string') {
    const value = admin.toLowerCase()
    return value === 'admin' || value === 'superadmin' || value === 'true'
  }
  return false
}

export default function WhatsappGruposPage() {
  const router = useRouter()
  const [authReady, setAuthReady] = useState(false)
  const [groups, setGroups] = useState<WaGroupListItem[]>([])
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<WaGroupListItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [rawParticipants, setRawParticipants] = useState('')

  const loadGroups = useCallback(async () => {
    try {
      setLoadingGroups(true)
      const list = await listWhatsappGroups({ force: true })
      setGroups(list)
      setSelectedGroup((prev) => {
        if (!prev) return null
        return list.find((g) => g.id === prev.id) || null
      })
    } catch (err) {
      console.error('Erro ao carregar grupos', err)
    } finally {
      setLoadingGroups(false)
    }
  }, [])

  useEffect(() => {
    if (!whatsappHasAuth()) {
      router.replace('/whatsapp/conexao')
      return
    }
    setAuthReady(true)
    void loadGroups()
  }, [router, loadGroups])

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return groups
    return groups.filter((g) => g.subject.toLowerCase().includes(q))
  }, [groups, searchQuery])

  const toggleSetting = async (action: 'announce' | 'locked', value: boolean) => {
    if (!selectedGroup) return
    const groupjid = selectedGroup.id
    const previous = { ...selectedGroup }
    setSelectedGroup({
      ...selectedGroup,
      announce: action === 'announce' ? value : selectedGroup.announce,
      restrict: action === 'locked' ? value : selectedGroup.restrict,
    })
    const result =
      action === 'announce'
        ? await updateGroupAnnounce(groupjid, value)
        : await updateGroupLocked(groupjid, value)
    if (!result.ok) {
      setSelectedGroup(previous)
      alert(result.error || 'Falha ao salvar configuração.')
    }
  }

  const getInviteLink = async () => {
    if (!selectedGroup) return
    try {
      setActionLoading(true)
      const result = await resetGroupInviteCode(selectedGroup.id)
      if (!result.ok || !result.invite) {
        alert(result.error || 'Não foi possível obter o link de convite.')
        return
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(result.invite)
        alert('Link de convite copiado!')
      } else {
        alert(`Link de convite: ${result.invite}`)
      }
    } finally {
      setActionLoading(false)
    }
  }

  const leaveGroup = async () => {
    if (!selectedGroup) return
    if (!confirm('Tem certeza que deseja sair deste grupo? O robô perderá o acesso.')) return
    const result = await leaveWhatsappGroup(selectedGroup.id)
    if (!result.ok) {
      alert(result.error || 'Falha ao sair do grupo.')
      return
    }
    setSelectedGroup(null)
    await loadGroups()
  }

  const submitCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newGroupName.trim()
    const jids = rawParticipants
      .split('\n')
      .map(toParticipantJid)
      .filter(Boolean)
    if (!name) {
      alert('Informe o nome do grupo.')
      return
    }
    if (jids.length === 0) {
      alert('Adicione pelo menos um participante.')
      return
    }
    try {
      setCreating(true)
      const result = await createWhatsappGroup(name, jids)
      if (!result.ok) {
        alert(result.error || 'Erro ao criar grupo.')
        return
      }
      setShowCreateModal(false)
      setNewGroupName('')
      setRawParticipants('')
      alert('Grupo criado com sucesso!')
      await loadGroups()
    } finally {
      setCreating(false)
    }
  }

  if (!authReady) {
    return (
      <div className={styles.page}>
        <div className={`admin-shell-card ${styles.stateCard}`}>
          <Loader2 className={styles.spin} size={28} />
          <p>Verificando sessão…</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestão de Grupos</h1>
          <p className={styles.subtitle}>
            Administre seus grupos e comunidades com agilidade e poder de moderação.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} /> Novo Grupo
        </button>
      </header>

      <div className={styles.grid}>
        <section className={`admin-shell-card ${styles.listCard}`}>
          <div className={styles.listHeader}>
            <div className={styles.searchBox}>
              <Search size={16} aria-hidden />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar grupo..."
                aria-label="Buscar grupo"
              />
            </div>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => void loadGroups()}
              title="Atualizar"
              aria-label="Atualizar lista"
            >
              <RefreshCw size={16} className={loadingGroups ? styles.spin : undefined} />
            </button>
          </div>

          {loadingGroups ? (
            <div className={styles.stateCard}>
              <Loader2 className={styles.spin} size={28} />
              <p>Sincronizando grupos...</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className={styles.stateCard}>
              <Users size={40} />
              <p>Nenhum grupo encontrado.</p>
            </div>
          ) : (
            <div className={styles.groupItems}>
              {filteredGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className={`${styles.groupCard} ${selectedGroup?.id === group.id ? styles.groupCardActive : ''}`}
                  onClick={() => setSelectedGroup(group)}
                >
                  <div className={styles.groupAvatar}>
                    <Users size={20} />
                  </div>
                  <div className={styles.groupInfo}>
                    <strong>{group.subject || 'Grupo sem nome'}</strong>
                    <span>{group.participants?.length || 0} membros</span>
                  </div>
                  <div className={styles.groupBadges}>
                    {group.isCommunity ? (
                      <span className={styles.badge} title="Comunidade">
                        <Globe size={14} />
                      </span>
                    ) : null}
                    {group.announce ? (
                      <span className={styles.badge} title="Somente admins">
                        🔒
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className={`admin-shell-card ${styles.detailCard}`}>
          {!selectedGroup ? (
            <div className={styles.stateCard}>
              <MousePointer2 size={40} />
              <h3>Selecione um grupo</h3>
              <p>Clique em um grupo na lista ao lado para ver e gerenciar suas configurações.</p>
            </div>
          ) : (
            <div className={styles.detailContent}>
              <div className={styles.detailHeader}>
                <div className={styles.bigAvatar}>
                  <Users size={32} />
                </div>
                <div>
                  <h2>{selectedGroup.subject}</h2>
                  <p>
                    {selectedGroup.creation
                      ? `Criado em ${new Date(selectedGroup.creation * 1000).toLocaleDateString('pt-BR')}`
                      : 'Data de criação indisponível'}
                    {' • '}
                    {selectedGroup.participants?.length || 0} participantes
                  </p>
                </div>
              </div>

              <h4 className={styles.sectionTitle}>
                <Settings size={16} /> Configurações e Moderação
              </h4>
              <div className={styles.settingsGrid}>
                <div className={styles.settingCard}>
                  <div>
                    <strong>Apenas Administradores podem enviar mensagens</strong>
                    <p>Bloqueia o chat para os membros comuns.</p>
                  </div>
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={Boolean(selectedGroup.announce)}
                      onChange={() => void toggleSetting('announce', !selectedGroup.announce)}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>
                <div className={styles.settingCard}>
                  <div>
                    <strong>Apenas Administradores podem editar dados</strong>
                    <p>Impede que membros mudem nome e foto.</p>
                  </div>
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={Boolean(selectedGroup.restrict)}
                      onChange={() => void toggleSetting('locked', !selectedGroup.restrict)}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>
              </div>

              <div className={styles.actionsRow}>
                <button
                  type="button"
                  className={styles.btnOutline}
                  disabled={actionLoading}
                  onClick={() => void getInviteLink()}
                >
                  {actionLoading ? <Loader2 size={16} className={styles.spin} /> : <Link2 size={16} />}
                  Copiar Link de Convite
                </button>
                <button type="button" className={styles.btnDanger} disabled={actionLoading} onClick={() => void leaveGroup()}>
                  <LogOut size={16} />
                  Sair do Grupo
                </button>
              </div>

              <h4 className={styles.sectionTitle}>
                <Users size={16} /> Participantes Principais
              </h4>
              <div className={styles.participantsList}>
                {(selectedGroup.participants || []).slice(0, 5).map((p) => (
                  <div key={p.id} className={styles.participantItem}>
                    <div className={styles.participantAvatar}>
                      <User size={14} />
                    </div>
                    <div className={styles.participantData}>
                      <span>{p.id.replace('@s.whatsapp.net', '').replace('@g.us', '')}</span>
                      {isParticipantAdmin(p.admin) ? (
                        <span className={styles.adminBadge}>Admin</span>
                      ) : null}
                    </div>
                  </div>
                ))}
                {(selectedGroup.participants?.length || 0) > 5 ? (
                  <p className={styles.moreParticipants}>
                    E mais {(selectedGroup.participants?.length || 0) - 5} participantes...
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </section>
      </div>

      {showCreateModal ? (
        <div
          className={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false)
          }}
        >
          <div className={`admin-shell-card ${styles.modal}`} role="dialog" aria-modal="true" aria-label="Criar novo grupo">
            <div className={styles.modalHeader}>
              <h2>Criar Novo Grupo</h2>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="Fechar"
                onClick={() => setShowCreateModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={(e) => void submitCreateGroup(e)}>
              <div className="field field--float">
                <label htmlFor="group-name">Nome do Grupo</label>
                <input
                  id="group-name"
                  type="text"
                  required
                  placeholder="Ex: Mentoria Turma 10"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
              </div>
              <div className={`field field--float ${styles.fieldSpaced}`}>
                <label htmlFor="group-participants">
                  Participantes Iniciais (ao menos 1 além de você)
                </label>
                <textarea
                  id="group-participants"
                  rows={4}
                  required
                  placeholder={'5511999999999\n5521988888888'}
                  value={rawParticipants}
                  onChange={(e) => setRawParticipants(e.target.value)}
                />
              </div>
              <p className={styles.hint}>Apenas números com DDD, um por linha.</p>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnGhost} onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? <Loader2 size={16} className={styles.spin} /> : <Plus size={16} />}
                  Criar Grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
