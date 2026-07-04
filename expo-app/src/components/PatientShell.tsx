import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  withTabClearance?: boolean;
};

/** Shell de conteúdo — tab bar nativa iOS não precisa de clearance manual. */
export default function PatientShell({ children, withTabClearance = false }: Props) {
  const insets = useSafeAreaInsets();
  const TAB_FLOAT_MARGIN = 12;
  const TAB_PILL_HEIGHT = 56;
  const tabClearance = withTabClearance
    ? TAB_PILL_HEIGHT + TAB_FLOAT_MARGIN + insets.bottom
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
