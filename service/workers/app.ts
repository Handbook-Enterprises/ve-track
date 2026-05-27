import * as Sentry from "@sentry/cloudflare";
import { createRequestHandler } from "react-router";
import honoApi from "../backend";
import { SENTRY_DSN } from "~/lib/sentry";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

const handler = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api")) {
      return honoApi.fetch(request, env, ctx);
    }

    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<Env>;

export default import.meta.env.PROD
  ? Sentry.withSentry(
      () => ({
        dsn: SENTRY_DSN,
        tracesSampleRate: 0.1,
        enableLogs: true,
        sendDefaultPii: true,
      }),
      handler,
    )
  : handler;
