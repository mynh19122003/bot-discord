import { REST, Routes } from "discord.js";
import { config } from "./config.js";
import { commands } from "./commands/index.js";
import { logger } from "./utils/logger.js";

const rest = new REST({ version: "10" }).setToken(config.DISCORD_TOKEN);

async function deployCommands() {
  try {
    const commandData = commands.map((cmd) => cmd.data.toJSON());

    logger.info(`Deploying ${commandData.length} slash commands...`);

    await rest.put(
      Routes.applicationCommands(config.DISCORD_CLIENT_ID),
      { body: commandData }
    );

    logger.info("Commands deployed successfully.");
  } catch (err) {
    logger.error("Failed to deploy commands", err);
    process.exit(1);
  }
}

deployCommands();
