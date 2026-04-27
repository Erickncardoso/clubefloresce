import { Router } from "express";
import { UserMgmtController } from "../controllers/user_mgmt.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
const userMgmtController = new UserMgmtController();

// Apenas NUTRICIONISTA 
router.get("/", authenticate, authorize(["NUTRICIONISTA"]), userMgmtController.getAll);
router.patch("/:id/status", authenticate, authorize(["NUTRICIONISTA"]), userMgmtController.updateStatus);
router.delete("/:id", authenticate, authorize(["NUTRICIONISTA"]), userMgmtController.delete);

export default router;
