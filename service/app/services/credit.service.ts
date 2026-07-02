import { handleApiResponse } from "~/utils";
import type {
  CreditDetailResponse,
  CreditQueryFilters,
  CreditSummaryResponse,
} from "~/types/credit.types";

type Fetcher = (path: string, init?: RequestInit) => Promise<Response>;

const buildQuery = (filters?: CreditQueryFilters): string => {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.from != null) params.set("from", String(filters.from));
  if (filters.to != null) params.set("to", String(filters.to));
  if (filters.lifetime) params.set("lifetime", "1");
  if (filters.fromDays != null) params.set("fromDays", String(filters.fromDays));
  if (filters.app) params.set("app", filters.app);
  if (filters.action) params.set("action", filters.action);
  if (filters.clerk_org_id) params.set("clerk_org_id", filters.clerk_org_id);
  if (filters.clerk_user_id) params.set("clerk_user_id", filters.clerk_user_id);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

export class CreditService {
  static async getSummary(
    authFetch: Fetcher,
    filters?: CreditQueryFilters,
  ): Promise<CreditSummaryResponse> {
    const response = await authFetch(`/dashboard/credits${buildQuery(filters)}`);
    return handleApiResponse<CreditSummaryResponse>(response);
  }

  static async getDetail(
    authFetch: Fetcher,
    filters?: CreditQueryFilters,
  ): Promise<CreditDetailResponse> {
    const response = await authFetch(
      `/dashboard/credits/detail${buildQuery(filters)}`,
    );
    return handleApiResponse<CreditDetailResponse>(response);
  }
}
