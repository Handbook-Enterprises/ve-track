export type UsageDimension = "app" | "org" | "user" | "provider" | "model" | "action";

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

export interface UsageSeriesPoint {
  day: string;
  cost_usd: number;
  credits: number;
  requests: number;
}

export interface UsageOverview {
  fromDays: number;
  totals: UsageTotals;
  byApp: UsageGroup[];
  byOrg: UsageGroup[];
  byUser: UsageGroup[];
  byProvider: UsageGroup[];
  byModel: UsageGroup[];
  byAction: UsageGroup[];
  series: UsageSeriesPoint[];
}

export interface UsageQueryFilters {
  fromDays?: number;
  from?: number;
  to?: number;
  lifetime?: boolean;
  app?: string;
  provider?: string;
  model?: string;
  clerk_org_id?: string;
  clerk_user_id?: string;
  action?: string;
  correlation_id?: string;
}

export interface UsageOverviewResponse {
  success: boolean;
  overview: UsageOverview;
}

export interface UsageCanaryResponse {
  success: boolean;
  message: string;
  runId: string;
}
