import { useRouter } from 'expo-router';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import DietaCalorieSubstitutionModal from '@/components/dieta/DietaCalorieSubstitutionModal';

export default function SubstituicaoScreen() {
  const router = useRouter();

  return (
    <PatientShell>
      <PatientHeader />
      <DietaCalorieSubstitutionModal
        open
        mealLabel="Calculadora de trocas"
        onClose={() => {
          if (router.canGoBack()) {
            router.back();
            return;
          }
          router.replace('/dieta' as never);
        }}
      />
    </PatientShell>
  );
}
