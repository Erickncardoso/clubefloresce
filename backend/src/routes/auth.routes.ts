import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authRateLimiter } from "../middleware/rate-limit.middleware";

const router = Router();
const authController = new AuthController();

router.post("/register", authRateLimiter, authController.register);
router.post("/patient-registration-request", authRateLimiter, authController.requestPatientRegistration);
router.post("/login", authRateLimiter, authController.login);
router.post("/refresh", authRateLimiter, authController.refresh);
router.get("/me", authController.me);
router.get("/setup/nutricionista/status", authController.oneTimeNutritionistStatus);
router.post("/setup/nutricionista", authRateLimiter, authController.oneTimeNutritionistRegister);
router.post("/first-access/change-password", authenticate, authController.changeFirstAccessPassword);

export default router;
