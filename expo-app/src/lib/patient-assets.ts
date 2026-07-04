/** Imagens espelhadas do PWA `frontend/public` e `cliente/public`. */
export const patientAssets = {
  quick: {
    dieta: require('../../assets/imgs/quick/quick-dieta.png'),
    evolucao: require('../../assets/imgs/quick/quick-evolucao.png'),
    checkin: require('../../assets/imgs/quick/quick-checkin.png'),
    bella: require('../../assets/imgs/quick/quick-bella.png'),
    videos: require('../../assets/imgs/quick/quick-videos.png'),
    ebooks: require('../../assets/imgs/quick/quick-ebooks.png'),
    biblioteca: require('../../assets/imgs/quick/quick-biblioteca.png'),
    comunidade: require('../../assets/imgs/quick/quick-comunidade.png'),
  },
  bellaEnsina: require('../../assets/imgs/bellaensina.png'),
  bellaAvatar: require('../../assets/imgs/falecomabella.webp'),
  courseCover: require('../../assets/imgs/curso-capa-personalizada.png'),
  courseCoverMobile: require('../../assets/imgs/curso-capa-personalizada-mobile.png'),
} as const;

export const QUICK_ACTIONS = [
  { label: 'Minha dieta', href: '/dieta', image: patientAssets.quick.dieta },
  { label: 'Evolução', href: '/evolucao', image: patientAssets.quick.evolucao },
  { label: 'Check-in', href: '/check-in', image: patientAssets.quick.checkin },
  { label: 'Bella IA', href: '/bella', image: patientAssets.quick.bella },
  { label: 'Vídeos', href: '/cursos', image: patientAssets.quick.videos },
  { label: 'Ebooks', href: '/ebooks', image: patientAssets.quick.ebooks },
  { label: 'Biblioteca', href: '/conteudo', image: patientAssets.quick.biblioteca },
  { label: 'Comunidade', href: '/comunidade', image: patientAssets.quick.comunidade },
] as const;
