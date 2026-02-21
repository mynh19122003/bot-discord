import {
  SlashCommandBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { connectionService } from "../services/connectionService.js";
import { rateLimiter } from "../middleware/rateLimiter.js";
import { RATE_LIMIT } from "@repo/shared";
import { logger } from "../utils/logger.js";
import { prisma } from "@repo/database";

export const command = {
  data: new SlashCommandBuilder()
    .setName("ketnoi")
    .setDescription("Nhập mã để kết nối Locket với một người bạn.")
    .addStringOption((opt) =>
      opt.setName("ma_moi").setDescription("Mã mời kết nối do bạn bè cung cấp").setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const limited = await rateLimiter.check(
      `cmd:${interaction.user.id}`,
      RATE_LIMIT.COMMAND
    );
    if (limited) {
      return interaction.reply({
        content: "Thao tác quá nhanh! Vui lòng đợi một lát.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const code = interaction.options.getString("ma_moi", true).trim().toUpperCase();

    try {
      const targetUser = await prisma.user.findUnique({ where: { inviteCode: code } });
      
      if (!targetUser) {
        return interaction.editReply("Mã mời không hợp lệ hoặc không tồn tại.");
      }

      if (targetUser.discordId === interaction.user.id) {
         return interaction.editReply("Bạn không thể tự kết nối với chính mình.");
      }

      const requester = await connectionService.getOrCreateUser(
        interaction.user.id,
        interaction.user.username,
        interaction.user.displayAvatarURL()
      );

      // Create or update connection to ACCEPTED
      const existingConnection = await prisma.connection.findFirst({
        where: {
          OR: [
            { requesterId: requester.id, addresseeId: targetUser.id },
            { addresseeId: requester.id, requesterId: targetUser.id }
          ]
        }
      });

      if (existingConnection) {
        if (existingConnection.status === "ACCEPTED") {
          return interaction.editReply(`Bạn đã kết nối với **${targetUser.discordUsername}** từ trước.`);
        } else {
          await prisma.connection.update({
            where: { id: existingConnection.id },
            data: { status: "ACCEPTED" }
          });
        }
      } else {
        await prisma.connection.create({
          data: {
            requesterId: requester.id,
            addresseeId: targetUser.id,
            status: "ACCEPTED"
          }
        });
      }

      const successEmbed = new EmbedBuilder()
        .setColor("#57f287")
        .setDescription(`Đã kết nối thành công với **${targetUser.discordUsername}**!`);

      await interaction.editReply({ embeds: [successEmbed] });

      // DM Health Check
      try {
        await interaction.user.send({
          content: `[Kiểm tra Hệ thống] Locket Bot đã có thể gửi tin nhắn cho bạn. Chúc bạn vui vẻ khi sử dụng với **${targetUser.discordUsername}**!`
        });
      } catch (dmError: any) {
        if (dmError.code === 50007) {
          logger.warn(`[Lệnh /connect] User ${interaction.user.id} khoá DM (Lỗi 50007).`);
          await interaction.followUp({
            content: "Kết nối thành công. Tuy nhiên, tôi không thể gửi ảnh locket cho bạn. Vui lòng vào **Cài đặt người dùng > Cài đặt quyền riêng tư** để mở khóa tin nhắn trực tiếp từ máy chủ này.",
            ephemeral: true
          });
        }
      }
      
      // Notify the target user if possible
      try {
        const discordUser = await interaction.client.users.fetch(targetUser.discordId);
        await discordUser.send({
          content: `Ting ting! **${interaction.user.username}** vừa sử dụng mã mời của bạn để kết nối locket.`
        });
      } catch (e) {
        // ignore if target user has DMs disabled
      }

    } catch (error) {
      logger.error("[Lỗi Lệnh /connect] Chi tiết:", error);
      await interaction.editReply("Đã xảy ra lỗi hệ thống khi xử lý kết nối.");
    }
  }
};
