// ─── Photo Constraints ──────────────────────────────────────────────

export const PHOTO_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const MEDIA_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
] as const;

export type AllowedMimeType = (typeof MEDIA_ALLOWED_MIME_TYPES)[number];

// ─── Connection Limits ──────────────────────────────────────────────

export const MAX_CONNECTIONS_PER_USER = 50;

// ─── Rate Limits ────────────────────────────────────────────────────

export const RATE_LIMIT = {
  PHOTO_UPLOAD: { window: 60, max: 5 },   // 5 photos per minute
  COMMAND: { window: 10, max: 3 },         // 3 commands per 10 seconds
  API_REQUEST: { window: 60, max: 60 },    // 60 API requests per minute
} as const;

// ─── Discord Embed Colors ───────────────────────────────────────────

export const COLORS = {
  PRIMARY: 0x5865f2,    // Discord blurple
  SUCCESS: 0x57f287,
  WARNING: 0xfee75c,
  ERROR: 0xed4245,
  INFO: 0x5865f2,
} as const;
