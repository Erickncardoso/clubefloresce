import { Router } from "express";
import multer from "multer";
import { PatientController } from "../controllers/patient.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
const controller = new PatientController();

const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isPdf =
      file.mimetype === "application/pdf" &&
      file.originalname.toLowerCase().endsWith(".pdf");
    if (isPdf) return cb(null, true);
    cb(new Error("Envie apenas arquivos PDF."));
  },
});

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

export default router;
