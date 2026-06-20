import { handleApiResponse } from "~/utils";
import type {
  TrackerActionResponse,
  TrackerCostQuery,
  TrackerCostsResponse,
  TrackerCreatePayload,
  TrackerCreateResponse,
  TrackersListResponse,
} from "~/types/tracker.types";

type Fetcher = (path: string, init?: RequestInit) => Promise<Response>;

export class TrackerService {
  static async list(authFetch: Fetcher): Promise<TrackersListResponse> {
    const response = await authFetch("/dashboard/trackers");
    return handleApiResponse<TrackersListResponse>(response);
  }

  static async create(
    authFetch: Fetcher,
    payload: TrackerCreatePayload,
  ): Promise<TrackerCreateResponse> {
    const response = await authFetch("/dashboard/trackers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return handleApiResponse<TrackerCreateResponse>(response);
  }

  static async updateKey(
    authFetch: Fetcher,
    id: string,
    apiKey: string,
  ): Promise<TrackerCreateResponse> {
    const response = await authFetch(`/dashboard/trackers/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ apiKey }),
    });
    return handleApiResponse<TrackerCreateResponse>(response);
  }

  static async disconnect(
    authFetch: Fetcher,
    id: string,
  ): Promise<TrackerActionResponse> {
    const response = await authFetch(`/dashboard/trackers/${id}`, {
      method: "DELETE",
    });
    return handleApiResponse<TrackerActionResponse>(response);
  }

  static async sync(
    authFetch: Fetcher,
    id: string,
  ): Promise<TrackerActionResponse> {
    const response = await authFetch(`/dashboard/trackers/${id}/sync`, {
      method: "POST",
    });
    return handleApiResponse<TrackerActionResponse>(response);
  }

  static async getCosts(
    authFetch: Fetcher,
    id: string,
    query?: TrackerCostQuery,
  ): Promise<TrackerCostsResponse> {
    const params = new URLSearchParams();
    if (query?.from != null) params.set("from", String(query.from));
    if (query?.to != null) params.set("to", String(query.to));
    const qs = params.toString();
    const response = await authFetch(
      `/dashboard/trackers/${id}/costs${qs ? `?${qs}` : ""}`,
    );
    return handleApiResponse<TrackerCostsResponse>(response);
  }
}
