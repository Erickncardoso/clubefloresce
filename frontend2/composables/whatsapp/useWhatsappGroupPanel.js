/**
 * useWhatsappGroupPanel
 * Estado e funções do painel lateral de grupo: info, permissões, mídia, membros.
 * Extrai ~500 linhas do monolito chat.vue.
 */
import { ref, computed, watch } from 'vue'
import {
  selectedChat, chats, chatActionFeedback,
  contactsDirectory, groupParticipantsDirectory, groupParticipantsByJid, groupParticipantsByLid,
  observedSenderDirectory, senderAvatarDirectory, lidToJidMap,
} from './useWhatsappState.js'
import {
  renderedMessages,
  extractUazapiJpegThumbDataUrl,
  resolveMediaGalleryPreviewUrl,
  preloadMessageMediaIfNeeded,
} from './useWhatsappMessages.js'
import { refreshChatPreview, loadChats } from './useWhatsappChats.js'
import { loadGroupParticipantsDirectory, resolveViewerGroupMembership } from './useWhatsappContacts.js'
import {
  getGroupInfo as getGroupInfoApi,
  leaveGroup as leaveGroupApi,
  resetGroupInviteCode as resetGroupInviteCodeApi,
  updateGroupAnnounce as updateGroupAnnounceApi,
  updateGroupDescription as updateGroupDescriptionApi,
  updateGroupLocked as updateGroupLockedApi,
  updateGroupName as updateGroupNameApi,
  updateGroupParticipants as updateGroupParticipantsApi,
} from './useWhatsappGroupsApi.js'
import { normalizeJid, isGroupJid, isGroupAnnounceRestricted, getStoredSessionJid } from './useWhatsappUtils.js'

// ─── Estado do painel de grupo ────────────────────────────────────────────────
export const groupInfoModalOpen = ref(false)
export const groupSidePanelView = ref('info')
export const groupInfoLoading = ref(false)
export const groupInfoError = ref('')
export const groupInfoData = ref(null)
export const groupInfoLoadedJid = ref('')
export const groupInfoLoadSeq = ref(0)
export const groupPermissionsSaving = ref(false)
export const groupMediaModalOpen = ref(false)
export const groupMediaActiveTab = ref('media')

// ─── Mute / favoritos / acesso por grupo ──────────────────────────────────────
export const groupMutedChats = ref({})
export const groupFavoriteChats = ref({})
export const groupAccessByJid = ref({})

// ─── Sessão JID (setado pelo onMounted do chat.vue) ───────────────────────────
export const sessionJid = ref('')

// ─── Adicionar membros ao grupo ───────────────────────────────────────────────
export const addGroupMembersOpen = ref(false)
export const addGroupMembersContacts = ref([])
export const addGroupMembersSelectedIds = ref([])
export const addGroupMembersSearchQuery = ref('')
export const addGroupMembersSending = ref(false)
export const addGroupMembersLoading = ref(false)
export const addGroupMembersFeedback = ref('')

// ─── Helpers internos ─────────────────────────────────────────────────────────

const resolveSelectedChatJid = () =>
  String(selectedChat.value?.chatJid || selectedChat.value?.wa_chatid || selectedChat.value?.chatid || '').trim()

const requireGroupJid = () => {
  const groupjid = String(selectedChat.value?.chatJid || '').trim()
  if (!groupjid || !groupjid.endsWith('@g.us')) {
    throw new Error('Grupo invalido para esta acao')
  }
  return groupjid
}

// ─── Computeds ────────────────────────────────────────────────────────────────

export const selectedChatIsGroup = computed(() => {
  const chat = selectedChat.value
  if (!chat) return false
  return Boolean(chat.isGroup || chat.wa_isGroup) || isGroupJid(chat.chatJid || chat.wa_chatid || '')
})

export const activeGroupInfoForPanel = computed(() => {
  const currentJid = normalizeJid(resolveSelectedChatJid())
  const loadedJid = normalizeJid(
    groupInfoLoadedJid.value ||
    groupInfoData.value?.JID ||
    groupInfoData.value?.jid ||
    groupInfoData.value?.groupjid ||
    ''
  )
  if (!currentJid || !loadedJid || currentJid !== loadedJid || !groupInfoData.value) return null
  return groupInfoData.value
})

export const selectedGroupAccess = computed(() => {
  const jid = normalizeJid(resolveSelectedChatJid())
  if (!jid || !selectedChatIsGroup.value) {
    return { isAnnounce: false, viewerIsAdmin: false, loaded: false }
  }
  const cached = groupAccessByJid.value[jid]
  const modalJid = normalizeJid(groupInfoData.value?.JID || groupInfoData.value?.jid || groupInfoData.value?.groupjid || '')
  if (modalJid && modalJid === jid) {
    const participants = Array.isArray(groupInfoData.value?.Participants)
      ? groupInfoData.value.Participants
      : (Array.isArray(groupInfoData.value?.participants) ? groupInfoData.value.participants : [])
    const membership = resolveViewerGroupMembership(
      participants,
      sessionJid.value || getStoredSessionJid(),
      { lidMap: lidToJidMap.value, groupInfo: groupInfoData.value }
    )
    return {
      isAnnounce: isGroupAnnounceRestricted(groupInfoData.value),
      viewerIsAdmin: membership.isAdmin,
      loaded: true
    }
  }
  return cached || { isAnnounce: false, viewerIsAdmin: false, loaded: false }
})

export const selectedGroupViewerIsAdmin = computed(() => Boolean(selectedGroupAccess.value.viewerIsAdmin))

export const selectedGroupComposeLocked = computed(() => {
  const access = selectedGroupAccess.value
  if (!selectedChatIsGroup.value || !access.loaded) return false
  return access.isAnnounce && !access.viewerIsAdmin
})

export const groupInfoParticipantsRaw = computed(() => {
  if (!groupInfoModalOpen.value) return []
  const data = activeGroupInfoForPanel.value
  if (!data) return []
  if (Array.isArray(data.Participants)) return data.Participants
  if (Array.isArray(data.participants)) return data.participants
  return []
})

export const groupMemberLookupContext = computed(() => ({
  contactsDirectory: contactsDirectory.value,
  groupParticipantsDirectory: groupParticipantsDirectory.value,
  groupParticipantsByJid: groupParticipantsByJid.value,
  groupParticipantsByLid: groupParticipantsByLid.value,
  observedSenderDirectory: observedSenderDirectory.value,
  senderAvatarDirectory: senderAvatarDirectory.value,
  lidToJidMap: lidToJidMap.value
}))

// ─── Computeds: galeria de mídia do chat ──────────────────────────────────────
// Usados tanto pelo GroupInfoModal quanto pelo ContactInfoModal

export const groupInfoMediaItems = computed(() => {
  const source = Array.isArray(renderedMessages.value) ? renderedMessages.value : []
  return source
    .filter((msg) => {
      const mediaType = String(msg?.mediaType || '').toLowerCase()
      return ['image', 'video', 'sticker'].includes(mediaType)
    })
    .map((msg, index) => {
      const { previewUrl, mediaUrl, thumbUrl } = resolveMediaGalleryPreviewUrl(msg)
      const mediaType = String(msg?.mediaType || msg?.type || 'media').toLowerCase()
      const label = mediaType.includes('video') ? 'Vídeo' : mediaType.includes('sticker') ? 'Figurinha' : 'Imagem'
      return {
        id: String(msg?.id || msg?.messageid || `media-${index}`),
        kind: 'media',
        previewUrl,
        mediaUrl: mediaUrl || previewUrl,
        thumbUrl,
        mediaType,
        label,
        timestamp: Number(msg?.timestamp || 0)
      }
    })
    .filter((item) => Boolean(item.previewUrl || item.mediaUrl))
    .sort((a, b) => b.timestamp - a.timestamp)
})

export const groupInfoDocumentItems = computed(() => {
  const source = Array.isArray(renderedMessages.value) ? renderedMessages.value : []
  return source
    .filter((msg) => String(msg?.mediaType || '').toLowerCase() === 'document')
    .map((msg, index) => {
      const documentNode = msg?.content?.documentMessage || {}
      const fileName = String(documentNode?.fileName || msg?.text || `Documento ${index + 1}`).trim()
      const mediaUrl = String(msg?.mediaUrl || '').trim()
      const pageCountRaw = Number(documentNode?.pageCount || documentNode?.pageCountV2 || 0)
      const pageCount = Number.isFinite(pageCountRaw) && pageCountRaw > 0 ? Math.floor(pageCountRaw) : 0
      const mimeType = String(documentNode?.mimetype || documentNode?.mimeType || '').trim().toUpperCase() || 'DOC'
      const fileLengthRaw = Number(documentNode?.fileLength || documentNode?.fileSize || 0)
      const fileKb = Number.isFinite(fileLengthRaw) && fileLengthRaw > 0 ? `${Math.max(1, Math.round(fileLengthRaw / 1024))} KB` : ''
      const metadata = [pageCount ? `${pageCount} ${pageCount > 1 ? 'páginas' : 'página'}` : '', mimeType, fileKb].filter(Boolean).join(' · ')
      const previewImage = String(extractUazapiJpegThumbDataUrl(msg?.content) || '').trim()
      return {
        id: String(msg?.id || msg?.messageid || `doc-${index}`),
        kind: 'document',
        fileName,
        subtitle: metadata || 'Documento',
        previewUrl: previewImage,
        mediaUrl,
        timestamp: Number(msg?.timestamp || 0),
        senderLabel: String(msg?.senderDisplayName || '').trim() || 'Contato',
        dayLabel: msg?.timestamp ? new Date(msg.timestamp).toLocaleDateString('pt-BR', { weekday: 'long' }) : '',
        dateLabel: msg?.timestamp ? new Date(msg.timestamp).toLocaleDateString('pt-BR') : '',
        timeLabel: msg?.timestamp ? new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''
      }
    })
    .sort((a, b) => b.timestamp - a.timestamp)
})

const linkUrlPattern = /(https?:\/\/[^\s<>"']+)/gi
const cleanLinkHref = (href) => String(href || '').trim().replace(/[)\],.;!?]+$/g, '')
const linkHostFromHref = (href) => {
  try { return new URL(String(href || '')).hostname.replace(/^www\./i, '') } catch { return '' }
}
const isUrlLikeText = (value) => /^https?:\/\//i.test(String(value || '').trim())

const buildLinkPanelTitle = (linkPreview, href) => {
  const title = String(linkPreview?.title || '').trim()
  const source = String(linkPreview?.source || linkHostFromHref(href)).trim()
  if (title && title !== href && !isUrlLikeText(title)) return title
  return source || href
}

const buildLinkPanelDescription = (linkPreview, href, title) => {
  const description = String(linkPreview?.description || '').trim()
  if (!description || description === href || description === title || isUrlLikeText(description)) return ''
  return description
}

const buildLinkPanelCaption = (linkPreview, href) => {
  const caption = String(linkPreview?.bodyText || '').trim()
  if (!caption || caption === href || isUrlLikeText(caption)) return ''
  if (caption.includes(href)) return ''
  return caption
}

export const groupInfoLinkItems = computed(() => {
  const source = Array.isArray(renderedMessages.value) ? renderedMessages.value : []
  const links = []

  source.forEach((msg, msgIndex) => {
    const pushLink = (href, linkPreview = null) => {
      const cleanHref = cleanLinkHref(href)
      if (!cleanHref || !/^https?:\/\//i.test(cleanHref)) return
      const title = buildLinkPanelTitle(linkPreview, cleanHref)
      const description = linkPreview ? buildLinkPanelDescription(linkPreview, cleanHref, title) : ''
      const caption = linkPreview ? buildLinkPanelCaption(linkPreview, cleanHref) : ''
      const previewImage = String(linkPreview?.imageUrl || '').trim()
      const sourceLabel = String(linkPreview?.source || linkHostFromHref(cleanHref)).trim()
      links.push({
        id: `${String(msg?.id || msg?.messageid || `link-${msgIndex}`)}-${cleanHref}`,
        kind: 'link',
        href: cleanHref,
        title,
        description,
        caption,
        previewImage,
        source: sourceLabel,
        senderLabel: String(msg?.senderDisplayName || msg?.pushName || '').trim() || 'Contato',
        timeLabel: msg?.timestamp ? new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
        dayLabel: msg?.timestamp ? new Date(msg.timestamp).toLocaleDateString('pt-BR', { weekday: 'long' }) : '',
        timestamp: Number(msg?.timestamp || 0)
      })
    }

    if (msg?.linkPreview?.url) {
      pushLink(msg.linkPreview.url, msg.linkPreview)
      return
    }
    const text = String(msg?.text || '').trim()
    if (!text) return
    const hrefSet = new Set()
    for (const match of text.match(linkUrlPattern) || []) {
      const clean = cleanLinkHref(match)
      if (clean) hrefSet.add(clean)
    }
    hrefSet.forEach((href) => pushLink(href, null))
  })

  const uniqueByHref = new Map()
  links.forEach((item) => {
    const key = String(item.href || '').toLowerCase()
    if (!key) return
    const current = uniqueByHref.get(key)
    if (!current) { uniqueByHref.set(key, item); return }
    const score = (entry) => {
      if (!entry || typeof entry !== 'object') return 0
      let points = 0
      if (String(entry.previewImage || '').trim()) points += 100
      if (String(entry.title || '').trim() && String(entry.title || '').trim() !== String(entry.href || '').trim()) points += 20
      if (String(entry.description || '').trim()) points += 15
      if (String(entry.caption || '').trim()) points += 8
      if (String(entry.source || '').trim()) points += 5
      return points
    }
    const currentScore = score(current)
    const incomingScore = score(item)
    if (incomingScore > currentScore) { uniqueByHref.set(key, item); return }
    if (incomingScore === currentScore && Number(item.timestamp || 0) > Number(current?.timestamp || 0)) {
      uniqueByHref.set(key, item)
    }
  })
  return Array.from(uniqueByHref.values()).sort((a, b) => b.timestamp - a.timestamp)
})

export const groupInfoPreviewItems = computed(() =>
  groupInfoMediaItems.value
    .filter((item) => Boolean(item.previewUrl))
    .slice(0, 4)
)

export const groupInfoMediaDocsCount = computed(
  () => groupInfoMediaItems.value.length + groupInfoDocumentItems.value.length + groupInfoLinkItems.value.length
)

export const existingGroupMemberKeys = computed(() => {
  const participants = groupInfoParticipantsRaw.value
  const keys = new Set()
  participants.forEach((participant) => {
    const jid = String(participant?.JID || participant?.jid || participant?.PhoneNumber || '').trim()
    const lid = String(participant?.LID || participant?.lid || '').trim()
    const phoneFromJid = jid.includes('@') ? jid.split('@')[0].replace(/\D/g, '') : ''
    const phone = String(participant?.PhoneNumber || phoneFromJid || '').replace(/\D/g, '')
    if (phone.length >= 10) keys.add(phone)
    if (jid) keys.add(normalizeJid(jid))
    if (lid) keys.add(normalizeJid(lid))
  })
  return keys
})

export const filteredAddGroupMembersContacts = computed(() => {
  const query = String(addGroupMembersSearchQuery.value || '').trim().toLowerCase()
  return addGroupMembersContacts.value.filter((item) => {
    const memberKeys = existingGroupMemberKeys.value
    const number = String(item?.number || '').replace(/\D/g, '')
    if (number.length >= 10 && memberKeys.has(number)) return false
    const jid = normalizeJid(item?.jid || '')
    if (jid && memberKeys.has(jid)) return false
    if (!query) return true
    return String(item?.name || '').toLowerCase().includes(query) ||
      String(item?.number || '').includes(query) ||
      String(item?.displayNumber || '').toLowerCase().includes(query) ||
      String(item?.subtitle || '').toLowerCase().includes(query)
  })
})

// ─── Sincronização de acesso ao grupo ─────────────────────────────────────────

export const syncGroupAccessFromInfo = (groupjid, groupInfo) => {
  const key = normalizeJid(groupjid)
  if (!key || !groupInfo) return
  const participants = Array.isArray(groupInfo?.Participants)
    ? groupInfo.Participants
    : (Array.isArray(groupInfo?.participants) ? groupInfo.participants : [])
  const membership = resolveViewerGroupMembership(
    participants,
    sessionJid.value || getStoredSessionJid(),
    { lidMap: lidToJidMap.value, groupInfo }
  )
  groupAccessByJid.value = {
    ...groupAccessByJid.value,
    [key]: {
      isAnnounce: isGroupAnnounceRestricted(groupInfo),
      viewerIsAdmin: membership.isAdmin,
      loaded: true
    }
  }
}

export const refreshSelectedGroupAccess = async (groupjid, { force = false } = {}) => {
  const key = normalizeJid(groupjid)
  if (!key || !isGroupJid(key)) return
  if (!force && groupAccessByJid.value[key]?.loaded) return
  try {
    const data = await getGroupInfoApi({
      groupjid: key,
      getInviteLink: false,
      getRequestsParticipants: false,
      force
    })
    syncGroupAccessFromInfo(key, data)
  } catch {
    // mantém composer liberado até confirmar restrição
  }
}

// ─── Info do grupo ────────────────────────────────────────────────────────────

export const refreshOpenedGroupInfo = async () => {
  const groupjid = normalizeJid(requireGroupJid())
  const loadSeq = ++groupInfoLoadSeq.value
  const data = await getGroupInfoApi({
    groupjid,
    getInviteLink: true,
    getRequestsParticipants: false,
    force: true
  })
  if (loadSeq !== groupInfoLoadSeq.value) return
  if (normalizeJid(resolveSelectedChatJid()) !== groupjid) return
  groupInfoData.value = data
  groupInfoLoadedJid.value = groupjid
  syncGroupAccessFromInfo(groupjid, data)
}

export const runGroupInfoAction = async (action) => {
  if (groupInfoLoading.value) return
  groupInfoError.value = ''
  groupInfoLoading.value = true
  try {
    await action()
  } catch (error) {
    groupInfoError.value = String(error?.message || 'Falha ao executar acao do grupo')
  } finally {
    groupInfoLoading.value = false
  }
}

export const closeGroupInfoModal = () => {
  groupInfoLoadSeq.value += 1
  groupInfoModalOpen.value = false
  groupSidePanelView.value = 'info'
  groupInfoLoading.value = false
  groupInfoError.value = ''
  groupInfoData.value = null
  groupInfoLoadedJid.value = ''
  closeAddGroupMembersPanel()
}

export const handleGroupMediaPanelBack = () => {
  groupSidePanelView.value = 'info'
}

export const handleGroupPermissionsBack = () => {
  groupSidePanelView.value = 'info'
  groupInfoError.value = ''
}

const openGroupPermissionsPanel = () => {
  if (!selectedGroupViewerIsAdmin.value) return
  groupSidePanelView.value = 'permissions'
  groupInfoError.value = ''
}

// ─── Adicionar membros ────────────────────────────────────────────────────────

export const closeAddGroupMembersPanel = () => {
  addGroupMembersOpen.value = false
  addGroupMembersSending.value = false
  addGroupMembersLoading.value = false
  addGroupMembersFeedback.value = ''
  addGroupMembersSearchQuery.value = ''
  addGroupMembersSelectedIds.value = []
}

export const handleGroupAddMembersBack = () => {
  closeAddGroupMembersPanel()
}

export const toggleAddGroupMembersSelection = (id) => {
  const key = String(id || '').trim()
  if (!key || addGroupMembersSending.value) return
  if (addGroupMembersSelectedIds.value.includes(key)) {
    addGroupMembersSelectedIds.value = addGroupMembersSelectedIds.value.filter((item) => item !== key)
    return
  }
  addGroupMembersSelectedIds.value = [...addGroupMembersSelectedIds.value, key]
}

export const confirmAddGroupMembers = async () => {
  if (addGroupMembersSending.value || addGroupMembersSelectedIds.value.length === 0) return
  const groupjid = normalizeJid(requireGroupJid())
  const selectedContacts = addGroupMembersContacts.value.filter((item) =>
    addGroupMembersSelectedIds.value.includes(item.id)
  )
  const participants = selectedContacts
    .map((item) => String(item.number || '').replace(/\D/g, ''))
    .filter((value, index, list) => value.length >= 10 && list.indexOf(value) === index)
  if (!participants.length) {
    addGroupMembersFeedback.value = 'Selecione contatos com numero valido.'
    return
  }
  addGroupMembersSending.value = true
  addGroupMembersFeedback.value = ''
  try {
    await updateGroupParticipantsApi({ groupjid, action: 'add', participants })
    await refreshOpenedGroupInfo()
    void loadGroupParticipantsDirectory(groupjid, { force: true }).catch(() => {})
    closeAddGroupMembersPanel()
    chatActionFeedback.value = participants.length === 1
      ? '1 membro adicionado ao grupo.'
      : `${participants.length} membros adicionados ao grupo.`
  } catch (error) {
    addGroupMembersFeedback.value = String(error?.message || 'Falha ao adicionar membros ao grupo')
  } finally {
    addGroupMembersSending.value = false
  }
}

// ─── Permissões ───────────────────────────────────────────────────────────────

export const handleGroupInfoPermissions = () => {
  if (!selectedGroupViewerIsAdmin.value) {
    groupInfoError.value = 'Somente admins podem alterar permissoes do grupo.'
    return
  }
  openGroupPermissionsPanel()
}

export const handleGroupPermissionToggle = async (key, enabled) => {
  if (groupPermissionsSaving.value || !selectedGroupViewerIsAdmin.value) return
  const groupjid = normalizeJid(requireGroupJid())
  groupInfoError.value = ''
  groupPermissionsSaving.value = true
  try {
    if (key === 'membersCanEdit') {
      await updateGroupLockedApi({ groupjid, locked: !enabled })
    } else if (key === 'membersCanSend') {
      await updateGroupAnnounceApi({ groupjid, announce: !enabled })
    } else {
      groupInfoError.value = 'Esta permissao ainda nao pode ser alterada pela API.'
      return
    }
    await refreshOpenedGroupInfo()
    syncGroupAccessFromInfo(groupjid, groupInfoData.value)
  } catch (error) {
    groupInfoError.value = String(error?.message || 'Falha ao atualizar permissao do grupo')
  } finally {
    groupPermissionsSaving.value = false
  }
}

export const handleGroupInfoEditAdmins = () => {
  groupInfoError.value = 'Promover ou rebaixar admins sera integrado na proxima etapa.'
}

// ─── Ações da info do grupo ───────────────────────────────────────────────────

export const handleGroupInfoInviteLink = async () => runGroupInfoAction(async () => {
  const groupjid = requireGroupJid()
  let inviteLink = String(
    groupInfoData.value?.invite_link ||
    groupInfoData.value?.inviteLink ||
    ''
  ).trim()
  if (!inviteLink) {
    await refreshOpenedGroupInfo()
    inviteLink = String(groupInfoData.value?.invite_link || groupInfoData.value?.inviteLink || '').trim()
  }
  if (!inviteLink) {
    await resetGroupInviteCodeApi({ groupjid })
    await refreshOpenedGroupInfo()
    inviteLink = String(groupInfoData.value?.invite_link || groupInfoData.value?.inviteLink || '').trim()
  }
  if (!inviteLink) {
    groupInfoError.value = 'Nao foi possivel obter o link de convite.'
    return
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(inviteLink)
    groupInfoError.value = 'Link de convite copiado para a area de transferencia.'
    return
  }
  groupInfoError.value = `Link de convite: ${inviteLink}`
})

export const handleGroupInfoEditName = async () => runGroupInfoAction(async () => {
  if (!selectedGroupViewerIsAdmin.value) {
    groupInfoError.value = 'Somente admins podem editar o nome do grupo.'
    return
  }
  const groupjid = requireGroupJid()
  const current = String(
    groupInfoData.value?.Name ||
    groupInfoData.value?.name ||
    selectedChat.value?.pushName ||
    selectedChat.value?.name ||
    ''
  ).trim()
  const next = typeof window !== 'undefined'
    ? window.prompt('Novo nome do grupo:', current)
    : null
  if (next === null) return
  const name = String(next || '').trim()
  if (!name) {
    groupInfoError.value = 'Informe um nome valido para o grupo.'
    return
  }
  await updateGroupNameApi({ groupjid, name })
  await refreshOpenedGroupInfo()
  if (selectedChat.value) {
    selectedChat.value.name = name
    selectedChat.value.pushName = name
    chats.value = chats.value.map((chat) => (
      normalizeJid(chat.chatJid) === normalizeJid(groupjid)
        ? { ...chat, name, pushName: name }
        : chat
    ))
  }
})

export const handleGroupInfoDescription = async () => runGroupInfoAction(async () => {
  if (!selectedGroupViewerIsAdmin.value) {
    groupInfoError.value = 'Somente admins podem editar a descricao do grupo.'
    return
  }
  const groupjid = requireGroupJid()
  const current = String(groupInfoData.value?.Topic || '').trim()
  const next = typeof window !== 'undefined'
    ? window.prompt('Nova descricao do grupo:', current)
    : null
  if (next === null) return
  await updateGroupDescriptionApi({ groupjid, description: String(next || '').trim() })
  await refreshOpenedGroupInfo()
})

export const handleGroupInfoLeave = async () => runGroupInfoAction(async () => {
  const groupjid = requireGroupJid()
  const confirmed = typeof window !== 'undefined' ? window.confirm('Deseja realmente sair deste grupo?') : false
  if (!confirmed) return
  await leaveGroupApi({ groupjid })
  closeGroupInfoModal()
  await loadChats(true)
  selectedChat.value = null
})

export const handleGroupInfoToggleMute = () => {
  const groupjid = String(selectedChat.value?.chatJid || '').trim()
  if (!groupjid) return
  const current = Boolean(groupMutedChats.value[groupjid]) || Boolean(selectedChat.value?.isMuted)
  const next = !current
  groupMutedChats.value = { ...groupMutedChats.value, [groupjid]: next }
  refreshChatPreview(groupjid, { isMuted: next, muteEndTime: next ? -1 : 0 })
  groupInfoError.value = next ? 'Notificacoes silenciadas localmente.' : 'Notificacoes reativadas localmente.'
}

export const handleGroupInfoToggleFavorite = () => {
  const groupjid = String(selectedChat.value?.chatJid || '').trim()
  if (!groupjid) return
  const current = Boolean(groupFavoriteChats.value[groupjid])
  groupFavoriteChats.value = { ...groupFavoriteChats.value, [groupjid]: !current }
  groupInfoError.value = !current ? 'Grupo marcado como favorito.' : 'Grupo removido dos favoritos.'
}

export const handleGroupInfoMediaDocs = () => {
  groupMediaActiveTab.value = 'media'
  groupSidePanelView.value = 'media'
  void preloadMessageMediaIfNeeded(renderedMessages.value)
}

export const handleGroupInfoStarredMessages = () => {
  const starred = (Array.isArray(renderedMessages.value) ? renderedMessages.value : [])
    .filter((msg) => Boolean(msg?.isStarred || msg?.starred || msg?.favorite))
  groupInfoError.value = starred.length
    ? `Foram encontradas ${starred.length} mensagens favoritas.`
    : 'Nenhuma mensagem favorita encontrada.'
}

export const handleGroupInfoAddMembers = () => {
  // delegado para openAddGroupMembersPanel que precisa do endereçário — chamado pelo composable
  // emitido como evento do composable para o chat.vue orquestrar
}

// ─── Composable ───────────────────────────────────────────────────────────────

/**
 * @param {{ ensureAddressBookContactsNormalized: Function, startBackgroundContactAvatarHydration: Function, addressBookNormalizedCache: import('vue').Ref }} opts
 */
export function useWhatsappGroupPanel({ ensureAddressBookContactsNormalized, startBackgroundContactAvatarHydration, addressBookNormalizedCache } = {}) {
  const openAddGroupMembersPanel = () => {
    if (!selectedGroupViewerIsAdmin.value) {
      groupInfoError.value = 'Somente admins podem adicionar membros.'
      return
    }
    addGroupMembersOpen.value = true
    addGroupMembersFeedback.value = ''
    addGroupMembersSearchQuery.value = ''
    addGroupMembersSelectedIds.value = []

    if (addressBookNormalizedCache?.value?.length) {
      addGroupMembersContacts.value = addressBookNormalizedCache.value
      addGroupMembersLoading.value = false
      startBackgroundContactAvatarHydration(
        () => addGroupMembersContacts.value,
        (nextRows) => { addGroupMembersContacts.value = nextRows }
      )
      return
    }

    addGroupMembersLoading.value = true
    Promise.resolve()
      .then(() => ensureAddressBookContactsNormalized?.())
      .then((normalized) => {
        if (Array.isArray(normalized)) addGroupMembersContacts.value = normalized
        startBackgroundContactAvatarHydration?.(
          () => addGroupMembersContacts.value,
          (nextRows) => { addGroupMembersContacts.value = nextRows }
        )
      })
      .catch((error) => {
        addGroupMembersFeedback.value = String(error?.message || 'Falha ao carregar contatos')
      })
      .finally(() => {
        addGroupMembersLoading.value = false
      })
  }

  const prefetchAddressBookForGroupPanel = () => {
    if (addressBookNormalizedCache?.value?.length) {
      startBackgroundContactAvatarHydration?.(
        () => addressBookNormalizedCache.value,
        (nextRows) => { addressBookNormalizedCache.value = nextRows }
      )
      return
    }
    Promise.resolve()
      .then(() => ensureAddressBookContactsNormalized?.())
      .then((normalized) => {
        if (Array.isArray(normalized) && addressBookNormalizedCache) {
          addressBookNormalizedCache.value = normalized
        }
        startBackgroundContactAvatarHydration?.(
          () => addressBookNormalizedCache?.value || [],
          (nextRows) => { if (addressBookNormalizedCache) addressBookNormalizedCache.value = nextRows }
        )
      })
      .catch(() => {})
  }

  const openGroupInfoModal = async () => {
    const groupjid = normalizeJid(resolveSelectedChatJid())
    if (!groupjid || !isGroupJid(groupjid)) return
    const loadSeq = ++groupInfoLoadSeq.value
    groupInfoData.value = null
    groupInfoLoadedJid.value = ''
    groupInfoModalOpen.value = true
    groupSidePanelView.value = 'info'
    groupInfoLoading.value = true
    groupInfoError.value = ''
    try {
      const data = await getGroupInfoApi({
        groupjid,
        getInviteLink: true,
        getRequestsParticipants: false,
        force: true
      })
      if (loadSeq !== groupInfoLoadSeq.value) return
      if (normalizeJid(resolveSelectedChatJid()) !== groupjid) return
      groupInfoData.value = data
      groupInfoLoadedJid.value = groupjid
      syncGroupAccessFromInfo(groupjid, data)
    } catch (error) {
      if (loadSeq !== groupInfoLoadSeq.value) return
      groupInfoError.value = String(error?.message || 'Falha ao carregar dados do grupo')
    } finally {
      if (loadSeq === groupInfoLoadSeq.value) groupInfoLoading.value = false
    }
    void loadGroupParticipantsDirectory(groupjid, { force: true }).catch(() => {})
    prefetchAddressBookForGroupPanel()
  }

  // watch: ao trocar para um grupo, carrega acesso do grupo
  watch(
    () => (selectedChatIsGroup.value ? normalizeJid(resolveSelectedChatJid()) : ''),
    (groupjid) => {
      if (!groupjid) return
      void refreshSelectedGroupAccess(groupjid, { force: false })
    },
    { immediate: true }
  )

  return {
    // estado
    groupInfoModalOpen,
    groupSidePanelView,
    groupInfoLoading,
    groupInfoError,
    groupInfoData,
    groupInfoLoadedJid,
    groupInfoLoadSeq,
    groupPermissionsSaving,
    groupMediaModalOpen,
    groupMediaActiveTab,
    groupMutedChats,
    groupFavoriteChats,
    groupAccessByJid,
    sessionJid,
    addGroupMembersOpen,
    addGroupMembersContacts,
    addGroupMembersSelectedIds,
    addGroupMembersSearchQuery,
    addGroupMembersSending,
    addGroupMembersLoading,
    addGroupMembersFeedback,
    // computeds
    selectedChatIsGroup,
    activeGroupInfoForPanel,
    selectedGroupAccess,
    selectedGroupViewerIsAdmin,
    selectedGroupComposeLocked,
    groupInfoParticipantsRaw,
    groupMemberLookupContext,
    groupInfoMediaItems,
    groupInfoDocumentItems,
    groupInfoLinkItems,
    groupInfoPreviewItems,
    groupInfoMediaDocsCount,
    existingGroupMemberKeys,
    filteredAddGroupMembersContacts,
    // funções
    openGroupInfoModal,
    closeGroupInfoModal,
    handleGroupMediaPanelBack,
    handleGroupPermissionsBack,
    closeAddGroupMembersPanel,
    handleGroupAddMembersBack,
    toggleAddGroupMembersSelection,
    confirmAddGroupMembers,
    handleGroupInfoAddMembers: openAddGroupMembersPanel,
    handleGroupInfoPermissions,
    handleGroupPermissionToggle,
    handleGroupInfoEditAdmins,
    handleGroupInfoInviteLink,
    handleGroupInfoEditName,
    handleGroupInfoDescription,
    handleGroupInfoLeave,
    handleGroupInfoToggleMute,
    handleGroupInfoToggleFavorite,
    handleGroupInfoMediaDocs,
    handleGroupInfoStarredMessages,
    syncGroupAccessFromInfo,
    refreshSelectedGroupAccess,
    refreshOpenedGroupInfo,
  }
}
