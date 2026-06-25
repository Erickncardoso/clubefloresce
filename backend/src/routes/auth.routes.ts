import { Router, Request, Response, NextFunction } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { credentialRateLimiter } from "../middleware/rate-limit.middleware";
import { profileAvatarUpload } from "../middleware/profile-avatar-upload.middleware";

const router = Router();
const authController = new AuthController();

function handleProfileAvatarUpload(req: Request, res: Response, next: NextFunction) {
  profileAvatarUpload(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : "Erro no upload da imagem.";
      return res.status(400).json({ message });
    }
    next();
  });
}

router.post("/patient-registration-request", credentialRateLimiter, authController.requestPatientRegistration.bind(authController));
router.post("/login", credentialRateLimiter, authController.login.bind(authController));
router.post("/forgot-password", credentialRateLimiter, authController.forgotPassword.bind(authController));
router.get("/password-reset/validate", authController.validatePasswordReset.bind(authController));
router.post("/reset-password", credentialRateLimiter, authController.resetPassword.bind(authController));
router.post("/refresh", authController.refresh.bind(authController));
router.get("/me", authController.me.bind(authController));
router.post(
  "/me/avatar",
  authenticate,
  handleProfileAvatarUpload,
  authController.updateAvatar.bind(authController),
);
router.get("/setup/nutricionista/status", authController.oneTimeNutritionistStatus.bind(authController));
router.post("/setup/nutricionista", credentialRateLimiter, authController.oneTimeNutritionistRegister.bind(authController));
router.post("/first-access/change-password", authenticate, authController.changeFirstAccessPassword.bind(authController));

export default router;
