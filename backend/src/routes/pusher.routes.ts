import { Router } from "express";
import { PusherController } from "../controllers/pusher.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
const pusherController = new PusherController();

router.get(
  "/config",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  pusherController.config.bind(pusherController),
);

router.post(
  "/auth",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  pusherController.auth.bind(pusherController),
);

export default router;
