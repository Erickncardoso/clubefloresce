import { InstagramConfigRepository } from "../repositories/instagram-config.repository";
import {
  buildAuthorizeUrl,
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  getMe,
  refreshLongLivedToken,
  subscribeToWebhooks,
} from "../utils/instagram-graph.client";
import { createOauthState, verifyOauthState } from "../utils/instagram-webhook";

const configRepository = new InstagramConfigRepository();

export class InstagramOauthService {
  /** URL de autorização com state assinado (chamada pelo painel, autenticada). */
  getAuthorizeUrl(userId: string): string | null {
    const state = createOauthState(userId);
    if (!state) return null;
    return buildAuthorizeUrl(state);
  }

  /**
   * Callback do OAuth: valida state, troca code → token curto → token longo (60d),
   * busca o perfil, salva a config e inscreve o app nos webhooks da conta.
   */
  async handleCallback(code: string, state: string | undefined): Promise<{ username: string }> {
    const userId = verifyOauthState(state);
    if (!userId) throw new Error("State inválido ou expirado — refaça a conexão pelo painel.");

    const short = await exchangeCodeForShortLivedToken(code);
    const long = await exchangeForLongLivedToken(short.access_token);
    const profile = await getMe(long.access_token);

    const tokenExpiresAt = new Date(Date.now() + long.expires_in * 1000);
    await configRepository.upsert({
      userId,
      accessToken: long.access_token,
      tokenExpiresAt,
      instagramUserId: profile.user_id,
      instagramUsername: profile.username,
      profilePictureUrl: profile.profile_picture_url ?? null,
    });

    try {
      await subscribeToWebhooks(profile.user_id, long.access_token);
    } catch (error) {
      console.warn("[Instagram] Falha ao inscrever webhooks (comments/messages):", error);
    }

    return { username: profile.username };
  }

  /** Renova tokens que expiram em menos de 10 dias (job diário). */
  async refreshExpiringTokens(): Promise<void> {
    const configs = await configRepository.listAll();
    const threshold = Date.now() + 10 * 24 * 60 * 60 * 1000;

    for (const config of configs) {
      if (config.tokenExpiresAt.getTime() > threshold) continue;
      try {
        const refreshed = await refreshLongLivedToken(config.accessToken);
        await configRepository.updateToken(
          config.userId,
          refreshed.access_token,
          new Date(Date.now() + refreshed.expires_in * 1000)
        );
        console.log(`[Instagram] Token renovado para @${config.instagramUsername}.`);
      } catch (error) {
        console.error(
          `[Instagram] Falha ao renovar token de @${config.instagramUsername}:`,
          error
        );
      }
    }
  }
}
