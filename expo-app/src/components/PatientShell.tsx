import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  PATIENT_NAV_CONTENT_GAP,
  PATIENT_NAV_HEIGHT,
} from '@/lib/tab-bar';
import { colors } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  /** Reserva espaço para a tab bar fixa (como `--cf-tab-clearance` no PWA). */
  withTabClearance?: boolean;
};

export default function PatientShell({ children, withTabClearance = true }: Props) {
  const insets = useSafeAreaInsets();
  const tabClearance = withTabClearance
    ? PATIENT_NAV_HEIGHT + PATIENT_NAV_CONTENT_GAP + insets.bottom
    : insets.bottom;

  return (
    <View style={[styles.shell, { paddingBottom: tabClearance }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
