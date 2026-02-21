import { Client, GatewayIntentBits, Partials, Collection } from "discord.js";
import type { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

export interface BotCommand {
  data: any;
  execute: (interaction: ChatInputCommandInteraction) => Promise<any>;
}

// Extend Client to hold commands collection
declare module "discord.js" {
  interface Client {
    commands: Collection<string, BotCommand>;
  }
}

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
  rest: { timeout: 15_000 },
});

client.commands = new Collection();
