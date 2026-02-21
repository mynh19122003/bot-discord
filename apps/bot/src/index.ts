import "dotenv/config";
import { client } from "./client.js";
import { config } from "./config.js";
import { commands } from "./commands/index.js";
import { registerReadyEvent } from "./events/ready.js";
import { registerInteractionCreateEvent } from "./events/interactionCreate.js";
import { registerMessageCreateEvent } from "./events/messageCreate.js";
import { logger } from "./utils/logger.js";

// ─── Register commands ──────────────────────────────────────────────

for (const command of commands) {
  client.commands.set(command.data.name, command);
}

// ─── Register events ────────────────────────────────────────────────

registerReadyEvent(client);
registerInteractionCreateEvent(client);
registerMessageCreateEvent(client);

import { registerControlListener } from "./services/controlService.js";
registerControlListener();

// ─── Login ──────────────────────────────────────────────────────────

client.login(config.DISCORD_TOKEN).catch((err) => {
  logger.error("Failed to login", err);
  process.exit(1);
});

// ─── Graceful shutdown ──────────────────────────────────────────────

process.on("SIGINT", () => {
  logger.info("Shutting down...");
  client.destroy();
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Shutting down...");
  client.destroy();
  process.exit(0);
});
