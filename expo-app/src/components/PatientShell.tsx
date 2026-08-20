import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPatientTabClearance } from '@/lib/tab-bar';

type Props = {
  children: ReactNode;
  /** Reserva espaço para a tab bar fixa (como `--cf-tab-clearance` no PWA). */
  withTabClearance?: boolean;
  /** Padding inferior do safe area no shell (desligar quando o filho controla, ex. chat Bella). */
  withBottomInset?: boolean;
};

/** Folga inferior para ScrollViews (conteúdo passa por baixo da tab flutuante). */
export function usePatientTabClearance(withTab = true) {
  const insets = useSafeAreaInsets();
  return getPatientTabClearance(insets.bottom, withTab);
}

export default function PatientShell({
  children,
  withTabClearance = true,
  withBottomInset = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const tabClearance = getPatientTabClearance(insets.bottom, withTabClearance);
  const bottomInset = withBottomInset ? Math.max(insets.bottom, 0) : 0;
  const paddingBottom = withTabClearance ? tabClearance : bottomInset;

  return (
    <View style={styles.shell}>
      <View
        style={[
          styles.content,
          withTabClearance && {
            marginBottom: -tabClearance,
            paddingBottom: tabClearance,
          },
          !withTabClearance && paddingBottom > 0 && {
            marginBottom: -paddingBottom,
            paddingBottom,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
  },
});
