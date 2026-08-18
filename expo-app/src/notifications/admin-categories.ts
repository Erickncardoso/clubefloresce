export const ADMIN_PUSH_CATEGORIES = [
  { id: 'admin-open', title: 'Abrir' },
  { id: 'admin-see', title: 'Ver agora' },
  { id: 'admin-checkin', title: 'Fazer check-in' },
  { id: 'admin-bella', title: 'Falar com Bella' },
  { id: 'admin-diary', title: 'Ver diário' },
] as const;

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
}
