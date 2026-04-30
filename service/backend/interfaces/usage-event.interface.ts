export interface UsageEventInput {
  id: string;
  timestamp: number;
  clerk_user_id: string | null;
  clerk_org_id: string | null;
  provider: string;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  latency_ms: number | null;
  cost_usd: number | null;
  status_code: number | null;
}

export interface IngestBody {
  app: string;
  events: UsageEventInput[];
}

export interface UsageQuery {
  fromDays?: string;
  app?: string;
  provider?: string;
  clerk_org_id?: string;
  clerk_user_id?: string;
}

export interface UsageGroup {
  key: string | null;
  cost_usd: number;
  prompt_tokens: number;
  completion_tokens: number;
  requests: number;
}

export interface UsageTotals {
  cost_usd: number;
  prompt_tokens: number;
  completion_tokens: number;
  requests: number;
  fromDays: number;
}
