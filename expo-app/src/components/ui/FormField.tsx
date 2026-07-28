import type { TextInputProps } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import FloatField from '@/components/ui/FloatField';

type Props = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
  leftIcon?: LucideIcon;
};

/** Campo com label flutuante — padrão admin/paciente (`field--float`). */
export default function FormField(props: Props) {
  return <FloatField {...props} />;
}
