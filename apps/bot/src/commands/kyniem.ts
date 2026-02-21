import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, ComponentType, AttachmentBuilder, Client } from "discord.js";
import { prisma } from "@repo/database";
import { logger } from "../utils/logger.js";
import { connectionService } from "../services/connectionService.js";
import { photoService } from "../services/photoService.js";
import { StorageService } from "@repo/storage";

const storage = new StorageService({
  bucket: process.env.S3_BUCKET || "locket-photos",
  region: process.env.S3_REGION || "us-east-1",
  accessKeyId: process.env.S3_ACCESS_KEY || "minioadmin",
  secretAccessKey: process.env.S3_SECRET_KEY || "minioadmin",
  endpoint: process.env.S3_ENDPOINT || "http://127.0.0.1:9000",
});

async function buildGalleryPayload(client: Client, userId: string, page: number): Promise<any> {
  const pageSize = 1;
  const totalPhotos = await prisma.photo.count({
    where: {
      OR: [
        { senderId: userId },
        { recipients: { some: { recipientId: userId } } }
      ]
    }
  });

  const totalPages = Math.ceil(totalPhotos / pageSize) || 1;
  const safePage = Math.max(1, Math.min(page, totalPages));

  if (totalPhotos === 0) {
    return { content: "Bạn chưa gửi hoặc nhận bức ảnh Locket nào.", embeds: [], components: [] };
  }

  const photos = await prisma.photo.findMany({
    where: {
      OR: [
        { senderId: userId },
        { recipients: { some: { recipientId: userId } } }
      ]
    },
    orderBy: { createdAt: "desc" },
    take: pageSize,
    skip: (safePage - 1) * pageSize,
  });

  const photo = photos[0];
  const isSender = photo.senderId === userId;

  const senderInfo = isSender ? null : await prisma.user.findUnique({ where: { id: photo.senderId } });
  const senderName = isSender ? "Bạn" : (senderInfo?.discordUsername || "Người ẩn danh");
  const senderAvatar = isSender ? null : (senderInfo?.avatarUrl || null);

  let signedUrl = "";
  let attachment: AttachmentBuilder | null = null;

  try {
    signedUrl = await photoService.getFreshUrl(client, photo.storageKey);
    // Kho dữ liệu cũ trên S3
    if (signedUrl && !signedUrl.startsWith("http") && !signedUrl.startsWith("attachment://")) {
      try {
        signedUrl = await storage.getSignedUrl(photo.storageKey);
      } catch (e) {
        signedUrl = "";
      }
    }

    // Luôn tải thành buffer để đính kèm. Lý do: Discord không thể hiển thị ảnh từ localhost (MinIO S3) qua embed.setImage. 
    // Cho dù là Dump Channel hay S3, việc push buffer trực tiếp đảm bảo hiển thị 100%.
    if (signedUrl && signedUrl.startsWith("http")) {
      const response = await fetch(signedUrl);
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        const ext = photo.mimeType?.split("/")[1] || (photo.mediaType === "VIDEO" ? "mp4" : "png");
        attachment = new AttachmentBuilder(buffer, { name: `locket.${ext}` });
      }
    }
  } catch (err) {
    logger.error(`[Lỗi Lệnh /kyniem] Không thể lấy tệp ${photo.storageKey}`, err);
  }

  const embed = new EmbedBuilder()
    .setColor("#2b2d31")
    .setTitle(isSender ? "Ảnh bạn đã gửi" : "Ảnh bạn nhận được")
    .setDescription(photo.caption || "Không có chú thích")
    .addFields(
      { name: "Thời gian", value: `<t:${Math.floor(photo.createdAt.getTime() / 1000)}:F>`, inline: false }
    )
    .setFooter({ text: `Locket Bot • Trang ${safePage}/${totalPages} • ${totalPhotos} khoảnh khắc tổng cộng` });

  if (senderAvatar) {
    embed.setAuthor({ name: senderName, iconURL: senderAvatar });
  } else if (!isSender && senderName) {
    embed.setAuthor({ name: senderName });
  }

  const payload: any = { content: " ", embeds: [embed], components: [] };

  if (photo.mediaType === "VIDEO") {
    if (attachment) {
      payload.files = [attachment];
    } else if (signedUrl) {
      payload.content = signedUrl;
    }
  } else {
    // IMAGE
    if (attachment) {
      embed.setImage(`attachment://${attachment.name}`);
      payload.files = [attachment];
    } else if (signedUrl) {
      embed.setImage(signedUrl);
    }
  }

  const row = new ActionRowBuilder<ButtonBuilder>();
  
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`gallery_prev_${safePage - 1}`)
      .setLabel("Trang Trước")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage <= 1)
  );

  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`gallery_next_${safePage + 1}`)
      .setLabel("Trang Sau")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage >= totalPages)
  );

  if (isSender) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`gallery_delete_${photo.id}_${safePage}`)
        .setLabel("Xóa tin")
        .setStyle(ButtonStyle.Danger)
    );
  }

  payload.components = [row];
  return payload;
}

export const command = {
  data: new SlashCommandBuilder()
    .setName("kyniem")
    .setDescription("Xem lại toàn bộ lịch sử các khoảnh khắc đã gửi và nhận.")
    .addIntegerOption((opt) =>
      opt.setName("trang").setDescription("Số trang (mặc định: 1)").setMinValue(1)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const page = interaction.options.getInteger("trang") || 1;

      const user = await connectionService.getOrCreateUser(
        interaction.user.id,
        interaction.user.username,
        interaction.user.displayAvatarURL()
      );

      const payload = await buildGalleryPayload(interaction.client, user.id, page);
      const message = await interaction.editReply(payload);

      if (!payload.components || payload.components.length === 0) return;

      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000 // 5 minutes
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) {
          await i.reply({ content: "Bạn không thể điều khiển thư viện của người khác.", ephemeral: true });
          return;
        }

        if (i.customId.startsWith("gallery_prev") || i.customId.startsWith("gallery_next")) {
          try {
            await i.deferUpdate();
            const targetPage = parseInt(i.customId.split("_")[2]);
            const newPayload = await buildGalleryPayload(interaction.client, user.id, targetPage);
            
            // Xóa file an toàn bằng attachments = [] chứ không phải files = []
            const editPayload: any = { ...newPayload };
            if (!newPayload.files || newPayload.files.length === 0) {
                 editPayload.attachments = [];
            }
            
            await i.editReply(editPayload);
          } catch (err) {
            logger.error(`[Lỗi Phân Trang] Lỗi khi chuyển trang:`, err);
            // Fallback notify
            try { await i.followUp({ content: "Có lỗi xảy ra khi chuyển trang.", ephemeral: true }); } catch (e) {}
          }
          return;
        }

        if (i.customId.startsWith("gallery_delete")) {
          const parts = i.customId.split("_");
          const targetPhotoId = parts[2];
          const currentPage = parseInt(parts[3]) || 1;
          
          try {
            await prisma.photo.delete({ where: { id: targetPhotoId } });
            logger.info(`[Lệnh /kyniem] User ${user.discordId} đã xóa ảnh ${targetPhotoId}`);
            
            await i.deferUpdate();
            const newPayload = await buildGalleryPayload(interaction.client, user.id, currentPage);
            
            const editPayload: any = { ...newPayload, content: "[Thành công] Đã xóa khoảnh khắc. Trang đã được làm mới." };
            if (!newPayload.files || newPayload.files.length === 0) {
                 editPayload.attachments = [];
            }
            
            await i.editReply(editPayload);
          } catch (err) {
            logger.error(`[Lỗi Xóa Ảnh]`, err);
            await i.reply({ content: "Đã xảy ra lỗi khi xóa ảnh. Vui lòng thử lại sau.", ephemeral: true });
          }
        }
      });

      collector.on("end", async () => {
        try {
          await interaction.editReply({ components: [] });
        } catch(e) {
          // Ignore
        }
      });

    } catch (error) {
      logger.error(`[Lỗi Lệnh /kyniem] Chi tiết:`, error);
      if (interaction.deferred) {
         await interaction.editReply("Đã xảy ra lỗi hệ thống khi tải hình ảnh.");
      }
    }
  }
};
