import { Router } from "express";
import { BillingController } from "../controllers/billing.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { billingRateLimiter } from "../middleware/rate-limit.middleware";

const router = Router();
const controller = new BillingController();

router.get("/config", authenticate, authorize(["PACIENTE"]), controller.getConfig);
router.get("/subscription/me", authenticate, authorize(["PACIENTE"]), controller.getMySubscription);
router.post(
  "/subscribe/card",
  authenticate,
  authorize(["PACIENTE"]),
  billingRateLimiter,
  controller.subscribeCard,
);
router.post(
  "/subscribe/pix",
  authenticate,
  authorize(["PACIENTE"]),
  billingRateLimiter,
  controller.subscribePix,
);
router.post("/webhook", controller.webhook);

router.get("/admin/products", authenticate, authorize(["NUTRICIONISTA"]), controller.getAdminProducts);
router.put("/admin/products", authenticate, authorize(["NUTRICIONISTA"]), controller.updateAdminProducts);
router.get("/admin/plans", authenticate, authorize(["NUTRICIONISTA"]), controller.getAdminPlans);
router.put("/admin/plans", authenticate, authorize(["NUTRICIONISTA"]), controller.updateAdminPlans);
router.get("/admin/summary", authenticate, authorize(["NUTRICIONISTA"]), controller.getFinancialSummary);
router.get("/admin/notification-logs", authenticate, authorize(["NUTRICIONISTA"]), controller.getAdminNotificationLogs);

export default router;
