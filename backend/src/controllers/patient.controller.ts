import { Request, Response } from "express";
import { PatientOverviewService } from "../services/patient-overview.service";
import { MealPlanService } from "../services/meal-plan/meal-plan.service";
import { FoodDiaryService } from "../services/food-diary.service";
import { PatientGoalsService } from "../services/patient-goals.service";
import { EngagementZonesService } from "../services/engagement-zones.service";
import { dangerZoneWhatsappService } from "../services/danger-zone-whatsapp.service";
import { anamneseTranscriptionService } from "../services/anamnese-transcription.service";
import {
  createAnamneseTranscriptionJob,
  getAnamneseTranscriptionJob,
} from "../services/anamnese-transcription-jobs.service";
import { documentoRewriteService } from "../services/documento-rewrite.service";
import { videoCallService } from "../services/video-call.service";
import { assertPatientUser } from "../utils/patient-access";
import { mapDatabaseError } from "../utils/db-errors";
import { prisma } from "../lib/prisma";
import { FoodDiarySocialRepository } from "../repositories/food-diary-social.repository";

const overviewService = new PatientOverviewService();
const mealPlanService = new MealPlanService();
const foodDiaryService = new FoodDiaryService();
const patientGoalsService = new PatientGoalsService();
const engagementZonesService = new EngagementZonesService();

export class PatientController {
  async getEngagementZones(_req: Request, res: Response): Promise<any> {
    try {
      const data = await engagementZonesService.getZonesForNutri();
      return res.json(data);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Erro ao calcular engajamento." });
    }
  }

  async startDangerZoneWhatsapp(req: Request, res: Response): Promise<any> {
    try {
      const message = typeof req.body?.message === "string" ? req.body.message : undefined;
      const data = await dangerZoneWhatsappService.startBroadcast(req.user!.id, message);
      return res.json(data);
    } catch (error: any) {
      return res.status(400).json({ message: error.message || "Falha ao iniciar envio." });
    }
  }

  async getDangerZoneWhatsappStatus(req: Request, res: Response): Promise<any> {
    try {
      const job = dangerZoneWhatsappService.getJobStatus(req.user!.id);
      return res.json({ job });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Falha ao consultar status." });
    }
  }

  async cancelDangerZoneWhatsapp(req: Request, res: Response): Promise<any> {
    try {
      const data = dangerZoneWhatsappService.cancelBroadcast(req.user!.id);
      return res.json(data);
    } catch (error: any) {
      return res.status(400).json({ message: error.message || "Falha ao cancelar envio." });
    }
  }

  async getOverview(req: Request, res: Response): Promise<any> {
    try {
      const data = await overviewService.getOverview(req.params.id);
      return res.json(data);
    } catch (error: any) {
      const dbMessage = mapDatabaseError(error);
      if (dbMessage) {
        return res.status(503).json({ message: dbMessage });
      }
      const status = error.message?.includes("não encontrado") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  async getFoodDiary(req: Request, res: Response): Promise<any> {
    try {
      const limit = Math.min(Number(req.query.limit) || 20, 50);
      const entries = await overviewService.getFoodDiaryRecent(req.params.id, limit);
      return res.json({ entries });
    } catch (error: any) {
      const status = error.message?.includes("não encontrado") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  async getMealPlan(req: Request, res: Response): Promise<any> {
    try {
      await assertPatientUser(req.params.id);
      const plan = await mealPlanService.getForUser(req.params.id);
      return res.json({ plan });
    } catch (error: any) {
      const status = error.message?.includes("não encontrado") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  async streamMealPlanPdf(req: Request, res: Response): Promise<any> {
    try {
      await assertPatientUser(req.params.id);
      const plan = await mealPlanService.getForUser(req.params.id);
      const pdfUrl = String(plan?.pdfUrl || "").trim();
      if (!pdfUrl) {
        return res.status(404).json({ message: "PDF do plano alimentar não encontrado." });
      }

      const upstream = await fetch(pdfUrl);
      if (!upstream.ok) {
        return res.status(502).json({ message: "Não foi possível baixar o PDF do armazenamento." });
      }

      const buffer = Buffer.from(await upstream.arrayBuffer());
      const fileName = String(plan?.fileName || "plano-alimentar.pdf").replace(/"/g, "");

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Length", String(buffer.length));
      res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
      res.setHeader("Cache-Control", "private, max-age=120");
      res.setHeader("X-Content-Type-Options", "nosniff");
      return res.send(buffer);
    } catch (error: any) {
      const status = error.message?.includes("não encontrado") ? 404 : 500;
      return res.status(status).json({
        message: error.message || "Não foi possível abrir o PDF.",
      });
    }
  }

  async transcribeAnamnese(req: Request, res: Response): Promise<any> {
    try {
      const patient = await assertPatientUser(req.params.id);
      const nutri = req.user;
      if (!nutri?.id) return res.status(401).json({ message: "Não autorizado." });
      if (!req.file) {
        return res.status(400).json({ message: "Envie o áudio da anamnese." });
      }

      const anamneseTitle = typeof req.body?.anamneseTitle === "string" ? req.body.anamneseTitle : "";
      const job = createAnamneseTranscriptionJob({
        nutriId: nutri.id,
        patientId: patient.id,
        patientName: patient.name,
        anamneseTitle,
        file: {
          buffer: req.file.buffer,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
        },
      });

      return res.status(202).json({
        jobId: job.id,
        status: job.status,
        message: "Transcrição enfileirada. Você será avisado quando estiver pronta.",
      });
    } catch (error: any) {
      console.error("[AnamneseWhisper] transcribe enqueue error:", error?.message || error);
      const message = String(error?.message || "Não foi possível enfileirar a transcrição.");
      const status = /OPENAI_API_KEY|indisponível/i.test(message)
        ? 503
        : message.includes("não encontrado")
          ? 404
          : 400;
      return res.status(status).json({ message });
    }
  }

  async getAnamneseTranscriptionJob(req: Request, res: Response): Promise<any> {
    try {
      await assertPatientUser(req.params.id);
      const nutri = req.user;
      if (!nutri?.id) return res.status(401).json({ message: "Não autorizado." });

      const job = getAnamneseTranscriptionJob(req.params.jobId, nutri.id);
      if (!job || job.patientId !== req.params.id) {
        return res.status(404).json({ message: "Job de transcrição não encontrado." });
      }

      return res.json({
        jobId: job.id,
        status: job.status,
        text: job.text,
        error: job.error,
        patientId: job.patientId,
        patientName: job.patientName,
        anamneseTitle: job.anamneseTitle,
        completedAt: job.completedAt,
      });
    } catch (error: any) {
      const status = error.message?.includes("não encontrado") ? 404 : 500;
      return res.status(status).json({ message: error.message || "Erro ao consultar transcrição." });
    }
  }

  async interpretAnamnese(req: Request, res: Response): Promise<any> {
    try {
      const patient = await assertPatientUser(req.params.id);
      const title = typeof req.body?.title === "string" ? req.body.title : "";
      const content = typeof req.body?.content === "string" ? req.body.content : "";

      const result = await anamneseTranscriptionService.interpretAnamnese({
        userId: patient.id,
        title,
        content,
        patientName: patient.name,
      });

      return res.json({
        interpretation: result.interpretation,
        message: "Interpretação concluída.",
      });
    } catch (error: any) {
      const status = /OPENAI_API_KEY|indisponível/i.test(String(error?.message || ""))
        ? 503
        : error.message?.includes("não encontrado")
          ? 404
          : 400;
      return res.status(status).json({
        message: error.message || "Não foi possível interpretar a anamnese.",
      });
    }
  }

  async rewriteDocumento(req: Request, res: Response): Promise<any> {
    try {
      const patient = await assertPatientUser(req.params.id);
      const html = typeof req.body?.html === "string" ? req.body.html : "";
      const modeRaw = typeof req.body?.mode === "string" ? req.body.mode : "formal";
      const mode = modeRaw === "simple" || modeRaw === "custom" ? modeRaw : "formal";
      const instruction = typeof req.body?.instruction === "string" ? req.body.instruction : "";
      const documentTitle = typeof req.body?.documentTitle === "string" ? req.body.documentTitle : "";

      const result = await documentoRewriteService.rewrite({
        html,
        mode,
        instruction,
        documentTitle,
        patientName: patient.name,
      });

      return res.json({
        html: result.html,
        message: "Reescrita concluída.",
      });
    } catch (error: any) {
      const status = /OPENAI_API_KEY|indisponível/i.test(String(error?.message || ""))
        ? 503
        : error.message?.includes("não encontrado")
          ? 404
          : 400;
      return res.status(status).json({
        message: error.message || "Não foi possível reescrever o trecho.",
      });
    }
  }

  async uploadMealPlan(req: Request, res: Response): Promise<any> {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Envie o PDF do planejamento alimentar." });
      }

      await assertPatientUser(req.params.id);
      const result = await mealPlanService.uploadAndSave(req.params.id, {
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });

      return res.json({
        message: "Plano alimentar importado com sucesso.",
        plan: result.plan,
        user: result.user,
        nutritionTargets: result.nutritionTargets,
      });
    } catch (error: any) {
      const status = error.message?.includes("não encontrado") ? 404 : 400;
      return res.status(status).json({ message: error.message || "Não foi possível processar o PDF." });
    }
  }

  async saveMealPlanFromEditor(req: Request, res: Response): Promise<any> {
    try {
      await assertPatientUser(req.params.id);
      const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
      const plan = req.body?.plan;
      if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
        return res.status(400).json({ message: "Plano alimentar inválido." });
      }
      if (!Array.isArray((plan as { meals?: unknown }).meals)) {
        return res.status(400).json({ message: "Informe ao menos uma refeição." });
      }

      const result = await mealPlanService.saveFromEditor(req.params.id, {
        title: title || String((plan as { title?: unknown }).title || ""),
        plan: plan as import("../types/meal-plan.types").ParsedMealPlan,
      });

      return res.json({
        message: "Plano alimentar publicado para o paciente.",
        plan: result.plan,
        user: result.user,
        nutritionTargets: result.nutritionTargets,
      });
    } catch (error: any) {
      const status = error.message?.includes("não encontrado") ? 404 : 400;
      return res.status(status).json({ message: error.message || "Não foi possível salvar o plano." });
    }
  }

  async getFoodDiaryMonth(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.params.id;
      await assertPatientUser(userId);
      const fallback = new Date().toISOString().slice(0, 10);
      const year = Number(req.query.year) || Number(fallback.slice(0, 4));
      const month = Number(req.query.month) || Number(fallback.slice(5, 7));
      const data = await foodDiaryService.getMonthSummary(userId, year, month);
      return res.json(data);
    } catch (error: any) {
      const status = error.message?.includes("não encontrado") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  async getFoodDiaryDay(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.params.id;
      await assertPatientUser(userId);
      const dateKey =
        typeof req.query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
          ? req.query.date
          : new Date().toISOString().slice(0, 10);
      const data = await foodDiaryService.getDailySummary(userId, dateKey);
      return res.json(data);
    } catch (error: any) {
      const status = error.message?.includes("não encontrado") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  async getFoodDiaryPhotos(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.params.id;
      await assertPatientUser(userId);
      const limit = Math.min(Number(req.query.limit) || 48, 100);
      const entries = await prisma.foodDiaryEntry.findMany({
        where: { userId, imageUrl: { not: null } },
        orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
        take: limit,
        select: {
          id: true,
          entryDate: true,
          mealType: true,
          mealLabel: true,
          imageUrl: true,
          caloriesKcal: true,
          items: true,
          createdAt: true,
        },
      });

      const readItemKcal = (raw: unknown): number | null => {
        if (!raw || typeof raw !== "object") return null;
        const row = raw as Record<string, unknown>;
        const candidates = [row.caloriesKcal, row.calories, row.kcal];
        for (const value of candidates) {
          const n = Number(value);
          if (Number.isFinite(n) && n >= 0) return n;
        }
        return null;
      };

      const exactCalories = (items: unknown, fallback: number | null) => {
        let fromItems: number | null = null;
        if (Array.isArray(items) && items.length) {
          let total = 0;
          let counted = 0;
          for (const raw of items) {
            const kcal = readItemKcal(raw);
            if (kcal == null) continue;
            total += kcal;
            counted += 1;
          }
          if (counted) fromItems = Math.round(total);
        }

        const fb = Number(fallback);
        const fromEntry = Number.isFinite(fb) && fb >= 0 ? Math.round(fb) : null;

        // Preferência: soma dos itens (fonte mais fiel da refeição); senão o total salvo.
        if (fromItems != null && fromItems > 0) return fromItems;
        if (fromEntry != null && fromEntry > 0) return fromEntry;
        return fromItems ?? fromEntry;
      };

      const viewerId = req.user?.id || "";
      const social = new FoodDiarySocialRepository();
      const { likeCounts, commentCounts, likedIds } = await social.countsForEntries(
        entries.map((entry) => entry.id),
        viewerId,
      );

      return res.json({
        photos: entries.map((entry) => ({
          id: entry.id,
          entryDate: entry.entryDate.toISOString().slice(0, 10),
          mealType: entry.mealType,
          mealLabel: entry.mealLabel,
          imageUrl: entry.imageUrl,
          caloriesKcal: exactCalories(entry.items, entry.caloriesKcal),
          createdAt: entry.createdAt,
          likesCount: likeCounts.get(entry.id) || 0,
          likedByMe: likedIds.has(entry.id),
          commentsCount: commentCounts.get(entry.id) || 0,
        })),
      });
    } catch (error: any) {
      const status = error.message?.includes("não encontrado") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  async getGoals(req: Request, res: Response): Promise<any> {
    try {
      const data = await patientGoalsService.getForUser(req.params.id);
      return res.json(data || { goals: [], progress: {} });
    } catch (error: any) {
      const status = error.message?.includes("não encontrado") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  async startVideoCall(req: Request, res: Response): Promise<any> {
    try {
      const notifyWhatsapp = req.body?.notifyWhatsapp !== false;
      const data = await videoCallService.startCall(req.user!.id, req.params.id, { notifyWhatsapp });
      return res.status(201).json(data);
    } catch (error: any) {
      const status = error.message?.includes("não encontrado") ? 404 : 400;
      return res.status(status).json({ message: error.message || "Falha ao iniciar chamada." });
    }
  }

  async getVideoCall(req: Request, res: Response): Promise<any> {
    try {
      const call = await videoCallService.getCallForNutri(req.params.callId, req.user!.id);
      return res.json({ call });
    } catch (error: any) {
      const status = error.message?.includes("não encontrada") || error.message?.includes("acesso")
        ? 404
        : 400;
      return res.status(status).json({ message: error.message || "Falha ao buscar chamada." });
    }
  }

  async endVideoCall(req: Request, res: Response): Promise<any> {
    try {
      const data = videoCallService.endCall(req.params.callId, req.user!.id, "NUTRICIONISTA");
      return res.json(data);
    } catch (error: any) {
      return res.status(400).json({ message: error.message || "Falha ao encerrar chamada." });
    }
  }

  async getMyActiveVideoCall(req: Request, res: Response): Promise<any> {
    try {
      const call = await videoCallService.getActiveForPatient(req.user!.id);
      return res.json({ call });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || "Falha ao buscar chamada." });
    }
  }

  async joinMyVideoCall(req: Request, res: Response): Promise<any> {
    try {
      const call = await videoCallService.getCallForPatient(
        req.params.callId,
        req.user!.id,
        { activate: true },
      );
      return res.json({ call });
    } catch (error: any) {
      const status = error.message?.includes("não encontrada") || error.message?.includes("acesso")
        ? 404
        : 400;
      return res.status(status).json({ message: error.message || "Falha ao entrar na chamada." });
    }
  }

  async peekMyVideoCall(req: Request, res: Response): Promise<any> {
    try {
      const call = await videoCallService.peekCallForPatient(req.params.callId, req.user!.id);
      return res.json({ call });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || "Falha ao buscar chamada." });
    }
  }

  async declineMyVideoCall(req: Request, res: Response): Promise<any> {
    try {
      const data = videoCallService.declineCall(req.params.callId, req.user!.id);
      return res.json(data);
    } catch (error: any) {
      const status = error.message?.includes("não encontrada") || error.message?.includes("acesso")
        ? 404
        : 400;
      return res.status(status).json({ message: error.message || "Falha ao recusar chamada." });
    }
  }

  async endMyVideoCall(req: Request, res: Response): Promise<any> {
    try {
      const data = videoCallService.endCall(req.params.callId, req.user!.id, "PACIENTE");
      return res.json(data);
    } catch (error: any) {
      return res.status(400).json({ message: error.message || "Falha ao encerrar chamada." });
    }
  }
}
