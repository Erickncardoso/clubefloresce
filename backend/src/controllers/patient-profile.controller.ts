import { Request, Response } from "express";
import { PatientProfileService } from "../services/patient-profile.service";

const service = new PatientProfileService();

export class PatientProfileController {
  async getMine(req: Request, res: Response): Promise<any> {
    try {
      const data = await service.getMine(req.user!.id);
      return res.json(data);
    } catch (error: any) {
      return res.status(400).json({ message: error.message || "Não foi possível carregar o perfil." });
    }
  }

  async saveMine(req: Request, res: Response): Promise<any> {
    try {
      const complete = Boolean(req.body?.complete);
      const data = await service.saveMine(req.user!.id, req.body ?? {}, complete);
      return res.json(data);
    } catch (error: any) {
      return res.status(400).json({ message: error.message || "Não foi possível salvar o perfil." });
    }
  }
}
