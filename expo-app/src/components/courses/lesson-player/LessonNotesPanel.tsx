import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Check, Play } from 'lucide-react-native';
import {
  createLessonNote,
  formatNoteTime,
  loadLessonNotes,
  saveLessonNotes,
  type LessonNote,
} from '@/lib/lesson-notes';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

const AULA_ACCENT = colors.primary;
const AULA_ACCENT_SOFT = colors.primarySoft;
const AULA_BORDER = '#eef1ee';

type Props = {
  lessonId: string;
  currentTime: number;
  onSeek?: (seconds: number) => void;
};

export default function LessonNotesPanel({ lessonId, currentTime, onSeek }: Props) {
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [composeText, setComposeText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isSavingCompose, setIsSavingCompose] = useState(false);
  const composeRef = useRef<TextInput>(null);
  const editRef = useRef<TextInput>(null);

  const currentTimeLabel = useMemo(() => formatNoteTime(currentTime), [currentTime]);

  const persist = useCallback(
    async (next: LessonNote[]) => {
      await saveLessonNotes(lessonId, next);
    },
    [lessonId],
  );

  const reloadNotes = useCallback(() => {
    void loadLessonNotes(lessonId).then(setNotes);
  }, [lessonId]);

  useEffect(() => {
    setComposeText('');
    setEditingId(null);
    setEditText('');
    setOpenMenuId(null);
    reloadNotes();
  }, [lessonId, reloadNotes]);

  function emitSeek(seconds: number) {
    onSeek?.(seconds);
  }

  function closeMenu() {
    setOpenMenuId(null);
  }

  function toggleMenu(noteId: string) {
    setOpenMenuId((prev) => (prev === noteId ? null : noteId));
  }

  async function saveCompose() {
    if (isSavingCompose) return;
    const text = composeText.trim();
    if (!text) return;
    setIsSavingCompose(true);
    const next = [...notes, createLessonNote(currentTime, text)].sort(
      (a, b) => a.seconds - b.seconds || a.createdAt - b.createdAt,
    );
    setNotes(next);
    setComposeText('');
    await persist(next);
    setIsSavingCompose(false);
    composeRef.current?.focus();
  }

  function startEdit(note: LessonNote) {
    setEditingId(note.id);
    setEditText(note.text);
    closeMenu();
    setTimeout(() => editRef.current?.focus(), 0);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText('');
  }

  async function saveEdit(noteId: string) {
    const text = editText.trim();
    if (!text) return;
    const next = notes
      .map((note) => (note.id === noteId ? { ...note, text } : note))
      .sort((a, b) => a.seconds - b.seconds || a.createdAt - b.createdAt);
    setNotes(next);
    await persist(next);
    cancelEdit();
  }

  async function removeNote(noteId: string) {
    const next = notes.filter((note) => note.id !== noteId);
    setNotes(next);
    await persist(next);
    closeMenu();
  }

  function handleSeek(note: LessonNote) {
    closeMenu();
    emitSeek(note.seconds);
  }

  return (
    <View style={styles.panel}>
      <View style={styles.composeBox}>
        <Pressable
          style={styles.timeBadge}
          onPress={() => emitSeek(currentTime)}
          accessibilityLabel={`Ir para ${currentTimeLabel}`}
        >
          <Play size={12} color="#fff" fill="#fff" />
          <Text style={styles.timeBadgeText}>{currentTimeLabel}</Text>
        </Pressable>

        <TextInput
          ref={composeRef}
          style={styles.composeInput}
          value={composeText}
          onChangeText={setComposeText}
          placeholder="Escreva uma anotação..."
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={2000}
          underlineColorAndroid="transparent"
          textAlignVertical="top"
        />

        <View style={styles.composeFooter}>
          <Pressable
            style={[styles.composeBtn, (!composeText.trim() || isSavingCompose) && styles.composeBtnDisabled]}
            onPress={() => void saveCompose()}
            disabled={!composeText.trim() || isSavingCompose}
          >
            <Check size={14} color="#fff" />
            <Text style={styles.composeBtnText}>Anotar</Text>
          </Pressable>
        </View>
      </View>

      {!notes.length ? (
        <Text style={styles.emptyMsg}>Você ainda não tem anotações nesta aula.</Text>
      ) : (
        <View style={styles.list}>
          {notes.map((note) => (
            <View
              key={note.id}
              style={[styles.noteItem, editingId === note.id && styles.noteItemEditing]}
            >
              {editingId === note.id ? (
                <View style={styles.noteEditor}>
                  <Pressable style={styles.timeBadgeSm} onPress={() => emitSeek(note.seconds)}>
                    <Play size={10} color="#fff" fill="#fff" />
                    <Text style={styles.timeBadgeSmText}>{note.time}</Text>
                  </Pressable>
                  <TextInput
                    ref={editRef}
                    style={[styles.composeInput, styles.composeInputSm]}
                    value={editText}
                    onChangeText={setEditText}
                    multiline
                    maxLength={2000}
                    underlineColorAndroid="transparent"
                    textAlignVertical="top"
                  />
                  <View style={styles.editActions}>
                    <Pressable style={styles.editBtn} onPress={cancelEdit}>
                      <Text style={styles.editBtnText}>Cancelar</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.editBtn, styles.editBtnSave]}
                      onPress={() => void saveEdit(note.id)}
                      disabled={!editText.trim()}
                    >
                      <Text style={[styles.editBtnText, styles.editBtnSaveText]}>Salvar</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <>
                  <Pressable style={styles.noteBadge} onPress={() => emitSeek(note.seconds)}>
                    <Play size={10} color={AULA_ACCENT} fill={AULA_ACCENT} />
                    <Text style={styles.noteBadgeText}>{note.time}</Text>
                  </Pressable>

                  <Pressable style={styles.noteContent} onPress={() => emitSeek(note.seconds)}>
                    <Text style={styles.noteText}>{note.text}</Text>
                  </Pressable>

                  <View style={styles.noteMenu}>
                    <Pressable
                      style={[styles.menuTrigger, openMenuId === note.id && styles.menuTriggerOpen]}
                      onPress={() => toggleMenu(note.id)}
                      accessibilityLabel="Opções da anotação"
                    >
                      <Text style={styles.menuTriggerIcon}>⋯</Text>
                    </Pressable>

                    {openMenuId === note.id ? (
                      <View style={styles.menuDropdown}>
                        <Pressable style={styles.menuItem} onPress={() => handleSeek(note)}>
                          <Text style={styles.menuItemText}>Ir para o tempo</Text>
                        </Pressable>
                        <Pressable style={styles.menuItem} onPress={() => startEdit(note)}>
                          <Text style={styles.menuItemText}>Editar</Text>
                        </Pressable>
                        <Pressable style={styles.menuItem} onPress={() => void removeNote(note.id)}>
                          <Text style={[styles.menuItemText, styles.menuItemDanger]}>Excluir</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                </>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const badgeShadow = Platform.select({
  ios: {
    shadowColor: 'rgba(45, 90, 39, 0.28)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 7,
  },
  android: { elevation: 4 },
  default: {},
});

const styles = StyleSheet.create({
  panel: {},
  composeBox: {
    minHeight: 168,
    flexDirection: 'column',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: '#dfe8df',
    borderRadius: 14,
    backgroundColor: '#f8fbf8',
    gap: 10,
  },
  timeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: AULA_ACCENT,
    ...badgeShadow,
  },
  timeBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  timeBadgeSm: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: AULA_ACCENT,
  },
  timeBadgeSmText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  composeInput: {
    minHeight: 96,
    flexGrow: 1,
    borderWidth: 0,
    padding: 0,
    margin: 0,
    backgroundColor: 'transparent',
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 23,
    color: colors.text,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  composeInputSm: {
    minHeight: 72,
    marginTop: 4,
  },
  composeFooter: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 2,
  },
  composeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radii.pill,
    backgroundColor: AULA_ACCENT,
    ...badgeShadow,
  },
  composeBtnDisabled: {
    opacity: 0.45,
    ...Platform.select({ ios: { shadowOpacity: 0 }, android: { elevation: 0 }, default: {} }),
  },
  composeBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#fff',
  },
  emptyMsg: {
    marginBottom: 12,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: '#9ca3af',
  },
  list: {
    gap: 9,
  },
  noteItem: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: AULA_BORDER,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  noteItemEditing: {
    flexDirection: 'column',
  },
  noteEditor: {
    width: '100%',
    gap: 8,
  },
  noteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: AULA_ACCENT_SOFT,
  },
  noteBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: AULA_ACCENT,
    fontVariant: ['tabular-nums'],
  },
  noteContent: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 2,
    paddingRight: 28,
  },
  noteText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
  },
  noteMenu: {
    position: 'absolute',
    top: 4,
    right: 0,
  },
  menuTrigger: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTriggerOpen: {
    backgroundColor: 'rgba(45, 90, 39, 0.08)',
  },
  menuTriggerIcon: {
    fontSize: 18,
    lineHeight: 20,
    color: '#9ca3af',
  },
  menuDropdown: {
    position: 'absolute',
    top: 30,
    right: 0,
    zIndex: 12,
    minWidth: 148,
    padding: 6,
    borderWidth: 1,
    borderColor: AULA_BORDER,
    borderRadius: 12,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(15, 23, 42, 0.12)',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 1,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  menuItem: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  menuItemText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: '#374151',
  },
  menuItemDanger: {
    color: '#b91c1c',
  },
  editActions: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
    marginTop: 4,
  },
  editBtn: {
    borderWidth: 1,
    borderColor: AULA_BORDER,
    borderRadius: radii.pill,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editBtnSave: {
    borderColor: '#c5ccc0',
    backgroundColor: AULA_ACCENT_SOFT,
  },
  editBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#6b7280',
  },
  editBtnSaveText: {
    color: AULA_ACCENT,
  },
});
