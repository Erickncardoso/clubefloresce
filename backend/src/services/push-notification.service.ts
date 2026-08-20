import { PushSubscriptionRepository } from "../repositories/push-subscription.repository";
import { ensureVapidConfigured, getVapidPublicKey, webpush } from "../utils/vapid-config";
import {
  expoEndpointFromToken,
  expoTokenFromEndpoint,
  isExpoPushEndpoint,
  isExpoPushToken,
  sendExpoPushMessage,
} from "../utils/expo-push";
import { PatientPreferencesService, isPushCategoryEnabled } from "./patient-preferences.service";
import { prisma } from "../lib/prisma";
import type { PatientProfileData } from "../types/patient-profile.types";

const repo = new PushSubscriptionRepository();
const preferencesService = new PatientPreferencesService();

export type PushMessage = {
  title: string;
  body: string;
  subtitle?: string | null;
  url?: string | null;
  tag?: string | null;
  imageUrl?: string | null;
  categoryId?: string | null;
  buttonLabel?: string | null;
  type?: string | null;
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
      diarySocialPushEnabled: preferences.diarySocialPushEnabled,
      pushCategories: preferences.pushCategories,
      timezone: preferences.timezone,
    };
  }

  async subscribeExpoToken(userId: string, token: string, userAgent?: string) {
    const normalized = String(token || "").trim();
    if (!isExpoPushToken(normalized)) {
      throw new Error("Token Expo inválido.");
    }

    const ua = userAgent?.trim() || "expo-ios";
    const endpoint = expoEndpointFromToken(normalized);

    const subscription = await repo.upsert({
      userId,
      endpoint,
      p256dh: "expo",
      auth: "expo",
      userAgent: ua,
    });

    await this.pruneOtherExpoTokens(userId, endpoint);

    return subscription;
  }

  /** Um token Expo por usuário — evita push duplicado no mesmo aparelho. */
  private async pruneOtherExpoTokens(userId: string, keepEndpoint: string) {
    const subs = await repo.listByUser(userId);
    await Promise.all(
      subs
        .filter((sub) => isExpoPushEndpoint(sub.endpoint) && sub.endpoint !== keepEndpoint)
        .map((sub) => repo.deleteByEndpoint(userId, sub.endpoint)),
    );
  }

  async unsubscribeExpoToken(userId: string, token: string) {
    const endpoint = expoEndpointFromToken(token);
    if (!endpoint) throw new Error("Token inválido.");
    await repo.deleteByEndpoint(userId, endpoint);
  }

  async syncTimezone(userId: string, timeZone?: string | null) {
    await preferencesService.syncTimezone(userId, timeZone);
  }

  async updatePreferences(
    userId: string,
    input: {
      mealRemindersEnabled?: boolean;
      diarySocialPushEnabled?: boolean;
      categories?: Record<string, boolean>;
    },
  ) {
    if (input.categories && typeof input.categories === "object") {
      await preferencesService.setPushCategories(userId, input.categories);
    }
    if (typeof input.mealRemindersEnabled === "boolean") {
      await preferencesService.setMealRemindersEnabled(userId, input.mealRemindersEnabled);
    }
    if (typeof input.diarySocialPushEnabled === "boolean") {
      await preferencesService.setDiarySocialPushEnabled(userId, input.diarySocialPushEnabled);
    }
    return preferencesService.getPreferences(userId);
  }

  async sendToUser(userId: string, message: PushMessage) {
    if (message.type) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { patientProfileData: true },
      });
      const profile = (user?.patientProfileData || {}) as PatientProfileData;
      if (!isPushCategoryEnabled(profile, message.type)) {
        return { sent: 0, failed: 0 };
      }
    }

    const subscriptions = await repo.listByUser(userId);
    if (!subscriptions.length) return { sent: 0, failed: 0 };

    const vapidReady = ensureVapidConfigured();
    let sent = 0;
    let failed = 0;

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          if (isExpoPushEndpoint(sub.endpoint)) {
            const result = await sendExpoPushMessage({
              token: expoTokenFromEndpoint(sub.endpoint),
              title: message.title,
              body: message.body,
              subtitle: message.subtitle,
              url: message.url,
              tag: message.tag,
              imageUrl: message.imageUrl,
              categoryId: message.categoryId,
            });
            if (result.deviceNotRegistered) {
              await repo.deleteByEndpoint(userId, sub.endpoint);
              failed += 1;
              return;
            }
            if (!result.ok) {
              failed += 1;
              return;
            }
            sent += 1;
            return;
          }

          if (!vapidReady) {
            failed += 1;
            return;
          }

          const payload = JSON.stringify({
            title: message.title,
            body: message.body,
            url: message.url || "/perfil/notificacoes",
            tag: message.tag || undefined,
            icon: message.imageUrl || "/pwa/icon-192.png",
            image: message.imageUrl || undefined,
            buttonLabel: message.buttonLabel || undefined,
          });

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
