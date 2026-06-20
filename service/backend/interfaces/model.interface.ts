export interface ModelCreateBody {
  provider?: string;
  model_id?: string;
  name?: string;
  description?: string;
  status?: string;
}

export interface ModelUpdateBody {
  provider?: string;
  model_id?: string;
  name?: string;
  description?: string;
  status?: string;
}
