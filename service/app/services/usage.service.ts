import { handleApiResponse } from "~/utils";
import type {
  UsageCanaryResponse,
  UsageOverviewResponse,
  UsageQueryFilters,
} from "~/types/usage.types";

type Fetcher = (path: string, init?: RequestInit) => Promise<Response>;

const buildQuery = (filters?: UsageQueryFilters): string => {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.fromDays != null) params.set("fromDays", String(filters.fromDays));
  if (filters.app) params.set("app", filters.app);
  if (filters.provider) params.set("provider", filters.provider);
  if (filters.clerk_org_id) params.set("clerk_org_id", filters.clerk_org_id);
  if (filters.clerk_user_id) params.set("clerk_user_id", filters.clerk_user_id);
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
