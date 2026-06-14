import { Router } from "express";
import multer from "multer";
import { MealPlanController } from "../controllers/meal-plan.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
const controller = new MealPlanController();

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

router.get("/me", authenticate, authorize(["PACIENTE"]), controller.getMine.bind(controller));
router.post(
  "/upload",
  authenticate,
  authorize(["PACIENTE"]),
  pdfUpload.single("file"),
  controller.upload.bind(controller),
);

export default router;
