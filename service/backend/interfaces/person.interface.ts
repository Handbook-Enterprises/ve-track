export interface PersonCreateBody {
  external_id?: string | null;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  organization_external_id?: string | null;
  status?: string;
}

export interface PersonUpdateBody {
  external_id?: string | null;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  organization_external_id?: string | null;
  status?: string;
}
