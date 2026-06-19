import { Request, Response } from "express";
import { CheckInService } from "../services/checkin.service";
import { readPatientTimeHeaders } from "../utils/patient-timezone";

const checkInService = new CheckInService();

export class CheckInController {
  async getMine(req: Request, res: Response): Promise<any> {
    try {
      const data = await checkInService.getMyCheckIns(req.user!.id, readPatientTimeHeaders(req));
      return res.json(data);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async submit(req: Request, res: Response): Promise<any> {
    try {
      const checkIn = await checkInService.submitCheckIn(
        req.user!.id,
        req.body,
        readPatientTimeHeaders(req),
      );
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

  async getPatientCheckIns(req: Request, res: Response): Promise<any> {
    try {
      const data = await checkInService.getPatientCheckIns(req.params.userId);
      return res.json(data);
    } catch (error: any) {
      const status = error.message?.includes("não encontrado") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  async upsertPatientCheckIn(req: Request, res: Response): Promise<any> {
    try {
      const checkIn = await checkInService.upsertForPatient(req.params.userId, req.body);
      return res.json(checkIn);
    } catch (error: any) {
      const status = error.message?.includes("não encontrado") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }
  }
}
