import { Request, Response } from "express";
import { InstagramConfigRepository } from "../repositories/instagram-config.repository";
import { InstagramEventRepository } from "../repositories/instagram-event.repository";
import { InstagramAutomationRepository } from "../repositories/instagram-automation.repository";
import { InstagramQueueRepository } from "../repositories/instagram-queue.repository";
import { InstagramOauthService } from "../services/instagram-oauth.service";
import { InstagramWebhookIngestService } from "../services/instagram-webhook-ingest.service";
import { drainInstagramQueue } from "../services/instagram-queue.service";
import { verifyInstagramWebhookSignature, verifyOauthState } from "../utils/instagram-webhook";
import { getInstagramWebhookVerifyToken, getFrontendBaseUrl, isInstagramConfigured } from "../utils/instagram-env";
import { buildAuthorizeUrl, listMedia } from "../utils/instagram-graph.client";

const configRepository = new InstagramConfigRepository();
const eventRepository = new InstagramEventRepository();
const automationRepository = new InstagramAutomationRepository();
const queueRepository = new InstagramQueueRepository();
const oauthService = new InstagramOauthService();
const ingestService = new InstagramWebhookIngestService();

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean);
}

function parseAutomationBody(body: any) {
  return {
    name: String(body?.name ?? "").trim(),
    active: body?.active !== false,
    triggerComment: Boolean(body?.triggerComment ?? true),
    triggerStory: Boolean(body?.triggerStory),
    triggerDm: Boolean(body?.triggerDm),
    keywords: sanitizeStringArray(body?.keywords),
    matchType: body?.matchType === "EXACT" ? ("EXACT" as const) : ("CONTAINS" as const),
    targetMediaId: body?.targetMediaId ? String(body.targetMediaId) : null,
    publicReplyVariations: sanitizeStringArray(body?.publicReplyVariations),
    welcomeMessage: String(body?.welcomeMessage ?? "").trim(),
    quickReplyLabel: String(body?.quickReplyLabel ?? "Quero o link!").trim() || "Quero o link!",
    linkText: body?.linkText ? String(body.linkText) : null,
    linkButtonLabel: body?.linkButtonLabel ? String(body.linkButtonLabel) : null,
    linkUrl: body?.linkUrl ? String(body.linkUrl) : null,
    reminderText: body?.reminderText ? String(body.reminderText) : null,
    reminderDelayMinutes: Math.max(1, Number(body?.reminderDelayMinutes) || 60),
  };
}

function parseFollowups(body: any) {
  if (!Array.isArray(body?.followups)) return [];
  return body.followups
    .filter((f: any) => String(f?.body ?? "").trim())
    .map((f: any, index: number) => ({
      type: f?.url ? "link" : "message",
      delayMinutes: Math.max(0, Number(f?.delayMinutes) || 0),
      body: String(f.body).trim(),
      buttonLabel: f?.buttonLabel ? String(f.buttonLabel) : null,
      url: f?.url ? String(f.url) : null,
      sortOrder: index,
    }));
}

export class InstagramController {
  // ---------- Webhook (público) ----------

  /** GET — handshake de verificação da Meta. */
  webhookVerify = (req: Request, res: Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    const expected = getInstagramWebhookVerifyToken();

    if (mode === "subscribe" && expected && token === expected) {
      return res.status(200).send(String(challenge ?? ""));
    }
    return res.sendStatus(403);
  };

  /** POST — eventos. Corpo CRU (express.raw) para validar o HMAC. */
  webhookReceive = (req: Request, res: Response) => {
    const rawBody = req.body as Buffer;
    if (!Buffer.isBuffer(rawBody)) {
      console.error("[Instagram] Webhook sem raw body — confira a ordem dos middlewares.");
      return res.sendStatus(500);
    }

    const signature = req.header("X-Hub-Signature-256");
    if (!verifyInstagramWebhookSignature(rawBody, signature)) {
      console.warn("[Instagram] Webhook com assinatura inválida — descartado.");
      return res.sendStatus(403);
    }

    // Responde 200 rápido; processa em fire-and-forget.
    res.sendStatus(200);

    let parsed: any = null;
    try {
      parsed = JSON.parse(rawBody.toString("utf8"));
    } catch {
      console.warn("[Instagram] Webhook com corpo não-JSON — ignorado.");
      return;
    }

    void ingestService
      .ingest(parsed)
      .then(() => drainInstagramQueue())
      .catch((error) => console.error("[Instagram] Erro ao processar webhook:", error));
  };

  // ---------- OAuth ----------

  /** GET /oauth/url (autenticada) — painel pega a URL e navega. */
  oauthUrl = (req: Request, res: Response) => {
    if (!isInstagramConfigured()) {
      return res.status(503).json({
        message: "INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET / INSTAGRAM_WEBHOOK_VERIFY_TOKEN ausentes no .env do backend.",
      });
    }
    const url = oauthService.getAuthorizeUrl(req.user!.id);
    if (!url) {
      return res.status(503).json({
        message: "Redirect URI indisponível — configure INSTAGRAM_REDIRECT_URI ou suba o tunnel (npm run dev:backend:tunnel).",
      });
    }
    return res.json({ url });
  };

  /**
   * GET /oauth/start?state=... (pública) — valida o state assinado (emitido por
   * /oauth/url) e redireciona para a tela de autorização do Instagram.
   */
  oauthStart = (req: Request, res: Response) => {
    const state = req.query.state ? String(req.query.state) : undefined;
    const userId = verifyOauthState(state);
    if (!userId || !state) {
      return res.redirect(`${getFrontendBaseUrl()}/instagram?erro=${encodeURIComponent("Sessão expirada — clique em Conectar novamente.")}`);
    }
    const url = buildAuthorizeUrl(state);
    if (!url) return res.status(503).send("Instagram não configurado no backend.");
    return res.redirect(url);
  };

  /** GET /oauth/callback (pública) — troca code por token e salva a conexão. */
  oauthCallback = async (req: Request, res: Response) => {
    const frontend = getFrontendBaseUrl();
    const code = req.query.code ? String(req.query.code) : null;
    const state = req.query.state ? String(req.query.state) : undefined;

    if (!code) {
      const reason = String(req.query.error_description ?? req.query.error ?? "cancelado");
      return res.redirect(`${frontend}/instagram?erro=${encodeURIComponent(reason)}`);
    }

    try {
      const result = await oauthService.handleCallback(code, state);
      return res.redirect(`${frontend}/instagram?conectado=${encodeURIComponent(result.username)}`);
    } catch (error) {
      console.error("[Instagram] Falha no callback OAuth:", error);
      const message = (error as Error)?.message ?? "Falha ao conectar.";
      return res.redirect(`${frontend}/instagram?erro=${encodeURIComponent(message)}`);
    }
  };

  // ---------- Painel (autenticadas) ----------

  status = async (req: Request, res: Response) => {
    const config = await configRepository.findByUserId(req.user!.id);
    return res.json({
      appConfigured: isInstagramConfigured(),
      connected: Boolean(config),
      username: config?.instagramUsername ?? null,
      profilePictureUrl: config?.profilePictureUrl ?? null,
      tokenExpiresAt: config?.tokenExpiresAt ?? null,
    });
  };

  disconnect = async (req: Request, res: Response) => {
    await configRepository.deleteByUserId(req.user!.id);
    return res.json({ ok: true });
  };

  media = async (req: Request, res: Response) => {
    const config = await configRepository.findByUserId(req.user!.id);
    if (!config) return res.status(400).json({ message: "Instagram não conectado." });
    try {
      const media = await listMedia(config.instagramUserId, config.accessToken);
      return res.json({ media });
    } catch (error) {
      console.error("[Instagram] Falha ao listar mídias:", error);
      return res.status(502).json({ message: "Falha ao buscar posts no Instagram." });
    }
  };

  listAutomations = async (req: Request, res: Response) => {
    const automations = await automationRepository.listByUser(req.user!.id);
    return res.json({ automations });
  };

  createAutomation = async (req: Request, res: Response) => {
    const data = parseAutomationBody(req.body);
    if (!data.name) return res.status(400).json({ message: "Informe um nome para a automação." });
    if (!data.keywords.length) return res.status(400).json({ message: "Informe ao menos uma palavra-chave." });
    if (!data.welcomeMessage) return res.status(400).json({ message: "Informe a mensagem de boas-vindas." });

    const automation = await automationRepository.create(req.user!.id, data, parseFollowups(req.body));
    return res.status(201).json({ automation });
  };

  updateAutomation = async (req: Request, res: Response) => {
    const data = parseAutomationBody(req.body);
    if (!data.name) return res.status(400).json({ message: "Informe um nome para a automação." });
    if (!data.keywords.length) return res.status(400).json({ message: "Informe ao menos uma palavra-chave." });
    if (!data.welcomeMessage) return res.status(400).json({ message: "Informe a mensagem de boas-vindas." });

    const automation = await automationRepository.update(
      req.params.id,
      req.user!.id,
      data,
      parseFollowups(req.body)
    );
    if (!automation) return res.status(404).json({ message: "Automação não encontrada." });
    return res.json({ automation });
  };

  toggleAutomation = async (req: Request, res: Response) => {
    const automation = await automationRepository.update(req.params.id, req.user!.id, {
      active: Boolean(req.body?.active),
    });
    if (!automation) return res.status(404).json({ message: "Automação não encontrada." });
    return res.json({ automation });
  };

  deleteAutomation = async (req: Request, res: Response) => {
    const deleted = await automationRepository.delete(req.params.id, req.user!.id);
    if (!deleted) return res.status(404).json({ message: "Automação não encontrada." });
    return res.json({ ok: true });
  };

  listEvents = async (req: Request, res: Response) => {
    const events = await eventRepository.listRecent(Number(req.query.limit) || 50);
    return res.json({ events });
  };

  listQueue = async (req: Request, res: Response) => {
    const items = await queueRepository.listRecent(req.user!.id, Number(req.query.limit) || 50);
    return res.json({ items });
  };
}
