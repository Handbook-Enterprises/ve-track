import { handleApiResponse } from "~/utils";
import type {
  ApiKeyCreatePayload,
  ApiKeyCreateResponse,
  ApiKeyRevokeResponse,
  ApiKeysListResponse,
} from "~/types/api-key.types";

type Fetcher = (path: string, init?: RequestInit) => Promise<Response>;

export class ApiKeyService {
  static async list(authFetch: Fetcher): Promise<ApiKeysListResponse> {
    const response = await authFetch("/dashboard/keys");
    return handleApiResponse<ApiKeysListResponse>(response);
  }

  static async create(
    authFetch: Fetcher,
    payload: ApiKeyCreatePayload,
  ): Promise<ApiKeyCreateResponse> {
    const response = await authFetch("/dashboard/keys", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return handleApiResponse<ApiKeyCreateResponse>(response);
  }

  static async revoke(
    authFetch: Fetcher,
    id: string,
  ): Promise<ApiKeyRevokeResponse> {
    const response = await authFetch(`/dashboard/keys/${id}`, {
      method: "DELETE",
    });
    return handleApiResponse<ApiKeyRevokeResponse>(response);
  }
}
