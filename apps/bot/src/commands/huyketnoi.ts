import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { connectionService } from "../services/connectionService.js";
import { logger } from "../utils/logger.js";

export const command = {
  data: new SlashCommandBuilder()
    .setName("huyketnoi")
    .setDescription("Ngắt kết nối gửi ảnh với một người bạn")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("Người bạn muốn ngắt kết nối").setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const targetUser = interaction.options.getUser("user", true);

      const requester = await connectionService.getOrCreateUser(
        interaction.user.id,
        interaction.user.username,
        interaction.user.displayAvatarURL()
      );

      const addressee = await connectionService.getOrCreateUser(
        targetUser.id,
        targetUser.username,
        targetUser.displayAvatarURL()
      );

      const result = await connectionService.removeConnection(requester.id, addressee.id);

      if ("error" in result) {
        const errorEmbed = new EmbedBuilder()
          .setColor("#ed4245")
          .setDescription(`Bạn không có kết nối nào với **${targetUser.username}**.`);
          
        return interaction.editReply({ embeds: [errorEmbed] });
      }

      const successEmbed = new EmbedBuilder()
        .setColor("#2b2d31")
        .setDescription(`Đã ngắt kết nối thành công với **${targetUser.username}**.`);

      await interaction.editReply({ embeds: [successEmbed] });
    } catch (err) {
      logger.error(`[Lỗi Lệnh /disconnect] Chi tiết:`, err);
      await interaction.editReply("Đã xảy ra lỗi hệ thống khi ngắt kết nối.");
    }
  }
};
