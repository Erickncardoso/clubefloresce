import { Request, Response } from "express";
import { NotificationService } from "../services/notification.service";
import { AdminPushService } from "../services/admin-push.service";

const service = new NotificationService();
const adminPush = new AdminPushService();

export class NotificationController {
  async listMine(req: Request, res: Response): Promise<any> {
    try {
      const data = await service.listForUser(req.user!.id);
      return res.json(data);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Erro ao carregar notificações." });
    }
  }

  async markRead(req: Request, res: Response): Promise<any> {
    try {
      const unreadCount = await service.markRead(req.user!.id, req.params.id);
      return res.json({ unreadCount });
    } catch (error: any) {
      const status = error.message?.includes("não encontrada") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  async markAllRead(req: Request, res: Response): Promise<any> {
    try {
      const unreadCount = await service.markAllRead(req.user!.id);
      return res.json({ unreadCount });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Erro ao marcar notificações." });
    }
  }

  async sendFromAdmin(req: Request, res: Response): Promise<any> {
    try {
      const result = await adminPush.createCampaign({
        authorId: req.user!.id,
        userId: req.body?.userId,
        userIds: req.body?.userIds,
        title: req.body?.title,
        body: req.body?.body,
        type: req.body?.type,
        actionPath: req.body?.actionPath,
        imageUrl: req.body?.imageUrl,
        buttonKey: req.body?.buttonKey,
        audience: req.body?.audience,
        scheduledAt: req.body?.scheduledAt,
      });
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({
        message: error.message || "Não foi possível enviar a notificação.",
      });
    }
  }

  async listCampaigns(req: Request, res: Response): Promise<any> {
    try {
      const items = await adminPush.listCampaigns(req.user!.id);
      return res.json({ items });
    } catch (error: any) {
      return res.status(500).json({
        message: error.message || "Não foi possível carregar os envios.",
      });
    }
  }

  async cancelCampaign(req: Request, res: Response): Promise<any> {
    try {
      const result = await adminPush.cancelCampaign(req.user!.id, req.params.id);
      return res.json(result);
    } catch (error: any) {
      const status = error.message?.includes("não encontrado") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }
  }
}
