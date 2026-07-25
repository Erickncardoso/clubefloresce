import { getInstagramAppId, getInstagramAppSecret, getInstagramRedirectUri } from "./instagram-env";

const GRAPH_BASE = "https://graph.instagram.com/v25.0";

export class InstagramGraphError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "InstagramGraphError";
    this.status = status;
    this.body = body;
  }
}

async function graphFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* corpo não-JSON */
  }
  if (!res.ok) {
    const message = (body as any)?.error?.message || `Instagram Graph HTTP ${res.status}`;
    throw new InstagramGraphError(message, res.status, body);
  }
  return body as T;
}

/** URL de autorização (Instagram Login para contas profissionais). */
export function buildAuthorizeUrl(state: string): string | null {
  const appId = getInstagramAppId();
  const redirectUri = getInstagramRedirectUri();
  if (!appId || !redirectUri) return null;

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: [
      "instagram_business_basic",
      "instagram_business_manage_messages",
      "instagram_business_manage_comments",
    ].join(","),
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

/** Troca o code por token de curta duração (~1h). */
export async function exchangeCodeForShortLivedToken(code: string): Promise<{
  access_token: string;
  user_id: string;
}> {
  const appId = getInstagramAppId();
  const appSecret = getInstagramAppSecret();
  const redirectUri = getInstagramRedirectUri();
  if (!appId || !appSecret || !redirectUri) {
    throw new Error("INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET / redirect URI ausentes no .env");
  }

  const form = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });
  const data = await graphFetch<{ access_token: string; user_id: number | string }>(
    "https://api.instagram.com/oauth/access_token",
    { method: "POST", body: form }
  );
  return { access_token: data.access_token, user_id: String(data.user_id) };
}

/** Troca token curto por longo (60 dias). */
export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const appSecret = getInstagramAppSecret();
  if (!appSecret) throw new Error("INSTAGRAM_APP_SECRET ausente no .env");

  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: appSecret,
    access_token: shortLivedToken,
  });
  return graphFetch("https://graph.instagram.com/access_token?" + params.toString());
}

/** Renova token longo (válido se tiver mais de 24h de vida e não estiver expirado). */
export async function refreshLongLivedToken(token: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const params = new URLSearchParams({ grant_type: "ig_refresh_token", access_token: token });
  return graphFetch("https://graph.instagram.com/refresh_access_token?" + params.toString());
}

export async function getMe(token: string): Promise<{
  user_id: string;
  username: string;
  profile_picture_url?: string;
}> {
  const params = new URLSearchParams({
    fields: "user_id,username,profile_picture_url",
    access_token: token,
  });
  const data = await graphFetch<any>(`${GRAPH_BASE}/me?${params.toString()}`);
  return {
    user_id: String(data.user_id ?? data.id),
    username: data.username,
    profile_picture_url: data.profile_picture_url,
  };
}

/** Inscreve o app nos webhooks da conta conectada (comments + messages). */
export async function subscribeToWebhooks(igUserId: string, token: string): Promise<void> {
  const params = new URLSearchParams({
    subscribed_fields: "comments,messages",
    access_token: token,
  });
  await graphFetch(`${GRAPH_BASE}/${igUserId}/subscribed_apps?${params.toString()}`, {
    method: "POST",
  });
}

/** Lista posts/reels da conta (para automação por mídia específica). */
export async function listMedia(igUserId: string, token: string, limit = 25): Promise<any[]> {
  const params = new URLSearchParams({
    fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp",
    limit: String(limit),
    access_token: token,
  });
  const data = await graphFetch<{ data: any[] }>(
    `${GRAPH_BASE}/${igUserId}/media?${params.toString()}`
  );
  return data.data ?? [];
}

type QuickReply = { title: string; payload: string };

/** DM para um IGSID (recipient.id) — texto simples, com quick replies opcionais. */
export async function sendDirectMessage(
  igUserId: string,
  token: string,
  recipientId: string,
  text: string,
  quickReplies?: QuickReply[]
): Promise<void> {
  const message: Record<string, unknown> = { text };
  if (quickReplies?.length) {
    message.quick_replies = quickReplies.map((qr) => ({
      content_type: "text",
      title: qr.title.slice(0, 20),
      payload: qr.payload,
    }));
  }
  await postMessage(igUserId, token, { recipient: { id: recipientId }, message });
}

/** DM com botão de link (template genérico). */
export async function sendLinkButtonMessage(
  igUserId: string,
  token: string,
  recipientId: string,
  text: string,
  buttonLabel: string,
  url: string
): Promise<void> {
  await postMessage(igUserId, token, {
    recipient: { id: recipientId },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text,
          buttons: [{ type: "web_url", url, title: buttonLabel.slice(0, 20) }],
        },
      },
    },
  });
}

/** Resposta privada a um comentário (abre a DM sem a janela de 24h). */
export async function sendPrivateReplyToComment(
  igUserId: string,
  token: string,
  commentId: string,
  text: string,
  quickReplies?: QuickReply[]
): Promise<void> {
  const message: Record<string, unknown> = { text };
  if (quickReplies?.length) {
    message.quick_replies = quickReplies.map((qr) => ({
      content_type: "text",
      title: qr.title.slice(0, 20),
      payload: qr.payload,
    }));
  }
  await postMessage(igUserId, token, { recipient: { comment_id: commentId }, message });
}

async function postMessage(igUserId: string, token: string, body: unknown): Promise<void> {
  await graphFetch(`${GRAPH_BASE}/${igUserId}/messages?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Reply público no comentário. */
export async function replyToCommentPublicly(
  commentId: string,
  token: string,
  message: string
): Promise<void> {
  const form = new URLSearchParams({ message, access_token: token });
  await graphFetch(`${GRAPH_BASE}/${commentId}/replies`, { method: "POST", body: form });
}
