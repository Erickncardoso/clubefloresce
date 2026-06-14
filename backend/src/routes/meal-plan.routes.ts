import { Router } from "express";
import { MealPlanController } from "../controllers/meal-plan.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { createPdfUpload } from "../utils/pdf-upload";

const router = Router();
const controller = new MealPlanController();
const pdfUpload = createPdfUpload({ fileSizeMb: 20 });

router.get("/me", authenticate, authorize(["PACIENTE"]), controller.getMine.bind(controller));
router.post(
  "/upload",
  authenticate,
  authorize(["PACIENTE"]),
  pdfUpload.single("file"),
  controller.upload.bind(controller),
);

export default router;
