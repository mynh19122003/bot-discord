import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { connectionService } from "../services/connectionService.js";
import { rateLimiter } from "../middleware/rateLimiter.js";
import { RATE_LIMIT } from "@repo/shared";
import { validateMediaAttachment } from "../middleware/validator.js";
import { photoService } from "../services/photoService.js";
import { deliveryService } from "../services/deliveryService.js";
import { logger } from "../utils/logger.js";

export const command = {
  data: new SlashCommandBuilder()
    .setName("chup")
    .setDescription("Gửi ngay một khoảnh khắc (ảnh/video dưới 10MB) đến những người bạn đã kết nối.")
    .addAttachmentOption((opt) =>
      opt.setName("file").setDescription("Ảnh hoặc video ngắn bạn muốn gửi").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("chuthich").setDescription("Chú thích cho ảnh (tối đa 500 ký tự)").setMaxLength(500)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const limited = await rateLimiter.check(
        `photo:${interaction.user.id}`,
        RATE_LIMIT.PHOTO_UPLOAD
      );
      
      if (limited) {
        return interaction.reply({
          content: "Bạn gửi ảnh quá nhanh! Vui lòng đợi một lát.",
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const attachment = interaction.options.getAttachment("file", true);
      const caption = interaction.options.getString("chuthich");

      const validation = validateMediaAttachment(attachment);
      if (!validation.valid) {
        return interaction.editReply(validation.reason || "File không hợp lệ.");
      }

      const sender = await connectionService.getOrCreateUser(
        interaction.user.id,
        interaction.user.username,
        interaction.user.displayAvatarURL()
      );

      const friends = await connectionService.getAcceptedFriends(sender.id);
      if (friends.length === 0) {
        return interaction.editReply(
          "Bạn chưa có bạn bè nào để gửi ảnh. Sử dụng lệnh `/connect` để thêm bạn bè trước."
        );
      }

      const response = await fetch(attachment.url);
      const buffer = Buffer.from(await response.arrayBuffer());

      const photo = await photoService.uploadAndSave(interaction.client, {
        senderId: sender.id,
        senderDiscordId: sender.discordId,
        buffer,
        contentType: attachment.contentType!,
        size: attachment.size,
        width: attachment.width,
        height: attachment.height,
        caption,
        recipientIds: friends.map((f) => f.id),
      });

      const freshUrl = await photoService.getFreshUrl(interaction.client, photo.storageKey);

      const result = await deliveryService.deliverPhoto(interaction.client, {
        senderUsername: interaction.user.username,
        senderAvatarUrl: interaction.user.displayAvatarURL(),
        mediaUrl: freshUrl,
        mediaType: photo.mediaType as "IMAGE" | "VIDEO",
        caption,
        recipients: friends.map((f) => ({ discordId: f.discordId, username: f.discordUsername })),
      });

      logger.info(`[Hệ thống] Đã giao Locket ảnh`, {
        sender: interaction.user.id,
        photoId: photo.id,
        ...result,
      });

      let replyMessage = `Đã gửi ảnh thành công đến **${result.delivered}/${result.total}** người bạn.`;
      if (result.failed > 0) {
        replyMessage = `Đã gửi ảnh thành công. Tuy nhiên, không thể gửi đến: **${result.failedNames.join(", ")}** do họ đang khóa tin nhắn riêng.`;
      }

      await interaction.editReply(replyMessage);
    } catch (error) {
      logger.error(`[Lỗi Lệnh /chup] Chi tiết:`, error);
      if (interaction.deferred) {
        await interaction.editReply("Đã xảy ra lỗi hệ thống khi xử lý ảnh Locket.");
      }
    }
  }
};
