import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { credentialRateLimiter } from "../middleware/rate-limit.middleware";

const router = Router();
const authController = new AuthController();

router.post("/register", credentialRateLimiter, authController.register.bind(authController));
router.post("/patient-registration-request", credentialRateLimiter, authController.requestPatientRegistration.bind(authController));
router.post("/login", credentialRateLimiter, authController.login.bind(authController));
router.post("/refresh", authController.refresh.bind(authController));
router.get("/me", authController.me.bind(authController));
router.get("/setup/nutricionista/status", authController.oneTimeNutritionistStatus.bind(authController));
router.post("/setup/nutricionista", credentialRateLimiter, authController.oneTimeNutritionistRegister.bind(authController));
router.post("/first-access/change-password", authenticate, authController.changeFirstAccessPassword.bind(authController));

export default router;
