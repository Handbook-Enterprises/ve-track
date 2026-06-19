export type TrackerStatus = "active" | "error";

export interface CostTracker {
  id: string;
  provider: string;
  label: string;
  app: string;
  key_last4: string;
  status: TrackerStatus;
  last_error: string | null;
  last_synced_at: number | null;
  pulled_cost_usd: number;
  created_at: string;
  updated_at: string;
}

export interface CostTrackerCreatePayload {
  provider: string;
  label: string;
  app: string;
  apiKey: string;
}

export interface CostTrackersListResponse {
  success: boolean;
  message: string;
  trackers: CostTracker[];
}

export interface CostTrackerCreateResponse {
  success: boolean;
  message: string;
  tracker: CostTracker;
}

export interface CostTrackerActionResponse {
  success: boolean;
  message: string;
}
