export type TrackerStatus = "active" | "error";

export type AddMethod = "integrate" | "manual";

export interface TrackerMetrics {
  monthly_spend: number | null;
  weekly_spend: number | null;
  balance_usd: number | null;
  total_usage_usd: number | null;
  total_usage_credits: number | null;
  credits_remaining: number | null;
  request_count: number | null;
}

export interface Tracker extends TrackerMetrics {
  id: string;
  provider: string;
  key_last4: string;
  account_ref: string | null;
  status: TrackerStatus;
  last_error: string | null;
  last_synced_at: number | null;
  pulled_cost_usd: number;
  window_spend: number;
  is_money: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrackerCreatePayload {
  provider: string;
  apiKey: string;
}

export interface ProviderGroup {
  provider: string;
  accounts: Tracker[];
  totalCost: number;
  metricLabel: string;
  metricValue: string;
  distinctOrgs: number;
  hasError: boolean;
  orgClashIds: Set<string>;
}

export interface TrackersListResponse {
  success: boolean;
  message: string;
  trackers: Tracker[];
}

export interface TrackerCreateResponse {
  success: boolean;
  message: string;
  tracker: Tracker;
}

export interface TrackerActionResponse {
  success: boolean;
  message: string;
}

export interface TrackerCostPoint {
  day: string;
  value: number;
}

export type TrackerMetricKind =
  | "cumulative"
  | "usage"
  | "credits_used"
  | "balance"
  | "credits"
  | "requests"
  | "none";

export interface TrackerCostDetail {
  series: TrackerCostPoint[];
  windowTotal: number;
  lifetime: number;
  activeDays: number;
  metrics: TrackerMetrics;
  kind: TrackerMetricKind;
  isMoney: boolean;
}

export interface TrackerCostsResponse {
  success: boolean;
  detail: TrackerCostDetail;
}

export interface TrackerCostQuery {
  from?: number;
  to?: number;
}
