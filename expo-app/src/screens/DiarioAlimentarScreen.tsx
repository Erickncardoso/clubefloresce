import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Camera } from 'lucide-react-native';
import DiarioFeedCard from '@/components/diario/DiarioFeedCard';
import DiarioSocialModal from '@/components/diario/DiarioSocialModal';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientFlatList from '@/components/ui/PatientFlatList';
import PatientShell from '@/components/PatientShell';
import { usePatientApi } from '@/hooks/usePatientApi';
import { DIARY_LIKE_VIEWABILITY, useDiaryNewLikes } from '@/hooks/useDiaryNewLikes';
import { useAuth } from '@/providers/AuthProvider';
import type {
  DiaryFeedAuthor,
  DiaryFeedComment,
  DiaryFeedEntry,
  DiaryFeedPage,
} from '@/lib/patient-diary-feed';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

const PAGE_SIZE = 12;

export default function DiarioAlimentarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { request } = usePatientApi();
  const [entries, setEntries] = useState<DiaryFeedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextSkip, setNextSkip] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [socialEntry, setSocialEntry] = useState<DiaryFeedEntry | null>(null);
  const [socialMode, setSocialMode] = useState<'like' | 'comment'>('comment');
  const [likes, setLikes] = useState<DiaryFeedAuthor[]>([]);
  const [comments, setComments] = useState<DiaryFeedComment[]>([]);
  const [sending, setSending] = useState(false);
  const { highlightIds, syncUnseen, onViewableItemsChanged, acknowledge } = useDiaryNewLikes();

  const loadPage = useCallback(async (skip = 0, replace = false) => {
    const data = await request<DiaryFeedPage>(`/food-diary/feed?limit=${PAGE_SIZE}&skip=${skip}`);
    const next = data.entries || [];
    setEntries((current) => (replace || skip === 0 ? next : [...current, ...next]));
    setNextSkip(data.hasMore ? data.nextSkip : null);
    await syncUnseen(next, replace || skip === 0 ? 'replace' : 'append');
  }, [request, syncUnseen]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setLoading(true);
      void loadPage(0, true)
        .catch(() => {
          if (alive) setEntries([]);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
      return () => {
        alive = false;
      };
    }, [loadPage]),
  );

  async function onRefresh() {
    setRefreshing(true);
    try {
      await loadPage(0, true);
    } catch {
      setEntries([]);
    } finally {
      setRefreshing(false);
    }
  }

  async function onEndReached() {
    if (loadingMore || nextSkip == null) return;
    setLoadingMore(true);
    try {
      await loadPage(nextSkip);
    } finally {
      setLoadingMore(false);
    }
  }

  function sendPhoto() {
    router.push('/bella/chat/meal' as never);
  }

  async function openSocial(entry: DiaryFeedEntry, mode: 'like' | 'comment') {
    setSocialMode(mode);
    setSocialEntry(entry);
    setComments(entry.commentsPreview || []);
    setLikes([]);
    if (mode === 'like') acknowledge(entry);
    try {
      const data = await request<{ likes?: DiaryFeedAuthor[]; comments?: DiaryFeedComment[] }>(
        `/food-diary/entries/${entry.id}/social`,
      );
      setLikes(data.likes || []);
      setComments(data.comments || []);
    } catch {
      /* preview já está na tela */
    }
  }

  async function sendComment(text: string) {
    if (!socialEntry) return;
    setSending(true);
    try {
      const created = await request<DiaryFeedComment>(
        `/food-diary/entries/${socialEntry.id}/comments`,
        { method: 'POST', body: JSON.stringify({ content: text }) },
      );
      setComments((list) => [...list, created]);
      setEntries((list) =>
        list.map((item) =>
          item.id === socialEntry.id
            ? { ...item, commentsCount: item.commentsCount + 1 }
            : item,
        ),
      );
    } finally {
      setSending(false);
    }
  }

  async function editComment(commentId: string, text: string) {
    const updated = await request<DiaryFeedComment>(`/food-diary/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content: text }),
    });
    setComments((list) => list.map((item) => (item.id === commentId ? { ...item, ...updated } : item)));
  }

  async function deleteComment(commentId: string) {
    await request(`/food-diary/comments/${commentId}`, { method: 'DELETE' });
    setComments((list) => list.filter((item) => item.id !== commentId));
    if (socialEntry) {
      setEntries((list) =>
        list.map((item) =>
          item.id === socialEntry.id
            ? { ...item, commentsCount: Math.max(0, item.commentsCount - 1) }
            : item,
        ),
      );
    }
  }

  return (
    <PatientShell>
      <PatientHeader />
      {loading && !entries.length ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <PatientFlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={DIARY_LIKE_VIEWABILITY}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
          }
          ListHeaderComponent={
            <View style={styles.intro}>
              <Text style={styles.introTitle}>Fotos dos seus pratos</Text>
              <Text style={styles.introCopy}>
                Envie a foto da refeição. A Bella registra no diário e sua nutri curte e comenta.
              </Text>
              <Pressable style={styles.cta} onPress={sendPhoto}>
                <Camera size={18} color="#fff" strokeWidth={1.8} />
                <Text style={styles.ctaText}>Enviar foto do prato</Text>
              </Pressable>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Nenhuma foto ainda</Text>
              <Text style={styles.emptyCopy}>
                Tire uma foto do prato para a nutri acompanhar o que você comeu.
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator style={styles.more} color={colors.primary} /> : null
          }
          renderItem={({ item, index }) => (
            <DiarioFeedCard
              entry={item}
              index={index}
              authorName={user?.name}
              authorAvatar={user?.avatar}
              onOpenPhoto={setPhotoUrl}
              onOpenLike={(next) => void openSocial(next, 'like')}
              onOpenComments={(next) => void openSocial(next, 'comment')}
              highlightLike={highlightIds.includes(item.id)}
            />
          )}
        />
      )}

      <DiarioSocialModal
        visible={Boolean(socialEntry)}
        mode={socialMode}
        likes={likes}
        likeCount={socialEntry?.likesCount}
        comments={comments}
        currentUserId={user?.id}
        sending={sending}
        onClose={() => {
          setSocialEntry(null);
          setLikes([]);
          setComments([]);
        }}
        onSend={sendComment}
        onEdit={editComment}
        onDelete={deleteComment}
      />
      <Modal visible={Boolean(photoUrl)} transparent animationType="fade" onRequestClose={() => setPhotoUrl('')}>
        <Pressable style={styles.lightbox} onPress={() => setPhotoUrl('')}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.lightboxPhoto} resizeMode="contain" />
          ) : null}
        </Pressable>
      </Modal>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: spacing[4], paddingBottom: spacing[8] },
  intro: { paddingTop: 4, paddingBottom: 18 },
  introTitle: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.text,
  },
  introCopy: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  cta: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: radii.control,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: '#fff',
  },
  empty: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },
  emptyCopy: {
    marginTop: 6,
    maxWidth: 280,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  more: { marginVertical: 16 },
  lightbox: {
    flex: 1,
    backgroundColor: 'rgba(10,12,10,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  lightboxPhoto: { width: '100%', height: '80%' },
});
