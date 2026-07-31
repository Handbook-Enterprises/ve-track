export interface IdentityKeyCreateBody {
  label?: string;
  provider?: string;
  apiKey?: string;
}

export interface IdentityKeyUpdateBody {
  apiKey?: string;
  label?: string;
}

export interface PublicIdentityKey {
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
