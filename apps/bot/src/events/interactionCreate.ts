import {
  type Client,
  type Interaction,
  type ButtonInteraction,
} from "discord.js";
import { prisma } from "@repo/database";
import { connectionService } from "../services/connectionService.js";
import { createSuccessEmbed, createErrorEmbed, createInfoEmbed } from "../utils/embed.js";
import { logger } from "../utils/logger.js";

export function registerInteractionCreateEvent(client: Client) {
  client.on("interactionCreate", async (interaction: Interaction) => {
    // ─── Slash Commands ───────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      logger.info(`Received command: ${interaction.commandName} from ${interaction.user.username}`);
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        logger.warn(`Command not found: ${interaction.commandName}`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (err) {
        logger.error(`Command error: ${interaction.commandName}`, err);
        const reply = {
          content: "An error occurred while executing this command.",
          ephemeral: true,
        };
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply(reply).catch(() => {});
        } else {
          await interaction.reply(reply).catch(() => {});
        }
      }
      return;
    }

    // ─── Button Interactions ──────────────────────────────────────
    if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    }
  });
}

async function handleButtonInteraction(interaction: ButtonInteraction) {
  const { customId } = interaction;

  // ─── Connection Accept/Reject ─────────────────────────────────
  if (customId.startsWith("accept_connection:")) {
    const connectionId = customId.split(":")[1];
    const user = await connectionService.getOrCreateUser(
      interaction.user.id,
      interaction.user.username,
      interaction.user.displayAvatarURL()
    );

    const result = await connectionService.acceptConnection(connectionId, user.id);

    if ("error" in result) {
      return interaction.update({
        embeds: [createErrorEmbed("Failed", `Could not accept: ${result.error}`)],
        components: [],
      });
    }

    // Notify the requester
    try {
      const requester = await interaction.client.users.fetch(
        result.data.requester.discordId
      );
      await requester.send({
        embeds: [
          createSuccessEmbed(
            "Connection Accepted",
            `**${interaction.user.username}** accepted your connection request. You can now share photos!`
          ),
        ],
      });
    } catch {
      // Requester DMs may be closed
    }

    return interaction.update({
      embeds: [
        createSuccessEmbed(
          "Connected!",
          `You're now connected with **${result.data.requester.discordUsername}**. Use \`/send\` to share photos!`
        ),
      ],
      components: [],
    });
  }

  if (customId.startsWith("reject_connection:")) {
    const connectionId = customId.split(":")[1];
    const user = await connectionService.getOrCreateUser(
      interaction.user.id,
      interaction.user.username,
      interaction.user.displayAvatarURL()
    );

    const result = await connectionService.rejectConnection(connectionId, user.id);

    if ("error" in result) {
      return interaction.update({
        embeds: [createErrorEmbed("Failed", `Could not reject: ${result.error}`)],
        components: [],
      });
    }

    return interaction.update({
      embeds: [createInfoEmbed("Request Rejected", "The connection request has been rejected.")],
      components: [],
    });
  }

  // ─── Settings Toggles ─────────────────────────────────────────
  if (customId === "toggle_dm_photos" || customId === "toggle_notifications") {
    const user = await connectionService.getOrCreateUser(
      interaction.user.id,
      interaction.user.username,
      interaction.user.displayAvatarURL()
    );

    const settings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    });
    if (!settings) return;

    const field =
      customId === "toggle_dm_photos" ? "allowDmPhotos" : "notifyOnReceive";

    await prisma.userSettings.update({
      where: { userId: user.id },
      data: { [field]: !settings[field] },
    });

    // Re-render the settings message
    const updated = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    });
    if (!updated) return;

    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import("discord.js");

    const row = new ActionRowBuilder<InstanceType<typeof ButtonBuilder>>().addComponents(
      new ButtonBuilder()
        .setCustomId("toggle_dm_photos")
        .setLabel(`DM Photos: ${updated.allowDmPhotos ? "ON" : "OFF"}`)
        .setStyle(updated.allowDmPhotos ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("toggle_notifications")
        .setLabel(`Notifications: ${updated.notifyOnReceive ? "ON" : "OFF"}`)
        .setStyle(updated.notifyOnReceive ? ButtonStyle.Success : ButtonStyle.Secondary)
    );

    return interaction.update({
      embeds: [
        createInfoEmbed(
          "Your Settings",
          [
            `**DM Photos:** ${updated.allowDmPhotos ? "Enabled" : "Disabled"}`,
            `**Notifications:** ${updated.notifyOnReceive ? "Enabled" : "Disabled"}`,
            "",
            "Click the buttons below to toggle settings.",
          ].join("\n")
        ),
      ],
      components: [row],
    });
  }
}
