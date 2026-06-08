import { Router } from "express";
import { CheckInController } from "../controllers/checkin.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
const controller = new CheckInController();

router.get("/me", authenticate, controller.getMine.bind(controller));
router.post("/", authenticate, authorize(["PACIENTE"]), controller.submit.bind(controller));
router.get("/patients", authenticate, authorize(["NUTRICIONISTA"]), controller.listPatients.bind(controller));

export default router;
