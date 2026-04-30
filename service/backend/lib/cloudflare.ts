import {
  CloudflareConfig,
  CloudflareDeleteResponse,
  CloudflareImageResponse,
  UploadOptions,
  UploadResult,
} from "backend/interfaces/lib/cloudinary.interface";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

class CloudflareService {
  static async upload(
    config: CloudflareConfig,
    file: File,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        success: false,
        error: "Invalid file type. Allowed: jpg, jpeg, png, gif, webp",
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: "File size exceeds the maximum limit of 10MB",
      };
    }

    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/images/v1`;

      const formData = new FormData();
      formData.append("file", file, file.name);

      if (options?.id) {
        formData.append("id", options.id);
      }

      if (options?.requireSignedURLs) {
        formData.append("requireSignedURLs", "true");
      }

      if (options?.metadata) {
        formData.append("metadata", JSON.stringify(options.metadata));
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiToken}`,
        },
        body: formData,
      });

      const data = (await response.json()) as CloudflareImageResponse;

      if (!data.success || !data.result) {
        return {
          success: false,
          error: data.errors?.[0]?.message || "Failed to upload image",
        };
      }

      const publicUrl =
        data.result.variants?.find((v) => v.includes("/public")) ||
        data.result.variants?.[0];

      return {
        success: true,
        imageId: data.result.id,
        url: publicUrl,
        variants: data.result.variants,
      };
    } catch (error) {
      console.error("[CloudflareService] Upload failed:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to upload image",
      };
    }
  }

  static async delete(
    config: CloudflareConfig,
    imageId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/images/v1/${imageId}`;

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${config.apiToken}`,
        },
      });

      const data = (await response.json()) as CloudflareDeleteResponse;

      if (!data.success) {
        return {
          success: false,
          error: data.errors?.[0]?.message || "Failed to delete image",
        };
      }

      return { success: true };
    } catch (error) {
      console.error("[CloudflareService] Delete failed:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete image",
      };
    }
  }

  static extractImageIdFromUrl(url: string): string | null {
    const match = url.match(/imagedelivery\.net\/[^/]+\/([^/]+)/);
    return match ? match[1] : null;
  }
}

export default CloudflareService;
