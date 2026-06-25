import { Router } from "express";
import { PushController } from "../controllers/push.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
const controller = new PushController();

router.get("/vapid-public-key", controller.getPublicKey.bind(controller));
router.get("/status", authenticate, authorize(["PACIENTE"]), controller.getStatus.bind(controller));
router.post("/subscribe", authenticate, authorize(["PACIENTE"]), controller.subscribe.bind(controller));
router.post("/unsubscribe", authenticate, authorize(["PACIENTE"]), controller.unsubscribe.bind(controller));
router.patch("/preferences", authenticate, authorize(["PACIENTE"]), controller.updatePreferences.bind(controller));
router.post("/sync-timezone", authenticate, authorize(["PACIENTE"]), controller.syncTimezone.bind(controller));

export default router;
