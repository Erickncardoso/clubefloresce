import Pusher from "pusher";
import { readEnv } from "./env";

let pusherClient: Pusher | null = null;

export function isPusherConfigured(): boolean {
  return Boolean(
    readEnv("PUSHER_APP_ID")
    && readEnv("PUSHER_KEY")
    && readEnv("PUSHER_SECRET")
    && readEnv("PUSHER_CLUSTER"),
  );
}

export function getPusherClient(): Pusher | null {
  if (!isPusherConfigured()) return null;

  if (!pusherClient) {
    pusherClient = new Pusher({
      appId: readEnv("PUSHER_APP_ID")!,
      key: readEnv("PUSHER_KEY")!,
      secret: readEnv("PUSHER_SECRET")!,
      cluster: readEnv("PUSHER_CLUSTER")!,
      useTLS: true,
    });
  }

  return pusherClient;
}

export function whatsappPusherChannel(userId: string): string {
  return `private-whatsapp-${userId}`;
}
