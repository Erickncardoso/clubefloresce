import {
  Coffee,
  Cookie,
  Moon,
  Salad,
  Sun,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react-native';

export function pickMealIcon(label = ''): LucideIcon {
  const value = String(label).toLowerCase();
  if (value.includes('café') || value.includes('cafe')) return Coffee;
  if (value.includes('lanche') || value.includes('shake') || value.includes('sobremesa')) return Cookie;
  if (value.includes('almoço') || value.includes('almoco')) return Salad;
  if (value.includes('jantar')) return Moon;
  if (value.includes('tarde')) return Sun;
  return UtensilsCrossed;
}
