import { Router } from "express";
import { UserMgmtController } from "../controllers/user_mgmt.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
const controller = new UserMgmtController();

router.get(
  "/",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.listRegistrationRequests.bind(controller),
);

export default router;
