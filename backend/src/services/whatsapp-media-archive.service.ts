import { WhatsappMediaArchiveRepository } from "../repositories/whatsapp_media_archive.repository";
import {
  getWhatsappMediaStoragePrefix,
  isBackblazeB2Configured,
} from "../utils/media/backblaze-config";
import {
  downloadRemoteFile,
  guessExtensionFromMime,
  uploadBufferToBackblazeB2,
} from "../utils/media/backblaze-storage";

const repository = new WhatsappMediaArchiveRepository();

const normalizeMessageId = (value: unknown): string => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.includes(":") ? (raw.split(":").pop() || raw) : raw;
};

const sanitizePathSegment = (value: string): string =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(0, 120) || "unknown";

const buildStorageKey = (
  userId: string,
  messageId: string,
  chatJid: string | null | undefined,
  mimeType: string | undefined,
): string => {
  const prefix = getWhatsappMediaStoragePrefix();
  const ext = guessExtensionFromMime(mimeType);
  const chatPart = sanitizePathSegment(String(chatJid || "direct").replace("@", "_"));
  const msgPart = sanitizePathSegment(messageId);
  const userPart = sanitizePathSegment(userId);
  return `${prefix}/${userPart}/${chatPart}/${msgPart}.${ext}`;
};

export class WhatsappMediaArchiveService {
  isEnabled(): boolean {
    return isBackblazeB2Configured();
  }

  async findCachedPublicUrl(userId: string, messageId: string): Promise<string | null> {
    const normalizedId = normalizeMessageId(messageId);
    if (!normalizedId) return null;
    const row = await repository.findByUserAndMessage(userId, normalizedId);
    return row?.publicUrl ? String(row.publicUrl).trim() : null;
  }

  async archiveFromRemoteUrl(
    userId: string,
    messageId: string,
    remoteUrl: string,
    options: { chatJid?: string; mimeType?: string } = {},
  ): Promise<string> {
    if (!this.isEnabled()) return remoteUrl;

    const normalizedId = normalizeMessageId(messageId);
    if (!normalizedId) throw new Error("messageId inválido para arquivamento.");

    const existing = await repository.findByUserAndMessage(userId, normalizedId);
    if (existing?.publicUrl) return existing.publicUrl;

    const remote = String(remoteUrl || "").trim();
    if (!remote) throw new Error("URL remota vazia para arquivamento.");

    const { body, mimeType } = await downloadRemoteFile(remote);
    const storageKey = buildStorageKey(userId, normalizedId, options.chatJid, options.mimeType || mimeType);
    const uploaded = await uploadBufferToBackblazeB2(storageKey, body, options.mimeType || mimeType || "application/octet-stream");

    const saved = await repository.upsert(userId, {
      messageId: normalizedId,
      chatJid: options.chatJid || null,
      mimeType: uploaded.mimeType,
      storageKey: uploaded.storageKey,
      publicUrl: uploaded.publicUrl,
      sourceUrl: remote,
      sizeBytes: uploaded.sizeBytes,
    });

    console.log(`[WhatsApp Media] Arquivado no B2: ${normalizedId.slice(0, 12)}… (${uploaded.sizeBytes} bytes)`);
    return saved.publicUrl;
  }

  withArchivedFileUrl<T extends Record<string, unknown>>(payload: T, publicUrl: string): T {
    return {
      ...payload,
      fileURL: publicUrl,
      fileUrl: publicUrl,
      archived: true,
      archiveProvider: "backblaze_b2",
    };
  }
}

const whatsappMediaArchiveService = new WhatsappMediaArchiveService();
export default whatsappMediaArchiveService;
