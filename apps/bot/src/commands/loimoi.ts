import { 
  SlashCommandBuilder, 
  type ChatInputCommandInteraction, 
  EmbedBuilder 
} from "discord.js";
import { connectionService } from "../services/connectionService.js";
import { prisma } from "@repo/database";
import { logger } from "../utils/logger.js";
import crypto from "crypto";

export const command = {
  data: new SlashCommandBuilder()
    .setName("loimoi")
    .setDescription("Tạo mã kết nối mới hoặc quản lý các lời mời chưa được chấp nhận."),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const user = await connectionService.getOrCreateUser(
        interaction.user.id,
        interaction.user.username,
        interaction.user.displayAvatarURL()
      );

      let inviteCode = user.inviteCode;
      
      if (!inviteCode) {
        let isUnique = false;
        while (!isUnique) {
          inviteCode = crypto.randomBytes(3).toString("hex").toUpperCase();
          const existing = await prisma.user.findUnique({ where: { inviteCode } });
          if (!existing) isUnique = true;
        }
        await prisma.user.update({
          where: { id: user.id },
          data: { inviteCode }
        });
      }

      const embed = new EmbedBuilder()
        .setColor("#2b2d31")
        .setTitle("Mã Mời Locket Của Bạn")
        .setDescription(`Mã kết nối của bạn là: **${inviteCode}**\n\nHãy gửi mã này cho bạn bè. Họ có thể sử dụng lệnh \`/connect ma_moi: ${inviteCode}\` để kết nối trực tiếp với bạn mà không cần chờ xác nhận.`)
        .setFooter({ text: "Mã này có thể sử dụng nhiều lần để kết bạn." });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      logger.error(`[Lỗi Lệnh /invite] Chi tiết:`, error);
      await interaction.editReply("Đã xảy ra lỗi hệ thống khi tạo mã mời.");
    }
  }
};
