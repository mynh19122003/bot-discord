import { EmbedBuilder } from "discord.js";
import { COLORS } from "@repo/shared";

export function createSuccessEmbed(title: string, description?: string) {
  const embed = new EmbedBuilder().setColor(COLORS.SUCCESS).setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

export function createErrorEmbed(title: string, description?: string) {
  const embed = new EmbedBuilder().setColor(COLORS.ERROR).setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

export function createInfoEmbed(title: string, description?: string) {
  const embed = new EmbedBuilder().setColor(COLORS.INFO).setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

export function createPhotoEmbed(
  senderName: string,
  senderAvatarUrl: string,
  imageUrl: string,
  caption?: string | null
) {
  return new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setAuthor({ name: senderName, iconURL: senderAvatarUrl })
    .setImage(imageUrl)
    .setDescription(caption ?? null)
    .setFooter({ text: "Sent via Locket Bot" })
    .setTimestamp();
}
