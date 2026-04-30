export interface UploadResult {
  success: boolean;
  imageId?: string;
  url?: string;
  variants?: string[];
  error?: string;
}

export interface CloudflareImageResponse {
  result: {
    id: string;
    filename: string;
    uploaded: string;
    requireSignedURLs: boolean;
    variants: string[];
  } | null;
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
}

export interface CloudflareDeleteResponse {
  result: unknown;
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
}

export interface CloudflareConfig {
  apiToken: string;
  accountId: string;
}

export interface UploadOptions {
  id?: string;
  metadata?: Record<string, string>;
  requireSignedURLs?: boolean;
}
