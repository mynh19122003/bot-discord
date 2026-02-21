import { z } from "zod/v4";
import { MEDIA_ALLOWED_MIME_TYPES } from "./constants.js";

// ─── Photo ──────────────────────────────────────────────────────────

export const mediaUploadSchema = z.object({
  caption: z.string().max(500).optional(),
  mimeType: z.enum(MEDIA_ALLOWED_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024, {
    error: "File size must not exceed 10MB",
  }),
});

export type MediaUploadInput = z.infer<typeof mediaUploadSchema>;

// ─── Connection ─────────────────────────────────────────────────────

export const connectionRequestSchema = z.object({
  targetDiscordId: z.string().min(1),
});

export type ConnectionRequestInput = z.infer<typeof connectionRequestSchema>;

// ─── Settings ───────────────────────────────────────────────────────

export const settingsUpdateSchema = z.object({
  allowDmPhotos: z.boolean().optional(),
  notifyOnReceive: z.boolean().optional(),
});

export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;
