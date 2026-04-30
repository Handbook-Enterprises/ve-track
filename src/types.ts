export interface VeTrackUser {
  userId: string | null;
  orgId: string | null;
}

export interface VeTrackUsage {
  costUsd: number;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
}

export interface VeTrackEvent {
  id: string;
  timestamp: number;
  app: string;
  clerk_user_id: string | null;
  clerk_org_id: string | null;
  provider: string;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  latency_ms: number | null;
  cost_usd: number | null;
  status_code: number | null;
}

export interface RequestScope {
  ctx: ExecutionContext;
  app: string;
  apiKey: string | undefined;
  baseUrl: string;
  userId: string | null;
  orgId: string | null;
  buffer: VeTrackEvent[];
}

export interface Provider {
  name: string;
  match: (url: string) => boolean;
  enhance?: (init: RequestInit, app: string, user: VeTrackUser) => void;
  extract: (response: Response) => Promise<VeTrackUsage | null>;
}

export type UserResolver<E = unknown> = (
  req: Request,
  env: E,
) => Promise<VeTrackUser> | VeTrackUser;

export interface TrackedHandlerConfig<E> {
  app: string;
  apiKey?: (env: E) => string | undefined;
  baseUrl?: string;
  appUrl?: (env: E) => string | undefined;
  resolveUser?: UserResolver<E>;
  fetch: (
    req: Request,
    env: E,
    ctx: ExecutionContext,
  ) => Response | Promise<Response>;
  scheduled?: (
    event: ScheduledEvent,
    env: E,
    ctx: ExecutionContext,
  ) => void | Promise<void>;
  queue?: (batch: MessageBatch<unknown>, env: E, ctx: ExecutionContext) => void | Promise<void>;
  email?: (message: ForwardableEmailMessage, env: E, ctx: ExecutionContext) => void | Promise<void>;
  tail?: (events: TraceItem[], env: E, ctx: ExecutionContext) => void | Promise<void>;
  trace?: (traces: TraceItem[], env: E, ctx: ExecutionContext) => void | Promise<void>;
}
