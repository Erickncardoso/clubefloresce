import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { credentialRateLimiter } from "../middleware/rate-limit.middleware";

const router = Router();
const authController = new AuthController();

router.post("/register", credentialRateLimiter, authController.register);
router.post("/patient-registration-request", credentialRateLimiter, authController.requestPatientRegistration);
router.post("/login", credentialRateLimiter, authController.login);
router.post("/refresh", authController.refresh);
router.get("/me", authController.me);
router.get("/setup/nutricionista/status", authController.oneTimeNutritionistStatus);
router.post("/setup/nutricionista", credentialRateLimiter, authController.oneTimeNutritionistRegister);
router.post("/first-access/change-password", authenticate, authController.changeFirstAccessPassword);

export default router;
