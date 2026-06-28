import { Request, Response } from "express";
import { WhatsappService } from "../services/whatsapp.service";
import { WhatsappChatSyncService } from "../services/whatsapp-chat-sync.service";
import { WhatsappContactStateRepository } from "../repositories/whatsapp_contact_state.repository";
import { WhatsappContactDirectoryRepository } from "../repositories/whatsapp_contact_directory.repository";
import { WhatsappGroupObservedSendersRepository } from "../repositories/whatsapp_group_observed_senders.repository";
import { sendNormalizedUazapiError } from "../utils/uazapi-error.util";
import whatsappPusherService from "../services/whatsapp-pusher.service";
import webhookLogService from "../services/webhook-log.service";
import whatsappMediaArchiveService from "../services/whatsapp-media-archive.service";
import { WhatsappChatDetailsService } from "../services/whatsapp-chat-details.service";
import { WhatsappChatRepository } from "../repositories/whatsapp_chat.repository";
import { parseUazapiChatDeletion } from "../utils/uazapi-webhook-event.util";

const whatsappService = new WhatsappService();
const whatsappChatSyncService = new WhatsappChatSyncService();
const whatsappChatDetailsService = new WhatsappChatDetailsService();
const whatsappContactStateRepository = new WhatsappContactStateRepository();
const whatsappContactDirectoryRepository = new WhatsappContactDirectoryRepository();
const whatsappGroupObservedSendersRepository = new WhatsappGroupObservedSendersRepository();
const whatsappChatRepository = new WhatsappChatRepository();
const UAZAPI_BASE_URL = process.env.UAZAPI_SERVER_URL || "";

export class WhatsappController {
  async create(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });
      const { name } = req.body;

      const result = await whatsappService.createInstanceManual(user.id, name);
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async deleteInstance(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });

      const { name } = req.params;
      const ownedName = `instancia_${user.id}`;
      if (name !== ownedName) {
        return res.status(403).json({ message: "Não autorizado a deletar esta instância." });
      }

      console.log(`[Controller] Deletando instância: ${name}`);
      const result = await whatsappService.deleteInstance(name, user.id);
      if (!result.success) {
        return res.status(400).json({ success: false, message: result.message || "Falha ao deletar instância." });
      }
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async connect(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });

      const { phone } = req.body || {};
      const result = await whatsappService.connect(user.id, phone);
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async regenerateQrCode(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });

      const result = await whatsappService.regenerateQrCode(user.id);
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async status(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });

      const result = await Promise.race([
        whatsappService.getStatus(user.id),
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                status: "timeout",
                instance: null,
                allInstances: [],
                message: "Tempo excedido ao consultar status do WhatsApp."
              }),
            10000
          )
        )
      ]);
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async listChats(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });

      const forceRefresh = String(req.query.refresh || "0") === "1";
      const chats = await whatsappChatSyncService.syncAndList(user.id, forceRefresh);
      return res.json({ chats });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async getChatDetails(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });

      const number = String(req.body?.number || req.body?.chatJid || "").trim();
      if (!number) {
        return res.status(400).json({ message: "Informe o número ou JID do contato." });
      }

      const preview = Boolean(req.body?.preview);
      const force = Boolean(req.body?.force);

      if (!force) {
        const cached = await whatsappChatDetailsService.getCached(user.id, number);
        if (cached) {
          return res.json({ details: cached, cached: true });
        }
      }

      const details = await whatsappChatDetailsService.fetchAndPersist(user.id, number, preview);
      return res.json({ details, cached: false });
    } catch (error: any) {
      return sendNormalizedUazapiError(res, error, "Falha ao obter detalhes do contato.");
    }
  }

  async disconnect(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });

      const result = await whatsappService.disconnect(user.id);
      whatsappService.invalidateInstanceTokenCache(user.id);
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async listContactStates(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });
      const jids = Array.isArray(req.body?.jids) ? req.body.jids : [];
      const rows = await whatsappContactStateRepository.listByUserAndJids(user.id, jids);
      return res.json({
        states: rows.map((row) => ({
          contactJid: row.contactJid,
          isSaved: row.isSaved,
          isBusiness: row.isBusiness,
          phone: row.phone,
          displayName: row.displayName,
          avatarUrl: row.avatarUrl,
          detailsSyncedAt: row.detailsSyncedAt,
          updatedAt: row.updatedAt
        }))
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async upsertContactStates(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });
      const states = Array.isArray(req.body?.states) ? req.body.states : [];
      await whatsappContactStateRepository.upsertMany(
        user.id,
        states.map((state: any) => ({
          contactJid: state?.contactJid || "",
          isSaved: Boolean(state?.isSaved),
          isBusiness: Boolean(state?.isBusiness)
        }))
      );
      return res.json({ ok: true });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async getContactDirectory(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });
      const data = await whatsappContactDirectoryRepository.getByUserId(user.id);
      return res.json({ data });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async upsertContactDirectory(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });
      const data = req.body?.data;
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        return res.status(400).json({ message: "Campo 'data' inválido. Esperado objeto { chave: nome }." });
      }
      await whatsappContactDirectoryRepository.upsert(user.id, data);
      return res.json({ ok: true });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async getGroupObservedSenders(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });
      const groupJid = String(req.query?.groupJid || "").trim();
      if (!groupJid || !groupJid.includes("@")) {
        return res.status(400).json({ message: "Query 'groupJid' obrigatória." });
      }
      const data = await whatsappGroupObservedSendersRepository.getByUserAndGroup(user.id, groupJid);
      return res.json({ data });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async mergeGroupObservedSenders(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });
      const groupJid = String(req.body?.groupJid || "").trim();
      const patch = req.body?.patch;
      if (!groupJid || !groupJid.includes("@")) {
        return res.status(400).json({ message: "Campo 'groupJid' obrigatório." });
      }
      if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
        return res.status(400).json({ message: "Campo 'patch' inválido. Esperado objeto { chave: nome }." });
      }
      await whatsappGroupObservedSendersRepository.mergePatch(user.id, groupJid, patch as Record<string, string>);
      return res.json({ ok: true });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async getGroupInfo(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });

      const groupjid = String(req.body?.groupjid || "").trim();
      if (!groupjid || !groupjid.endsWith("@g.us")) {
        return res.status(400).json({ message: "Campo 'groupjid' inválido. Esperado JID de grupo (@g.us)." });
      }

      const payload = {
        groupjid,
        getInviteLink: Boolean(req.body?.getInviteLink),
        getRequestsParticipants: Boolean(req.body?.getRequestsParticipants),
        force: req.body?.force === undefined ? true : Boolean(req.body?.force)
      };

      const raw = await whatsappService.getGroupInfo(user.id, payload as any);
      const participants = Array.isArray(raw?.Participants)
        ? raw.Participants
        : (Array.isArray(raw?.participants) ? raw.participants : []);

      return res.json({
        ...raw,
        Participants: participants,
        participants
      });
    } catch (error: unknown) {
      return sendNormalizedUazapiError(res, error, "Falha ao obter informações do grupo.");
    }
  }

  async createGroup(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });
      const name = String(req.body?.name || "").trim();
      const participants = Array.isArray(req.body?.participants) ? req.body.participants.map((v: any) => String(v || "").replace(/\D/g, "")).filter(Boolean) : [];
      if (!name) return res.status(400).json({ message: "Campo 'name' obrigatório." });
      if (participants.length < 1) return res.status(400).json({ message: "Campo 'participants' deve conter ao menos 1 número." });
      const result = await whatsappService.createGroup(user.id, { name, participants });
      return res.json(result);
    } catch (error: unknown) {
      return sendNormalizedUazapiError(res, error, "Falha ao criar grupo.");
    }
  }

  async getGroupInviteInfo(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });
      const invitecode = String(req.body?.invitecode || "").trim();
      if (!invitecode) return res.status(400).json({ message: "Campo 'invitecode' obrigatório." });
      const result = await whatsappService.getGroupInviteInfo(user.id, { invitecode });
      return res.json(result);
    } catch (error: unknown) {
      return sendNormalizedUazapiError(res, error, "Falha ao obter informações do convite.");
    }
  }

  async joinGroup(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });
      const invitecode = String(req.body?.invitecode || "").trim();
      if (!invitecode) return res.status(400).json({ message: "Campo 'invitecode' obrigatório." });
      const result = await whatsappService.joinGroup(user.id, { invitecode });
      return res.json(result);
    } catch (error: unknown) {
      return sendNormalizedUazapiError(res, error, "Falha ao entrar no grupo.");
    }
  }

  async leaveGroup(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });
      const groupjid = String(req.body?.groupjid || "").trim();
      if (!groupjid || !groupjid.endsWith("@g.us")) return res.status(400).json({ message: "Campo 'groupjid' inválido (@g.us)." });
      const result = await whatsappService.leaveGroup(user.id, { groupjid });
      return res.json(result);
    } catch (error: unknown) {
      return sendNormalizedUazapiError(res, error, "Falha ao sair do grupo.");
    }
  }

  async listGroups(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });
      const force = String(req.query?.force || "").toLowerCase() === "true";
      const noparticipants = String(req.query?.noparticipants || "").toLowerCase() === "true";
      const result = await whatsappService.getAllGroups(user.id, force, noparticipants);
      return res.json(result);
    } catch (error: unknown) {
      return sendNormalizedUazapiError(res, error, "Falha ao listar grupos.");
    }
  }

  async listGroupsPaginated(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });
      const payload = {
        limit: Number.isFinite(Number(req.body?.limit)) ? Number(req.body.limit) : undefined,
        offset: Number.isFinite(Number(req.body?.offset)) ? Number(req.body.offset) : undefined,
        search: req.body?.search ? String(req.body.search) : undefined,
        force: req.body?.force === undefined ? undefined : Boolean(req.body.force),
        noParticipants: req.body?.noParticipants === undefined ? undefined : Boolean(req.body.noParticipants)
      };
      const result = await whatsappService.listGroupsPaginated(user.id, payload);
      return res.json(result);
    } catch (error: unknown) {
      return sendNormalizedUazapiError(res, error, "Falha ao listar grupos com filtros.");
    }
  }

  async resetGroupInviteCode(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });
      const groupjid = String(req.body?.groupjid || "").trim();
      if (!groupjid || !groupjid.endsWith("@g.us")) return res.status(400).json({ message: "Campo 'groupjid' inválido (@g.us)." });
      const result = await whatsappService.resetGroupInviteCode(user.id, { groupjid });
      return res.json(result);
    } catch (error: unknown) {
      return sendNormalizedUazapiError(res, error, "Falha ao resetar convite do grupo.");
    }
  }

  async updateGroupAnnounce(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });
      const groupjid = String(req.body?.groupjid || "").trim();
      if (!groupjid || !groupjid.endsWith("@g.us")) return res.status(400).json({ message: "Campo 'groupjid' inválido (@g.us)." });
      if (req.body?.announce === undefined) return res.status(400).json({ message: "Campo 'announce' obrigatório." });
      const result = await whatsappService.updateGroupAnnounce(user.id, { groupjid, announce: Boolean(req.body.announce) });
      return res.json(result);
    } catch (error: unknown) {
      return sendNormalizedUazapiError(res, error, "Falha ao atualizar configuração de anúncio do grupo.");
    }
  }

  async updateGroupDescription(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });
      const groupjid = String(req.body?.groupjid || "").trim();
      const description = String(req.body?.description || "").trim();
      if (!groupjid || !groupjid.endsWith("@g.us")) return res.status(400).json({ message: "Campo 'groupjid' inválido (@g.us)." });
      if (!description) return res.status(400).json({ message: "Campo 'description' obrigatório." });
      const result = await whatsappService.updateGroupDescription(user.id, { groupjid, description });
      return res.json(result);
    } catch (error: unknown) {
      return sendNormalizedUazapiError(res, error, "Falha ao atualizar descrição do grupo.");
    }
  }

  async updateGroupImage(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });
      const groupjid = String(req.body?.groupjid || "").trim();
      const image = String(req.body?.image || "").trim();
      if (!groupjid || !groupjid.endsWith("@g.us")) return res.status(400).json({ message: "Campo 'groupjid' inválido (@g.us)." });
      if (!image) return res.status(400).json({ message: "Campo 'image' obrigatório." });
      const result = await whatsappService.updateGroupImage(user.id, { groupjid, image });
      return res.json(result);
    } catch (error: unknown) {
      return sendNormalizedUazapiError(res, error, "Falha ao atualizar imagem do grupo.");
    }
  }

  async updateGroupLocked(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });
      const groupjid = String(req.body?.groupjid || "").trim();
      if (!groupjid || !groupjid.endsWith("@g.us")) return res.status(400).json({ message: "Campo 'groupjid' inválido (@g.us)." });
      if (req.body?.locked === undefined) return res.status(400).json({ message: "Campo 'locked' obrigatório." });
      const result = await whatsappService.updateGroupLocked(user.id, { groupjid, locked: Boolean(req.body.locked) });
      return res.json(result);
    } catch (error: unknown) {
      return sendNormalizedUazapiError(res, error, "Falha ao atualizar bloqueio de edição do grupo.");
    }
  }

  async updateGroupName(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });
      const groupjid = String(req.body?.groupjid || "").trim();
      const name = String(req.body?.name || "").trim();
      if (!groupjid || !groupjid.endsWith("@g.us")) return res.status(400).json({ message: "Campo 'groupjid' inválido (@g.us)." });
      if (!name) return res.status(400).json({ message: "Campo 'name' obrigatório." });
      const result = await whatsappService.updateGroupName(user.id, { groupjid, name });
      return res.json(result);
    } catch (error: unknown) {
      return sendNormalizedUazapiError(res, error, "Falha ao atualizar nome do grupo.");
    }
  }

  async updateGroupParticipants(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });
      const groupjid = String(req.body?.groupjid || "").trim();
      const action = String(req.body?.action || "").trim() as 'add' | 'remove' | 'promote' | 'demote' | 'approve' | 'reject';
      const validActions = ['add', 'remove', 'promote', 'demote', 'approve', 'reject'];
      const participants = Array.isArray(req.body?.participants) ? req.body.participants.map((v: any) => String(v || "").trim()).filter(Boolean) : [];
      if (!groupjid || !groupjid.endsWith("@g.us")) return res.status(400).json({ message: "Campo 'groupjid' inválido (@g.us)." });
      if (!validActions.includes(action)) return res.status(400).json({ message: "Campo 'action' inválido." });
      if (participants.length === 0) return res.status(400).json({ message: "Campo 'participants' obrigatório." });
      const result = await whatsappService.updateGroupParticipants(user.id, { groupjid, action, participants });
      return res.json(result);
    } catch (error: unknown) {
      return sendNormalizedUazapiError(res, error, "Falha ao atualizar participantes do grupo.");
    }
  }

  async sse(req: Request, res: Response): Promise<any> {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Não autorizado." });

    if (!UAZAPI_BASE_URL) {
      return res.status(503).json({ message: "UAZAPI_SERVER_URL não configurada." });
    }

    let instanceToken: string | null = null;
    try {
      instanceToken = await whatsappService.getInstanceToken(user.id);
    } catch (error) {
      console.warn("[WhatsApp SSE] Token indisponível:", error);
      return res.status(503).json({ message: "Instância WhatsApp indisponível." });
    }

    if (!instanceToken) {
      return res.status(503).json({ message: "WhatsApp não conectado." });
    }

    const baseUrl = UAZAPI_BASE_URL.replace(/\/+$/, "");
    const events = ["messages", "messages_update", "chats"];
    const sseUrl = `${baseUrl}/sse?token=${encodeURIComponent(instanceToken)}&events=${events.join(",")}&excludeMessages=${encodeURIComponent("wasSentByApi")}`;

    let upstream: globalThis.Response;
    try {
      upstream = await fetch(sseUrl, {
        headers: { Accept: "text/event-stream" },
      });
    } catch (error) {
      console.error("[WhatsApp SSE] Falha ao conectar UAZAPI:", error);
      return res.status(502).json({ message: "Falha ao conectar stream UAZAPI." });
    }

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => "");
      return res.status(upstream.status).json({ message: text || "Stream UAZAPI indisponível." });
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const reader = upstream.body.getReader();
    let closed = false;

    const close = () => {
      if (closed) return;
      closed = true;
      reader.cancel().catch(() => {});
      if (!res.writableEnded) res.end();
    };

    req.on("close", close);
    req.on("aborted", close);

    try {
      while (!closed) {
        const { done, value } = await reader.read();
        if (done) break;
        if (closed) break;
        const chunk = Buffer.from(value);
        const canContinue = res.write(chunk);
        if (!canContinue) {
          await new Promise<void>((resolve) => res.once("drain", resolve));
        }
      }
    } catch (error) {
      if (!closed) console.warn("[WhatsApp SSE] Encerrado:", error);
    } finally {
      close();
    }
  }

  async webhook(req: Request, res: Response): Promise<any> {
    const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
    if (webhookSecret) {
      const provided =
        (req.headers["x-webhook-secret"] as string | undefined) ||
        (req.headers["authorization"] as string | undefined)?.replace(/^Bearer\s+/i, "");
      if (provided !== webhookSecret) {
        return res.status(401).json({ message: "Webhook não autorizado." });
      }
    }

    res.status(200).json({ received: true });

    try {
      const event = req.body;
      const eventType = event?.event || event?.type || "unknown";

      const relevantEvents = ["messages.upsert", "messages.update", "chats.update", "chats.upsert"];
      if (relevantEvents.includes(eventType)) {
        console.log(`[Webhook] ${eventType}`, JSON.stringify(event).substring(0, 200));
      } else {
        console.log(`[Webhook] ${eventType} recebido`);
      }

      void webhookLogService.logWebhookEvent(event);
      const deletedChatJid = parseUazapiChatDeletion(event);
      if (deletedChatJid) {
        const userId = await whatsappPusherService.resolveUserIdFromWebhook(event);
        if (userId) {
          void whatsappChatRepository.deleteByChatJid(userId, deletedChatJid).catch((err) => {
            console.warn("[WhatsApp] Falha ao remover chat local após webhook delete:", err?.message || err);
          });
        }
      }
      void whatsappPusherService.handleWebhook(event);
    } catch (error) {
      console.error("Erro ao processar webhook:", error);
    }
  }

  // --- PROXY GENÉRICO PARA UAZAPI (todos os métodos HTTP) ---
  async markMessagePlayed(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });

      const rawIds = Array.isArray(req.body?.id)
        ? req.body.id
        : (req.body?.messageId || req.body?.messageid ? [req.body.messageId || req.body.messageid] : []);
      const ids = rawIds.map((id: unknown) => String(id || '').trim()).filter(Boolean);
      if (!ids.length) return res.status(400).json({ message: "Informe ao menos um ID de mensagem." });

      const data = await whatsappService.markMessagePlayed(user.id, ids);
      return res.json(data);
    } catch (error: any) {
      return res.status(400).json({ message: error.message || "Falha ao marcar áudio como ouvido." });
    }
  }

  async proxyRequest(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });

      const endpoint = "/" + req.params[0];
      const method = req.method.toUpperCase();
      if (endpoint === "/message/download" && method === "POST") {
        return this.downloadMessageMedia(req, res);
      }

      return this.forwardUazapiProxy(req, res, user, endpoint, method);
    } catch (error: any) {
      if (error.name === "AbortError") {
        return res.status(504).json({ message: "Timeout ao conectar com a UAZAPI.", error: "UAZAPI_TIMEOUT" });
      }
      return res.status(400).json({ message: error.message });
    }
  }

  private async downloadMessageMedia(req: Request, res: Response): Promise<any> {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Não autorizado." });
    if (!UAZAPI_BASE_URL) {
      return res.status(503).json({ message: "UAZAPI_SERVER_URL não configurada." });
    }

    const body = req.body || {};
    const messageId = String(body.id || body.messageid || body.messageId || "").trim();
    const chatJid = String(body.chatid || body.chatId || body.wa_chatid || "").trim();

    if (whatsappMediaArchiveService.isEnabled() && messageId) {
      const cachedUrl = await whatsappMediaArchiveService.findCachedPublicUrl(user.id, messageId);
      if (cachedUrl) {
        return res.json(whatsappMediaArchiveService.withArchivedFileUrl({ ok: true }, cachedUrl));
      }
    }

    const instanceToken = await whatsappService.getInstanceToken(user.id);
    if (!instanceToken) {
      return res.status(503).json({ message: "Instância não configurada.", error: "INSTANCE_NOT_FOUND" });
    }

    const fetchController = new AbortController();
    const fetchTimer = setTimeout(() => fetchController.abort(), 60000);
    let apiRes: globalThis.Response;
    try {
      apiRes = await fetch(`${UAZAPI_BASE_URL}/message/download`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: instanceToken,
        },
        body: JSON.stringify(body),
        signal: fetchController.signal,
      });
    } finally {
      clearTimeout(fetchTimer);
    }

    const result: any = await apiRes.json().catch(async () => ({ raw: await apiRes.text() }));
    if (!apiRes.ok) {
      return res.status(apiRes.status).json(result);
    }

    const remoteUrl = String(result?.fileURL || result?.fileUrl || result?.url || "").trim();
    if (!remoteUrl || !whatsappMediaArchiveService.isEnabled() || !messageId) {
      return res.json(result);
    }

    try {
      const archivedUrl = await whatsappMediaArchiveService.archiveFromRemoteUrl(
        user.id,
        messageId,
        remoteUrl,
        {
          chatJid: chatJid || undefined,
          mimeType: String(result?.mimetype || result?.mimeType || body?.mimetype || "").trim() || undefined,
        },
      );
      return res.json(whatsappMediaArchiveService.withArchivedFileUrl(result, archivedUrl));
    } catch (error: any) {
      console.warn("[WhatsApp Media] Falha ao arquivar no B2, usando URL da UAZAPI:", error?.message || error);
      return res.json(result);
    }
  }

  private async forwardUazapiProxy(
    req: Request,
    res: Response,
    user: any,
    endpoint: string,
    method: string,
  ): Promise<any> {
    try {
      if (!UAZAPI_BASE_URL) {
        return res.status(503).json({ message: "UAZAPI_SERVER_URL não configurada." });
      }

      const instanceToken = await whatsappService.getInstanceToken(user.id);
      if (!instanceToken) {
        // Retorna 503 (Service Unavailable) em vez de 400 para indicar ao frontend
        // que é um problema de disponibilidade temporária, não um erro de requisição.
        // O frontend trata BACKEND_OFFLINE com log silencioso e retry.
        return res.status(503).json({ message: "Instância não configurada.", error: "INSTANCE_NOT_FOUND" });
      }

      const queryParams = new URLSearchParams(req.query as Record<string, string>).toString();
      const fullUrl = `${UAZAPI_BASE_URL}${endpoint}${queryParams ? "?" + queryParams : ""}`;
      let normalizedBody: any = req.body;
      if (endpoint === "/send/contact" && method === "POST") {
        const raw = req.body || {};
        const targetRaw = String(raw?.number || raw?.to || raw?.chatid || "").trim();
        const targetDigits = targetRaw.includes("@") ? targetRaw.split("@")[0].replace(/\D/g, "") : targetRaw.replace(/\D/g, "");
        const isGroupTarget = targetRaw.endsWith("@g.us");
        const number = isGroupTarget ? targetRaw : (targetDigits || targetRaw);

        const contactName = String(
          raw?.contactName ||
          raw?.fullName ||
          raw?.name ||
          raw?.contact?.[0]?.name ||
          raw?.contacts?.[0]?.name ||
          ""
        ).trim();

        const contactNumberRaw = String(
          raw?.contactNumber ||
          raw?.phoneNumber ||
          raw?.contactPhone ||
          raw?.phone ||
          raw?.contact?.[0]?.phone ||
          raw?.contacts?.[0]?.phone ||
          raw?.contact?.[0]?.number ||
          raw?.contacts?.[0]?.number ||
          raw?.contact?.[0]?.jid ||
          raw?.contacts?.[0]?.jid ||
          raw?.contact?.[0] ||
          raw?.contacts?.[0] ||
          ""
        ).trim();
        const contactNumber = contactNumberRaw.includes("@")
          ? contactNumberRaw.split("@")[0].replace(/\D/g, "")
          : contactNumberRaw.replace(/\D/g, "");

        normalizedBody = {
          number,
          fullName: contactName,
          phoneNumber: contactNumber
        };
      }
      const hasBody = !["GET", "HEAD"].includes(method) && normalizedBody && Object.keys(normalizedBody).length > 0;

      // Timeout de 15s para evitar que requisições lentas da UAZAPI travem o proxy
      const fetchController = new AbortController();
      const fetchTimer = setTimeout(() => fetchController.abort(), 15000);
      const apiRes = await fetch(fullUrl, {
        method,
        headers: {
          "Content-Type": "application/json",
          "token": instanceToken
        },
        body: hasBody ? JSON.stringify(normalizedBody) : undefined,
        signal: fetchController.signal
      }).finally(() => clearTimeout(fetchTimer));
      
      const result = await apiRes.json().catch(async () => ({ raw: await apiRes.text() }));
      if (endpoint === "/chat/delete" && apiRes.ok) {
        const chatJid = String(normalizedBody?.number || normalizedBody?.chatid || "").trim();
        if (chatJid) {
          void whatsappChatRepository.deleteByChatJid(user.id, chatJid).catch((err) => {
            console.warn("[WhatsApp] Falha ao remover chat local após /chat/delete:", err?.message || err);
          });
        }
      }
      if (
        endpoint === "/business/get/profile" ||
        endpoint === "/business/catalog/list" ||
        endpoint === "/business/catalog/info"
      ) {
        const responsePayload = (result as any)?.response || result || {};
        const keys = responsePayload && typeof responsePayload === "object" ? Object.keys(responsePayload) : [];
        console.log(`[ProxyDebug] ${endpoint} status=${apiRes.status} keys=${keys.join(",")}`);
        if (endpoint === "/business/catalog/list") {
          const products = Array.isArray((responsePayload as any)?.Products) ? (responsePayload as any).Products : [];
          const firstProduct = products[0] || {};
          const firstProductKeys = firstProduct && typeof firstProduct === "object" ? Object.keys(firstProduct) : [];
          const firstImage = Array.isArray((firstProduct as any)?.Images) ? (firstProduct as any).Images[0] : null;
          const firstImageKeys = firstImage && typeof firstImage === "object" ? Object.keys(firstImage) : [];
          console.log(`[ProxyDebug] /business/catalog/list products=${products.length} firstProductKeys=${firstProductKeys.join(",")} firstImageKeys=${firstImageKeys.join(",")}`);
        }
      }
      return res.status(apiRes.status).json(result);
    } catch (error: any) {
      if (error.name === "AbortError") {
        return res.status(504).json({ message: "Timeout ao conectar com a UAZAPI.", error: "UAZAPI_TIMEOUT" });
      }
      return res.status(400).json({ message: error.message });
    }
  }
}
