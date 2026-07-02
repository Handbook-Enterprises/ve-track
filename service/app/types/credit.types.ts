export type CreditDimension = "app" | "action" | "org" | "user";

export interface CreditGroup {
  key: string | null;
  credits: number;
  revenue_usd: number;
  cost_usd: number;
  margin_usd: number;
  margin_pct: number | null;
  charges: number;
}

export interface CreditDelta {
  previousRevenue: number;
  pctChange: number | null;
  direction: "up" | "down" | "flat";
}

export interface CreditTotals {
  credits: number;
  revenue_usd: number;
  cost_usd: number;
  margin_usd: number;
  margin_pct: number | null;
  charges: number;
  fromDays: number;
  delta?: CreditDelta;
}

export interface CreditSeriesPoint {
  day: string;
  credits: number;
  revenue_usd: number;
  cost_usd: number;
}

export interface CreditSummary {
  fromDays: number;
  totals: CreditTotals;
  byApp: CreditGroup[];
  byAction: CreditGroup[];
  byOrg: CreditGroup[];
  byUser: CreditGroup[];
  series: CreditSeriesPoint[];
}

export interface CreditDetail {
  fromDays: number;
  totals: Omit<CreditTotals, "fromDays" | "delta">;
  byAction: CreditGroup[];
  byOrg: CreditGroup[];
  byUser: CreditGroup[];
  series: CreditSeriesPoint[];
}

export interface CreditQueryFilters {
  fromDays?: number;
  from?: number;
  to?: number;
  lifetime?: boolean;
  app?: string;
  action?: string;
  clerk_org_id?: string;
  clerk_user_id?: string;
}

export interface CreditSummaryResponse {
  success: boolean;
  summary: CreditSummary;
}

export interface CreditDetailResponse {
  success: boolean;
  detail: CreditDetail;
}
