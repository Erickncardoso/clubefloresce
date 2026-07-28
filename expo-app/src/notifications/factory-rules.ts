/** Regras de fábrica — edite horários, limites e textos aqui. */

export const NOTIFICATION_TEST_MODE = __DEV__ && false;

export const FACTORY_LIMITS = {
  maxPerDay: 3,
  quietStartHour: 22,
  quietEndHour: 8,
  reengagementDays: NOTIFICATION_TEST_MODE ? 0.003 : 4,
  onboardingRecoveryHours: NOTIFICATION_TEST_MODE ? 0.033 : 24,
  checkinDraftRecoveryHours: NOTIFICATION_TEST_MODE ? 0.05 : 3,
} as const;

export const FACTORY_SCHEDULE = {
  weeklyCheckin: { weekday: 6, hour: 10, minute: 0 },
  emptyDiary: { hour: 12, minute: 30 },
} as const;

export type FactoryMessage = {
  title: string;
  body: string;
  route: string;
  channelId: 'reminders' | 'motivation';
};

export const FACTORY_MESSAGES = {
  weeklyCheckin: {
    title: 'Como foi sua semana?',
    body: 'Registre sua evolução antes de segunda-feira.',
    route: '/check-in',
    channelId: 'reminders',
  },
  emptyDiary: {
    title: 'Seu diário te espera',
    body: 'Um minutinho para registrar o que você comeu hoje.',
    route: '/dieta',
    channelId: 'reminders',
  },
  streak7: {
    title: 'Seu jardim floresceu',
    body: '7 dias de presença no Clube. Continue assim.',
    route: '/inicio',
    channelId: 'motivation',
  },
  reengagement: {
    title: 'O Clube te espera',
    body: 'Volte quando quiser — sua jornada não parou.',
    route: '/inicio',
    channelId: 'motivation',
  },
  onboardingRecovery: {
    title: 'Continue de onde parou',
    body: 'Seus dados iniciais ainda estão esperando você.',
    route: '/onboarding',
    channelId: 'reminders',
  },
  checkinDraftRecovery: {
    title: 'Só falta enviar',
    body: 'Seu check-in está salvo pela metade. Finalize em poucos toques.',
    route: '/check-in/responder',
    channelId: 'reminders',
  },
  onboardingComplete: {
    title: 'Clube Florescer',
    body: 'Notificações ativas! Este é um aviso de teste — em breve você recebe lembretes por aqui.',
    route: '/inicio',
    channelId: 'motivation',
  },
  userReminderDefaultBody: 'Seu momento chegou — abra o app quando puder.',
} as const;

export type FactoryRuleKey = keyof typeof FACTORY_MESSAGES | 'userReminder';
