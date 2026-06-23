import { handleApiResponse } from "~/utils";
import type { SettingsResponse, TenantSettings } from "~/types/settings.types";

type Fetcher = (path: string, init?: RequestInit) => Promise<Response>;

export class SettingsService {
  static async get(authFetch: Fetcher): Promise<SettingsResponse> {
    const response = await authFetch("/dashboard/settings");
    return handleApiResponse<SettingsResponse>(response);
  }

  static async update(
    authFetch: Fetcher,
    patch: Partial<TenantSettings>,
  ): Promise<SettingsResponse> {
    const response = await authFetch("/dashboard/settings", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    return handleApiResponse<SettingsResponse>(response);
  }
}
