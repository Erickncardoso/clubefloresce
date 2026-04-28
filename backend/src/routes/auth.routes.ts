import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();
const authController = new AuthController();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", authController.me);
router.get("/setup/nutricionista/status", authController.oneTimeNutritionistStatus);
router.post("/setup/nutricionista", authController.oneTimeNutritionistRegister);
router.post("/first-access/change-password", authenticate, authController.changeFirstAccessPassword);

export default router;
