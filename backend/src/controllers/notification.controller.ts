import { Request, Response } from "express";
import { NotificationService } from "../services/notification.service";

const service = new NotificationService();

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
}
