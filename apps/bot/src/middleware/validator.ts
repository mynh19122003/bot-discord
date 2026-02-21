import {
  PHOTO_MAX_SIZE_BYTES,
  MEDIA_ALLOWED_MIME_TYPES,
  type AllowedMimeType,
} from "@repo/shared";

interface AttachmentLike {
  contentType: string | null;
  size: number;
}

export function validateMediaAttachment(
  attachment: AttachmentLike
): { valid: true } | { valid: false; reason: string } {
  if (!attachment.contentType) {
    return { valid: false, reason: "File has no content type." };
  }

  if (
    !MEDIA_ALLOWED_MIME_TYPES.includes(attachment.contentType as AllowedMimeType)
  ) {
    return {
      valid: false,
      reason: "Định dạng file không được hỗ trợ. Vui lòng chỉ tải lên ảnh hoặc video ngắn.",
    };
  }

  if (attachment.size > PHOTO_MAX_SIZE_BYTES) {
    return {
      valid: false,
      reason: "Dung lượng file quá lớn. Vui lòng gửi file dưới 10MB.",
    };
  }

  return { valid: true };
}
