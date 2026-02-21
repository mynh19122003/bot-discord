import { 
  SlashCommandBuilder, 
  type ChatInputCommandInteraction, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  EmbedBuilder, 
  ComponentType,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";
import { connectionService } from "../services/connectionService.js";
import { prisma } from "@repo/database";
import { logger } from "../utils/logger.js";

export const command = {
  data: new SlashCommandBuilder()
    .setName("banbe")
    .setDescription("Xem danh sách bạn bè đang kết nối và tùy chọn ngắt kết nối")
    .addIntegerOption((opt) =>
      opt.setName("trang").setDescription("Số trang (mặc định: 1)").setMinValue(1)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const page = interaction.options.getInteger("trang") || 1;
      const pageSize = 25; // Giới hạn của Discord Select Menu là tối đa 25 options

      const user = await connectionService.getOrCreateUser(
        interaction.user.id,
        interaction.user.username,
        interaction.user.displayAvatarURL()
      );

      // Đếm tổng số kết nối để tính tổng số trang
      const totalConnections = await prisma.connection.count({
        where: {
          status: "ACCEPTED",
          OR: [
            { requesterId: user.id },
            { addresseeId: user.id }
          ]
        }
      });

      const totalPages = Math.ceil(totalConnections / pageSize) || 1;

      if (page > totalPages) {
        return interaction.editReply(`Trang ${page} không tồn tại. Bạn chỉ có ${totalPages} trang.`);
      }

      // Lấy danh sách bạn bè theo phân trang
      const connections = await prisma.connection.findMany({
        where: {
          status: "ACCEPTED",
          OR: [
            { requesterId: user.id },
            { addresseeId: user.id }
          ]
        },
        include: { requester: true, addressee: true },
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: (page - 1) * pageSize,
      });

      const friends = connections.map(c => 
        c.requesterId === user.id ? c.addressee : c.requester
      );

      if (friends.length === 0) {
        return interaction.editReply("Bạn chưa kết nối với ai. Hãy dùng lệnh `/connect` để thêm bạn bè.");
      }

      const embed = new EmbedBuilder()
        .setColor("#2b2d31")
        .setTitle(`Danh sách kết nối (${totalConnections})`)
        .setDescription("Dưới đây là những người bạn đã kết nối để gửi ảnh Locket. Bạn có thể chọn một người từ menu bên dưới để ngắt kết nối.")
        .setFooter({ text: `Trang ${page}/${totalPages}` });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("disconnect_select")
        .setPlaceholder("Chọn một người để ngắt kết nối...")
        .addOptions(
          friends.map((f) => ({
            label: f.discordUsername,
            description: `Ngắt kết nối với ${f.discordUsername}`,
            value: f.id,
          }))
        );

      const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`friends_prev_${page - 1}`)
          .setLabel("Trang Trước")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page <= 1),
        new ButtonBuilder()
          .setCustomId(`friends_next_${page + 1}`)
          .setLabel("Trang Sau")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page >= totalPages)
      );

      const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

      const message = await interaction.editReply({
        embeds: [embed],
        components: [selectRow, navRow],
      });

      const collector = message.createMessageComponentCollector({
        time: 120000 // 2 minutes
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) {
          logger.warn(`[Hệ thống] User ${i.user.id} cố gắng dùng menu của ${interaction.user.id}`);
          await i.reply({ content: "Bạn không có quyền thao tác trên menu này.", ephemeral: true });
          return;
        }

        if (i.componentType === ComponentType.Button) {
          const targetPage = parseInt(i.customId.split("_")[2]);
          await i.reply({ content: `Vui lòng sử dụng lệnh \`/friends trang:${targetPage}\` để chuyển sang trang khác.`, ephemeral: true });
          return;
        }

        if (i.componentType === ComponentType.StringSelect) {
          await i.deferUpdate();

          const targetUserId = i.values[0];
          const targetFriend = friends.find(f => f.id === targetUserId);

          if (!targetFriend) {
             await interaction.editReply({ content: "Không tìm thấy thông tin bạn bè.", components: [] });
             return;
          }

          try {
             const connection = await prisma.connection.findFirst({
               where: {
                 status: "ACCEPTED",
                 OR: [
                   { requesterId: user.id, addresseeId: targetUserId },
                   { addresseeId: user.id, requesterId: targetUserId }
                 ]
               }
             });

             if (connection) {
               await prisma.connection.delete({ where: { id: connection.id } });
               logger.info(`[Lệnh /friends] Đã ngắt kết nối giữa ${user.discordId} và ${targetFriend.discordId}`);
               
               const successEmbed = new EmbedBuilder()
                 .setColor("#2b2d31")
                 .setDescription(`Đã ngắt kết nối thành công với **${targetFriend.discordUsername}**.`);
                 
               await interaction.editReply({ embeds: [successEmbed], components: [] });
             } else {
               await interaction.editReply({ content: "Kết nối không tồn tại hoặc đã bị ngắt trước đó.", components: [] });
             }
          } catch (err) {
             logger.error(`[Lỗi Cơ sở dữ liệu] Lỗi khi ngắt kết nối:`, err);
             await interaction.editReply({ content: "Đã xảy ra lỗi hệ thống khi ngắt kết nối.", components: [] });
          }
        }
      });

      collector.on("end", async () => {
         try {
           const disabledSelect = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu.setDisabled(true));
           navRow.components.forEach(c => c.setDisabled(true));
           await interaction.editReply({ components: [disabledSelect, navRow] });
         } catch (e) {
         }
      });

    } catch (error) {
      logger.error(`[Lỗi Lệnh /friends] Chi tiết:`, error);
      await interaction.editReply("Đã xảy ra lỗi hệ thống khi tải danh sách bạn bè.");
    }
  }
};
