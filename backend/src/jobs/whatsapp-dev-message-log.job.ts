import { readEnv } from "../utils/env";
import { WhatsappService } from "../services/whatsapp.service";
import webhookLogService from "../services/webhook-log.service";
import { resolveDevTunnelPublicUrl } from "../utils/dev-tunnel-url";

const whatsappService = new WhatsappService();
const UAZAPI_URL = (readEnv("UAZAPI_SERVER_URL") || "").replace(/\/+$/, "");

const activeStreams = new Map<string, AbortController>();
const RECONNECT_MS = 3000;
const SCAN_MS = 45_000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const parseSseEvents = (buffer: string): { events: string[]; rest: string } => {
  const events: string[] = [];
  let rest = buffer;
  let boundary = rest.indexOf("\n\n");

  while (boundary >= 0) {
    const chunk = rest.slice(0, boundary);
    rest = rest.slice(boundary + 2);
    boundary = rest.indexOf("\n\n");

    const dataLine = chunk
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.startsWith("data:"));
    if (!dataLine) continue;

    const raw = dataLine.slice(5).trim();
    if (!raw || raw === "[DONE]") continue;
    events.push(raw);
  }

  return { events, rest };
};

const consumeUazapiSse = async (userId: string, token: string, signal: AbortSignal): Promise<void> => {
  if (!UAZAPI_URL) return;

  const events = ["messages", "messages_update", "chats"];
  const sseUrl = `${UAZAPI_URL}/sse?token=${encodeURIComponent(token)}&events=${events.join(",")}`;

  const response = await fetch(sseUrl, {
    headers: { Accept: "text/event-stream" },
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`SSE ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  console.log(`[Webhook] SSE dev ativo (${userId.slice(0, 8)}…) — mensagens aparecem aqui no terminal`);

  while (!signal.aborted) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseEvents(buffer);
    buffer = parsed.rest;

    for (const raw of parsed.events) {
      try {
        const payload = JSON.parse(raw);
        await webhookLogService.logWebhookEvent(payload);
      } catch {
        /* ignora linha inválida */
      }
    }
  }
};

const runSseLoop = async (userId: string, token: string): Promise<void> => {
  const key = token;
  if (activeStreams.has(key)) return;

  const controller = new AbortController();
  activeStreams.set(key, controller);

  while (!controller.signal.aborted) {
    try {
      await consumeUazapiSse(userId, token, controller.signal);
    } catch (error) {
      if (controller.signal.aborted) break;
      console.warn(`[Webhook] SSE dev reconectando (${userId.slice(0, 8)}…):`, (error as Error)?.message || error);
      await sleep(RECONNECT_MS);
    }
  }

  activeStreams.delete(key);
};

const syncConnectedStreams = async (): Promise<void> => {
  if (!UAZAPI_URL) return;

  try {
    const connected = await whatsappService.listConnectedClubInstances();
    const connectedTokens = new Set<string>();

    for (const { userId, token } of connected) {
      connectedTokens.add(token);
      void runSseLoop(userId, token);
    }

    for (const [token, controller] of activeStreams.entries()) {
      if (!connectedTokens.has(token)) controller.abort();
    }
  } catch (error) {
    console.warn("[Webhook] Falha ao sincronizar SSE dev:", error);
  }
};

/** Em dev local: escuta mensagens via SSE da UAZAPI (webhook aponta para produção). */
export function startWhatsappDevMessageLog(): void {
  const enabled =
    readEnv("WHATSAPP_DEV_MESSAGE_LOG") !== "false"
    && readEnv("NODE_ENV") !== "production";

  if (!enabled) return;
  if (resolveDevTunnelPublicUrl()) {
    console.log("[Webhook] Cloudflare Tunnel ativo — webhook HTTP local; SSE dev desligado.");
    return;
  }
  if (!UAZAPI_URL) {
    console.warn("[Webhook] UAZAPI_SERVER_URL ausente — log dev de mensagens desativado.");
    return;
  }

  const webhookUrl = readEnv("WHATSAPP_WEBHOOK_URL") || readEnv("BACKEND_PUBLIC_URL");
  if (webhookUrl && !webhookUrl.includes("localhost") && !webhookUrl.includes("127.0.0.1")) {
    console.log(
      `[Webhook] URL remota (${webhookUrl}) — eventos HTTP não passam neste terminal; usando SSE dev para log local.`,
    );
  }

  void syncConnectedStreams();
  setInterval(() => {
    void syncConnectedStreams();
  }, SCAN_MS);
}
