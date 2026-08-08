'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { CommunityFeed, type CommunityTab, type PostTypeChip } from '@/components/community/CommunityFeed'
import { ApiError } from '@/lib/api'
import { getCachedUser } from '@/lib/auth'
import {
  addPostComment,
  createCommunityPost,
  deleteCommunityPost,
  fetchCommunityPosts,
  formatCommunityDistance,
  togglePostLike,
  type CommunityPost,
} from '@/lib/community'
import styles from './comunidade.module.scss'

export default function ComunidadePage() {
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [newPostContent, setNewPostContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [expandedComments, setExpandedComments] = useState<string[]>([])
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null)
  const [likingPostId, setLikingPostId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<CommunityTab>('feed')
  const [activePostType, setActivePostType] = useState<PostTypeChip>('achievement')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState('')
  const [userId, setUserId] = useState('')
  const [userInitial, setUserInitial] = useState('N')
  const [error, setError] = useState('')

  const loadPosts = useCallback(async () => {
    try {
      const data = await fetchCommunityPosts()
      setPosts(data)
      setError('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar posts.')
    }
  }, [])

  useEffect(() => {
    const user = getCachedUser()
    if (user) {
      setUserId(user.id)
      setUserInitial((user.name?.trim().charAt(0) || 'N').toUpperCase())
    } else {
      try {
        setUserId(localStorage.getItem('user_id') || '')
        const name = localStorage.getItem('user_name') || ''
        setUserInitial((name.trim().charAt(0) || 'N').toUpperCase())
      } catch {
        /* ignore */
      }
    }
    void loadPosts()
  }, [loadPosts])

  useEffect(() => {
    function closeMenu() {
      setOpenMenuPostId(null)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setLightboxUrl('')
        document.body.style.overflow = ''
        setOpenMenuPostId(null)
      }
    }
    document.addEventListener('click', closeMenu)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', closeMenu)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function clearPostImage() {
    setSelectedImage(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl('')
  }

  function onPostImageSelect(file: File | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Selecione uma imagem (JPG, PNG, WEBP ou GIF).')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 8MB.')
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedImage(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  async function handleCreatePost() {
    if (!newPostContent.trim() && !selectedImage) return
    setLoading(true)
    try {
      await createCommunityPost(newPostContent.trim(), selectedImage)
      setNewPostContent('')
      clearPostImage()
      await loadPosts()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao publicar post.')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleLike(post: CommunityPost) {
    if (likingPostId === post.id) return
    setLikingPostId(post.id)
    try {
      const result = await togglePostLike(post.id)
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, likes: result.likes, likedByMe: result.likedByMe } : p,
        ),
      )
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao curtir publicação.')
    } finally {
      setLikingPostId(null)
    }
  }

  async function handleAddComment(post: CommunityPost) {
    const content = post.newComment?.trim()
    if (!content) return
    try {
      await addPostComment(post.id, content)
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, newComment: '' } : p)),
      )
      setExpandedComments((prev) => (prev.includes(post.id) ? prev : [...prev, post.id]))
      await loadPosts()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao adicionar comentário.')
    }
  }

  async function handleDeletePost(id: string) {
    setOpenMenuPostId(null)
    if (!window.confirm('Deseja excluir esta publicação? Esta ação não pode ser desfeita.')) return
    try {
      await deleteCommunityPost(id)
      setExpandedComments((prev) => prev.filter((postId) => postId !== id))
      await loadPosts()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao excluir publicação.')
    }
  }

  function toggleComments(id: string) {
    setExpandedComments((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      queueMicrotask(() => document.getElementById(`comment-input-${id}`)?.focus())
      return [...prev, id]
    })
  }

  async function copyPost(post: CommunityPost) {
    setOpenMenuPostId(null)
    if (!post.content) return
    try {
      await navigator.clipboard.writeText(post.content)
    } catch {
      /* ignore */
    }
  }

  function openLightbox(url: string) {
    setLightboxUrl(url)
    document.body.style.overflow = 'hidden'
  }

  function closeLightbox() {
    setLightboxUrl('')
    document.body.style.overflow = ''
  }

  return (
    <div className={styles.page}>
      <header className="admin-shell-header">
        <div>
          <h1>Comunidade</h1>
          <p>Compartilhe novidades, conquistas e interaja com os pacientes.</p>
        </div>
      </header>

      {error ? <p className={styles.error}>{error}</p> : null}

      <CommunityFeed
        isNutri
        posts={posts}
        activeTab={activeTab}
        activePostType={activePostType}
        newPostContent={newPostContent}
        loading={loading}
        postImagePreviewUrl={previewUrl}
        expandedComments={expandedComments}
        openMenuPostId={openMenuPostId}
        likingPostId={likingPostId}
        userInitial={userInitial}
        userId={userId}
        formatDistance={formatCommunityDistance}
        onActiveTabChange={setActiveTab}
        onActivePostTypeChange={setActivePostType}
        onNewPostContentChange={setNewPostContent}
        onCreatePost={() => void handleCreatePost()}
        onPostImageSelect={onPostImageSelect}
        onClearPostImage={clearPostImage}
        onToggleLike={(post) => void handleToggleLike(post)}
        onToggleComments={toggleComments}
        onAddComment={(post) => void handleAddComment(post)}
        onCommentChange={(postId, value) =>
          setPosts((prev) =>
            prev.map((p) => (p.id === postId ? { ...p, newComment: value } : p)),
          )
        }
        onDeletePost={(id) => void handleDeletePost(id)}
        onTogglePostMenu={(id) => setOpenMenuPostId((cur) => (cur === id ? null : id))}
        onCopyPost={(post) => void copyPost(post)}
        onOpenLightbox={openLightbox}
      />

      {lightboxUrl && typeof document !== 'undefined'
        ? createPortal(
            <div
              className={styles.lightbox}
              role="dialog"
              aria-modal="true"
              aria-label="Visualização da imagem"
              onClick={closeLightbox}
            >
              <button
                type="button"
                className={styles.lightboxClose}
                aria-label="Fechar"
                onClick={closeLightbox}
              >
                <X size={20} aria-hidden />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxUrl}
                alt="Imagem ampliada"
                className={styles.lightboxImg}
                onClick={(e) => e.stopPropagation()}
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
