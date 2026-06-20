export interface OrganizationCreateBody {
  external_id?: string | null;
  name?: string | null;
  domain?: string | null;
  status?: string;
}

export interface OrganizationUpdateBody {
  external_id?: string | null;
  name?: string | null;
  domain?: string | null;
  status?: string;
}
