import Redis from "ioredis";

class CacheService {
  private redis: Redis | null = null;
  private enabled = false;
  private loggedRedisError = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL?.trim();
    if (!redisUrl) return;

    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
      retryStrategy: () => null,
      reconnectOnError: () => false,
    });

    this.redis = client;

    client.on("ready", () => {
      this.enabled = true;
    });

    client.on("error", (err) => {
      this.enabled = false;
      if (this.loggedRedisError) return;
      this.loggedRedisError = true;
      console.warn(
        "[Redis] indisponível — cache de vídeo desativado neste ambiente:",
        err.message,
      );
    });

    void client.connect().catch((err) => {
      this.enabled = false;
      if (this.loggedRedisError) return;
      this.loggedRedisError = true;
      console.warn(
        "[Redis] indisponível — cache de vídeo desativado neste ambiente:",
        err.message,
      );
      void client.quit().catch(() => {});
      this.redis = null;
    });
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (!this.redis || !this.enabled) return null;
    const value = await this.redis.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.redis || !this.enabled) return;
    await this.redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  }

  async del(key: string): Promise<void> {
    if (!this.redis || !this.enabled) return;
    await this.redis.del(key);
  }

  isReady(): boolean {
    return Boolean(this.redis && this.enabled);
  }
}

export const cacheService = new CacheService();
