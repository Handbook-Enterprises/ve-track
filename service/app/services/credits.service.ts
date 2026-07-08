import { handleApiResponse } from "~/utils";
import { buildQuery } from "~/services/usage.service";
import type { CreditsOverviewResponse } from "~/types/credits.types";
import type { UsageQueryFilters } from "~/types/usage.types";

type Fetcher = (path: string, init?: RequestInit) => Promise<Response>;

export class CreditsService {
  static async getOverview(
    authFetch: Fetcher,
    filters?: UsageQueryFilters,
  ): Promise<CreditsOverviewResponse> {
    const response = await authFetch(`/dashboard/credits${buildQuery(filters)}`);
    return handleApiResponse<CreditsOverviewResponse>(response);
  }
}
