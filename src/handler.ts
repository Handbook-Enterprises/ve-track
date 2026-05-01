import { installFetchHook, runScope } from "./hook";
import type {
  RequestScope,
  TrackedHandlerConfig,
  VeTrackUser,
} from "./types";

const DEFAULT_BASE_URL = "https://track.viewengine.ai";
const EMPTY_USER: VeTrackUser = { userId: null, orgId: null };

const resolveString = <E>(
  source: ((env: E) => string | undefined) | undefined,
  env: E,
  fallbackKey: string,
): string | undefined => {
  if (source) return source(env);
  const fromEnv = (env as any)?.[fallbackKey];
  return typeof fromEnv === "string" ? fromEnv : undefined;
};

const buildScope = <E>(
  env: E,
  ctx: ExecutionContext,
  app: string,
  apiKeySource: ((env: E) => string | undefined) | undefined,
  baseUrlOverride: string | undefined,
  user: VeTrackUser,
): RequestScope => ({
  ctx,
  app,
  apiKey: resolveString(apiKeySource, env, "VE_TRACK_KEY"),
  baseUrl:
    baseUrlOverride ??
    resolveString(undefined, env, "VE_TRACK_BASE_URL") ??
    DEFAULT_BASE_URL,
  userId: user.userId,
  orgId: user.orgId,
  buffer: [],
});

export function trackedHandler<E>(
  config: TrackedHandlerConfig<E>,
): ExportedHandler<E> {
  installFetchHook();

  return {
    async fetch(req, env, ctx) {
      const user = config.resolveUser
        ? await config.resolveUser(req, env)
        : EMPTY_USER;
      return runScope(
        buildScope(env, ctx, config.app, config.apiKey, config.baseUrl, user),
        () => config.fetch(req, env, ctx),
      );
    },

    scheduled: config.scheduled
      ? (event, env, ctx) =>
          runScope(
            buildScope(
              env,
              ctx,
              config.app,
              config.apiKey,
              config.baseUrl,
              EMPTY_USER,
            ),
            () => config.scheduled!(event, env, ctx),
          )
      : undefined,

    queue: config.queue
      ? (batch, env, ctx) =>
          runScope(
            buildScope(
              env,
              ctx,
              config.app,
              config.apiKey,
              config.baseUrl,
              EMPTY_USER,
            ),
            () => config.queue!(batch, env, ctx),
          )
      : undefined,

    email: config.email
      ? (message, env, ctx) =>
          runScope(
            buildScope(
              env,
              ctx,
              config.app,
              config.apiKey,
              config.baseUrl,
              EMPTY_USER,
            ),
            () => config.email!(message, env, ctx),
          )
      : undefined,

    tail: config.tail,
    trace: config.trace,
  };
}
