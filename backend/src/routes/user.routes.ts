import { Router } from "express";
import { UserMgmtController } from "../controllers/user_mgmt.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
const userMgmtController = new UserMgmtController();

// Apenas NUTRICIONISTA
router.get("/", authenticate, authorize(["NUTRICIONISTA"]), userMgmtController.getAll);
router.get(
  "/registration-requests",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  userMgmtController.listRegistrationRequests,
);
router.get(
  "/approval-whatsapp-template",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  userMgmtController.getApprovalWhatsappTemplate,
);
router.patch(
  "/approval-whatsapp-template",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  userMgmtController.updateApprovalWhatsappTemplate,
);
router.post(
  "/resend-approval-whatsapp-pending",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  userMgmtController.resendPendingApprovalWhatsapp,
);
router.post(
  "/sync-registration-phones",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  userMgmtController.syncRegistrationPhones,
);
router.post("/", authenticate, authorize(["NUTRICIONISTA"]), userMgmtController.createPatient);
router.get("/:id", authenticate, authorize(["NUTRICIONISTA"]), userMgmtController.getById);
router.patch("/:id", authenticate, authorize(["NUTRICIONISTA"]), userMgmtController.updatePatient);
router.patch("/:id/status", authenticate, authorize(["NUTRICIONISTA"]), userMgmtController.updateStatus);
router.post(
  "/:id/resend-approval-email",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  userMgmtController.resendApprovalEmail,
);
router.post(
  "/:id/resend-approval-whatsapp",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  userMgmtController.resendApprovalWhatsapp,
);
router.patch(
  "/:id/approval-whatsapp-message",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  userMgmtController.updateApprovalWhatsappMessage,
);
router.delete("/:id", authenticate, authorize(["NUTRICIONISTA"]), userMgmtController.delete);

export default router;
