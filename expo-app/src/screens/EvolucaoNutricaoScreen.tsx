import { ScrollView, StyleSheet } from 'react-native';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import NutritionMonthView from '@/components/evolucao/NutritionMonthView';
import { spacing } from '@/theme/tokens';

export default function EvolucaoNutricaoScreen() {
  return (
    <PatientShell>
      <PatientHeader title="Nutrição do mês" showBack backTo="/inicio" showBell={false} showMenu={false} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <NutritionMonthView />
      </ScrollView>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: spacing[6] },
});
