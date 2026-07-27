import { trackedHandler } from "./handler";
import { runScope, withAction, withUser } from "./hook";
import { clerkUserResolver } from "./clerk";
const DEFAULT_BASE_URL = "https://track.viewengine.ai";
const NO_USER_RESOLVER = () => ({
    userId: null,
    orgId: null,
});
const resolveApiKey = (config, env) => {
    if (typeof config.apiKey === "function")
        return config.apiKey(env);
    if (typeof config.apiKey === "string")
        return config.apiKey;
    const fromEnv = env.VE_TRACK_KEY;
    return typeof fromEnv === "string" ? fromEnv : undefined;
};
const resolveBaseUrl = (config, env) => {
    if (config.baseUrl)
        return config.baseUrl;
    const fromEnv = env.VE_TRACK_BASE_URL;
    return typeof fromEnv === "string" ? fromEnv : DEFAULT_BASE_URL;
};
const pickResolver = (config) => {
    if (config.resolveUser === "none") {
        return NO_USER_RESOLVER;
    }
    if (typeof config.resolveUser === "function")
        return config.resolveUser;
    return clerkUserResolver;
};
export function trackHandler(config, handler) {
    const resolver = pickResolver(config);
    const tracked = trackedHandler({
        app: config.app,
        apiKey: (env) => resolveApiKey(config, env),
        baseUrl: typeof config.baseUrl === "string" ? config.baseUrl : undefined,
        resolveUser: resolver,
        maxExtractBytes: config.maxExtractBytes,
        fetch: handler.fetch
            ? handler.fetch.bind(handler)
            : () => new Response("Not Implemented", { status: 501 }),
    });
    const buildBatchScope = (env, ctx, action) => ({
        ctx,
        app: config.app,
        apiKey: resolveApiKey(config, env),
        baseUrl: resolveBaseUrl(config, env),
        userId: null,
        orgId: null,
        action,
        buffer: [],
        pending: [],
        unattributed: [],
        maxExtractBytes: config.maxExtractBytes,
    });
    return {
        fetch: handler.fetch ? tracked.fetch : undefined,
        queue: handler.queue
            ? async (batch, env, ctx) => {
                const baseAction = batch.queue ?? "queue";
                await runScope(buildBatchScope(env, ctx, baseAction), () => handler.queue(batch, env, ctx));
            }
            : undefined,
        scheduled: handler.scheduled
            ? async (controller, env, ctx) => {
                await runScope(buildBatchScope(env, ctx, "scheduled"), () => handler.scheduled(controller, env, ctx));
            }
            : undefined,
        email: handler.email
            ? async (msg, env, ctx) => {
                await runScope(buildBatchScope(env, ctx, "email"), () => handler.email(msg, env, ctx));
            }
            : undefined,
        tail: handler.tail,
        trace: handler.trace,
    };
}
export function trackMessage(message, fn) {
    const body = (message?.body ?? {});
    const auth = (body.auth ?? {});
    const userId = (typeof auth.userId === "string" ? auth.userId : undefined) ??
        (typeof body.userId === "string" ? body.userId : null) ??
        null;
    const orgId = (typeof auth.orgId === "string" ? auth.orgId : undefined) ??
        (typeof body.orgId === "string" ? body.orgId : null) ??
        null;
    const action = typeof body.action === "string" ? body.action : null;
    const inner = () => Promise.resolve(fn());
    const wrapped = action ? () => withAction(action, inner) : inner;
    return withUser({ userId, orgId }, wrapped);
}
export { withAction as trackAction } from "./hook";
//# sourceMappingURL=simple.js.map