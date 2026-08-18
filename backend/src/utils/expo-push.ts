const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
export const EXPO_TOKEN_PREFIX = "expo:";

export function isExpoPushEndpoint(endpoint: string): boolean {
  return String(endpoint || "").startsWith(EXPO_TOKEN_PREFIX);
}

export function expoEndpointFromToken(token: string): string {
  const value = String(token || "").trim();
  if (!value) return "";
  return value.startsWith(EXPO_TOKEN_PREFIX) ? value : `${EXPO_TOKEN_PREFIX}${value}`;
}

export function expoTokenFromEndpoint(endpoint: string): string {
  return String(endpoint || "").replace(/^expo:/, "").trim();
}

export function isExpoPushToken(token: string): boolean {
  return /^ExponentPushToken\[.+\]$/.test(token.trim());
}

export async function sendExpoPushMessage(input: {
  token: string;
  title: string;
  body: string;
  url?: string | null;
  tag?: string | null;
  imageUrl?: string | null;
  categoryId?: string | null;
}): Promise<{ ok: boolean; deviceNotRegistered?: boolean }> {
  const imageUrl = String(input.imageUrl || "").trim();
  const categoryId = String(input.categoryId || "").trim();
  const payload: Record<string, unknown> = {
    to: input.token,
    title: input.title,
    body: input.body,
    sound: "default",
    channelId: "reminders",
    data: {
      url: input.url || "/diario",
      route: input.url || "/diario",
      tag: input.tag || undefined,
      imageUrl: imageUrl || undefined,
    },
  };
  if (categoryId) payload.categoryId = categoryId;
  if (imageUrl) {
    payload.mutableContent = true;
    payload.richContent = { image: imageUrl };
  }

  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({})) as {
    data?: { status?: string; details?: { error?: string } };
    errors?: Array<{ code?: string }>;
  };

  const status = result?.data?.status;
  const error = result?.data?.details?.error || result?.errors?.[0]?.code;
  if (error === "DeviceNotRegistered") {
    return { ok: false, deviceNotRegistered: true };
  }
  if (!response.ok || status === "error") {
    return { ok: false };
  }
  return { ok: true };
}
