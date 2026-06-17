import { Router } from "express";
import { CheckInController } from "../controllers/checkin.controller";
import { CheckInTemplateController } from "../controllers/checkin-template.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
const controller = new CheckInController();
const templateController = new CheckInTemplateController();

router.get("/me", authenticate, authorize(["PACIENTE"]), controller.getMine.bind(controller));
router.post("/", authenticate, authorize(["PACIENTE"]), controller.submit.bind(controller));

router.get("/me/responses", authenticate, authorize(["PACIENTE"]), templateController.listMyResponses.bind(templateController));
router.get("/templates/active", authenticate, authorize(["PACIENTE"]), templateController.listActive.bind(templateController));
router.post("/dispatch", authenticate, authorize(["NUTRICIONISTA"]), templateController.dispatchWeekly.bind(templateController));
router.get("/dispatch/status", authenticate, authorize(["NUTRICIONISTA"]), templateController.dispatchStatus.bind(templateController));
router.post("/reminders/subscribe", authenticate, authorize(["PACIENTE"]), templateController.subscribeReminder.bind(templateController));
router.get(
  "/templates/:templateId/context",
  authenticate,
  authorize(["PACIENTE"]),
  templateController.getPatientContext.bind(templateController),
);
router.post("/responses", authenticate, authorize(["PACIENTE"]), templateController.submitResponse.bind(templateController));

router.get("/templates", authenticate, authorize(["NUTRICIONISTA"]), templateController.listTemplates.bind(templateController));
router.post("/templates", authenticate, authorize(["NUTRICIONISTA"]), templateController.createTemplate.bind(templateController));
router.put("/templates/:id", authenticate, authorize(["NUTRICIONISTA"]), templateController.updateTemplate.bind(templateController));
router.delete("/templates/:id", authenticate, authorize(["NUTRICIONISTA"]), templateController.deleteTemplate.bind(templateController));
router.get("/responses", authenticate, authorize(["NUTRICIONISTA"]), templateController.listResponses.bind(templateController));
router.get("/responses/:id", authenticate, authorize(["NUTRICIONISTA"]), templateController.getResponse.bind(templateController));
router.get(
  "/patients/:userId/responses",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  templateController.listPatientResponses.bind(templateController),
);

router.get("/patients", authenticate, authorize(["NUTRICIONISTA"]), controller.listPatients.bind(controller));
router.get(
  "/patients/:userId",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.getPatientCheckIns.bind(controller),
);
router.put(
  "/patients/:userId",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.upsertPatientCheckIn.bind(controller),
);

export default router;
