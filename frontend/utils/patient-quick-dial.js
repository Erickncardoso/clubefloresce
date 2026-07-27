import {
  BookOpen,
  CalendarCheck,
  Camera,
  Library,
  MessageCircle,
  PlayCircle,
  RefreshCw,
  Salad,
  ScanBarcode,
  Sparkles,
  TrendingUp,
  Users,
  UtensilsCrossed,
} from 'lucide-vue-next'

/** Itens do menu + — ordem crescente por tamanho do rótulo (index 0 = mais curto, perto do +). */
export const PATIENT_QUICK_DIAL_ITEMS = [
  { id: 'bella', label: 'Bella', icon: Sparkles, to: '/bella' },
  { id: 'videos', label: 'Vídeos', icon: PlayCircle, to: '/cursos', premium: true },
  { id: 'ebooks', label: 'Ebooks', icon: BookOpen, to: '/ebooks' },
  { id: 'checkin', label: 'Check-in', icon: CalendarCheck, to: '/check-in' },
  { id: 'evolution', label: 'Evolução', icon: TrendingUp, to: '/evolucao' },
  { id: 'meal', label: 'Meu prato', icon: Camera, chatTopic: 'meal', premium: true },
  { id: 'library', label: 'Biblioteca', icon: Library, to: '/conteudo' },
  { id: 'community', label: 'Comunidade', icon: Users, to: '/comunidade' },
  { id: 'label', label: 'Ler rótulo', icon: ScanBarcode, chatTopic: 'label', premium: true },
  { id: 'diet', label: 'Minha dieta', icon: Salad, to: '/dieta' },
  { id: 'restaurant', label: 'Restaurante', icon: UtensilsCrossed, chatTopic: 'restaurant', premium: true },
  { id: 'ask', label: 'Fazer pergunta', icon: MessageCircle, chatTopic: 'general', premium: true },
  { id: 'swap', label: 'Substituir alimento', icon: RefreshCw, chatTopic: 'swap', premium: true },
]

export function navigateQuickDialItem(item) {
  if (!item) return
  if (item.to) {
    navigateTo(item.to)
    return
  }
  if (item.chatTopic) {
    navigateTo(`/bella/chat/${item.chatTopic}`)
  }
}
