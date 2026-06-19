import { Router } from "express";
import { PatientController } from "../controllers/patient.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { createPdfUpload } from "../utils/pdf-upload";

const router = Router();
const controller = new PatientController();
const pdfUpload = createPdfUpload({ fileSizeMb: 20 });

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
router.post(
  "/:id/meal-plan/upload",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  pdfUpload.single("file"),
  controller.uploadMealPlan.bind(controller),
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

export default router;
