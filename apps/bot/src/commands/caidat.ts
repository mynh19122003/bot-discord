import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  ComponentType
} from "discord.js";
import { prisma } from "@repo/database";
import { connectionService } from "../services/connectionService.js";

export const command = {
  data: new SlashCommandBuilder()
    .setName("caidat")
    .setDescription("Quản lý cài đặt Locket Bot của bạn"),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const user = await connectionService.getOrCreateUser(
        interaction.user.id,
        interaction.user.username,
        interaction.user.displayAvatarURL()
      );

      // Lấy hoặc tạo cài đặt
      let settings = await prisma.userSettings.findUnique({
        where: { userId: user.id },
      });

      if (!settings) {
        settings = await prisma.userSettings.create({
          data: { userId: user.id },
        });
      }

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("toggle_dm_photos")
          .setLabel(`Nhận ảnh qua DM: ${settings.allowDmPhotos ? "BẬT" : "TẮT"}`)
          .setStyle(settings.allowDmPhotos ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("toggle_notifications")
          .setLabel(`Thông báo: ${settings.notifyOnReceive ? "BẬT" : "TẮT"}`)
          .setStyle(settings.notifyOnReceive ? ButtonStyle.Success : ButtonStyle.Secondary)
      );

      const embed = new EmbedBuilder()
        .setColor("#2b2d31")
        .setTitle("Cài đặt của bạn")
        .setDescription([
          `**Nhận ảnh qua DM:** ${settings.allowDmPhotos ? "Đã bật" : "Đã tắt"}`,
          `**Thông báo:** ${settings.notifyOnReceive ? "Đã bật" : "Đã tắt"}`,
          "",
          "Nhấn vào các nút bên dưới để chuyển đổi cài đặt."
        ].join("\n"));

      const message = await interaction.editReply({
        embeds: [embed],
        components: [row],
      });

      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000 // 1 phút
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) {
          await i.reply({ content: "Bạn không thể thay đổi cài đặt của người khác.", ephemeral: true });
          return;
        }

        try {
          let updatedSettings = settings;
          if (i.customId === "toggle_dm_photos") {
             updatedSettings = await prisma.userSettings.update({
               where: { userId: user.id },
               data: { allowDmPhotos: !settings!.allowDmPhotos }
             });
          } else if (i.customId === "toggle_notifications") {
             updatedSettings = await prisma.userSettings.update({
               where: { userId: user.id },
               data: { notifyOnReceive: !settings!.notifyOnReceive }
             });
          }

          // Gán lại
          settings = updatedSettings;

          const newRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId("toggle_dm_photos")
              .setLabel(`Nhận ảnh qua DM: ${settings!.allowDmPhotos ? "BẬT" : "TẮT"}`)
              .setStyle(settings!.allowDmPhotos ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId("toggle_notifications")
              .setLabel(`Thông báo: ${settings!.notifyOnReceive ? "BẬT" : "TẮT"}`)
              .setStyle(settings!.notifyOnReceive ? ButtonStyle.Success : ButtonStyle.Secondary)
          );

          const newEmbed = new EmbedBuilder()
            .setColor("#2b2d31")
            .setTitle("Cài đặt của bạn")
            .setDescription([
              `**Nhận ảnh qua DM:** ${settings!.allowDmPhotos ? "Đã bật" : "Đã tắt"}`,
              `**Thông báo:** ${settings!.notifyOnReceive ? "Đã bật" : "Đã tắt"}`,
              "",
              "Nhấn vào các nút bên dưới để chuyển đổi cài đặt."
            ].join("\n"));

          await i.update({ embeds: [newEmbed], components: [newRow] });

        } catch (err) {
           await i.reply({ content: "Đã xảy ra lỗi khi lưu cài đặt.", ephemeral: true });
        }
      });

      collector.on("end", async () => {
         try {
           row.components.forEach(c => c.setDisabled(true));
           await interaction.editReply({ components: [row] });
         } catch(e) {}
      });

    } catch (error) {
       await interaction.editReply("Đã xảy ra lỗi hệ thống khi tải cài đặt.");
    }
  }
};
