import { prisma } from "@repo/database";
import { MAX_CONNECTIONS_PER_USER } from "@repo/shared";

export const connectionService = {
  async getOrCreateUser(discordId: string, username: string, avatarUrl?: string) {
    return prisma.user.upsert({
      where: { discordId },
      update: { discordUsername: username, avatarUrl },
      create: { discordId, discordUsername: username, avatarUrl },
    });
  },

  async requestConnection(requesterId: string, addresseeId: string) {
    // Check existing connection in either direction
    const existing = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });

    if (existing) {
      if (existing.status === "ACCEPTED") return { error: "ALREADY_CONNECTED" } as const;
      if (existing.status === "PENDING") return { error: "ALREADY_PENDING" } as const;
      if (existing.status === "BLOCKED") return { error: "BLOCKED" } as const;
    }

    // Check connection limit
    const count = await prisma.connection.count({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId }, { addresseeId: requesterId }],
      },
    });

    if (count >= MAX_CONNECTIONS_PER_USER) {
      return { error: "LIMIT_REACHED" } as const;
    }

    const connection = await prisma.connection.create({
      data: { requesterId, addresseeId },
      include: { requester: true, addressee: true },
    });

    return { data: connection } as const;
  },

  async acceptConnection(connectionId: string, userId: string) {
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) return { error: "NOT_FOUND" } as const;
    if (connection.addresseeId !== userId) return { error: "UNAUTHORIZED" } as const;
    if (connection.status !== "PENDING") return { error: "INVALID_STATUS" } as const;

    const updated = await prisma.connection.update({
      where: { id: connectionId },
      data: { status: "ACCEPTED" },
      include: { requester: true, addressee: true },
    });

    return { data: updated } as const;
  },

  async rejectConnection(connectionId: string, userId: string) {
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) return { error: "NOT_FOUND" } as const;
    if (connection.addresseeId !== userId) return { error: "UNAUTHORIZED" } as const;

    await prisma.connection.delete({ where: { id: connectionId } });
    return { data: true } as const;
  },

  async removeConnection(userId: string, targetUserId: string) {
    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: targetUserId },
          { requesterId: targetUserId, addresseeId: userId },
        ],
      },
    });

    if (!connection) return { error: "NOT_FOUND" } as const;

    await prisma.connection.delete({ where: { id: connection.id } });
    return { data: true } as const;
  },

  async getAcceptedFriends(userId: string) {
    const connections = await prisma.connection.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: { requester: true, addressee: true },
    });

    return connections.map((c) =>
      c.requesterId === userId ? c.addressee : c.requester
    );
  },

  async getPendingRequests(userId: string) {
    return prisma.connection.findMany({
      where: { addresseeId: userId, status: "PENDING" },
      include: { requester: true },
      orderBy: { createdAt: "desc" },
    });
  },
};
