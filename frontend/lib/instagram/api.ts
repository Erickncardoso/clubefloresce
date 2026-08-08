/**
 * Cliente Instagram — mesmos endpoints do Nuxt (`/api/instagram/*`).
 */
import { apiFetch, ApiError } from '@/lib/api'

export { ApiError }

export type InstagramStatus = {
  appConfigured: boolean
  connected: boolean
  username: string | null
  profilePictureUrl: string | null
  tokenExpiresAt: string | null
}

export type InstagramMatchType = 'CONTAINS' | 'EXACT'

export type InstagramAutomation = {
  id: string
  name: string
  active: boolean
  triggerComment: boolean
  triggerStory: boolean
  triggerDm: boolean
  matchType: InstagramMatchType
  keywords: string[]
  targetMediaId: string | null
  publicReplyVariations: string[]
  welcomeMessage: string
  quickReplyLabel: string
  linkText: string | null
  linkButtonLabel: string | null
  linkUrl: string | null
  reminderText: string | null
  reminderDelayMinutes: number | null
}

export type InstagramAutomationPayload = {
  name: string
  active: boolean
  triggerComment: boolean
  triggerStory: boolean
  triggerDm: boolean
  matchType: InstagramMatchType
  keywords: string[]
  targetMediaId: string | null
  publicReplyVariations: string[]
  welcomeMessage: string
  quickReplyLabel: string
  linkText: string
  linkButtonLabel: string
  linkUrl: string
  reminderText: string
  reminderDelayMinutes: number
}

export type InstagramMediaItem = {
  id: string
  media_type?: string
  caption?: string | null
  permalink?: string
  thumbnail_url?: string
  media_url?: string
}

export async function fetchInstagramStatus(): Promise<InstagramStatus> {
  return apiFetch<InstagramStatus>('/instagram/status')
}

export async function fetchInstagramOauthUrl(): Promise<string> {
  const data = await apiFetch<{ url: string }>('/instagram/oauth/url')
  return String(data.url || '')
}

export async function disconnectInstagram(): Promise<void> {
  await apiFetch('/instagram/disconnect', { method: 'POST' })
}

export async function fetchInstagramAutomations(): Promise<InstagramAutomation[]> {
  const data = await apiFetch<{ automations?: InstagramAutomation[] }>('/instagram/automations')
  return Array.isArray(data.automations) ? data.automations : []
}

export async function fetchInstagramMedia(): Promise<InstagramMediaItem[]> {
  try {
    const data = await apiFetch<{ media?: InstagramMediaItem[] }>('/instagram/media')
    return Array.isArray(data.media) ? data.media : []
  } catch {
    return []
  }
}

export async function createInstagramAutomation(
  payload: InstagramAutomationPayload,
): Promise<InstagramAutomation> {
  const data = await apiFetch<{ automation: InstagramAutomation }>('/instagram/automations', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.automation
}

export async function updateInstagramAutomation(
  id: string,
  payload: InstagramAutomationPayload,
): Promise<InstagramAutomation> {
  const data = await apiFetch<{ automation: InstagramAutomation }>(`/instagram/automations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return data.automation
}

export async function toggleInstagramAutomation(
  id: string,
  active: boolean,
): Promise<void> {
  await apiFetch(`/instagram/automations/${id}/toggle`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  })
}

export async function deleteInstagramAutomation(id: string): Promise<void> {
  await apiFetch(`/instagram/automations/${id}`, { method: 'DELETE' })
}
