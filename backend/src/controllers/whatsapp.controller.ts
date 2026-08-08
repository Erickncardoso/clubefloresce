import { Request, Response } from "express";
import { WhatsappService, getActiveWhatsappProvider } from "../services/whatsapp.service";
import {
  getWhatsappProvider,
  getWhatsappProviderLabel,
  isWuzapiProvider,
} from "../config/whatsapp-provider.config";
import { wuzapiProxyService } from "../services/wuzapi/wuzapi-proxy.service";
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
import {
  normalizeWuzapiWebhookEventType,
  parseWuzapiWebhookBody,
  extractWuzapiSessionJidFromWebhook,
} from "../utils/wuzapi-webhook.util";
import { adaptWuzapiWebhookForIngest } from "../utils/wuzapi-message-ingest.util";
import whatsappMessageService from "../services/whatsapp-message.service";
import { whatsappMessageRepository } from "../repositories/whatsapp_message.repository";
import whatsappMessageHistoryBackfillService from "../services/whatsapp-message-history-backfill.service";
import whatsappSessionService, { extractSessionJidFromStatusPayload } from "../services/whatsapp-session.service";
import { mapDatabaseError } from "../utils/db-errors";
import { readEnv } from "../utils/env";

const whatsappService = new WhatsappService();
const whatsappChatSyncService = new WhatsappChatSyncService();
const whatsappChatDetailsService = new WhatsappChatDetailsService();
const whatsappContactStateRepository = new WhatsappContactStateRepository();
const whatsappContactDirectoryRepository = new WhatsappContactDirectoryRepository();
const whatsappGroupObservedSendersRepository = new WhatsappGroupObservedSendersRepository();
const whatsappChatRepository = new WhatsappChatRepository();

export class WhatsappController {
  async provider(req: Request, res: Response): Promise<any> {
    const provider = getWhatsappProvider();
    return res.json({
      provider,
      label: getWhatsappProviderLabel(),
      wuzapiEnabled: isWuzapiProvider(),
      wuzapiConfigured: Boolean(String(process.env.WUZAPI_SERVER_URL || "").trim()),
      message: "WhatsApp via WuzAPI.",
    });
  }

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

  async refreshQrCode(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });

      const result = await whatsappService.refreshQrCode(user.id);
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

      const connectionStatus = String((result as any)?.connectionStatus || (result as any)?.status?.status || "").trim().toLowerCase();
      if (connectionStatus === "connected" || connectionStatus === "open" || connectionStatus === "online") {
        whatsappMessageHistoryBackfillService.scheduleOnConnect(user.id, "status-poll");
      }

      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async backfillMessages(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });

      const force = Boolean(req.body?.force);
      const chatJids = Array.isArray(req.body?.chatJids)
        ? req.body.chatJids.map((jid: unknown) => String(jid || "").trim()).filter(Boolean)
        : undefined;

      void whatsappMessageHistoryBackfillService.runBackfill(user.id, {
        force,
        chatJids,
        reason: "api-manual",
      });

      return res.json({
        started: true,
        message: "Backfill de histórico iniciado em background. Mantenha o WhatsApp aberto no celular.",
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || "Falha ao iniciar backfill." });
    }
  }

  async backfillStatus(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });

      const status = await whatsappMessageHistoryBackfillService.getStatusWithCounts(user.id);
      return res.json(status);
    } catch (error: any) {
      return res.status(400).json({ message: error.message || "Falha ao consultar backfill." });
    }
  }

  async listChats(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });

      const cacheOnly = String(req.query.cache || "0") === "1";
      if (cacheOnly) {
        // WuzAPI: sem cache Postgres — mesma resposta live do sync normal.
        if (isWuzapiProvider()) {
          const chats = await whatsappChatSyncService.syncAndList(user.id, false);
          return res.json({ chats });
        }
        const chats = await whatsappChatSyncService.listCachedChats(user.id);
        return res.json({ chats });
      }

      const forceRefresh = String(req.query.refresh || "0") === "1";
      const chats = await whatsappChatSyncService.syncAndList(user.id, forceRefresh);
      return res.json({ chats });
    } catch (error: any) {
      const dbMessage = mapDatabaseError(error);
      if (dbMessage) return res.status(503).json({ message: dbMessage });
      return res.status(400).json({ message: error.message });
    }
  }

  async listChatMessages(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });

      const chatJid = decodeURIComponent(String(req.params.chatJid || req.query.chatid || "").trim());
      if (!chatJid) {
        return res.status(400).json({ message: "Informe o JID do chat." });
      }

      const limit = Number(req.query.limit) || 50;
      const offset = Number(req.query.offset) || 0;
      const sync = String(req.query.sync || "0") === "1";
      const awaitHistory = sync && String(req.query.awaitHistory || "0") === "1";

      const data = await whatsappMessageService.listChatMessages(user.id, chatJid, {
        limit,
        offset,
        sync,
        awaitHistory,
      });

      return res.json(data);
    } catch (error: any) {
      if (error?.message === "CHAT_ID_INVALID") {
        return res.status(400).json({ message: "JID do chat inválido.", error: "CHAT_ID_INVALID" });
      }
      return sendNormalizedUazapiError(res, error, "Falha ao buscar mensagens do chat.");
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

      const preview = req.body?.preview !== false;
      const force = Boolean(req.body?.force);

      if (!force) {
        const cached = await whatsappChatDetailsService.getCached(user.id, number);
        if (cached) {
          const cachedAvatar = String(
            (cached as any)?.avatarUrl ||
            (cached as any)?.avatarPreviewUrl ||
            (cached as any)?.image ||
            (cached as any)?.imagePreview ||
            "",
          ).trim();
          if (cachedAvatar) {
            return res.json({ details: cached, cached: true });
          }
        }
      }

      const details = await whatsappChatDetailsService.fetchAndPersist(user.id, number, preview);
      return res.json({ details, cached: false });
    } catch (error: any) {
      return sendNormalizedUazapiError(res, error, "Falha ao obter detalhes do contato.");
    }
  }

  async batchFetchChatAvatars(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autorizado" });

      const targets = Array.isArray(req.body?.targets)
        ? req.body.targets
        : (Array.isArray(req.body?.phones) ? req.body.phones : []);
      const preview = req.body?.preview !== false;
      const namesByTarget =
        req.body?.namesByTarget && typeof req.body.namesByTarget === "object"
          ? (req.body.namesByTarget as Record<string, string>)
          : {};
      const avatars = await whatsappService.batchFetchAvatars(
        user.id,
        targets,
        preview,
        namesByTarget,
      );
      return res.json({ avatars });
    } catch (error: any) {
      return sendNormalizedUazapiError(res, error, "Falha ao buscar avatares.");
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

  async webhook(req: Request, res: Response): Promise<any> {
    const webhookSecret = readEnv("WHATSAPP_WEBHOOK_SECRET");
    if (webhookSecret) {
      const received = String(req.headers["x-webhook-secret"] || "").trim();
      if (received !== webhookSecret) {
        return res.status(401).json({ message: "Webhook secret inválido" });
      }
    }

    res.status(200).json({ received: true });

    try {
      const rawBody = req.body;
      const event = parseWuzapiWebhookBody(rawBody) || rawBody;
      const eventType = normalizeWuzapiWebhookEventType(event);
      const ingestPayload = adaptWuzapiWebhookForIngest(event);

      const relevantEvents = [
        "messages",
        "messages.upsert",
        "messages.update",
        "chats.update",
        "chats.upsert",
        "history",
        "message",
        "historysync",
        "readreceipt",
      ];
      if (relevantEvents.includes(eventType)) {
        console.log(`[Webhook] ${eventType}`, JSON.stringify(event).substring(0, 200));
      } else {
        console.log(`[Webhook] ${eventType} recebido`);
      }

      void webhookLogService.logWebhookEvent(event);
      const userId = await whatsappPusherService.resolveUserIdFromWebhook(event);

      if (userId) {
        const sessionJid = extractWuzapiSessionJidFromWebhook(event)
          || extractSessionJidFromStatusPayload(event);
        if (sessionJid) {
          const isolation = await whatsappSessionService.ensureSessionIsolation(
            userId,
            sessionJid,
            () => whatsappService.purgeWhatsappDatastore(userId),
          );
          if (isolation.purged) {
            void whatsappPusherService.notifySessionReset(userId, "webhook-account-switch");
            await Promise.all([
              whatsappMessageRepository.deleteNotMatchingSession(userId, isolation.nextJid),
              whatsappChatRepository.deleteNotMatchingSession(userId, isolation.nextJid),
            ]);
          } else if (isolation.nextJid) {
            await Promise.all([
              whatsappMessageRepository.assignSessionJidToOrphans(userId, isolation.nextJid),
              whatsappChatRepository.assignSessionJidToOrphans(userId, isolation.nextJid),
            ]);
          }
        }
      }

      if (userId && whatsappMessageService.shouldIngestEventType(eventType)) {
        try {
          await whatsappMessageService.ingestPayload(userId, ingestPayload);
        } catch (err: any) {
          console.warn("[WhatsApp] Falha ao persistir mensagens do webhook:", err?.message || err);
        }
      }
      if (userId) {
        whatsappMessageHistoryBackfillService.handleWebhook(userId, event, eventType);
      }
      void whatsappPusherService.handleWebhook(event);
    } catch (error) {
      console.error("Erro ao processar webhook:", error);
    }
  }

  // --- Proxy WuzAPI (compatibilidade com rotas /proxy/* do painel admin) ---
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

      try {
        const result = await wuzapiProxyService.handle(
          user.id,
          endpoint,
          method,
          (req.body || {}) as Record<string, unknown>,
          req.query as Record<string, string>,
        );
        return res.json(result);
      } catch (error: any) {
        const msg = String(error?.message || "Falha no proxy WuzAPI.");
        if (msg.includes("não disponível") || msg.includes("não mapeado")) {
          return res.status(501).json({ message: msg, provider: getActiveWhatsappProvider() });
        }
        return res.status(400).json({ message: msg });
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        return res.status(504).json({ message: "Timeout ao conectar com a WuzAPI.", error: "WUZAPI_TIMEOUT" });
      }
      return res.status(400).json({ message: error.message });
    }
  }

  private async downloadMessageMedia(req: Request, res: Response): Promise<any> {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Não autorizado." });

    const body = req.body || {};
    const messageId = String(body.id || body.messageid || body.messageId || "").trim();
    const chatJid = String(body.chatid || body.chatId || body.wa_chatid || "").trim();

    try {
      if (whatsappMediaArchiveService.isEnabled() && messageId) {
        const cachedUrl = await whatsappMediaArchiveService.findCachedPublicUrl(user.id, messageId);
        if (cachedUrl) {
          return res.json(whatsappMediaArchiveService.withArchivedFileUrl({ ok: true }, cachedUrl));
        }
      }

      const result = await whatsappService.downloadMedia(user.id, body);
      const data = (result as any)?.data ?? result;
      const remoteUrl = String(
        data?.fileURL || data?.fileUrl || data?.url || data?.URL || data?.Data || "",
      ).trim();

      if (whatsappMediaArchiveService.isEnabled() && messageId && remoteUrl) {
        try {
          const archivedUrl = await whatsappMediaArchiveService.archiveFromRemoteUrl(
            user.id,
            messageId,
            remoteUrl,
            { chatJid, mimeType: String(body.mimetype || body.mimeType || data?.mimetype || "") },
          );
          return res.json(whatsappMediaArchiveService.withArchivedFileUrl(data, archivedUrl));
        } catch (archiveErr) {
          console.warn("[WhatsApp Media] Falha ao arquivar mídia WuzAPI:", (archiveErr as Error)?.message || archiveErr);
        }
      }

      return res.json(data);
    } catch (error: any) {
      return res.status(400).json({ message: error?.message || "Falha ao baixar mídia via WuzAPI." });
    }
  }
}
