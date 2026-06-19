export const BELLA_TOPIC_IDS = ['general', 'label', 'meal', 'restaurant', 'swap', 'ask']

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
    subtitle: 'Classificação do consumo',
    welcome: (name) =>
      `Olá, ${name}! 📋 Envie a foto do rótulo pelo clipe. Classifico o consumo: 🟢 liberado, 🟡 moderar ou 🔴 evitar frequente.`,
    placeholder: 'Descreva a dúvida ou envie a foto...',
    taskHint: 'label',
    acceptPdf: false,
    acceptImages: true,
  },
  meal: {
    title: 'Meu prato',
    subtitle: 'Registre no diário de hoje',
    welcome: (name) =>
      `Olá, ${name}! 📸 Escolha a refeição logo abaixo e envie a foto do prato. Estimo gramas, calorias e macros; você confirma e registro no diário de hoje.`,
    placeholder: 'Opcional: descreva a refeição...',
    taskHint: 'meal',
    acceptPdf: false,
    acceptImages: true,
  },
  restaurant: {
    title: 'Restaurante',
    subtitle: 'Melhor opção no seu plano',
    welcome: (name) =>
      `Olá, ${name}! 🍽️ Mande foto do cardápio ou as opções que você quer comer. Sugiro a melhor escolha alinhada ao seu plano alimentar (japonesa, italiana, mexicana, brasileira e mais).`,
    placeholder: 'Ex.: estou entre salmão grelhado e yakisoba...',
    taskHint: null,
    acceptPdf: true,
    acceptImages: true,
  },
  swap: {
    title: 'Substituir alimento',
    subtitle: 'Trocas alinhadas ao seu plano',
    welcome: (name) =>
      `Olá, ${name}! 🔄 Vou te ajudar a substituir um alimento do seu plano com porções equivalentes em calorias e macros.`,
    placeholder: 'Use os botões para escolher refeição e alimento',
    taskHint: null,
    acceptPdf: false,
    acceptImages: false,
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
}

export function getBellaTopicConfig(topicId) {
  return BELLA_TOPICS[normalizeBellaTopic(topicId)]
}
