import { Request, Response } from "express";
import { CommunityBlockService } from "../services/community-block.service";

const service = new CommunityBlockService();

export class CommunityBlockController {
  async listMine(req: Request, res: Response): Promise<any> {
    try {
      const data = await service.listMine(req.user!.id);
      return res.json(data);
    } catch (error: any) {
      return res.status(400).json({ message: error.message || "Não foi possível carregar bloqueios." });
    }
  }

  async block(req: Request, res: Response): Promise<any> {
    try {
      const data = await service.block(req.user!.id, req.params.userId);
      return res.status(201).json(data);
    } catch (error: any) {
      const message = error?.message || "Não foi possível bloquear o membro.";
      const status = message.includes("não encontrado") ? 404 : 400;
      return res.status(status).json({ message });
    }
  }
}
