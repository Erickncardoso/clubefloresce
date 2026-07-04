import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  Heart,
  HelpCircle,
  MessageCircle,
  MoreHorizontal,
  Send,
  Sparkles,
  Star,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react-native';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { getApiBase, NATIVE_CLIENT_HEADER } from '@/config/env';
import { resolveMediaUrl } from '@/lib/media-url';
import { usePatientApi } from '@/hooks/usePatientApi';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Post = {
  id: string;
  content: string;
  type?: string;
  authorName?: string;
  author?: { name?: string; role?: string; id?: string };
  authorId?: string;
  createdAt: string;
  likes?: number;
  likesCount?: number;
  likedByMe?: boolean;
  imageUrl?: string;
  comments?: Array<{ id: string; content: string; author?: { name?: string; role?: string } }>;
  newComment?: string;
};

const TABS = [
  { id: 'feed', label: 'Feed' },
  { id: 'groups', label: 'Grupos' },
  { id: 'friends', label: 'Amigas' },
];

const COMPOSE_CHIPS = [
  { id: 'achievement', label: 'Conquista', Icon: Star },
  { id: 'question', label: 'Dúvida', Icon: HelpCircle },
  { id: 'recipe', label: 'Receita', Icon: UtensilsCrossed },
  { id: 'inspiration', label: 'Inspiração', Icon: Sparkles },
];

function formatDistance(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function ComunidadeScreen() {
  const { user, token } = useAuth();
  const { request } = usePatientApi();
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState('feed');
  const [activePostType, setActivePostType] = useState('achievement');
  const [newPost, setNewPost] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  async function loadPosts() {
    try {
      const data = await request<Post[]>('/posts');
      setPosts((data || []).map((p) => ({
        ...p,
        likes: p.likes ?? p.likesCount ?? 0,
        likedByMe: Boolean(p.likedByMe),
      })));
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function createPost() {
    if (!newPost.trim() && !imageUri) return;
    setPosting(true);
    try {
      const form = new FormData();
      form.append('content', newPost.trim());
      form.append('type', activePostType);
      if (imageUri) {
        form.append('image', {
          uri: imageUri,
          name: 'post.jpg',
          type: 'image/jpeg',
        } as unknown as Blob);
      }
      const url = `${getApiBase()}/posts`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'X-CF-Client': NATIVE_CLIENT_HEADER,
        },
        body: form,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.message || 'Erro ao publicar.');
      setNewPost('');
      setImageUri(null);
      await loadPosts();
    } catch (err) {
      Alert.alert('Erro', (err as Error).message);
    } finally {
      setPosting(false);
    }
  }

  async function toggleLike(post: Post) {
    if (likingId === post.id) return;
    setLikingId(post.id);
    try {
      const result = await request<{ likes: number; likedByMe: boolean }>(
        `/posts/${post.id}/toggle-like`,
        { method: 'POST' },
      );
      setPosts((prev) => prev.map((p) => (
        p.id === post.id ? { ...p, likes: result.likes, likedByMe: result.likedByMe } : p
      )));
    } finally {
      setLikingId(null);
    }
  }

  async function addComment(postId: string) {
    const content = (commentDrafts[postId] || '').trim();
    if (!content) return;
    await request(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    setCommentDrafts((d) => ({ ...d, [postId]: '' }));
    setExpanded((e) => ({ ...e, [postId]: true }));
    await loadPosts();
  }

  async function deletePost(id: string) {
    setOpenMenuId(null);
    Alert.alert('Excluir publicação', 'Deseja excluir esta publicação?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await request(`/posts/${id}`, { method: 'DELETE' });
          await loadPosts();
        },
      },
    ]);
  }

  async function copyPost(post: Post) {
    setOpenMenuId(null);
    await Clipboard.setStringAsync(post.content || '');
    Alert.alert('Copiado', 'Texto copiado para a área de transferência.');
  }

  function isNutritionist(author?: { role?: string }) {
    return author?.role === 'NUTRITIONIST' || author?.role === 'nutritionist';
  }

  const userInitial = (user?.name || '?').charAt(0).toUpperCase();

  return (
    <PatientShell>
      <PatientHeader title="Comunidade" showBack={false} showBell={false} showMenu={false} />
      {loading ? (
        <LoadingScreen />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.tabs}>
            {TABS.map((tab) => (
              <Pressable
                key={tab.id}
                style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {activeTab === 'feed' ? (
            <>
              <View style={styles.composeCard}>
                <View style={styles.composeRow}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{userInitial}</Text></View>
                  <TextInput
                    style={styles.composeInput}
                    value={newPost}
                    onChangeText={setNewPost}
                    placeholder="No que você está pensando?"
                    placeholderTextColor={colors.placeholder}
                    onSubmitEditing={createPost}
                  />
                  <Pressable
                    style={[styles.cameraBtn, imageUri && styles.cameraBtnActive]}
                    onPress={pickImage}
                    disabled={posting}
                  >
                    <Camera color={imageUri ? colors.primaryDark : colors.textMuted} size={20} />
                  </Pressable>
                </View>
                {imageUri ? (
                  <View style={styles.previewWrap}>
                    <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
                    <Pressable style={styles.previewRemove} onPress={() => setImageUri(null)}>
                      <X color="#fff" size={16} />
                    </Pressable>
                  </View>
                ) : null}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeChips}>
                  {COMPOSE_CHIPS.map(({ id, label, Icon }) => (
                    <Pressable
                      key={id}
                      style={[styles.typeChip, activePostType === id && styles.typeChipActive]}
                      onPress={() => setActivePostType(id)}
                    >
                      <Icon size={14} color={activePostType === id ? colors.primaryDark : colors.textMuted} />
                      <Text style={[styles.typeChipText, activePostType === id && styles.typeChipTextActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {(newPost.trim() || imageUri) ? (
                  <Pressable style={styles.publishBtn} onPress={createPost} disabled={posting}>
                    <Text style={styles.publishBtnText}>{posting ? 'Publicando...' : 'Publicar'}</Text>
                  </Pressable>
                ) : null}
              </View>

              <Text style={styles.sectionTitle}>Publicações</Text>

              {posts.length ? posts.map((post) => {
                const authorName = post.author?.name || post.authorName || 'Membro';
                const isMine = post.authorId === user?.id || post.author?.id === user?.id;
                return (
                  <View key={post.id} style={styles.postCard}>
                    <View style={styles.postHead}>
                      <View style={styles.avatar}><Text style={styles.avatarText}>{authorName.charAt(0)}</Text></View>
                      <View style={styles.postMeta}>
                        <Text style={styles.authorName}>
                          {authorName}
                          {isNutritionist(post.author) ? ' ✓' : ''}
                        </Text>
                        <Text style={styles.postTime}>{formatDistance(post.createdAt)}</Text>
                      </View>
                      <Pressable onPress={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}>
                        <MoreHorizontal color={colors.textMuted} size={20} />
                      </Pressable>
                    </View>
                    {openMenuId === post.id ? (
                      <View style={styles.menu}>
                        {isMine ? (
                          <Pressable onPress={() => deletePost(post.id)}>
                            <Text style={styles.menuDanger}>Excluir publicação</Text>
                          </Pressable>
                        ) : null}
                        <Pressable onPress={() => copyPost(post)}>
                          <Text style={styles.menuItem}>Copiar texto</Text>
                        </Pressable>
                      </View>
                    ) : null}
                    {post.content ? <Text style={styles.postText}>{post.content}</Text> : null}
                    {post.imageUrl ? (
                      <Image
                        source={{ uri: resolveMediaUrl(post.imageUrl) }}
                        style={styles.postImage}
                        resizeMode="cover"
                      />
                    ) : null}
                    <View style={styles.postActions}>
                      <Pressable style={styles.action} onPress={() => toggleLike(post)}>
                        <Heart
                          size={18}
                          color={post.likedByMe ? '#c17b80' : colors.textMuted}
                          fill={post.likedByMe ? '#c17b80' : 'transparent'}
                        />
                        <Text style={styles.actionText}>{post.likes || 0}</Text>
                      </Pressable>
                      <Pressable
                        style={styles.action}
                        onPress={() => setExpanded((e) => ({ ...e, [post.id]: !e[post.id] }))}
                      >
                        <MessageCircle size={18} color={colors.textMuted} />
                        <Text style={styles.actionText}>{post.comments?.length || 0}</Text>
                      </Pressable>
                    </View>
                    {expanded[post.id] ? (
                      <View style={styles.comments}>
                        {(post.comments || []).map((c) => (
                          <Text key={c.id} style={styles.comment}>
                            <Text style={styles.commentAuthor}>{c.author?.name || 'Membro'}: </Text>
                            {c.content}
                          </Text>
                        ))}
                        <View style={styles.commentRow}>
                          <TextInput
                            style={styles.commentInput}
                            value={commentDrafts[post.id] || ''}
                            onChangeText={(text) => setCommentDrafts((d) => ({ ...d, [post.id]: text }))}
                            placeholder="Comentar..."
                            placeholderTextColor={colors.placeholder}
                          />
                          <Pressable onPress={() => addComment(post.id)}>
                            <Send size={18} color={colors.primary} />
                          </Pressable>
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              }) : (
                <View style={styles.empty}>
                  <MessageCircle color={colors.textMuted} size={28} />
                  <Text style={styles.emptyText}>Seja a primeira a compartilhar algo na comunidade.</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.empty}>
              <Users color={colors.textMuted} size={28} />
              <Text style={styles.emptyText}>
                {activeTab === 'groups' ? 'Grupos em breve.' : 'Amigas em breve.'}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[8] },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: -spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted },
  tabTextActive: { color: colors.primaryDark },
  composeCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    gap: spacing[3],
  },
  composeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  composeInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    paddingVertical: spacing[2],
  },
  cameraBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.track,
  },
  cameraBtnActive: { backgroundColor: colors.primarySoft },
  previewWrap: { position: 'relative', alignSelf: 'flex-start' },
  preview: { width: 120, height: 120, borderRadius: radii.control },
  previewRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChips: { gap: spacing[2] },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  typeChipText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textMuted },
  typeChipTextActive: { color: colors.primaryDark },
  publishBtn: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  publishBtnText: { color: '#fff', fontFamily: fonts.semibold, fontSize: 13 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 16 },
  postCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    gap: spacing[3],
  },
  postHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.bold, color: colors.primaryDark },
  postMeta: { flex: 1 },
  authorName: { fontFamily: fonts.semibold, fontSize: 15 },
  postTime: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  menu: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    padding: spacing[3],
  },
  menuDanger: { fontFamily: fonts.semibold, color: colors.error },
  menuItem: { fontFamily: fonts.semibold, color: colors.text, marginTop: spacing[2] },
  postText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  postImage: { width: '100%', height: 220, borderRadius: radii.control },
  postActions: { flexDirection: 'row', gap: spacing[4] },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontFamily: fonts.medium, color: colors.textMuted },
  comments: { gap: spacing[2], borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing[3] },
  comment: { fontFamily: fonts.regular, fontSize: 14 },
  commentAuthor: { fontFamily: fonts.semibold },
  commentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontFamily: fonts.regular,
  },
  empty: { alignItems: 'center', gap: spacing[3], paddingVertical: spacing[8] },
  emptyText: { fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
});
