import { Router } from "express";
import multer from "multer";
import { PatientController } from "../controllers/patient.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { createPdfUpload } from "../utils/pdf-upload";
import { acceptByExtensionOrMime, hasAllowedExtension } from "../utils/upload-file-filter";

const router = Router();
const controller = new PatientController();
const pdfUpload = createPdfUpload({ fileSizeMb: 20 });

const AUDIO_EXTENSION = /\.(webm|ogg|mp3|mp4|m4a|wav|mpeg)$/i;
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const extOk = hasAllowedExtension(file.originalname, AUDIO_EXTENSION);
    const mime = String(file.mimetype || "").split(";")[0].trim().toLowerCase();
    const mimeOk = !mime
      || mime === "application/octet-stream"
      || mime.startsWith("audio/")
      || mime === "video/webm";

    if (extOk && mimeOk) {
      return cb(null, true);
    }

    if (acceptByExtensionOrMime(
      { ...file, mimetype: mime } as Express.Multer.File,
      {
        extensionPattern: AUDIO_EXTENSION,
        allowedMimes: new Set([
          "audio/webm",
          "audio/ogg",
          "audio/mpeg",
          "audio/mp3",
          "audio/mp4",
          "audio/m4a",
          "audio/wav",
          "audio/x-wav",
          "video/webm",
        ]),
        allowMimePrefix: "audio/",
      },
    )) {
      return cb(null, true);
    }

    cb(new Error("Envie um áudio válido (webm, ogg, mp3, m4a ou wav)."));
  },
});

router.get(
  "/engagement-zones",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.getEngagementZones.bind(controller),
);
router.post(
  "/engagement-zones/danger/whatsapp",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.startDangerZoneWhatsapp.bind(controller),
);
router.get(
  "/engagement-zones/danger/whatsapp",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.getDangerZoneWhatsappStatus.bind(controller),
);
router.post(
  "/engagement-zones/danger/whatsapp/cancel",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.cancelDangerZoneWhatsapp.bind(controller),
);

router.get(
  "/me/video-call",
  authenticate,
  authorize(["PACIENTE"]),
  controller.getMyActiveVideoCall.bind(controller),
);
router.get(
  "/me/video-call/:callId",
  authenticate,
  authorize(["PACIENTE"]),
  controller.joinMyVideoCall.bind(controller),
);
router.post(
  "/me/video-call/:callId/end",
  authenticate,
  authorize(["PACIENTE"]),
  controller.endMyVideoCall.bind(controller),
);

router.get(
  "/:id/overview",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.getOverview.bind(controller),
);
router.get(
  "/:id/food-diary",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.getFoodDiary.bind(controller),
);
router.get(
  "/:id/meal-plan",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.getMealPlan.bind(controller),
);
router.get(
  "/:id/meal-plan/pdf",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.streamMealPlanPdf.bind(controller),
);
router.post(
  "/:id/anamnese/transcribe",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  audioUpload.single("audio"),
  controller.transcribeAnamnese.bind(controller),
);
router.get(
  "/:id/anamnese/transcribe/:jobId",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.getAnamneseTranscriptionJob.bind(controller),
);
router.post(
  "/:id/anamnese/interpret",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.interpretAnamnese.bind(controller),
);
router.post(
  "/:id/documentos/rewrite",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.rewriteDocumento.bind(controller),
);
router.post(
  "/:id/meal-plan/upload",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  pdfUpload.single("file"),
  controller.uploadMealPlan.bind(controller),
);
router.post(
  "/:id/meal-plan/save",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.saveMealPlanFromEditor.bind(controller),
);
router.get(
  "/:id/food-diary/month",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.getFoodDiaryMonth.bind(controller),
);
router.get(
  "/:id/food-diary/day",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.getFoodDiaryDay.bind(controller),
);
router.get(
  "/:id/food-diary/photos",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.getFoodDiaryPhotos.bind(controller),
);
router.get(
  "/:id/goals",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.getGoals.bind(controller),
);

router.post(
  "/:id/video-call",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.startVideoCall.bind(controller),
);
router.get(
  "/:id/video-call/:callId",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.getVideoCall.bind(controller),
);
router.post(
  "/:id/video-call/:callId/end",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.endVideoCall.bind(controller),
);

export default router;
