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
router.post("/", authenticate, authorize(["NUTRICIONISTA"]), userMgmtController.createPatient);
router.get("/:id", authenticate, authorize(["NUTRICIONISTA"]), userMgmtController.getById);
router.patch("/:id", authenticate, authorize(["NUTRICIONISTA"]), userMgmtController.updatePatient);
router.patch("/:id/status", authenticate, authorize(["NUTRICIONISTA"]), userMgmtController.updateStatus);
router.delete("/:id", authenticate, authorize(["NUTRICIONISTA"]), userMgmtController.delete);

export default router;
