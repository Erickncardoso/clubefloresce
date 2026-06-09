import { Router } from "express";
import { CheckInController } from "../controllers/checkin.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
const controller = new CheckInController();

router.get("/me", authenticate, controller.getMine.bind(controller));
router.post("/", authenticate, authorize(["PACIENTE"]), controller.submit.bind(controller));
router.get("/patients", authenticate, authorize(["NUTRICIONISTA"]), controller.listPatients.bind(controller));
router.get(
  "/patients/:userId",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.getPatientCheckIns.bind(controller),
);
router.put(
  "/patients/:userId",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.upsertPatientCheckIn.bind(controller),
);

export default router;
