import { apiFetch } from '@/lib/api'

export type CommunityAuthor = {
  id?: string
  name?: string
  role?: string
}

export type CommunityComment = {
  id: string
  content: string
  author?: CommunityAuthor
}

export type CommunityPost = {
  id: string
  content?: string
  imageUrl?: string | null
  createdAt: string
  authorId?: string
  author?: CommunityAuthor
  likes: number
  likedByMe: boolean
  comments?: CommunityComment[]
  newComment?: string
}

type PostApi = Omit<CommunityPost, 'likes' | 'likedByMe' | 'newComment'> & {
  likes?: number
  likesCount?: number
  likedByMe?: boolean
}

export function normalizePost(p: PostApi): CommunityPost {
  return {
    ...p,
    likes: p.likes ?? p.likesCount ?? 0,
    likedByMe: Boolean(p.likedByMe),
    newComment: '',
  }
}

export async function fetchCommunityPosts() {
  const data = await apiFetch<PostApi[]>('/posts')
  return (Array.isArray(data) ? data : []).map(normalizePost)
}

export async function createCommunityPost(content: string, image?: File | null) {
  const form = new FormData()
  form.append('content', content)
  if (image) form.append('image', image)
  return apiFetch('/posts', { method: 'POST', body: form })
}

export async function togglePostLike(postId: string) {
  return apiFetch<{ likes: number; likedByMe: boolean }>(`/posts/${postId}/toggle-like`, {
    method: 'POST',
  })
}

export async function addPostComment(postId: string, content: string) {
  return apiFetch(`/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

export async function deleteCommunityPost(postId: string) {
  return apiFetch(`/posts/${postId}`, { method: 'DELETE' })
}

export function formatCommunityDistance(date: string) {
  const diffMs = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
