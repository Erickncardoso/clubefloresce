import { Router } from "express";
import { WhatsappController } from "../controllers/whatsapp.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
const whatsappController = new WhatsappController();

// Apenas Nutricionistas conseguem gerenciar conexões do WhatsApp
router.get("/status", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.status);
router.get("/chats", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.listChats);
router.post("/create", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.create);
router.post("/connect", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.connect);
router.post("/connect/regenerate-qr", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.regenerateQrCode);
router.post("/disconnect", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.disconnect);
router.delete("/instance/:name", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.deleteInstance);
router.post("/contact-states/list", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.listContactStates);
router.post("/contact-states/upsert", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.upsertContactStates);
router.get("/contact-directory", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.getContactDirectory);
router.post("/contact-directory", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.upsertContactDirectory);
router.get("/group-observed-senders", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.getGroupObservedSenders);
router.post("/group-observed-senders", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.mergeGroupObservedSenders);
router.post("/group/create", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.createGroup);
router.post("/group/info", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.getGroupInfo);
router.post("/group/inviteInfo", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.getGroupInviteInfo);
router.post("/group/join", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.joinGroup);
router.post("/group/leave", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.leaveGroup);
router.get("/group/list", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.listGroups);
router.post("/group/list", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.listGroupsPaginated);
router.post("/group/resetInviteCode", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.resetGroupInviteCode);
router.post("/group/updateAnnounce", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.updateGroupAnnounce);
router.post("/group/updateDescription", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.updateGroupDescription);
router.post("/group/updateImage", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.updateGroupImage);
router.post("/group/updateLocked", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.updateGroupLocked);
router.post("/group/updateName", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.updateGroupName);
router.post("/group/updateParticipants", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.updateGroupParticipants);

// ROTA PÚBLICA para a UazAPI enviar as mensagens (Webhook)
router.post("/webhook", whatsappController.webhook);

// --- ROTA PROXY (Repasse automático para todos os endpoints da UazAPI) ---
// Usa um curinga * para repassar qualquer coisa após /proxy/ com qualquer método HTTP.
router.all("/proxy/*", authenticate, authorize(["NUTRICIONISTA"]), whatsappController.proxyRequest);

export default router;
