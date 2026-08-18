const TITLE_MAX = 80;
const BODY_MAX = 200;
const IMAGE_MAX = 600;

const ACTION_PATHS = new Set([
  "/inicio",
  "/diario",
  "/dieta",
  "/check-in",
  "/bella",
  "/perfil/notificacoes",
]);

const TYPES = new Set(["bella", "checkin", "community", "content", "meal", "general"]);
const AUDIENCES = new Set(["one", "all", "female", "male", "selected"]);

const BUTTONS: Record<string, { categoryId: string; label: string }> = {
  open: { categoryId: "admin-open", label: "Abrir" },
  see: { categoryId: "admin-see", label: "Ver agora" },
  checkin: { categoryId: "admin-checkin", label: "Fazer check-in" },
  bella: { categoryId: "admin-bella", label: "Falar com Bella" },
  diary: { categoryId: "admin-diary", label: "Ver diário" },
};

export type AdminPushCampaignInput = {
  authorId: string;
  title?: string;
  body: string;
  type?: string;
  actionPath?: string | null;
  imageUrl?: string | null;
  buttonKey?: string | null;
  audience?: string;
  userId?: string;
  userIds?: unknown;
  scheduledAt?: unknown;
};

export function cleanPushText(value: unknown, max = TITLE_MAX): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function parsePushBody(value: unknown): string {
  const body = cleanPushText(value, BODY_MAX);
  if (body.length < 2) throw new Error("Escreva a mensagem da notificação.");
  return body;
}

export function parseActionPath(value: unknown): string {
  const path = String(value || "").trim() || "/inicio";
  if (ACTION_PATHS.has(path)) return path;
  throw new Error("Destino inválido.");
}

export function parseType(value: unknown): string {
  const type = String(value || "general").trim() || "general";
  if (!TYPES.has(type)) throw new Error("Tipo de notificação inválido.");
  return type;
}

export function parseAudience(value: unknown, userId?: string, userIds?: string[]): string {
  const raw = String(value || "").trim();
  if (raw && AUDIENCES.has(raw)) return raw;
  if (userId) return "one";
  if (userIds?.length) return "selected";
  throw new Error("Escolha para quem enviar.");
}

export function parseUserIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((id) => String(id).trim()).filter(Boolean))];
}

export function parseScheduledAt(value: unknown): Date | null {
  if (!value) return null;
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (match) {
    const [, dateKey, hour, minute] = match;
    const parsed = new Date(`${dateKey}T${hour}:${minute}:00-03:00`);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function parseImageUrl(value: unknown): string | null {
  const url = String(value || "").trim();
  if (!url) return null;
  if (url.length > IMAGE_MAX || !/^https:\/\//i.test(url)) {
    throw new Error("A imagem precisa ser um link https.");
  }
  return url;
}

export function parseButton(value: unknown): { buttonKey: string | null; categoryId: string | null; label: string | null } {
  const key = String(value || "").trim();
  if (!key) return { buttonKey: null, categoryId: null, label: null };
  const button = BUTTONS[key];
  if (!button) throw new Error("Botão inválido.");
  return { buttonKey: key, categoryId: button.categoryId, label: button.label };
}

export function profileGender(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const gender = (data as { gender?: unknown }).gender;
  return typeof gender === "string" ? gender : null;
}

export async function mapInChunks<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  for (let index = 0; index < items.length; index += size) {
    await Promise.all(items.slice(index, index + size).map(fn));
  }
}
