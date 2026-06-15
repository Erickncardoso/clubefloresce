import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
const controller = new NotificationController();

router.get("/", authenticate, authorize(["PACIENTE"]), controller.listMine.bind(controller));
router.patch("/read-all", authenticate, authorize(["PACIENTE"]), controller.markAllRead.bind(controller));
router.patch("/:id/read", authenticate, authorize(["PACIENTE"]), controller.markRead.bind(controller));

export default router;
