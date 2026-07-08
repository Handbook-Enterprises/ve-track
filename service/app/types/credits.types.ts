import type { UsageDelta } from "~/types/usage.types";

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

export interface CreditsTotals {
  revenue_usd: number;
  cost_usd: number;
  margin_usd: number;
  margin_pct: number | null;
  credits_charged: number;
  requests: number;
  fromDays: number;
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

export interface CreditsOverviewResponse {
  success: boolean;
  credits: CreditsOverview;
}
