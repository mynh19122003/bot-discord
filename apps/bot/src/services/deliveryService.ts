import { Client, EmbedBuilder } from "discord.js";
import { logger } from "../utils/logger.js";

interface DeliveryResult {
  delivered: number;
  failed: number;
  total: number;
  failedNames: string[];
}

export const deliveryService = {
  async deliverPhoto(
    client: Client,
    params: {
      senderUsername: string;
      senderAvatarUrl: string;
      mediaUrl: string;
      mediaType: "IMAGE" | "VIDEO";
      caption?: string | null;
      recipients: { discordId: string; username: string }[];
    }
  ): Promise<DeliveryResult> {
    const embed = new EmbedBuilder()
      .setColor("#2b2d31")
      .setAuthor({ name: params.senderUsername, iconURL: params.senderAvatarUrl })
      .setDescription(params.caption || "Không có chú thích")
      .setFooter({ text: "Locket Bot" })
      .setTimestamp();

    const payload: any = { embeds: [embed] };

    if (params.mediaType === "IMAGE") {
      embed.setImage(params.mediaUrl);
    } else {
      // Đối với Video, Discord không cho phép phát qua embed.setImage
      // Nên ta gửi video qua attachment độc lập
      const ext = params.mediaUrl.split("?")[0].split(".").pop() || "mp4";
      payload.files = [{ attachment: params.mediaUrl, name: `locket_video.${ext}` }];
    }

    let delivered = 0;
    let failed = 0;
    const failedNames: string[] = [];

    await Promise.allSettled(
      params.recipients.map(async (recipient) => {
        try {
          const user = await client.users.fetch(recipient.discordId);
          await user.send(payload);
          delivered++;
        } catch (err: any) {
          failed++;
          failedNames.push(recipient.username);
          if (err.code === 50007) {
            logger.warn(`[Hệ thống Locket] Không thể gửi ảnh cho ID ${recipient.discordId} do khóa DM.`);
          } else {
            logger.error(`[Hệ thống Locket] Lỗi gửi ảnh khác do người dùng ${recipient.discordId}:`, err);
          }
        }
      })
    );

    return {
      delivered,
      failed,
      total: params.recipients.length,
      failedNames
    };
  },
};
