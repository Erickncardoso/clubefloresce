import { Request, Response } from "express";
import { BellaService } from "../services/bella.service";
import { BellaOrchestratorService } from "../services/bella/bella-orchestrator.service";
import { BELLA_TOPICS } from "../services/bella/topic-config";
import { readPatientTimeHeaders, resolvePatientDateKey } from "../utils/patient-timezone";

const bellaService = new BellaService();
const orchestrator = new BellaOrchestratorService();

export class BellaController {
  async getStatus(_req: Request, res: Response): Promise<any> {
    const models = orchestrator.getModels();
    return res.json({
      aiEnabled: orchestrator.isAiEnabled(),
      models,
      tasks: {
        chat: { model: models.chat, accepts: ["text"] },
        image: { model: models.image, accepts: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
        pdf: { model: models.pdf, accepts: ["application/pdf"] },
      },
      tools: [
        "get_user_profile",
        "get_checkin_summary",
        "list_recommended_courses",
        "search_educational_content",
        "get_patient_meal_plan",
        "get_daily_diary_summary",
      ],
      topics: BELLA_TOPICS,
    });
  }

  async getMessages(req: Request, res: Response): Promise<any> {
    try {
      const topic = typeof req.query.topic === "string" ? req.query.topic : undefined;
      const dateKey = resolvePatientDateKey(readPatientTimeHeaders(req));
      const data = await bellaService.getMessages(req.user!.id, topic, dateKey);
      return res.json(data);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async chat(req: Request, res: Response): Promise<any> {
    try {
      const message = typeof req.body.message === "string" ? req.body.message : "";
      const topic = typeof req.body.topic === "string" ? req.body.topic : undefined;
      const taskHint = typeof req.body.taskHint === "string" ? req.body.taskHint : undefined;
      const mealType = typeof req.body.mealType === "string" ? req.body.mealType : undefined;
      const mealLabel = typeof req.body.mealLabel === "string" ? req.body.mealLabel : undefined;
      const file = req.file;

      const dateKey = resolvePatientDateKey(readPatientTimeHeaders(req));

      const result = await bellaService.chat(req.user!.id, {
        message,
        topic,
        taskHint,
        mealType,
        mealLabel,
        file,
      }, dateKey);
      return res.json(result);
    } catch (error: any) {
      const status = error.name === "OpenAIApiError" ? 502 : 400;
      return res.status(status).json({ message: error.message });
    }
  }
}
