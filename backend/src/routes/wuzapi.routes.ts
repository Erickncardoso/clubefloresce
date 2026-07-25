import { Router, Request, Response } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { isWuzapiProvider } from "../config/whatsapp-provider.config";
import { WuzapiWhatsappService } from "../services/wuzapi/wuzapi-whatsapp.service";
import { wuzapiAdmin } from "../services/wuzapi/wuzapi-api";

const router = Router();
const wuzapiService = new WuzapiWhatsappService();

function requireWuzapi(_req: Request, res: Response, next: () => void) {
  if (!isWuzapiProvider()) {
    return res.status(503).json({ message: "WHATSAPP_PROVIDER não é wuzapi." });
  }
  next();
}

/** GET /api/whatsapp/wuzapi/health */
router.get("/health", requireWuzapi, async (_req, res) => {
  try {
    const data = await wuzapiService.wuzHealth();
    return res.json(data);
  } catch (error: any) {
    return res.status(400).json({ message: error?.message || "Falha health WuzAPI" });
  }
});

/** GET /api/whatsapp/wuzapi/admin/users */
router.get("/admin/users", authenticate, authorize(["NUTRICIONISTA"]), requireWuzapi, async (_req, res) => {
  try {
    return res.json(await wuzapiAdmin.listUsers());
  } catch (error: any) {
    return res.status(400).json({ message: error?.message });
  }
});

/** POST /api/whatsapp/wuzapi/admin/users */
router.post("/admin/users", authenticate, authorize(["NUTRICIONISTA"]), requireWuzapi, async (req, res) => {
  try {
    return res.status(201).json(await wuzapiAdmin.createUser(req.body));
  } catch (error: any) {
    return res.status(400).json({ message: error?.message });
  }
});

/** DELETE /api/whatsapp/wuzapi/admin/users/:id */
router.delete("/admin/users/:id", authenticate, authorize(["NUTRICIONISTA"]), requireWuzapi, async (req, res) => {
  try {
    const full = String(req.query.full || "") === "1";
    const data = full
      ? await wuzapiAdmin.deleteUserFull(req.params.id)
      : await wuzapiAdmin.deleteUser(req.params.id);
    return res.json(data);
  } catch (error: any) {
    return res.status(400).json({ message: error?.message });
  }
});

/**
 * POST /api/whatsapp/wuzapi/call/:method
 * Body = payload WuzAPI. Ex.: method=chatSendPoll, chatSendSticker, groupEphemeral, etc.
 */
router.post("/call/:method", authenticate, authorize(["NUTRICIONISTA"]), requireWuzapi, async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: "Não autorizado." });

  const method = String(req.params.method || "").trim();
  const api = wuzapiService.api(user.id) as unknown as Record<string, (...args: any[]) => Promise<any>>;
  const fn = api[method];
  if (typeof fn !== "function") {
    return res.status(404).json({ message: `Método WuzAPI desconhecido: ${method}` });
  }

  try {
    const body = req.body || {};
    const result = Array.isArray(body._args)
      ? await fn.apply(api, body._args)
      : await fn.call(api, body);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ message: error?.message || "Falha na chamada WuzAPI" });
  }
});

export default router;
