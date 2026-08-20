import {
  StyleSheet
} from 'react-native';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientScrollView from '@/components/ui/PatientScrollView';
import PatientShell from '@/components/PatientShell';
import NutritionMonthView from '@/components/evolucao/NutritionMonthView';
import { spacing } from '@/theme/tokens';

export default function EvolucaoNutricaoScreen() {
  return (
    <PatientShell>
      <PatientHeader />
      <PatientScrollView contentContainerStyle={styles.scroll}>
        <NutritionMonthView />
      </PatientScrollView>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: spacing[6] },
});
