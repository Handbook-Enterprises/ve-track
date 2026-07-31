export interface IdentityKeyEntry {
  id: string;
  provider: string;
  label: string;
  key_last4: string;
  account_ref: string | null;
  status: string;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface IdentityKeysListResponse {
  success: boolean;
  message: string;
  identityKeys: IdentityKeyEntry[];
}

export interface IdentityKeyActionResponse {
  success: boolean;
  message: string;
  identityKey?: IdentityKeyEntry;
}

export interface IdentityKeyCreatePayload {
  label: string;
  apiKey: string;
  provider?: string;
}
