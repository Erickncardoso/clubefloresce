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

router.patch(
  "/:id/reject",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.rejectRegistrationRequest.bind(controller),
);

export default router;
