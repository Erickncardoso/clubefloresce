import { Request, Response } from "express";
import { PatientGoalsService } from "../services/patient-goals.service";

const service = new PatientGoalsService();

export class PatientGoalsController {
  async getMine(req: Request, res: Response): Promise<any> {
    try {
      const data = await service.getForUser(req.user!.id);
      return res.json(data || { goals: [], progress: {} });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async saveMine(req: Request, res: Response): Promise<any> {
    try {
      const body = req.body || {};
      const data = await service.saveForUser(req.user!.id, {
        goals: Array.isArray(body.goals) ? body.goals : [],
        progress:
          body.progress && typeof body.progress === "object" ? body.progress : {},
      });
      return res.json(data);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
}
