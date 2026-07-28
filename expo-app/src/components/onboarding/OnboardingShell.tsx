import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import PatientShell from '@/components/PatientShell';
import { colors, fonts, spacing } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  showHeader?: boolean;
  showBack?: boolean;
  showFooter?: boolean;
  progressCurrent?: number;
  progressTotal?: number;
  continueLabel?: string;
  continueDisabled?: boolean;
  saving?: boolean;
  onBack?: () => void;
  onContinue?: () => void;
  footerNote?: ReactNode;
};

export default function OnboardingShell({
  children,
  showHeader = true,
  showBack = true,
  showFooter = true,
  progressCurrent = 0,
  progressTotal = 0,
  continueLabel = 'Continuar',
  continueDisabled = false,
  saving = false,
  onBack,
  onContinue,
  footerNote,
}: Props) {
  const insets = useSafeAreaInsets();
  const progressPct = progressTotal > 0
    ? Math.max(8, (progressCurrent / progressTotal) * 100)
    : 0;

  return (
    <PatientShell withTabClearance={false}>
      <View
        style={[
          styles.shell,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        {showHeader ? (
          <View style={styles.header}>
            {showBack ? (
              <Pressable
                accessibilityLabel="Voltar"
                style={styles.backBtn}
                onPress={onBack}
              >
                <ArrowLeft size={18} color={colors.text} />
              </Pressable>
            ) : (
              <View style={styles.backSpacer} />
            )}

            {progressTotal > 0 ? (
              <View
                style={styles.progressTrack}
                accessibilityRole="progressbar"
                accessibilityValue={{
                  min: 0,
                  max: progressTotal,
                  now: progressCurrent,
                }}
              >
                <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
              </View>
            ) : (
              <View style={styles.progressSpacer} />
            )}

            <View style={styles.backSpacer} />
          </View>
        ) : null}

        <ScrollView
          style={styles.main}
          contentContainerStyle={styles.mainContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>

        {showFooter ? (
          <View style={styles.footer}>
            {footerNote}
            <Pressable
              disabled={continueDisabled || saving}
              style={[styles.continueBtn, (continueDisabled || saving) && styles.continueBtnDisabled]}
              onPress={onContinue}
            >
              <Text style={styles.continueText}>
                {saving ? 'Salvando…' : continueLabel}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backSpacer: {
    width: 38,
    height: 38,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#ececec',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primaryDark,
  },
  progressSpacer: {
    flex: 1,
    height: 4,
  },
  main: {
    flex: 1,
  },
  mainContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
  },
  footer: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[4],
    gap: spacing[3],
  },
  continueBtn: {
    minHeight: 50,
    borderRadius: 999,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnDisabled: {
    opacity: 0.45,
  },
  continueText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#fff',
  },
});
