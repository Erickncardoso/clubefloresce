import { Request, Response } from "express";
import { CheckInTemplateService } from "../services/checkin-template.service";
import { CheckInDispatchService } from "../services/checkin-dispatch.service";
import { getWeekStart } from "../utils/week-start";

const service = new CheckInTemplateService();
const dispatchService = new CheckInDispatchService();

export class CheckInTemplateController {
  async listTemplates(req: Request, res: Response): Promise<any> {
    try {
      const templates = await service.listForNutri(req.user!.id);
      return res.json({ templates });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async listActive(req: Request, res: Response): Promise<any> {
    try {
      const { templates } = await service.listActiveForPatient(req.headers);
      const data = await service.enrichTemplatesForPatient(req.user!.id, templates, req.headers);
      return res.json(data);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async dispatchWeekly(req: Request, res: Response): Promise<any> {
    try {
      const force = Boolean(req.body?.force);
      const result = await dispatchService.dispatchWeeklyToAllPatients({ force });
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async dispatchStatus(req: Request, res: Response): Promise<any> {
    try {
      const periodKey = getWeekStart().toISOString();
      const dispatched = await dispatchService.wasDispatchedForPeriod(periodKey);
      return res.json({ periodKey, dispatched });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async subscribeReminder(req: Request, res: Response): Promise<any> {
    try {
      const result = await dispatchService.subscribeReminder(req.user!.id);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async createTemplate(req: Request, res: Response): Promise<any> {
    try {
      const template = await service.createTemplate(req.user!.id, req.body);
      return res.status(201).json(template);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async updateTemplate(req: Request, res: Response): Promise<any> {
    try {
      const template = await service.updateTemplate(req.params.id, req.user!.id, req.body);
      return res.json(template);
    } catch (error: any) {
      const status = error.message === "Acesso negado." ? 403 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  async deleteTemplate(req: Request, res: Response): Promise<any> {
    try {
      await service.deleteTemplate(req.params.id, req.user!.id);
      return res.status(204).send();
    } catch (error: any) {
      const status = error.message === "Acesso negado." ? 403 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  async getPatientContext(req: Request, res: Response): Promise<any> {
    try {
      const data = await service.getPatientContext(
        req.user!.id,
        req.params.templateId,
        req.headers,
      );
      return res.json(data);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async submitResponse(req: Request, res: Response): Promise<any> {
    try {
      const { templateId, answers } = req.body;
      if (!templateId) return res.status(400).json({ message: "templateId é obrigatório." });
      const response = await service.submitResponse(
        req.user!.id,
        templateId,
        answers || {},
        req.headers,
      );
      return res.status(201).json(response);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async listMyResponses(req: Request, res: Response): Promise<any> {
    try {
      const responses = await service.listMyResponses(req.user!.id);
      return res.json({ responses });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async getResponse(req: Request, res: Response): Promise<any> {
    try {
      const response = await service.getResponseById(req.params.id);
      return res.json(response);
    } catch (error: any) {
      const status = error.message === "Resposta não encontrada." ? 404 : 500;
      return res.status(status).json({ message: error.message });
    }
  }

  async listPatientResponses(req: Request, res: Response): Promise<any> {
    try {
      const responses = await service.listPatientResponses(req.params.userId);
      return res.json({ responses });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async listResponses(req: Request, res: Response): Promise<any> {
    try {
      const responses = await service.listResponsesForNutri();
      return res.json({ responses });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }
}
