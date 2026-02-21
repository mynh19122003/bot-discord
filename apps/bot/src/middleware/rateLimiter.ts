import Redis from "ioredis";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    redis.on("error", (err) => logger.error("Redis error", err));
  }
  return redis;
}

interface RateLimitConfig {
  window: number; // seconds
  max: number;    // max requests in window
}

export const rateLimiter = {
  async check(key: string, limit: RateLimitConfig): Promise<boolean> {
    const r = getRedis();
    const now = Date.now();
    const windowStart = now - limit.window * 1000;

    const pipeline = r.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, now, `${now}`);
    pipeline.zcard(key);
    pipeline.expire(key, limit.window);

    const results = await pipeline.exec();
    const count = results?.[2]?.[1] as number;
    return count > limit.max;
  },

  async disconnect(): Promise<void> {
    if (redis) {
      await redis.quit();
      redis = null;
    }
  },
};
