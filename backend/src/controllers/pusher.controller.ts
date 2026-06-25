import { Request, Response } from "express";
import {
  getPusherClient,
  isPusherConfigured,
  whatsappPusherChannel,
} from "../utils/pusher-config";
import { readEnv } from "../utils/env";

export class PusherController {
  async config(req: Request, res: Response): Promise<any> {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Não autorizado." });

    if (!isPusherConfigured()) {
      return res.json({ enabled: false, key: null, cluster: null, channel: null });
    }

    return res.json({
      enabled: true,
      key: readEnv("PUSHER_KEY"),
      cluster: readEnv("PUSHER_CLUSTER"),
      channel: whatsappPusherChannel(user.id),
    });
  }

  async auth(req: Request, res: Response): Promise<any> {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Não autorizado." });

    if (!isPusherConfigured()) {
      return res.status(503).json({ message: "Pusher não configurado." });
    }

    const socketId = String(req.body?.socket_id || req.query?.socket_id || "");
    const channelName = String(req.body?.channel_name || req.query?.channel_name || "");
    const expectedChannel = whatsappPusherChannel(user.id);

    if (!socketId || channelName !== expectedChannel) {
      return res.status(403).json({ message: "Canal não autorizado." });
    }

    const pusher = getPusherClient();
    if (!pusher) {
      return res.status(503).json({ message: "Pusher não configurado." });
    }

    const auth = pusher.authorizeChannel(socketId, channelName);
    return res.send(auth);
  }
}
