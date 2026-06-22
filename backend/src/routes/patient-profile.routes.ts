import { Router } from "express";
import { PatientProfileController } from "../controllers/patient-profile.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
const controller = new PatientProfileController();

router.get("/me", authenticate, authorize(["PACIENTE"]), controller.getMine.bind(controller));
router.put("/me", authenticate, authorize(["PACIENTE"]), controller.saveMine.bind(controller));

export default router;
