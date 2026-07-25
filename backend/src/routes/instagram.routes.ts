import express, { Router } from "express";
import { InstagramController } from "../controllers/instagram.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const instagramController = new InstagramController();

/**
 * Router do webhook — montado ANTES do express.json() global no index.ts,
 * porque o POST precisa do corpo CRU (Buffer) para validar o X-Hub-Signature-256.
 */
export const instagramWebhookRouter = Router();
instagramWebhookRouter.get("/", instagramController.webhookVerify);
instagramWebhookRouter.post(
  "/",
  express.raw({ type: "*/*", limit: "2mb" }),
  instagramController.webhookReceive
);

const router = Router();

// Públicas (OAuth)
router.get("/oauth/url", authenticate, authorize(["NUTRICIONISTA"]), instagramController.oauthUrl);
router.get("/oauth/start", instagramController.oauthStart);
router.get("/oauth/callback", instagramController.oauthCallback);

// Autenticadas (nutri)
router.get("/status", authenticate, authorize(["NUTRICIONISTA"]), instagramController.status);
router.post("/disconnect", authenticate, authorize(["NUTRICIONISTA"]), instagramController.disconnect);
router.get("/media", authenticate, authorize(["NUTRICIONISTA"]), instagramController.media);
router.get("/automations", authenticate, authorize(["NUTRICIONISTA"]), instagramController.listAutomations);
router.post("/automations", authenticate, authorize(["NUTRICIONISTA"]), instagramController.createAutomation);
router.put("/automations/:id", authenticate, authorize(["NUTRICIONISTA"]), instagramController.updateAutomation);
router.patch("/automations/:id/toggle", authenticate, authorize(["NUTRICIONISTA"]), instagramController.toggleAutomation);
router.delete("/automations/:id", authenticate, authorize(["NUTRICIONISTA"]), instagramController.deleteAutomation);
router.get("/events", authenticate, authorize(["NUTRICIONISTA"]), instagramController.listEvents);
router.get("/queue", authenticate, authorize(["NUTRICIONISTA"]), instagramController.listQueue);

export default router;
