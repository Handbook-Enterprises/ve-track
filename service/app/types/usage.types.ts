export type UsageDimension = "app" | "org" | "user" | "provider" | "model";

export interface UsageGroup {
  key: string | null;
  cost_usd: number;
  prompt_tokens: number;
  completion_tokens: number;
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
  requests: number;
  fromDays: number;
  delta?: UsageDelta;
}

export interface UsageOverview {
  fromDays: number;
  totals: UsageTotals;
  byApp: UsageGroup[];
  byOrg: UsageGroup[];
  byUser: UsageGroup[];
  byProvider: UsageGroup[];
  byModel: UsageGroup[];
}

export interface UsageQueryFilters {
  fromDays?: number;
  app?: string;
  provider?: string;
  clerk_org_id?: string;
  clerk_user_id?: string;
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
