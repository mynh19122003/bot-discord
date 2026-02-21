import { prisma } from "@repo/database";
import { config } from "../config.js";
import { randomUUID } from "node:crypto";
import { Client, TextChannel, AttachmentBuilder } from "discord.js";
import { logger } from "../utils/logger.js";

export const photoService = {
  async uploadAndSave(
    client: Client,
    params: {
      senderId: string;
      senderDiscordId: string;
      buffer: Buffer;
      contentType: string;
      size: number;
      width?: number | null;
      height?: number | null;
      caption?: string | null;
      recipientIds: string[];
    }
  ) {
    const isVideo = params.contentType.startsWith("video/");
    const ext = params.contentType.split("/")[1] ?? (isVideo ? "mp4" : "jpg");
    const fileName = `locket_${randomUUID()}.${ext}`;

    // Upload to Dump Channel
    let storageKey = "";
    try {
      const dumpChannel = await client.channels.fetch(config.DUMP_CHANNEL_ID) as TextChannel;
      const attachment = new AttachmentBuilder(params.buffer, { name: fileName });
      const dumpMessage = await dumpChannel.send({
        content: `[Dump] Tải lên bởi ${params.senderDiscordId}`,
        files: [attachment]
      });
      storageKey = `dump:${dumpMessage.channelId}:${dumpMessage.id}`;
    } catch (error) {
      logger.error("[Lỗi Dump Channel] Không thể upload cấu trúc ảnh/video", error);
      throw new Error("Dump upload failed");
    }

    // Save metadata
    const photo = await prisma.photo.create({
      data: {
        senderId: params.senderId,
        storageKey,
        mimeType: params.contentType,
        mediaType: isVideo ? "VIDEO" : "IMAGE",
        sizeBytes: params.size,
        width: params.width,
        height: params.height,
        caption: params.caption,
        recipients: {
          create: params.recipientIds.map((recipientId) => ({ recipientId })),
        },
      },
      include: { recipients: true },
    });

    return photo;
  },

  async getFreshUrl(client: Client, storageKey: string): Promise<string> {
    if (storageKey.startsWith("dump:")) {
      const parts = storageKey.split(":");
      const channelId = parts[1];
      const messageId = parts[2];
      try {
        const channel = await client.channels.fetch(channelId) as TextChannel;
        const msg = await channel.messages.fetch(messageId);
        return msg.attachments.first()?.url || "";
      } catch (e) {
        logger.error("Failed to fetch fresh URL from dump channel", e);
        return "";
      }
    }
    // Fallback if old S3 links are still in DB (not handled completely here but avoids crash)
    return storageKey;
  },

  async getReceivedPhotos(userId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.photoRecipient.findMany({
        where: { recipientId: userId },
        include: {
          photo: {
            include: { sender: true },
          },
        },
        orderBy: { deliveredAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.photoRecipient.count({
        where: { recipientId: userId },
      }),
    ]);

    return { items, total, page, pageSize, hasMore: skip + items.length < total };
  },

  async getSentPhotos(userId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.photo.findMany({
        where: { senderId: userId },
        include: { recipients: { include: { recipient: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.photo.count({ where: { senderId: userId } }),
    ]);

    return { items, total, page, pageSize, hasMore: skip + items.length < total };
  },

  async markAsViewed(photoId: string, recipientId: string) {
    await prisma.photoRecipient.updateMany({
      where: { photoId, recipientId, viewedAt: null },
      data: { viewedAt: new Date() },
    });
  },
};
