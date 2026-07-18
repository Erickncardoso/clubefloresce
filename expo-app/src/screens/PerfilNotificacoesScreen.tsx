import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bell, BookOpen, CalendarCheck, Sparkles, Users } from 'lucide-react-native';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { usePatientNotifications } from '@/hooks/usePatientNotifications';
import { colors, fonts, spacing } from '@/theme/tokens';

const TYPE_ICONS: Record<string, typeof Bell> = {
  bella: Sparkles,
  checkin: CalendarCheck,
  community: Users,
  content: BookOpen,
  general: Bell,
};

const TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  bella: { bg: '#eef0eb', fg: colors.primaryDark },
  checkin: { bg: '#eff6ff', fg: '#2563eb' },
  community: { bg: '#fdf4ff', fg: '#9333ea' },
  content: { bg: '#fff7ed', fg: '#ea580c' },
  general: { bg: '#f3f4f6', fg: '#4b5563' },
};

export default function PerfilNotificacoesScreen() {
  const {
    grouped,
    hasUnread,
    loading,
    error,
    fetchNotifications,
    markAllRead,
    openNotification,
    formatNotificationTime,
  } = usePatientNotifications();

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  return (
    <PatientShell>
      <PatientHeader title="Notificações" showBack backTo="/perfil" showBell={false} showMenu={false} />
      {hasUnread ? (
        <View style={styles.toolbar}>
          <Pressable onPress={() => void markAllRead()}>
            <Text style={styles.markAll}>Marcar todas como lidas</Text>
          </Pressable>
        </View>
      ) : null}

      {loading && !grouped.length ? (
        <LoadingScreen />
      ) : error ? (
        <Text style={styles.empty}>{error}</Text>
      ) : !grouped.length ? (
        <Text style={styles.empty}>Nenhuma notificação por enquanto.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {grouped.map((group) => (
            <View key={group.label} style={styles.group}>
              <Text style={styles.groupTitle}>{group.label}</Text>
              {group.items.map((item) => {
                const Icon = TYPE_ICONS[item.type] || TYPE_ICONS.general;
                const palette = TYPE_COLORS[item.type] || TYPE_COLORS.general;
                return (
                  <Pressable
                    key={item.id}
                    style={styles.item}
                    onPress={() => void openNotification(item)}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: palette.bg }]}>
                      <Icon color={palette.fg} size={18} />
                    </View>
                    <View style={styles.body}>
                      <Text style={styles.title}>{item.title}</Text>
                      <Text style={styles.text}>{item.body}</Text>
                      <Text style={styles.time}>{formatNotificationTime(item.createdAt)}</Text>
                    </View>
                    {!item.read ? <View style={styles.dot} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  toolbar: { alignItems: 'flex-end', paddingHorizontal: spacing[4], paddingBottom: spacing[2] },
  markAll: { color: colors.primaryDark, fontFamily: fonts.bold, fontSize: 12 },
  empty: { textAlign: 'center', color: colors.textMuted, fontFamily: fonts.regular, padding: spacing[6] },
  scroll: { paddingHorizontal: spacing[4], paddingBottom: spacing[6] },
  group: { marginBottom: spacing[4] },
  groupTitle: { fontFamily: fonts.extrabold, fontSize: 11, color: colors.textMuted, letterSpacing: 0.8, marginBottom: spacing[2] },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  title: { fontFamily: fonts.bold, fontSize: 14 },
  text: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
  time: { fontFamily: fonts.medium, fontSize: 12, color: '#6b7280', marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
});
