import { handleApiResponse } from "~/utils";
import type {
  CostTrackerActionResponse,
  CostTrackerCreatePayload,
  CostTrackerCreateResponse,
  CostTrackersListResponse,
} from "~/types/cost-tracker.types";

type Fetcher = (path: string, init?: RequestInit) => Promise<Response>;

export class CostTrackerService {
  static async list(authFetch: Fetcher): Promise<CostTrackersListResponse> {
    const response = await authFetch("/dashboard/trackers");
    return handleApiResponse<CostTrackersListResponse>(response);
  }

  static async create(
    authFetch: Fetcher,
    payload: CostTrackerCreatePayload,
  ): Promise<CostTrackerCreateResponse> {
    const response = await authFetch("/dashboard/trackers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return handleApiResponse<CostTrackerCreateResponse>(response);
  }

  static async disconnect(
    authFetch: Fetcher,
    id: string,
  ): Promise<CostTrackerActionResponse> {
    const response = await authFetch(`/dashboard/trackers/${id}`, {
      method: "DELETE",
    });
    return handleApiResponse<CostTrackerActionResponse>(response);
  }

  static async sync(
    authFetch: Fetcher,
    id: string,
  ): Promise<CostTrackerActionResponse> {
    const response = await authFetch(`/dashboard/trackers/${id}/sync`, {
      method: "POST",
    });
    return handleApiResponse<CostTrackerActionResponse>(response);
  }
}
