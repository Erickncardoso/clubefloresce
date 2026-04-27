import Redis from "ioredis";

class CacheService {
  private redis: Redis | null = null;
  private enabled = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return;

    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false
    });

    this.redis.on("error", (err) => {
      console.error("[Redis] erro de conexão:", err.message);
      this.enabled = false;
    });

    this.redis.on("ready", () => {
      this.enabled = true;
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
}

export const cacheService = new CacheService();
