import { handleApiResponse } from "~/utils";

type Fetcher = (path: string, init?: RequestInit) => Promise<Response>;

export interface ActionRenameResponse {
  success: boolean;
  message: string;
}

export interface ActionMergeResponse {
  success: boolean;
  message: string;
  data: { from: string; into: string; retagged: number };
}

export class ActionsService {
  static async rename(
    authFetch: Fetcher,
    slug: string,
    name: string,
  ): Promise<ActionRenameResponse> {
    const response = await authFetch(`/dashboard/actions/rename`, {
      method: "PATCH",
      body: JSON.stringify({ slug, name }),
    });
    return handleApiResponse<ActionRenameResponse>(response);
  }

  static async merge(
    authFetch: Fetcher,
    from: string,
    into: string,
  ): Promise<ActionMergeResponse> {
    const response = await authFetch(`/dashboard/actions/merge`, {
      method: "POST",
      body: JSON.stringify({ from, into }),
    });
    return handleApiResponse<ActionMergeResponse>(response);
  }
}
