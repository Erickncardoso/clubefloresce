import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Pencil, Send, Trash2, User, X } from 'lucide-react-native';
import DiarioLikePanel from '@/components/diario/DiarioLikePanel';
import { resolveMediaUrl } from '@/lib/media-url';
import {
  formatDiaryCommentWhen,
  shortDiaryName,
  type DiaryFeedAuthor,
  type DiaryFeedComment,
} from '@/lib/patient-diary-feed';
import { fonts } from '@/theme/tokens';

type Props = {
  visible: boolean;
  mode: 'like' | 'comment';
  likes: DiaryFeedAuthor[];
  likeCount?: number;
  comments: DiaryFeedComment[];
  currentUserId?: string | null;
  sending?: boolean;
  onClose: () => void;
  onSend: (text: string) => Promise<void> | void;
  onEdit: (commentId: string, text: string) => Promise<void> | void;
  onDelete: (commentId: string) => Promise<void> | void;
};

function authorLabel(author?: DiaryFeedAuthor | null) {
  const role = String(author?.role || '').toUpperCase();
  if (role === 'NUTRICIONISTA') return shortDiaryName(author?.name) || 'Sua nutri';
  return shortDiaryName(author?.name);
}

export default function DiarioSocialModal({
  visible,
  mode,
  likes,
  likeCount = 0,
  comments,
  currentUserId,
  sending = false,
  onClose,
  onSend,
  onEdit,
  onDelete,
}: Props) {
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const isLike = mode === 'like';

  async function submit() {
    const text = draft.trim();
    if (!text || sending) return;
    await onSend(text);
    setDraft('');
  }

  async function saveEdit() {
    if (!editingId || !editDraft.trim()) return;
    await onEdit(editingId, editDraft.trim());
    setEditingId(null);
    setEditDraft('');
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.card, isLike && styles.cardLike]}>
          <View style={styles.head}>
            {isLike ? <View style={{ flex: 1 }} /> : (
              <Text style={styles.headTitle}>Comentários</Text>
            )}
            <Pressable style={styles.close} onPress={onClose} accessibilityLabel="Fechar">
              <X size={16} color="#fff" strokeWidth={2} />
            </Pressable>
          </View>

          {isLike ? (
            <DiarioLikePanel likes={likes} likeCount={likeCount} active={visible} />
          ) : (
            <>
              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {comments.length ? comments.map((comment) => {
                  const mine = Boolean(currentUserId && comment.author?.id === currentUserId);
                  const editing = editingId === comment.id;
                  const avatar = resolveMediaUrl(comment.author?.avatar);
                  return (
                    <View key={comment.id} style={styles.row}>
                      {avatar ? (
                        <Image source={{ uri: avatar }} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatarFallback}>
                          <User size={11} color="#fff" strokeWidth={1.8} />
                        </View>
                      )}
                      <View style={styles.body}>
                        <View style={styles.meta}>
                          <Text style={styles.author}>{authorLabel(comment.author)}</Text>
                          <Text style={styles.when}>{formatDiaryCommentWhen(comment.createdAt)}</Text>
                          {mine && !editing ? (
                            <View style={styles.actions}>
                              <Pressable
                                onPress={() => {
                                  setEditingId(comment.id);
                                  setEditDraft(comment.content);
                                }}
                                hitSlop={8}
                              >
                                <Pencil size={12} color="rgba(255,255,255,0.7)" />
                              </Pressable>
                              <Pressable onPress={() => void onDelete(comment.id)} hitSlop={8}>
                                <Trash2 size={12} color="rgba(255,255,255,0.7)" />
                              </Pressable>
                            </View>
                          ) : null}
                        </View>
                        {editing ? (
                          <View>
                            <TextInput
                              style={styles.editInput}
                              value={editDraft}
                              onChangeText={setEditDraft}
                              multiline
                            />
                            <View style={styles.editRow}>
                              <Pressable onPress={() => { setEditingId(null); setEditDraft(''); }}>
                                <Text style={styles.cancel}>Cancelar</Text>
                              </Pressable>
                              <Pressable onPress={() => void saveEdit()}>
                                <Text style={styles.save}>Salvar</Text>
                              </Pressable>
                            </View>
                          </View>
                        ) : (
                          <Text style={styles.content}>{comment.content}</Text>
                        )}
                      </View>
                    </View>
                  );
                }) : (
                  <Text style={styles.empty}>Nenhum comentário ainda.</Text>
                )}
              </ScrollView>

              <TextInput
                style={styles.input}
                placeholder="Escreva um comentário..."
                placeholderTextColor="rgba(255,255,255,0.42)"
                value={draft}
                onChangeText={setDraft}
                multiline
              />
              <Pressable
                style={[styles.send, (!draft.trim() || sending) && styles.sendDisabled]}
                disabled={!draft.trim() || sending}
                onPress={() => void submit()}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Send size={14} color="#fff" />
                    <Text style={styles.sendText}>Enviar</Text>
                  </>
                )}
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '78%',
    backgroundColor: '#1a1e1c',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    gap: 10,
    zIndex: 2,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  headTitle: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: '#fff',
    paddingTop: 6,
  },
  cardLike: {
    maxWidth: 300,
    alignItems: 'stretch',
  },
  avatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#3a3f3c' },
  avatarFallback: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { maxHeight: 220 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  body: { flex: 1, minWidth: 0 },
  meta: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  author: { fontFamily: fonts.semibold, fontSize: 12, color: '#fff' },
  when: { fontFamily: fonts.medium, fontSize: 10, color: 'rgba(255,255,255,0.62)' },
  actions: { marginLeft: 'auto', flexDirection: 'row', gap: 8 },
  content: { marginTop: 2, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.92)' },
  empty: { fontFamily: fonts.regular, fontSize: 13, color: 'rgba(255,255,255,0.62)', paddingVertical: 6 },
  input: {
    minHeight: 64,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  send: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  sendDisabled: { opacity: 0.45 },
  sendText: { fontFamily: fonts.semibold, fontSize: 13, color: '#fff' },
  editInput: {
    marginTop: 6,
    minHeight: 44,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 10,
    padding: 8,
    color: '#fff',
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  editRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 6 },
  cancel: { fontFamily: fonts.medium, fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  save: { fontFamily: fonts.semibold, fontSize: 12, color: '#fff' },
});
