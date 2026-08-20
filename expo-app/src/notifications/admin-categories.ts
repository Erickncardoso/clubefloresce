export const ADMIN_PUSH_CATEGORIES = [
  { id: 'admin-open', title: 'Abrir' },
  { id: 'admin-see', title: 'Ver agora' },
  { id: 'admin-checkin', title: 'Fazer check-in' },
  { id: 'admin-bella', title: 'Falar com Bella' },
  { id: 'admin-diary', title: 'Ver diário' },
] as const;

export const MEAL_REMINDER_CATEGORY = {
  id: 'meal-reminder',
  actions: [
    { id: 'meal-reminder-open', title: 'Ver refeição' },
    { id: 'meal-reminder-items', title: 'Ver todos os itens' },
  ],
} as const;

export async function registerAdminPushCategories(
  Notifications: typeof import('expo-notifications'),
) {
  for (const category of ADMIN_PUSH_CATEGORIES) {
    await Notifications.setNotificationCategoryAsync(category.id, [
      {
        identifier: category.id,
        buttonTitle: category.title,
        options: { opensAppToForeground: true },
      },
    ]);
  }

  await Notifications.setNotificationCategoryAsync(MEAL_REMINDER_CATEGORY.id, [
    {
      identifier: MEAL_REMINDER_CATEGORY.actions[0].id,
      buttonTitle: MEAL_REMINDER_CATEGORY.actions[0].title,
      options: { opensAppToForeground: true },
    },
    {
      identifier: MEAL_REMINDER_CATEGORY.actions[1].id,
      buttonTitle: MEAL_REMINDER_CATEGORY.actions[1].title,
      options: { opensAppToForeground: true },
    },
  ]);
}
