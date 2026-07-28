export const BELLA_TOPIC_IDS = ['general', 'label', 'meal', 'receipt', 'restaurant', 'swap', 'ask'] as const;

export type BellaTopicId = (typeof BELLA_TOPIC_IDS)[number] | 'meal-photo';

export type BellaTopicConfig = {
  title: string;
  subtitle: string;
  welcome: (name: string) => string;
  placeholder: string;
  taskHint: string | null;
  acceptPdf: boolean;
  acceptImages: boolean;
};

export function normalizeBellaTopic(raw?: string | string[] | null): BellaTopicId {
  const value = Array.isArray(raw) ? raw[0] : typeof raw === 'string' ? raw : '';
  const normalized = value.trim().toLowerCase();
  if (normalized === 'meal-photo') return 'meal';
  if ((BELLA_TOPIC_IDS as readonly string[]).includes(normalized)) {
    return normalized as BellaTopicId;
  }
  return 'general';
}

export const BELLA_TOPICS: Record<string, BellaTopicConfig> = {
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
      `Olá, ${name}! 📋 Envie a foto do rótulo. Classifico o consumo: 🟢 liberado, 🟡 moderar ou 🔴 evitar frequente.`,
    placeholder: 'Descreva a dúvida ou envie a foto...',
    taskHint: 'label',
    acceptPdf: false,
    acceptImages: true,
  },
  meal: {
    title: 'Meu prato',
    subtitle: 'Registre no diário de hoje',
    welcome: (name) =>
      `Olá, ${name}! 📸 Escolha a refeição abaixo e envie a foto do prato para registrar no diário de hoje.`,
    placeholder: 'Opcional: descreva a refeição...',
    taskHint: 'meal',
    acceptPdf: false,
    acceptImages: true,
  },
  receipt: {
    title: 'Cupom / fatura',
    subtitle: 'Vincule à base TBCA/TACO',
    welcome: (name) =>
      `Olá, ${name}! 🧾 Envie a foto do cupom ou fatura. Extraio os alimentos para você confirmar.`,
    placeholder: 'Opcional: diga o mercado ou o que comprou...',
    taskHint: 'receipt',
    acceptPdf: false,
    acceptImages: true,
  },
  restaurant: {
    title: 'Restaurante',
    subtitle: 'Melhor opção no seu plano',
    welcome: (name) =>
      `Olá, ${name}! 🍽️ Mande foto do cardápio ou as opções que você quer comer.`,
    placeholder: 'Ex.: estou entre salmão grelhado e yakisoba...',
    taskHint: null,
    acceptPdf: true,
    acceptImages: true,
  },
  swap: {
    title: 'Substituir alimento',
    subtitle: 'Trocas alinhadas ao seu plano',
    welcome: (name) =>
      `Olá, ${name}! 🔄 Vou te ajudar a substituir um alimento do seu plano.`,
    placeholder: 'Use os botões para escolher refeição e alimento',
    taskHint: null,
    acceptPdf: false,
    acceptImages: false,
  },
  ask: {
    title: 'Fazer pergunta',
    subtitle: 'Tire suas dúvidas',
    welcome: (name) => `Olá, ${name}! 💬 Pode perguntar. Estou aqui para ajudar.`,
    placeholder: 'Digite sua pergunta...',
    taskHint: null,
    acceptPdf: true,
    acceptImages: true,
  },
};

export function getBellaTopicConfig(topicId: string): BellaTopicConfig {
  return BELLA_TOPICS[normalizeBellaTopic(topicId)] || BELLA_TOPICS.general;
}
