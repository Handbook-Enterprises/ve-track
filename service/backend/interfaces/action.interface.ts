export interface ActionCreateBody {
  slug?: string;
  name?: string;
  app_slug?: string | null;
  description?: string;
  credits_per_call?: number | null;
  status?: string;
}

export interface ActionUpdateBody {
  slug?: string;
  name?: string;
  app_slug?: string | null;
  description?: string;
  credits_per_call?: number | null;
  status?: string;
}
