export type NotificationLogicalKey =
  | `user:${string}`
  | 'factory:weekly-checkin'
  | 'factory:empty-diary'
  | 'factory:streak-7'
  | 'factory:reengagement'
  | 'factory:onboarding-recovery'
  | 'factory:onboarding-complete'
  | 'factory:checkin-draft';

export type ScheduledRegistryEntry = {
  logicalKey: NotificationLogicalKey;
  notificationId: string;
  scheduledFor: string;
};

export type UserReminder = {
  id: string;
  label: string;
  hour: number;
  minute: number;
  weekdays: number[];
  route: string;
  enabled: boolean;
};

export type NotificationPayload = {
  route: string;
  logicalKey: NotificationLogicalKey;
};
