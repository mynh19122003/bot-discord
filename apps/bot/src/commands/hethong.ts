import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type ChatInputCommandInteraction
} from "discord.js";
import { logger } from "../utils/logger.js";

// Lấy danh sách ID Admin từ biến môi trường (phân tách bằng phẩy)
const ADMIN_IDS = (process.env.ADMIN_IDS || "").split(",").map(id => id.trim()).filter(id => id.length > 0);

export const command = {
  data: new SlashCommandBuilder()
    .setName("hethong")
    .setDescription("Các lệnh quản trị hệ thống bot (Chỉ dành cho Developer).")
    .addStringOption(option =>
      option.setName("action")
        .setDescription("Hành động muốn thực hiện")
        .setRequired(true)
        .addChoices(
          { name: "Khởi động lại (Restart)", value: "restart" },
          { name: "Tắt máy (Shutdown)", value: "shutdown" }
        )
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    // Kiểm tra quyền kiểm soát của người dùng
    if (!ADMIN_IDS.includes(interaction.user.id)) {
      logger.warn(`[Lệnh /admin] Người dùng ${interaction.user.id} cố gắng sử dụng lệnh admin trái phép.`);
      return interaction.editReply({ content: "Bạn không có quyền sử dụng lệnh này." });
    }

    const action = interaction.options.getString("action", true);
    
    // Tạo Embed cảnh báo và nút xác nhận
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`admin_confirm_${action}`)
        .setLabel("Xác nhận")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("admin_cancel")
        .setLabel("Hủy bỏ")
        .setStyle(ButtonStyle.Secondary)
    );

    const message = await interaction.editReply({
      content: `[Cảnh báo] Bạn có chắc chắn muốn **${action === 'restart' ? 'Khởi động lại' : 'Tắt'}** hệ thống bot? Hành động này có thể làm gián đoạn trải nghiệm của người dùng.`,
      components: [row]
    });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000 // 30s timeout
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({ content: "Bạn không có quyền thao tác trên menu này.", ephemeral: true });
        return;
      }

      const customId = i.customId;

      if (customId === "admin_cancel") {
        await i.update({
          content: "[Thành công] Đã hủy thao tác.",
          components: []
        });
        return;
      }

      if (customId.startsWith("admin_confirm_")) {
        const confirmAction = customId.split("_")[2];
        
        await i.update({
          content: `[Đang xử lý] Đang thực hiện gửi lệnh **${confirmAction}**...`,
          components: []
        });

        logger.info(`[Lệnh /admin] Admin ${interaction.user.id} đã kích hoạt: ${confirmAction}`);

        if (confirmAction === "restart") {
          // Thoát tiến trình kèm mã 0 để PM2/Docker tự khởi động lại
          setTimeout(() => {
             process.exit(0);
          }, 2000);
        } else if (confirmAction === "shutdown") {
          // Thoát với mã lỗi nhẹ hoặc tín hiệu để PM2 không auto-restart nếu cấu hình
          setTimeout(() => {
             process.exit(0);
          }, 2000);
        }
      }
    });

    collector.on("end", async (_, reason) => {
      if (reason === "time") {
        try {
          row.components.forEach(c => c.setDisabled(true));
          await interaction.editReply({ content: "[Hết hạn] Đã hết thời gian xác nhận.", components: [row] });
        } catch (e) {
          // Bỏ qua lỗi
        }
      }
    });
  }
};
