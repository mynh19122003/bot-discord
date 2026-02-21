import Redis from "ioredis";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import { client as discordClient } from "../client.js";

// Dedicated redis client for subscribing (Redis requires separate client for sub)
const subClient = new Redis(config.REDIS_URL);

export function registerControlListener() {
  subClient.subscribe("bot-control", (err, count) => {
    if (err) {
      logger.error("Failed to subscribe to bot-control channel", err);
      return;
    }
    logger.info(`Subscribed to bot-control channel (${count} subscriptions)`);
  });

  subClient.on("message", async (channel, message) => {
    if (channel !== "bot-control") return;

    logger.info(`Received control command: ${message}`);

    try {
      const payload = JSON.parse(message);

      if (payload.action === "RESTART") {
        logger.info("Restart command received. Shutting down gracefully for restart...");
        await discordClient.destroy();
        // Exit with code 1 so process managers (PM2/Docker/nodemon) restart it
        process.exit(1);
      }

      if (payload.action === "SHUTDOWN") {
        logger.info("Shutdown command received. Terminating process safely...");
        await discordClient.destroy();
        // Exit with code 0 to signify clean stop
        process.exit(0);
      }
    } catch (e) {
      logger.error("Failed to process control command", e);
    }
  });
}
