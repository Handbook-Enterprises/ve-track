import { handleApiResponse } from "~/utils";
import type {
  IdentityKeyActionResponse,
  IdentityKeyCreatePayload,
  IdentityKeysListResponse,
} from "~/types/identity-key.types";

type Fetcher = (path: string, init?: RequestInit) => Promise<Response>;

export class IdentityKeyService {
  static async list(authFetch: Fetcher): Promise<IdentityKeysListResponse> {
    const response = await authFetch("/dashboard/identity-keys");
    return handleApiResponse<IdentityKeysListResponse>(response);
  }

  static async create(
    authFetch: Fetcher,
    payload: IdentityKeyCreatePayload,
  ): Promise<IdentityKeyActionResponse> {
    const response = await authFetch("/dashboard/identity-keys", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return handleApiResponse<IdentityKeyActionResponse>(response);
  }

  static async updateKey(
    authFetch: Fetcher,
    id: string,
    apiKey: string,
  ): Promise<IdentityKeyActionResponse> {
    const response = await authFetch(`/dashboard/identity-keys/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ apiKey }),
    });
    return handleApiResponse<IdentityKeyActionResponse>(response);
  }

  static async remove(
    authFetch: Fetcher,
    id: string,
  ): Promise<IdentityKeyActionResponse> {
    const response = await authFetch(`/dashboard/identity-keys/${id}`, {
      method: "DELETE",
    });
    return handleApiResponse<IdentityKeyActionResponse>(response);
  }
}
