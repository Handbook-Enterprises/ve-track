import * as Sentry from "@sentry/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { createRequestHandler } from "react-router";
import honoApi from "../backend";
import PricingService from "../backend/services/pricing.service";
import TrackerService from "../backend/services/tracker.service";
import { trackerConsumer } from "../backend/consumers/tracker.consumer";
import type { TrackerSyncMessage } from "../backend/interfaces/tracker.interface";
import { SENTRY_DSN } from "~/lib/sentry";

const DAILY_CRON = "0 0 * * *";

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
  async scheduled(event, env, ctx) {
    const db = drizzle(env.DB);
    ctx.waitUntil(PricingService.syncIfStale(db));
    if (event.cron === DAILY_CRON) {
      ctx.waitUntil(
        env.TRACKER_QUEUE
          ? TrackerService.enqueueAll(db, env)
          : TrackerService.syncAll(db, env),
      );
    }
  },
  async queue(batch, env) {
    await trackerConsumer(batch as MessageBatch<TrackerSyncMessage>, env);
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
