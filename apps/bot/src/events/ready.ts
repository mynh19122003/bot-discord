import type { Client } from "discord.js";
import { logger } from "../utils/logger.js";
import Redis from "ioredis";
import { config } from "../config.js";

const redis = new Redis(config.REDIS_URL);
const startTime = Date.now();

export function registerReadyEvent(client: Client) {
  client.once("ready", (c) => {
    logger.info(`Bot online as ${c.user.tag}`);
    logger.info(`Serving ${c.guilds.cache.size} guilds`);

    // Sync bot status to Redis every 10 seconds for the Dashboard
    setInterval(async () => {
      try {
        await redis.set(
          "bot:status",
          JSON.stringify({
            status: "Online",
            uptimeMs: Date.now() - startTime,
            servers: c.guilds.cache.size,
            lastHeartbeat: Date.now(),
          }),
          "EX",
          30 // Expire in 30 seconds if bot dies
        );
      } catch (err) {
        logger.error("Failed to sync status to Redis", err);
      }
    }, 10000);
  });
}
