export interface UsageEventInput {
  id: string;
  timestamp: number;
  clerk_user_id: string | null;
  clerk_org_id: string | null;
  action: string | null;
  provider: string;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  cached_input_tokens?: number | null;
  cache_write_tokens?: number | null;
  reasoning_tokens?: number | null;
  latency_ms: number | null;
  cost_usd: number | null;
  status_code: number | null;
  credits_charged: number | null;
  credit_price_usd_at_event: number | null;
  correlation_id: string | null;
}

export interface IngestBody {
  app: string;
  events: UsageEventInput[];
}

export interface UsageQuery {
  fromDays?: string;
  from?: string;
  to?: string;
  lifetime?: string;
  app?: string;
  provider?: string;
  model?: string;
  clerk_org_id?: string;
  clerk_user_id?: string;
  action?: string;
  correlation_id?: string;
}

export interface UsageSeriesPoint {
  day: string;
  cost_usd: number;
  credits: number;
  requests: number;
}

export interface UsageGroup {
  key: string | null;
  cost_usd: number;
  prompt_tokens: number;
  completion_tokens: number;
  credits: number;
  requests: number;
  name?: string | null;
  secondary?: string | null;
  imageUrl?: string | null;
}

export interface UsageDelta {
  previousCost: number;
  pctChange: number | null;
  direction: "up" | "down" | "flat";
}

export interface UsageTotals {
  cost_usd: number;
  prompt_tokens: number;
  completion_tokens: number;
  credits: number;
  requests: number;
  fromDays: number;
  delta?: UsageDelta;
}

export interface ProfitabilityGroup {
  key: string | null;
  revenue_usd: number;
  cost_usd: number;
  margin_usd: number;
  margin_pct: number | null;
  credits_charged: number;
  requests: number;
  name?: string | null;
  secondary?: string | null;
  imageUrl?: string | null;
}

export interface ProfitabilityTotals {
  revenue_usd: number;
  cost_usd: number;
  margin_usd: number;
  margin_pct: number | null;
  credits_charged: number;
  requests: number;
  fromDays: number;
}

export interface ProfitabilitySeriesPoint {
  day: string;
  revenue_usd: number;
  cost_usd: number;
  margin_usd: number;
  credits: number;
  requests: number;
}

export interface CreditsDeltas {
  revenue?: UsageDelta;
  cost?: UsageDelta;
  credits?: UsageDelta;
}

export interface CreditsTotals extends ProfitabilityTotals {
  deltas?: CreditsDeltas;
}

export interface CreditsOverview {
  fromDays: number;
  creditPriceUsd: number | null;
  totals: CreditsTotals;
  series: ProfitabilitySeriesPoint[];
  byApp: ProfitabilityGroup[];
  byAction: ProfitabilityGroup[];
  byUser: ProfitabilityGroup[];
  byOrg: ProfitabilityGroup[];
  byProvider: ProfitabilityGroup[];
  byModel: ProfitabilityGroup[];
}
