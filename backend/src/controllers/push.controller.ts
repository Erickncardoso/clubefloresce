import { Request, Response } from "express";
import { PushNotificationService } from "../services/push-notification.service";
import { readPatientTimeHeaders } from "../utils/patient-timezone";

const pushService = new PushNotificationService();

export class PushController {
  async getPublicKey(_req: Request, res: Response): Promise<any> {
    const publicKey = pushService.getPublicKey();
    if (!publicKey) {
      return res.status(503).json({ message: "Push não configurado no servidor." });
    }
    return res.json({ publicKey, enabled: true });
  }

  async getStatus(req: Request, res: Response): Promise<any> {
    try {
      const headers = readPatientTimeHeaders(req);
      await pushService.syncTimezone(req.user!.id, headers.patientTimeZone);
      const status = await pushService.getStatus(req.user!.id);
      return res.json(status);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async subscribe(req: Request, res: Response): Promise<any> {
    try {
      if (!pushService.isEnabled()) {
        return res.status(503).json({ message: "Push não configurado no servidor." });
      }

      const endpoint = typeof req.body.endpoint === "string" ? req.body.endpoint : "";
      const keys = req.body.keys || {};

      const subscription = await pushService.subscribe(
        req.user!.id,
        {
          endpoint,
          keys: {
            p256dh: typeof keys.p256dh === "string" ? keys.p256dh : "",
            auth: typeof keys.auth === "string" ? keys.auth : "",
          },
        },
        req.header("user-agent") || undefined,
      );

      const headers = readPatientTimeHeaders(req);
      await pushService.syncTimezone(req.user!.id, headers.patientTimeZone);

      return res.status(201).json({ ok: true, id: subscription.id });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async unsubscribe(req: Request, res: Response): Promise<any> {
    try {
      const endpoint = typeof req.body.endpoint === "string" ? req.body.endpoint : "";
      await pushService.unsubscribe(req.user!.id, endpoint);
      return res.json({ ok: true });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async updatePreferences(req: Request, res: Response): Promise<any> {
    try {
      const mealRemindersEnabled = req.body?.mealRemindersEnabled;
      if (typeof mealRemindersEnabled !== "boolean") {
        return res.status(400).json({ message: "Informe mealRemindersEnabled (boolean)." });
      }

      const headers = readPatientTimeHeaders(req);
      await pushService.syncTimezone(req.user!.id, headers.patientTimeZone);

      const preferences = await pushService.updatePreferences(req.user!.id, {
        mealRemindersEnabled,
      });

      return res.json(preferences);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async syncTimezone(req: Request, res: Response): Promise<any> {
    try {
      const headers = readPatientTimeHeaders(req);
      await pushService.syncTimezone(req.user!.id, headers.patientTimeZone);
      const preferences = await pushService.getStatus(req.user!.id);
      return res.json({
        timezone: preferences.timezone,
        mealRemindersEnabled: preferences.mealRemindersEnabled,
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
}
