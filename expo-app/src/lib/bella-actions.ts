import type { LucideIcon } from 'lucide-react-native';
import {
  Camera,
  MessageCircle,
  RefreshCw,
  Salad,
  ScanBarcode,
  UtensilsCrossed,
} from 'lucide-react-native';

export type BellaAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  route?: string;
};

export const BELLA_ACTIONS: BellaAction[] = [
  { id: 'label', label: 'Ler rótulo', icon: ScanBarcode },
  { id: 'meal', label: 'Meu prato', icon: Camera },
  { id: 'restaurant', label: 'Restaurante', icon: UtensilsCrossed },
  { id: 'swap', label: 'Substituir alimento', icon: RefreshCw },
  { id: 'diet', label: 'Minha dieta', icon: Salad, route: '/dieta' },
  { id: 'ask', label: 'Fazer pergunta', icon: MessageCircle },
];

export const BELLA_TOPIC_TITLES: Record<string, { title: string; subtitle?: string }> = {
  general: { title: 'Bella', subtitle: 'Conversa geral' },
  ask: { title: 'Fazer pergunta', subtitle: 'Tire suas dúvidas' },
  label: { title: 'Ler rótulo', subtitle: 'Analise ingredientes' },
  meal: { title: 'Meu prato', subtitle: 'Foto da refeição' },
  'meal-photo': { title: 'Foto da refeição', subtitle: 'Envie para análise' },
  restaurant: { title: 'Restaurante', subtitle: 'Escolhas fora de casa' },
  swap: { title: 'Substituir alimento', subtitle: 'Troque com segurança' },
};
