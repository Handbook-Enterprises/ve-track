export interface ApiKey {
  id: string;
  tenant_id: string;
  name: string;
  prefix: string;
  revoked_at: number | null;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyWithSecret extends ApiKey {
  fullKey: string;
}

export interface ApiKeyCreatePayload {
  name: string;
}

export interface ApiKeysListResponse {
  success: boolean;
  message: string;
  apiKeys: ApiKey[];
}

export interface ApiKeyCreateResponse {
  success: boolean;
  message: string;
  apiKey: ApiKeyWithSecret;
}

export interface ApiKeyRevokeResponse {
  success: boolean;
  message: string;
  apiKey: ApiKey;
}
