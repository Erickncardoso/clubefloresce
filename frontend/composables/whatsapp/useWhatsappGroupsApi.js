import { getAuthToken, getWhatsappApiBase } from './useWhatsappApi.js'
import { parseJsonBodySafe } from './useWhatsappUtils.js'

const buildHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getAuthToken()}`
})

const createGroupApiError = (fallbackMessage, payload = {}) => {
  const message = String(payload?.message || payload?.error || fallbackMessage || 'Falha na operação de grupo').trim()
  const error = new Error(message)
  error.code = String(payload?.error || 'GROUP_API_ERROR')
  error.statusCode = Number(payload?.statusCode || 500)
  return error
}

const requestGroupApi = async (path, { method = 'POST', body, fallbackMessage = 'Falha na operação de grupo' } = {}) => {
  const base = getWhatsappApiBase()
  const res = await fetch(`${base}${path}`, {
    method,
    headers: buildHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined
  })
  const data = await parseJsonBodySafe(res)
  if (!res.ok) throw createGroupApiError(fallbackMessage, data)
  return data
}

export const createGroup = (payload) =>
  requestGroupApi('/group/create', { body: payload, fallbackMessage: 'Falha ao criar grupo' })

export const getGroupInfo = (payload) =>
  requestGroupApi('/group/info', { body: payload, fallbackMessage: 'Falha ao carregar informações do grupo' })

export const getGroupInviteInfo = (payload) =>
  requestGroupApi('/group/inviteInfo', { body: payload, fallbackMessage: 'Falha ao carregar convite do grupo' })

export const joinGroup = (payload) =>
  requestGroupApi('/group/join', { body: payload, fallbackMessage: 'Falha ao entrar no grupo' })

export const leaveGroup = (payload) =>
  requestGroupApi('/group/leave', { body: payload, fallbackMessage: 'Falha ao sair do grupo' })

export const listGroups = (query = {}) => {
  const params = new URLSearchParams()
  if (query.force !== undefined) params.set('force', String(Boolean(query.force)))
  if (query.noparticipants !== undefined) params.set('noparticipants', String(Boolean(query.noparticipants)))
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return requestGroupApi(`/group/list${suffix}`, { method: 'GET', fallbackMessage: 'Falha ao listar grupos' })
}

export const listGroupsPaginated = (payload) =>
  requestGroupApi('/group/list', { body: payload, fallbackMessage: 'Falha ao listar grupos com filtros' })

export const resetGroupInviteCode = (payload) =>
  requestGroupApi('/group/resetInviteCode', { body: payload, fallbackMessage: 'Falha ao resetar convite do grupo' })

export const updateGroupAnnounce = (payload) =>
  requestGroupApi('/group/updateAnnounce', { body: payload, fallbackMessage: 'Falha ao atualizar permissões de envio no grupo' })

export const updateGroupDescription = (payload) =>
  requestGroupApi('/group/updateDescription', { body: payload, fallbackMessage: 'Falha ao atualizar descrição do grupo' })

export const updateGroupImage = (payload) =>
  requestGroupApi('/group/updateImage', { body: payload, fallbackMessage: 'Falha ao atualizar imagem do grupo' })

export const updateGroupLocked = (payload) =>
  requestGroupApi('/group/updateLocked', { body: payload, fallbackMessage: 'Falha ao atualizar bloqueio do grupo' })

export const updateGroupName = (payload) =>
  requestGroupApi('/group/updateName', { body: payload, fallbackMessage: 'Falha ao atualizar nome do grupo' })

export const updateGroupParticipants = (payload) =>
  requestGroupApi('/group/updateParticipants', { body: payload, fallbackMessage: 'Falha ao atualizar participantes do grupo' })

export function useWhatsappGroupsApi() {
  return {
    createGroup,
    getGroupInfo,
    getGroupInviteInfo,
    joinGroup,
    leaveGroup,
    listGroups,
    listGroupsPaginated,
    resetGroupInviteCode,
    updateGroupAnnounce,
    updateGroupDescription,
    updateGroupImage,
    updateGroupLocked,
    updateGroupName,
    updateGroupParticipants
  }
}
