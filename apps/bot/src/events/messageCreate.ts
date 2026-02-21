import type { Client, Message } from "discord.js";
import { connectionService } from "../services/connectionService.js";
import { photoService } from "../services/photoService.js";
import { deliveryService } from "../services/deliveryService.js";
import { validateMediaAttachment } from "../middleware/validator.js";
import { rateLimiter } from "../middleware/rateLimiter.js";
import { RATE_LIMIT } from "@repo/shared";
import { createPhotoEmbed } from "../utils/embed.js";
import { logger } from "../utils/logger.js";

export function registerMessageCreateEvent(client: Client) {
  client.on("messageCreate", async (message: Message) => {
    // Only process DMs with attachments (non-bot)
    if (!message.inGuild() && !message.author.bot && message.attachments.size > 0) {
      await handleDmPhoto(message);
    }
  });
}

async function handleDmPhoto(message: Message) {
  const attachment = message.attachments.first();
  if (!attachment) return;

  // Validate it's media
  const validation = validateMediaAttachment(attachment);
  if (!validation.valid) return; // Silently ignore non-media attachments in DMs

  // Rate limit
  const limited = await rateLimiter.check(
    `photo:${message.author.id}`,
    RATE_LIMIT.PHOTO_UPLOAD
  );
  if (limited) {
    await message.reply("You're sending photos too fast. Please wait a moment.");
    return;
  }

  // Get sender
  const sender = await connectionService.getOrCreateUser(
    message.author.id,
    message.author.username,
    message.author.displayAvatarURL()
  );

  // Get friends
  const friends = await connectionService.getAcceptedFriends(sender.id);
  if (friends.length === 0) {
    await message.reply(
      "You have no connected friends yet. Use `/connect` in a server to add friends first."
    );
    return;
  }

  // Download & upload
  const response = await fetch(attachment.url);
  const buffer = Buffer.from(await response.arrayBuffer());

  const photo = await photoService.uploadAndSave(message.client, {
    senderId: sender.id,
    senderDiscordId: sender.discordId,
    buffer,
    contentType: attachment.contentType!,
    size: attachment.size,
    width: attachment.width,
    height: attachment.height,
    caption: message.content || null,
    recipientIds: friends.map((f) => f.id),
  });

  const freshUrl = await photoService.getFreshUrl(message.client, photo.storageKey);

  // Deliver
  const result = await deliveryService.deliverPhoto(message.client, {
    senderUsername: message.author.username,
    senderAvatarUrl: message.author.displayAvatarURL(),
    mediaUrl: freshUrl,
    mediaType: photo.mediaType as "IMAGE" | "VIDEO",
    caption: message.content || null,
    recipients: friends.map((f) => ({ discordId: f.discordId, username: f.discordUsername })),
  });

  logger.info("DM photo delivered", {
    sender: message.author.id,
    photoId: photo.id,
    ...result,
  });

  let replyMessage = `Đã gửi ảnh thành công đến **${result.delivered}/${result.total}** người bạn.`;
  if (result.failed > 0) {
    replyMessage = `Đã gửi ảnh thành công. Tuy nhiên, không thể gửi đến: **${result.failedNames.join(", ")}** do họ đang khóa tin nhắn riêng.`;
  }

  await message.reply(replyMessage);
}
