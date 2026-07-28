import { installFetchHook, runScope } from "./hook.js";
const DEFAULT_BASE_URL = "https://track.viewengine.ai";
const EMPTY_USER = { userId: null, orgId: null };
const resolveString = (source, env, fallbackKey) => {
    if (source)
        return source(env);
    const fromEnv = env?.[fallbackKey];
    return typeof fromEnv === "string" ? fromEnv : undefined;
};
const buildScope = (env, ctx, config) => {
    const apiKey = resolveString(config.apiKey, env, "VE_TRACK_KEY");
    const baseUrl = config.baseUrl ??
        resolveString(undefined, env, "VE_TRACK_BASE_URL") ??
        DEFAULT_BASE_URL;
    return {
        ctx,
        app: config.app,
        apiKey,
        baseUrl,
        userId: null,
        orgId: null,
        action: null,
        buffer: [],
        pending: [],
        unattributed: [],
        maxExtractBytes: config.maxExtractBytes,
    };
};
export function trackedHandler(config) {
    installFetchHook();
    return {
        async fetch(req, env, ctx) {
            const scope = buildScope(env, ctx, config);
            const resolveUser = config.resolveUser;
            if (resolveUser) {
                let memo;
                scope.resolveIdentity = () => (memo ??= Promise.resolve(resolveUser(req, env)).catch(() => EMPTY_USER));
            }
            return runScope(scope, () => config.fetch(req, env, ctx));
        },
        scheduled: config.scheduled
            ? (event, env, ctx) => runScope(buildScope(env, ctx, config), () => config.scheduled(event, env, ctx))
            : undefined,
        queue: config.queue
            ? (batch, env, ctx) => runScope(buildScope(env, ctx, config), () => config.queue(batch, env, ctx))
            : undefined,
        email: config.email
            ? (message, env, ctx) => runScope(buildScope(env, ctx, config), () => config.email(message, env, ctx))
            : undefined,
        tail: config.tail,
        trace: config.trace,
    };
}
//# sourceMappingURL=handler.js.map