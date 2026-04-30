export interface ApiKeyCreateBody {
  name: string;
}

export interface ApiKeySummary {
  id: string;
  tenant_id: string;
  name: string;
  prefix: string;
  revoked_at: number | null;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyWithSecret extends ApiKeySummary {
  fullKey: string;
}
