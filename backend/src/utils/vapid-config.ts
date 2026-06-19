import webpush from "web-push";

let configured = false;

function readEnvKey(...names: string[]): string | null {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return null;
}

export function isVapidConfigured(): boolean {
  return Boolean(readEnvKey("VAPID_PUBLIC_KEY", "VAPID_PUBLIC", "VPID_PUBLIC_KEY")
    && readEnvKey("VAPID_PRIVATE_KEY", "VAPID_PRIVATE", "VPID_PRIVATE_KEY"));
}

export function getVapidPublicKey(): string | null {
  return readEnvKey("VAPID_PUBLIC_KEY", "VAPID_PUBLIC", "VPID_PUBLIC_KEY");
}

export function ensureVapidConfigured(): boolean {
  if (configured) return true;

  const publicKey = getVapidPublicKey();
  const privateKey = readEnvKey("VAPID_PRIVATE_KEY", "VAPID_PRIVATE", "VPID_PRIVATE_KEY");
  if (!publicKey || !privateKey) return false;

  const subject =
    readEnvKey("VAPID_SUBJECT", "VAPID_CONTACT", "VPID_SUBJECT")
    || "mailto:contato@nutrisabellajardim.com.br";

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export { webpush };
