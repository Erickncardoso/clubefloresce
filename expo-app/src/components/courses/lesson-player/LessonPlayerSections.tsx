import { useMemo } from 'react';
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ComponentType } from 'react';
import {
  ArrowRight,
  Captions,
  Check,
  CheckCircle2,
  CircleHelp,
  Clock,
  Heart,
  Info,
  Link,
  Menu,
  PlayCircle,
  StickyNote,
} from 'lucide-react-native';
import FlorescerQuadrosIcon from '@/components/icons/FlorescerQuadrosIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LessonNotesPanel from '@/components/courses/lesson-player/LessonNotesPanel';
import LessonSummaryView from '@/components/courses/lesson-player/LessonSummaryView';
import { resolveMediaUrl } from '@/lib/media-url';
import { getTranscriptionDisplayLines } from '@/lib/transcription';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

export type LessonTabId = 'resumo' | 'transcricao' | 'anotacoes' | 'links' | 'aulas';

export type LessonItem = {
  id: string;
  title: string;
  duration?: string;
  content?: string;
  summary?: string;
  videoUrl?: string;
  thumbnail?: string;
  cover?: string;
  transcription?: unknown[];
  materials?: Array<{ name?: string; title?: string; url?: string }>;
  progress?: Array<{ watched?: boolean; favorited?: boolean }>;
};

export type ModulePlayerData = {
  id: string;
  title: string;
  lessons?: LessonItem[];
  course?: {
    id?: string;
    title?: string;
    thumbnail?: string;
    modules?: Array<{ id: string; title?: string }>;
  };
};

type TabIcon = ComponentType<{ size?: number; color?: string; fill?: string }>;

const TABS: Array<{ id: LessonTabId; label: string; Icon: TabIcon }> = [
  { id: 'resumo', label: 'Resumo', Icon: Info },
  { id: 'transcricao', label: 'Transcrição', Icon: Captions },
  { id: 'anotacoes', label: 'Anotações', Icon: StickyNote },
  { id: 'links', label: 'Links', Icon: Link },
  { id: 'aulas', label: 'Aulas', Icon: FlorescerQuadrosIcon },
];

type MobileBarProps = {
  courseTitle: string;
  courseThumbnail?: string;
  onOpenMenu: () => void;
};

export function LessonMobileBar({ courseTitle, courseThumbnail, onOpenMenu }: MobileBarProps) {
  const insets = useSafeAreaInsets();
  const cover = resolveMediaUrl(courseThumbnail || '');

  return (
    <View style={[styles.mobileBar, { paddingTop: insets.top + 8 }]}>
      <Pressable style={styles.mobileBarBtn} onPress={onOpenMenu} accessibilityLabel="Abrir menu">
        <Menu size={20} color={colors.text} />
      </Pressable>
      {cover ? (
        <Image source={{ uri: cover }} style={styles.mobileBarThumb} resizeMode="cover" />
      ) : (
        <View style={[styles.mobileBarThumb, styles.mobileBarThumbEmpty]} />
      )}
      <Text style={styles.mobileBarTitle} numberOfLines={1}>{courseTitle}</Text>
    </View>
  );
}

type HeaderProps = {
  lesson: LessonItem;
  lessonIndex: number;
  watched: boolean;
  favorited: boolean;
  onToggleWatched: () => void;
  onToggleFavorite: () => void;
};

export function LessonPlayerHeader({
  lesson,
  lessonIndex,
  watched,
  favorited,
  onToggleWatched,
  onToggleFavorite,
}: HeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerInfo}>
        <Text style={styles.lessonBadge}>Aula {lessonIndex + 1}</Text>
        <Text style={styles.lessonTitle}>{lesson.title}</Text>
        <View style={styles.lessonDurationRow}>
          <Clock size={14} color={colors.textMuted} />
          <Text style={styles.lessonDuration}>{lesson.duration || '—'}</Text>
        </View>
      </View>
      <View style={styles.headerActions}>
        <Pressable
          style={[styles.doneBtn, watched && styles.doneBtnActive]}
          onPress={onToggleWatched}
        >
          <Check size={16} color={watched ? colors.primaryDark : colors.textMuted} />
          <Text style={[styles.doneBtnText, watched && styles.doneBtnTextActive]}>
            {watched ? 'Concluída' : 'Marcar concluída'}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.iconBtn, favorited && styles.iconBtnActive]}
          onPress={onToggleFavorite}
          accessibilityLabel="Favoritar"
        >
          <Heart
            size={18}
            color={favorited ? colors.primaryDark : colors.textMuted}
            fill={favorited ? colors.primaryDark : 'transparent'}
          />
        </Pressable>
      </View>
    </View>
  );
}

type TabsProps = {
  activeTab: LessonTabId;
  onChange: (tab: LessonTabId) => void;
  moduleData: ModulePlayerData;
  activeLesson: LessonItem;
  currentTime: number;
  onSeek?: (seconds: number) => void;
  onSelectLesson: (lesson: LessonItem) => void;
  isLessonWatched: (lessonId: string) => boolean;
  courseThumbnail?: string;
  onNextModule?: () => void;
  nextModuleTitle?: string;
};

export function LessonTabsPanel({
  activeTab,
  onChange,
  moduleData,
  activeLesson,
  currentTime,
  onSeek,
  onSelectLesson,
  isLessonWatched,
  courseThumbnail,
  onNextModule,
  nextModuleTitle,
}: TabsProps) {
  return (
    <View style={styles.tabsCard}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
        {TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <Pressable
              key={id}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
              onPress={() => onChange(id)}
            >
              <Icon size={18} color={active ? colors.primary : '#9ca3af'} />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.tabBody, activeTab === 'aulas' && styles.tabBodyLessons]}>
        {activeTab === 'resumo' ? (
          <LessonSummaryView content={activeLesson.content || activeLesson.summary || ''} />
        ) : null}

        {activeTab === 'transcricao' ? (
          <LessonTranscriptionContent transcription={activeLesson.transcription} />
        ) : null}

        {activeTab === 'anotacoes' ? (
          <LessonNotesPanel
            lessonId={activeLesson.id}
            currentTime={currentTime}
            onSeek={onSeek}
          />
        ) : null}

        {activeTab === 'links' ? (
          <LessonLinksContent materials={activeLesson.materials} />
        ) : null}

        {activeTab === 'aulas' ? (
          <LessonListContent
            moduleData={moduleData}
            activeLesson={activeLesson}
            onSelectLesson={onSelectLesson}
            isLessonWatched={isLessonWatched}
            courseThumbnail={courseThumbnail}
            onNextModule={onNextModule}
            nextModuleTitle={nextModuleTitle}
          />
        ) : null}
      </View>
    </View>
  );
}

function LessonTranscriptionContent({ transcription }: { transcription?: unknown[] }) {
  const lines = useMemo(
    () => getTranscriptionDisplayLines(transcription),
    [transcription],
  );

  if (!lines.length) {
    return <Text style={styles.emptyPanel}>Nenhuma transcrição disponível para esta aula.</Text>;
  }

  return (
    <ScrollView style={styles.transcriptionList} nestedScrollEnabled>
      {lines.map((line, index) => (
        <View key={`${line.seconds}-${index}`} style={styles.transcriptionRow}>
          <Text style={styles.transcriptionTime}>{line.time}</Text>
          <Text style={styles.transcriptionText}>{line.text}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function LessonLinksContent({ materials }: { materials?: LessonItem['materials'] }) {
  const links = useMemo(() => {
    if (!Array.isArray(materials)) return [];
    return materials
      .map((item) => ({
        name: String(item?.name || item?.title || '').trim(),
        url: String(item?.url || '').trim(),
      }))
      .filter((item) => item.name && item.url);
  }, [materials]);

  if (!links.length) {
    return <Text style={styles.emptyPanel}>Não existem links para esta aula.</Text>;
  }

  return links.map((item, index) => (
    <Pressable key={`${item.url}-${index}`} style={styles.linkItem} onPress={() => void Linking.openURL(item.url)}>
      <View style={styles.linkIcon}>
        <Link size={18} color={colors.primaryDark} />
      </View>
      <View style={styles.linkCopy}>
        <Text style={styles.linkTitle}>{item.name}</Text>
        <Text style={styles.linkUrl} numberOfLines={1}>{item.url}</Text>
      </View>
    </Pressable>
  ));
}

type LessonListProps = {
  moduleData: ModulePlayerData;
  activeLesson: LessonItem;
  onSelectLesson: (lesson: LessonItem) => void;
  isLessonWatched: (lessonId: string) => boolean;
  courseThumbnail?: string;
  onNextModule?: () => void;
  nextModuleTitle?: string;
};

function LessonListContent({
  moduleData,
  activeLesson,
  onSelectLesson,
  isLessonWatched,
  courseThumbnail,
  onNextModule,
  nextModuleTitle,
}: LessonListProps) {
  const coverFallback = resolveMediaUrl(courseThumbnail || '');

  return (
    <View>
      <View style={styles.moduleIntro}>
        {coverFallback ? (
          <Image source={{ uri: coverFallback }} style={styles.moduleIntroThumb} resizeMode="cover" />
        ) : null}
        <View style={styles.moduleIntroCopy}>
          <Text style={styles.moduleIntroTitle}>{moduleData.title}</Text>
          <Text style={styles.moduleIntroMeta}>
            {moduleData.course?.title} · {moduleData.lessons?.length || 0} aulas
          </Text>
        </View>
      </View>

      {(moduleData.lessons || []).map((lesson, index) => {
        const active = activeLesson.id === lesson.id;
        const done = isLessonWatched(lesson.id);
        const thumb = resolveMediaUrl(lesson.thumbnail || lesson.cover || courseThumbnail || '');

        return (
          <Pressable
            key={lesson.id}
            style={[styles.lessonListItem, active && styles.lessonListItemActive]}
            onPress={() => onSelectLesson(lesson)}
          >
            <View style={[styles.lessonListNum, done && styles.lessonListNumDone]}>
              {done ? <CheckCircle2 size={12} color={colors.primaryDark} /> : (
                <Text style={styles.lessonListNumText}>{index + 1}</Text>
              )}
            </View>
            <View style={styles.lessonListThumb}>
              {thumb ? (
                <Image source={{ uri: thumb }} style={styles.lessonListThumbImg} resizeMode="cover" />
              ) : null}
            </View>
            <View style={styles.lessonListCopy}>
              <Text style={[styles.lessonListTitle, active && styles.lessonListTitleActive]} numberOfLines={2}>
                {lesson.title}
              </Text>
              <Text style={styles.lessonListDur}>{lesson.duration || '0:00'}</Text>
            </View>
          </Pressable>
        );
      })}

      {nextModuleTitle && onNextModule ? (
        <Pressable style={styles.nextModuleBtn} onPress={onNextModule}>
          <PlayCircle size={16} color={colors.primaryDark} />
          <Text style={styles.nextModuleText}>Próximo: {nextModuleTitle}</Text>
          <ArrowRight size={14} color={colors.primaryDark} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mobileBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing[4],
    paddingBottom: 12,
    backgroundColor: colors.surface,
  },
  mobileBarBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  mobileBarThumb: { width: 34, height: 34, borderRadius: 9, backgroundColor: colors.primarySoft },
  mobileBarThumbEmpty: { backgroundColor: '#e8ece9' },
  mobileBarTitle: { flex: 1, fontFamily: fonts.extrabold, fontSize: 13, color: colors.text },
  header: { paddingHorizontal: spacing[4], paddingTop: 14, paddingBottom: 12, gap: 12 },
  headerInfo: { gap: 6 },
  lessonBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    color: colors.primaryDark,
    fontFamily: fonts.extrabold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    overflow: 'hidden',
  },
  lessonTitle: { fontFamily: fonts.extrabold, fontSize: 22, letterSpacing: -0.5, color: colors.text },
  lessonDurationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lessonDuration: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  doneBtn: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  doneBtnActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  doneBtnText: { fontFamily: fonts.bold, fontSize: 13, color: '#374151' },
  doneBtnTextActive: { color: colors.primaryDark },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  iconBtnActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  tabsCard: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[6],
    borderWidth: 1,
    borderColor: '#eef1ee',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  tabsRow: { gap: 4, paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eef1ee' },
  tabBtn: {
    minWidth: 66,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 14,
  },
  tabBtnActive: { backgroundColor: colors.primarySoft },
  tabLabel: { fontFamily: fonts.bold, fontSize: 10, color: '#9ca3af' },
  tabLabelActive: { color: colors.primary },
  tabBody: { padding: spacing[4], minHeight: 280 },
  tabBodyLessons: { minHeight: 360 },
  emptyPanel: { fontFamily: fonts.regular, color: colors.textMuted, lineHeight: 22 },
  transcriptionList: { maxHeight: 420 },
  transcriptionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  transcriptionTime: { width: 48, fontFamily: fonts.bold, fontSize: 12, color: colors.primaryDark },
  transcriptionText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: '#4b5563' },
  linkItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkCopy: { flex: 1, gap: 2 },
  linkTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  linkUrl: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  moduleIntro: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  moduleIntroThumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: colors.primarySoft },
  moduleIntroCopy: { flex: 1, gap: 4 },
  moduleIntroTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  moduleIntroMeta: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  lessonListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  lessonListItemActive: { backgroundColor: colors.primarySoft },
  lessonListNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef1ee',
  },
  lessonListNumDone: { backgroundColor: colors.primarySoft },
  lessonListNumText: { fontFamily: fonts.bold, fontSize: 11, color: colors.textMuted },
  lessonListThumb: {
    width: 72,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.primarySoft,
  },
  lessonListThumbImg: { width: '100%', height: '100%' },
  lessonListCopy: { flex: 1, gap: 2 },
  lessonListTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  lessonListTitleActive: { color: colors.primaryDark },
  lessonListDur: { fontFamily: fonts.medium, fontSize: 11, color: colors.textMuted },
  nextModuleBtn: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextModuleText: { flex: 1, fontFamily: fonts.semibold, fontSize: 13, color: colors.primaryDark },
});
