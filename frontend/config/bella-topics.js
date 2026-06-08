export const BELLA_TOPIC_IDS = ['general', 'label', 'meal', 'restaurant', 'swap', 'ask', 'goal']

export function normalizeBellaTopic(raw) {
  const value = Array.isArray(raw)
    ? raw[0]
    : typeof raw === 'string'
      ? raw
      : ''
  const normalized = value.trim().toLowerCase()
  if (BELLA_TOPIC_IDS.includes(normalized)) return normalized
  return 'general'
}

export const BELLA_TOPICS = {
  general: {
    title: 'Bella',
    subtitle: 'Sua assistente nutricional',
    welcome: (name) => `Olá, ${name}! 💚 Como posso te ajudar hoje?`,
    placeholder: 'Digite sua mensagem...',
    taskHint: null,
    acceptPdf: true,
    acceptImages: true,
  },
  label: {
    title: 'Ler rótulo',
    subtitle: 'Envie a foto do rótulo',
    welcome: (name) =>
      `Olá, ${name}! 📋 Envie a foto do rótulo pelo clipe abaixo, ou descreva sua dúvida sobre o produto.`,
    placeholder: 'Descreva a dúvida ou envie a foto...',
    taskHint: 'label',
    acceptPdf: false,
    acceptImages: true,
  },
  meal: {
    title: 'Meu prato',
    subtitle: 'Calorias e nutrientes',
    welcome: (name) =>
      `Olá, ${name}! 📸 Envie a foto do seu prato de cima, com boa luz. Estimo gramas, calorias e macros de cada item.`,
    placeholder: 'Opcional: descreva a refeição...',
    taskHint: 'meal',
    acceptPdf: false,
    acceptImages: true,
  },
  restaurant: {
    title: 'Restaurante',
    subtitle: 'Escolhas mais equilibradas',
    welcome: (name) =>
      `Olá, ${name}! 🍽️ Me conte onde você está ou o tipo de restaurante. Ajudo a escolher opções mais equilibradas.`,
    placeholder: 'Ex.: estou num rodízio japonês...',
    taskHint: null,
    acceptPdf: true,
    acceptImages: true,
  },
  swap: {
    title: 'Substituir alimento',
    subtitle: 'Trocas práticas na dieta',
    welcome: (name) =>
      `Olá, ${name}! 🔄 Qual alimento você quer substituir? Me diga o que costuma comer e a restrição ou objetivo.`,
    placeholder: 'Ex.: quero trocar arroz branco por...',
    taskHint: null,
    acceptPdf: true,
    acceptImages: true,
  },
  ask: {
    title: 'Fazer pergunta',
    subtitle: 'Tire suas dúvidas',
    welcome: (name) => `Olá, ${name}! 💬 Pode perguntar. Estou aqui para ajudar com nutrição e hábitos.`,
    placeholder: 'Digite sua pergunta...',
    taskHint: null,
    acceptPdf: true,
    acceptImages: true,
  },
  goal: {
    title: 'Meta semanal',
    subtitle: 'Seu progresso recente',
    welcome: (name) =>
      `Olá, ${name}! 🎯 Vou olhar seus check-ins recentes e te ajudar com a meta da semana. O que você quer saber?`,
    placeholder: 'Ex.: como está minha aderência esta semana?',
    taskHint: null,
    acceptPdf: false,
    acceptImages: false,
  },
}

export function getBellaTopicConfig(topicId) {
  return BELLA_TOPICS[normalizeBellaTopic(topicId)]
}
