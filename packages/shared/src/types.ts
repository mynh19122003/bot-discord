// ─── API Response Types ─────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Pagination ─────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ─── User ───────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  discordId: string;
  discordUsername: string;
  avatarUrl: string | null;
  friendCount: number;
  photosSent: number;
  photosReceived: number;
}

// ─── Connection ─────────────────────────────────────────────────────

export type ConnectionStatus = "PENDING" | "ACCEPTED" | "BLOCKED";

export interface FriendInfo {
  id: string;
  discordId: string;
  discordUsername: string;
  avatarUrl: string | null;
  connectedAt: string;
  status: ConnectionStatus;
}

// ─── Photo ──────────────────────────────────────────────────────────

export interface PhotoInfo {
  id: string;
  senderUsername: string;
  senderAvatarUrl: string | null;
  imageUrl: string;
  caption: string | null;
  createdAt: string;
  viewed: boolean;
}

// ─── Dashboard Stats ────────────────────────────────────────────────

export interface DashboardStats {
  totalFriends: number;
  totalPhotosSent: number;
  totalPhotosReceived: number;
  unviewedPhotos: number;
}
