import { PushSubscriptionRepository } from "../repositories/push-subscription.repository";
import { ensureVapidConfigured, getVapidPublicKey, webpush } from "../utils/vapid-config";
import { PatientPreferencesService } from "./patient-preferences.service";

const repo = new PushSubscriptionRepository();
const preferencesService = new PatientPreferencesService();

export type PushMessage = {
  title: string;
  body: string;
  url?: string | null;
  tag?: string | null;
};

export type PushSubscribePayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export class PushNotificationService {
  isEnabled() {
    return ensureVapidConfigured();
  }

  getPublicKey() {
    return getVapidPublicKey();
  }

  async subscribe(userId: string, payload: PushSubscribePayload, userAgent?: string) {
    if (!payload.endpoint?.trim()) {
      throw new Error("Subscription inválida.");
    }
    if (!payload.keys?.p256dh?.trim() || !payload.keys?.auth?.trim()) {
      throw new Error("Chaves da subscription inválidas.");
    }

    return repo.upsert({
      userId,
      endpoint: payload.endpoint.trim(),
      p256dh: payload.keys.p256dh.trim(),
      auth: payload.keys.auth.trim(),
      userAgent: userAgent?.trim() || null,
    });
  }

  async unsubscribe(userId: string, endpoint: string) {
    if (!endpoint?.trim()) {
      throw new Error("Endpoint inválido.");
    }
    await repo.deleteByEndpoint(userId, endpoint.trim());
  }

  async getStatus(userId: string) {
    const count = await repo.countByUser(userId);
    const preferences = await preferencesService.getPreferences(userId);
    return {
      enabled: this.isEnabled(),
      subscribed: count > 0,
      deviceCount: count,
      mealRemindersEnabled: preferences.mealRemindersEnabled,
      timezone: preferences.timezone,
    };
  }

  async syncTimezone(userId: string, timeZone?: string | null) {
    await preferencesService.syncTimezone(userId, timeZone);
  }

  async updatePreferences(userId: string, input: { mealRemindersEnabled?: boolean }) {
    if (typeof input.mealRemindersEnabled === "boolean") {
      await preferencesService.setMealRemindersEnabled(userId, input.mealRemindersEnabled);
    }
    return preferencesService.getPreferences(userId);
  }

  async sendToUser(userId: string, message: PushMessage) {
    if (!ensureVapidConfigured()) return { sent: 0, failed: 0 };

    const subscriptions = await repo.listByUser(userId);
    if (!subscriptions.length) return { sent: 0, failed: 0 };

    const payload = JSON.stringify({
      title: message.title,
      body: message.body,
      url: message.url || "/perfil/notificacoes",
      tag: message.tag || undefined,
      icon: "/pwa/icon-192.png",
    });

    let sent = 0;
    let failed = 0;

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload,
            { TTL: 60 * 60 * 24 },
          );
          sent += 1;
        } catch (error: any) {
          failed += 1;
          const status = error?.statusCode;
          if (status === 404 || status === 410) {
            await repo.deleteByEndpoint(userId, sub.endpoint);
          }
        }
      }),
    );

    return { sent, failed };
  }
}

const pushNotificationService = new PushNotificationService();

export function dispatchPushToUser(userId: string, message: PushMessage) {
  void pushNotificationService.sendToUser(userId, message).catch((error) => {
    console.warn("[Push] Falha ao enviar:", error?.message || error);
  });
}
