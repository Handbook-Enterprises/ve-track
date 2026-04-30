export interface TenantBody {
  name: string;
  clerk_org_id?: string | null;
  plan?: string;
}

export interface TenantSummary {
  id: string;
  name: string;
  clerk_org_id: string | null;
  plan: string;
  created_at: string;
  updated_at: string;
  api_key_count: number;
}
