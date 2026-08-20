'use client'

import { useRef, type ChangeEvent, type KeyboardEvent } from 'react'
import {
  Heart,
  HelpCircle,
  MessageCircle,
  MoreHorizontal,
  Send,
  Sparkles,
  Star,
  UtensilsCrossed,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import Camera from '@/components/icons/CameraIcon'
import type { CommunityPost } from '@/lib/community'
import { AnimatedPopover } from '@/components/overlays'
import styles from './CommunityFeed.module.scss'

export type CommunityTab = 'feed' | 'groups' | 'friends'
export type PostTypeChip = 'achievement' | 'question' | 'recipe' | 'inspiration'

type Props = {
  isNutri?: boolean
  posts: CommunityPost[]
  activeTab: CommunityTab
  activePostType: PostTypeChip
  newPostContent: string
  loading?: boolean
  postImagePreviewUrl?: string
  expandedComments: string[]
  openMenuPostId: string | null
  likingPostId: string | null
  userInitial: string
  userId: string
  formatDistance: (date: string) => string
  onActiveTabChange: (tab: CommunityTab) => void
  onActivePostTypeChange: (type: PostTypeChip) => void
  onNewPostContentChange: (value: string) => void
  onCreatePost: () => void
  onPostImageSelect: (file: File | null) => void
  onClearPostImage: () => void
  onToggleLike: (post: CommunityPost) => void
  onToggleComments: (postId: string) => void
  onAddComment: (post: CommunityPost) => void
  onCommentChange: (postId: string, value: string) => void
  onDeletePost: (postId: string) => void
  onTogglePostMenu: (postId: string) => void
  onCopyPost: (post: CommunityPost) => void
  onOpenLightbox: (url: string) => void
}

const TABS: { id: CommunityTab; label: string }[] = [
  { id: 'feed', label: 'Feed' },
  { id: 'groups', label: 'Grupos' },
  { id: 'friends', label: 'Amigas' },
]

const CHIPS: { id: PostTypeChip; label: string; icon: LucideIcon }[] = [
  { id: 'achievement', label: 'Conquista', icon: Star },
  { id: 'question', label: 'Dúvida', icon: HelpCircle },
  { id: 'recipe', label: 'Receita', icon: UtensilsCrossed },
  { id: 'inspiration', label: 'Inspiração', icon: Sparkles },
]

function isNutritionist(author?: { role?: string }) {
  return author?.role === 'NUTRICIONISTA'
}

export function CommunityFeed({
  isNutri = false,
  posts,
  activeTab,
  activePostType,
  newPostContent,
  loading = false,
  postImagePreviewUrl = '',
  expandedComments,
  openMenuPostId,
  likingPostId,
  userInitial,
  userId,
  formatDistance,
  onActiveTabChange,
  onActivePostTypeChange,
  onNewPostContentChange,
  onCreatePost,
  onPostImageSelect,
  onClearPostImage,
  onToggleLike,
  onToggleComments,
  onAddComment,
  onCommentChange,
  onDeletePost,
  onTogglePostMenu,
  onCopyPost,
  onOpenLightbox,
}: Props) {
  const imageInputRef = useRef<HTMLInputElement>(null)

  function triggerImageUpload() {
    if (!imageInputRef.current) return
    imageInputRef.current.value = ''
    imageInputRef.current.click()
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null
    onPostImageSelect(file)
  }

  function isMyPost(post: CommunityPost) {
    return post.authorId === userId || post.author?.id === userId
  }

  function onComposeKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') onCreatePost()
  }

  return (
    <div className={styles.root}>
      <nav className={styles.tabs} aria-label="Seções da comunidade">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => onActiveTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'feed' ? (
        <>
          <section className={styles.compose}>
            <div className={styles.composeInput}>
              <div className={styles.avatar}>{userInitial}</div>
              <input
                type="text"
                value={newPostContent}
                placeholder="No que você está pensando?"
                onChange={(e) => onNewPostContentChange(e.target.value)}
                onKeyUp={onComposeKey}
              />
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className={styles.fileInput}
                onChange={onFileChange}
              />
              <button
                type="button"
                className={`${styles.cameraBtn} ${postImagePreviewUrl ? styles.cameraBtnActive : ''}`}
                aria-label="Adicionar foto"
                disabled={loading}
                onClick={triggerImageUpload}
              >
                <Camera size={17} aria-hidden />
              </button>
            </div>

            {postImagePreviewUrl ? (
              <div className={styles.preview}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={postImagePreviewUrl} alt="Pré-visualização da foto" />
                <button
                  type="button"
                  className={styles.previewRemove}
                  aria-label="Remover foto"
                  onClick={onClearPostImage}
                >
                  <X size={15} aria-hidden />
                </button>
              </div>
            ) : null}

            <div className={styles.chips}>
              {CHIPS.map((chip) => {
                const Icon = chip.icon
                return (
                  <button
                    key={chip.id}
                    type="button"
                    className={`${styles.chip} ${activePostType === chip.id ? styles.chipActive : ''}`}
                    onClick={() => onActivePostTypeChange(chip.id)}
                  >
                    <Icon size={14} aria-hidden />
                    {chip.label}
                  </button>
                )
              })}
            </div>
          </section>

          <h2 className={styles.sectionTitle}>Publicações</h2>

          {posts.length ? (
            <div className={styles.feed}>
              {posts.map((post) => (
                <article key={post.id} className={styles.post}>
                  <div className={styles.postHead}>
                    <div className={styles.avatar}>
                      {(post.author?.name?.charAt(0) || 'U').toUpperCase()}
                    </div>
                    <div className={styles.meta}>
                      <strong>
                        {post.author?.name}
                        {isNutritionist(post.author) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src="/icons/verificado.svg"
                            alt=""
                            className={styles.verified}
                            aria-label="Nutricionista verificada"
                          />
                        ) : null}
                      </strong>
                      <span>{formatDistance(post.createdAt)}</span>
                    </div>
                    <div className={styles.menuWrap}>
                      <AnimatedPopover
                        open={openMenuPostId === post.id}
                        onOpenChange={() => onTogglePostMenu(post.id)}
                        align="end"
                        contentClassName={styles.menuPopover}
                        trigger={
                          <button
                            type="button"
                            className={styles.menuBtn}
                            aria-label="Opções da publicação"
                          >
                            <MoreHorizontal size={18} aria-hidden />
                          </button>
                        }
                      >
                        {isMyPost(post) || isNutri ? (
                          <button
                            type="button"
                            className={`${styles.menuItem} ${styles.menuDanger}`}
                            onClick={() => {
                              onDeletePost(post.id)
                              onTogglePostMenu(post.id)
                            }}
                          >
                            Excluir publicação
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={styles.menuItem}
                          onClick={() => {
                            onCopyPost(post)
                            onTogglePostMenu(post.id)
                          }}
                        >
                          Copiar texto
                        </button>
                      </AnimatedPopover>
                    </div>
                  </div>

                  {post.content ? <p className={styles.postText}>{post.content}</p> : null}

                  {post.imageUrl ? (
                    <button
                      type="button"
                      className={styles.imageBtn}
                      aria-label="Abrir imagem em tela cheia"
                      onClick={() => onOpenLightbox(post.imageUrl!)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={post.imageUrl} alt="Imagem da publicação" loading="lazy" />
                    </button>
                  ) : null}

                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={`${styles.action} ${post.likedByMe ? styles.actionLiked : ''}`}
                      disabled={likingPostId === post.id}
                      onClick={() => onToggleLike(post)}
                    >
                      <Heart size={16} fill={post.likedByMe ? 'currentColor' : 'none'} aria-hidden />
                      <span>{post.likes ?? 0}</span>
                    </button>
                    <button
                      type="button"
                      className={styles.action}
                      onClick={() => onToggleComments(post.id)}
                    >
                      <MessageCircle size={16} aria-hidden />
                      <span>{post.comments?.length || 0}</span>
                    </button>
                  </div>

                  {expandedComments.includes(post.id) ? (
                    <div className={styles.comments}>
                      {post.comments?.length ? (
                        <div className={styles.commentsList}>
                          {post.comments.map((comment) => (
                            <div key={comment.id} className={styles.comment}>
                              <strong>
                                {comment.author?.name}
                                {isNutritionist(comment.author) ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src="/icons/verificado.svg"
                                    alt=""
                                    className={styles.verified}
                                    aria-hidden
                                  />
                                ) : null}
                              </strong>
                              <p>{comment.content}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={styles.commentsEmpty}>Nenhum comentário ainda. Seja o primeiro!</p>
                      )}
                      <div className={styles.commentInput}>
                        <input
                          id={`comment-input-${post.id}`}
                          value={post.newComment || ''}
                          placeholder="Comentar..."
                          onChange={(e) => onCommentChange(post.id, e.target.value)}
                          onKeyUp={(e) => {
                            if (e.key === 'Enter') onAddComment(post)
                          }}
                        />
                        <button
                          type="button"
                          aria-label="Enviar comentário"
                          onClick={() => onAddComment(post)}
                        >
                          <Send size={16} aria-hidden />
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <MessageCircle size={32} aria-hidden />
              <p>Seja a primeira a compartilhar algo na comunidade.</p>
            </div>
          )}
        </>
      ) : (
        <div className={styles.empty}>
          <Users size={32} aria-hidden />
          <p>{activeTab === 'groups' ? 'Grupos em breve.' : 'Amigas em breve.'}</p>
        </div>
      )}
    </div>
  )
}
