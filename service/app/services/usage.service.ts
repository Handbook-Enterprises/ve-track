import { handleApiResponse } from "~/utils";
import type {
  UsageCanaryResponse,
  UsageOverviewResponse,
  UsageQueryFilters,
} from "~/types/usage.types";

type Fetcher = (path: string, init?: RequestInit) => Promise<Response>;

export const buildQuery = (filters?: UsageQueryFilters): string => {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.from != null) params.set("from", String(filters.from));
  if (filters.to != null) params.set("to", String(filters.to));
  if (filters.lifetime) params.set("lifetime", "1");
  if (filters.fromDays != null) params.set("fromDays", String(filters.fromDays));
  if (filters.app) params.set("app", filters.app);
  if (filters.provider) params.set("provider", filters.provider);
  if (filters.model) params.set("model", filters.model);
  if (filters.clerk_org_id) params.set("clerk_org_id", filters.clerk_org_id);
  if (filters.clerk_user_id) params.set("clerk_user_id", filters.clerk_user_id);
  if (filters.action) params.set("action", filters.action);
  if (filters.correlation_id)
    params.set("correlation_id", filters.correlation_id);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

export class UsageService {
  static async getOverview(
    authFetch: Fetcher,
    filters?: UsageQueryFilters,
  ): Promise<UsageOverviewResponse> {
    const response = await authFetch(`/dashboard/overview${buildQuery(filters)}`);
    return handleApiResponse<UsageOverviewResponse>(response);
  }

  static async runCanary(authFetch: Fetcher): Promise<UsageCanaryResponse> {
    const response = await authFetch(`/dashboard/canary`, { method: "POST" });
    return handleApiResponse<UsageCanaryResponse>(response);
  }
}
