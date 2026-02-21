import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
  ComponentType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { config } from "../config.js";
import { prisma } from "@repo/database";
import { logger } from "../utils/logger.js";
import { connectionService } from "../services/connectionService.js";

// Helper để gọi API Giphy
async function fetchGiphyUrl(tag: string): Promise<string | null> {
  try {
    const url = `https://api.giphy.com/v1/gifs/random?api_key=${config.GIPHY_API_KEY}&tag=${encodeURIComponent(tag)}&rating=g`;
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const json: any = await response.json();
    return json?.data?.images?.original?.url || null;
  } catch (err) {
    logger.error(`[Lỗi Giphy API] Không thể lấy GIF cho tag: ${tag}`, err);
    return null;
  }
}

// Map các mood cố định sang tiếng anh hợp chuẩn trên Giphy
const MOOD_MAP: Record<string, { label: string; tag: string }> = {
  happy: { label: "Vui vẻ", tag: "happy" },
  sad: { label: "Buồn bã", tag: "sad" },
  hungry: { label: "Đói bụng", tag: "hungry eating" },
  tired: { label: "Mệt mỏi", tag: "tired exhausted" },
};

export const command = {
  data: new SlashCommandBuilder()
    .setName("tamtrang")
    .setDescription("Chia sẻ tâm trạng hiện tại của bạn bằng một GIF ngẫu nhiên."),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      // 1. Dựng UI (Ephemeral Message)
      const embed = new EmbedBuilder()
        .setColor("#2b2d31")
        .setDescription("Hôm nay bạn cảm thấy thế nào?");

      const row = new ActionRowBuilder<ButtonBuilder>();
      
      row.addComponents(
        new ButtonBuilder().setCustomId("mood_happy").setLabel("Vui vẻ").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("mood_sad").setLabel("Buồn bã").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("mood_hungry").setLabel("Đói bụng").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("mood_tired").setLabel("Mệt mỏi").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("mood_custom").setLabel("Tùy chỉnh").setStyle(ButtonStyle.Primary)
      );

      const message = await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
        fetchReply: true,
      });

      // 2. Bắt sự kiện người dùng bấm mảng nút (Component Collector)
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000,
        filter: (i) => i.user.id === interaction.user.id
      });

      let selectedTag = "";
      let selectedLabel = "";

      collector.on("collect", async (i) => {
        if (i.customId === "mood_custom") {
          // Hiện bảng Modal cho Tùy chỉnh
          const modal = new ModalBuilder()
            .setCustomId("modal_mood_custom")
            .setTitle("Bạn đang cảm thấy thế nào?");

          const textInput = new TextInputBuilder()
            .setCustomId("custom_mood_input")
            .setLabel("Nhập cảm xúc của bạn (VD: sleepy, angry)")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(30);

          modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(textInput));
          await i.showModal(modal);

          try {
            const modalSubmit = await i.awaitModalSubmit({
              filter: (mi) => mi.customId === "modal_mood_custom" && mi.user.id === interaction.user.id,
              time: 60000,
            });
            
            await modalSubmit.deferUpdate();
            selectedTag = modalSubmit.fields.getTextInputValue("custom_mood_input");
            selectedLabel = selectedTag; // Label gốc tự do
            collector.stop("custom_success");
          } catch (e) {
            // Cancel hoặc quá giờ
            collector.stop("modal_timeout");
          }
          return;
        }

        // Nếu là nút cơ bản
        await i.deferUpdate();
        const moodKey = i.customId.replace("mood_", "");
        if (MOOD_MAP[moodKey]) {
          selectedTag = MOOD_MAP[moodKey].tag;
          selectedLabel = MOOD_MAP[moodKey].label;
          collector.stop("basic_success");
        }
      });

      collector.on("end", async (_, reason) => {
        if (reason !== "basic_success" && reason !== "custom_success") {
          await interaction.editReply({ content: "Đã hủy bỏ hành động.", embeds: [], components: [] });
          return;
        }

        await interaction.editReply({
          content: "Đang tìm kiếm ảnh GIF phù hợp...",
          embeds: [],
          components: []
        });

        // 3. Phân phối (Broadcasting)
        const gifUrl = await fetchGiphyUrl(selectedTag);
        
        if (!gifUrl) {
          await interaction.editReply({ content: "Rất tiếc, đã có lỗi kết nối đến Giphy hoặc không tìm thấy ảnh phù hợp." });
          return;
        }

        const user = await connectionService.getOrCreateUser(
          interaction.user.id,
          interaction.user.username,
          interaction.user.displayAvatarURL()
        );

        // Lưu vào BD như một Photo gửi đi, nhưng với mediaType Giphy/URL nếu mở rộng. 
        // Hiện tại DB Photo yêu cầu storageKey (bắt buộc). Gán trực tiếp gifUrl làm storageKey để tương thích.
        const photo = await prisma.photo.create({
          data: {
            senderId: user.id,
            storageKey: gifUrl,
            mimeType: "image/gif",
            mediaType: "IMAGE",
            sizeBytes: 0,
            caption: selectedLabel,
          },
        });

        const connections = await prisma.connection.findMany({
          where: {
            status: "ACCEPTED",
            OR: [{ requesterId: user.id }, { addresseeId: user.id }],
          },
          include: { requester: true, addressee: true },
        });

        const friends = connections.map((c) => (c.requesterId === user.id ? c.addressee : c.requester));

        if (friends.length === 0) {
          await interaction.editReply({ content: "Tâm trạng đã lưu, nhưng bạn chưa có bạn bè nào để chia sẻ." });
          return;
        }

        // Tạo Embed gửi DM
        const dmEmbed = new EmbedBuilder()
          .setColor("#2b2d31")
          .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
          .setTitle(`Tâm trạng hiện tại: ${selectedLabel}`)
          .setImage(gifUrl);

        let delivered = 0;
        let failed = 0;

        await Promise.allSettled(
          friends.map(async (friend) => {
            try {
              const discordUser = await interaction.client.users.fetch(friend.discordId);
              await discordUser.send({ embeds: [dmEmbed] });
              
              // Ghi nhận recipient cho CSDL
              await prisma.photoRecipient.create({
                data: {
                  photoId: photo.id,
                  recipientId: friend.id,
                },
              });
              delivered++;
            } catch (err: any) {
              if (err.code === 50007) {
                 logger.warn(`[Lệnh /tamtrang] Bỏ qua lỗi 50007 (DMs closed) đối với ID: ${friend.discordId}`);
              }
              failed++;
            }
          })
        );

        await interaction.editReply({
          content: `Đã chia sẻ tâm trạng của bạn đến ${delivered}/${friends.length} bạn bè!${failed > 0 ? ` (Không thể gửi tới ${failed} người vì họ đã đóng DM)` : ""}`
        });
      });

    } catch (error) {
      logger.error(`[Lỗi Lệnh /tamtrang] Chi tiết:`, error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: "Đã xảy ra lỗi hệ thống khi phân phối tâm trạng. Vui lòng thử lại sau.", embeds: [], components: [] }).catch(() => {});
      } else {
        await interaction.reply({ content: "Lỗi hệ thống.", ephemeral: true });
      }
    }
  }
};
