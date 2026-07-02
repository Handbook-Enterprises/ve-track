import { trackedHandler } from "./handler";
import { runScope, withAction, withCorrelation, withUser } from "./hook";
import { clerkUserResolver } from "./clerk";
import type { RequestScope, UserResolver } from "./types";

const DEFAULT_BASE_URL = "https://track.viewengine.ai";

const NO_USER_RESOLVER: UserResolver<unknown> = () => ({
  userId: null,
  orgId: null,
});

export interface TrackConfig<E> {
  app: string;
  apiKey?: string | ((env: E) => string | undefined);
  baseUrl?: string;
  resolveUser?: "clerk" | "none" | UserResolver<E>;
}

const resolveApiKey = <E>(
  config: TrackConfig<E>,
  env: E,
): string | undefined => {
  if (typeof config.apiKey === "function") return config.apiKey(env);
  if (typeof config.apiKey === "string") return config.apiKey;
  const fromEnv = (env as Record<string, unknown>).VE_TRACK_KEY;
  return typeof fromEnv === "string" ? fromEnv : undefined;
};

const resolveBaseUrl = <E>(config: TrackConfig<E>, env: E): string => {
  if (config.baseUrl) return config.baseUrl;
  const fromEnv = (env as Record<string, unknown>).VE_TRACK_BASE_URL;
  return typeof fromEnv === "string" ? fromEnv : DEFAULT_BASE_URL;
};

const pickResolver = <E>(config: TrackConfig<E>): UserResolver<E> => {
  if (config.resolveUser === "none") {
    return NO_USER_RESOLVER as UserResolver<E>;
  }
  if (typeof config.resolveUser === "function") return config.resolveUser;
  return clerkUserResolver as UserResolver<E>;
};

export function trackHandler<E>(
  config: TrackConfig<E>,
  handler: ExportedHandler<E>,
): ExportedHandler<E> {
  const resolver = pickResolver(config);
  const apiKeyFn = typeof config.apiKey === "function" ? config.apiKey : undefined;

  const tracked = trackedHandler<E>({
    app: config.app,
    apiKey: apiKeyFn,
    baseUrl:
      typeof config.baseUrl === "string" ? config.baseUrl : undefined,
    resolveUser: resolver,
    fetch: handler.fetch
      ? handler.fetch.bind(handler)
      : () => new Response("Not Implemented", { status: 501 }),
  });

  const buildBatchScope = (
    env: E,
    ctx: ExecutionContext,
    action: string,
  ): RequestScope =>
    ({
      ctx,
      app: config.app,
      apiKey: resolveApiKey(config, env),
      baseUrl: resolveBaseUrl(config, env),
      userId: null,
      orgId: null,
      action,
      buffer: [],
      pending: [] as Promise<unknown>[],
    }) as unknown as RequestScope;

  return {
    fetch: handler.fetch ? tracked.fetch : undefined,
    queue: handler.queue
      ? async (batch, env, ctx) => {
          const baseAction =
            (batch as { queue?: string }).queue ?? "queue";
          await runScope(buildBatchScope(env, ctx, baseAction), () =>
            handler.queue!(batch, env, ctx),
          );
        }
      : undefined,
    scheduled: handler.scheduled
      ? async (controller, env, ctx) => {
          await runScope(buildBatchScope(env, ctx, "scheduled"), () =>
            handler.scheduled!(controller, env, ctx),
          );
        }
      : undefined,
    email: handler.email
      ? async (msg, env, ctx) => {
          await runScope(buildBatchScope(env, ctx, "email"), () =>
            handler.email!(msg, env, ctx),
          );
        }
      : undefined,
    tail: handler.tail,
    trace: handler.trace,
  };
}

export function trackMessage<T>(
  message: { body?: unknown },
  fn: () => Promise<T> | T,
): Promise<T> {
  const body = (message?.body ?? {}) as Record<string, unknown>;
  const auth = (body.auth ?? {}) as Record<string, unknown>;
  const userId =
    (typeof auth.userId === "string" ? auth.userId : undefined) ??
    (typeof body.userId === "string" ? (body.userId as string) : null) ??
    null;
  const orgId =
    (typeof auth.orgId === "string" ? auth.orgId : undefined) ??
    (typeof body.orgId === "string" ? (body.orgId as string) : null) ??
    null;
  const action =
    typeof body.action === "string" ? (body.action as string) : null;
  const correlationId =
    typeof body.correlationId === "string" ? (body.correlationId as string) : null;

  const inner = () => Promise.resolve(fn());
  const withCorr = correlationId
    ? () => withCorrelation(correlationId, inner)
    : inner;
  const wrapped = action ? () => withAction(action, withCorr) : withCorr;
  return withUser({ userId, orgId }, wrapped);
}

export { withAction as trackAction } from "./hook";
