import { Router, Request, Response, NextFunction } from "express";
import { BellaController } from "../controllers/bella.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { bellaUpload } from "../middleware/bella-upload.middleware";

const router = Router();
const controller = new BellaController();

function handleBellaUpload(req: Request, res: Response, next: NextFunction) {
  bellaUpload(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : "Erro no upload do arquivo.";
      return res.status(400).json({ message });
    }
    next();
  });
}

router.get("/messages", authenticate, authorize(["PACIENTE"]), controller.getMessages.bind(controller));
router.get("/status", authenticate, authorize(["PACIENTE"]), controller.getStatus.bind(controller));
router.post(
  "/chat",
  authenticate,
  authorize(["PACIENTE"]),
  handleBellaUpload,
  controller.chat.bind(controller),
);

export default router;
