export type TrackerStatus = "active" | "error";

export type AddMethod = "integrate" | "manual";

export interface Tracker {
  id: string;
  provider: string;
  key_last4: string;
  account_ref: string | null;
  status: TrackerStatus;
  last_error: string | null;
  last_synced_at: number | null;
  pulled_cost_usd: number;
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
  distinctOrgs: number;
  hasError: boolean;
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
  cost_usd: number;
  requests: number;
}

export interface TrackerCostDetail {
  series: TrackerCostPoint[];
  totals: {
    cost_usd: number;
    requests: number;
  };
}

export interface TrackerCostsResponse {
  success: boolean;
  detail: TrackerCostDetail;
}

export interface TrackerCostQuery {
  from?: number;
  to?: number;
}
