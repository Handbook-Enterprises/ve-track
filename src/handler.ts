import { installFetchHook, runScope } from "./hook";
import type { TrackedHandlerConfig, VeTrackUser } from "./types";

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

export function trackedHandler<E>(
  config: TrackedHandlerConfig<E>,
): ExportedHandler<E> {
  installFetchHook();

  return {
    async fetch(req, env, ctx) {
      const apiKey = resolveString(config.apiKey, env, "VE_TRACK_KEY");
      const baseUrl =
        config.baseUrl ??
        resolveString(undefined, env, "VE_TRACK_BASE_URL") ??
        DEFAULT_BASE_URL;

      const user = config.resolveUser
        ? await config.resolveUser(req, env)
        : EMPTY_USER;

      return runScope(
        {
          ctx,
          app: config.app,
          apiKey,
          baseUrl,
          userId: user.userId,
          orgId: user.orgId,
          buffer: [],
        },
        () => config.fetch(req, env, ctx),
      );
    },
    scheduled: config.scheduled,
    queue: config.queue,
    email: config.email,
    tail: config.tail,
    trace: config.trace,
  };
}
