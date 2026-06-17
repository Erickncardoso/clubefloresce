import {
  Camera,
  MessageCircle,
  RefreshCw,
  Salad,
  ScanBarcode,
  UtensilsCrossed,
} from 'lucide-vue-next'

export const BELLA_ACTIONS = [
  { id: 'label', label: 'Ler rótulo', icon: ScanBarcode },
  { id: 'meal', label: 'Meu prato', icon: Camera },
  { id: 'restaurant', label: 'Restaurante', icon: UtensilsCrossed },
  { id: 'swap', label: 'Substituir alimento', icon: RefreshCw },
  { id: 'diet', label: 'Minha dieta', icon: Salad, route: '/dieta' },
  { id: 'ask', label: 'Fazer pergunta', icon: MessageCircle },
]

export function navigateBellaAction(action) {
  if (!action) return
  if (action.route) {
    navigateTo(action.route)
    return
  }
  navigateTo(`/bella/chat/${action.id}`)
}
