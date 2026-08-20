import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPatientTabClearance } from '@/lib/tab-bar';

type Props = {
  children: ReactNode;
  /** Reserva espaço para a tab bar fixa (como `--cf-tab-clearance` no PWA). */
  withTabClearance?: boolean;
};

/** Folga inferior para ScrollViews (conteúdo passa por baixo da tab flutuante). */
export function usePatientTabClearance(withTab = true) {
  const insets = useSafeAreaInsets();
  return getPatientTabClearance(insets.bottom, withTab);
}

export default function PatientShell({ children, withTabClearance = true }: Props) {
  const insets = useSafeAreaInsets();
  const tabClearance = getPatientTabClearance(insets.bottom, withTabClearance);

  return (
    <View style={styles.shell}>
      <View
        style={[
          styles.content,
          withTabClearance && {
            marginBottom: -tabClearance,
            paddingBottom: tabClearance,
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
