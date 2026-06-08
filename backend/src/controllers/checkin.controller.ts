import { Request, Response } from "express";
import { CheckInService } from "../services/checkin.service";

const checkInService = new CheckInService();

export class CheckInController {
  async getMine(req: Request, res: Response): Promise<any> {
    try {
      const data = await checkInService.getMyCheckIns(req.user!.id);
      return res.json(data);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async submit(req: Request, res: Response): Promise<any> {
    try {
      const checkIn = await checkInService.submitCheckIn(req.user!.id, req.body);
      return res.status(201).json(checkIn);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async listPatients(req: Request, res: Response): Promise<any> {
    try {
      const list = await checkInService.listForNutricionista();
      return res.json(list);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }
}
