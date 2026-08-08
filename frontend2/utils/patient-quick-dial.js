import {
  CalendarCheck,
  Library,
  Salad,
  TrendingUp,
  Users,
} from 'lucide-vue-next'

/** Itens do menu + — ordem crescente por tamanho do rótulo (index 0 = mais curto, perto do +). */
export const PATIENT_QUICK_DIAL_ITEMS = [
  { id: 'checkin', label: 'Check-in', icon: CalendarCheck, to: '/check-in' },
  { id: 'evolution', label: 'Evolução', icon: TrendingUp, to: '/evolucao' },
  { id: 'library', label: 'Biblioteca', icon: Library, to: '/conteudo' },
  { id: 'community', label: 'Comunidade', icon: Users, to: '/comunidade' },
  { id: 'diet', label: 'Minha dieta', icon: Salad, to: '/dieta' },
]

export function navigateQuickDialItem(item) {
  if (!item?.to) return
  navigateTo(item.to)
}
