#!/usr/bin/env bun
import { readFileSync } from "node:fs";
import { Command } from "commander";
import { ApiClient } from "./client";
import { defaultApiUrl, envKey } from "./config";

const program = new Command();

program
  .name("ve-track")
  .description("VE Track — usage & cost-attribution CLI")
  .version("1.0.0")
  .option("--key <key>", "API key (or set VE_TRACK_KEY env)")
  .option("--url <url>", "API base URL (or set VE_TRACK_API_URL env)");

function getClient(requireKey = true): ApiClient {
  const opts = program.opts();
  const baseUrl = opts.url || defaultApiUrl();
  const key = opts.key || envKey() || "";
  if (requireKey && !key) {
    console.error("No API key. Pass --key or set VE_TRACK_KEY (mint one in the ve-track dashboard).");
    process.exit(1);
  }
  return new ApiClient({ baseUrl, key });
}

function out(data: unknown) {
  console.log(JSON.stringify(data, null, 2));
}

function fail(err: unknown) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}

function usageQuery(opts: Record<string, string | undefined>): Record<string, string | undefined> {
  return {
    fromDays: opts.fromDays,
    app: opts.app,
    provider: opts.provider,
    clerk_org_id: opts.org,
    clerk_user_id: opts.user,
    action: opts.action,
  };
}

const filterOpts = (cmd: Command) =>
  cmd
    .option("--from-days <n>", "Look back this many days")
    .option("--app <app>", "Filter by app")
    .option("--provider <provider>", "Filter by provider")
    .option("--org <clerkOrgId>", "Filter by Clerk org id")
    .option("--user <clerkUserId>", "Filter by Clerk user id")
    .option("--action <action>", "Filter by action");

program
  .command("events")
  .description("Ingest usage events — body { app, events: [...] } from a JSON file")
  .requiredOption("--input <path>", "Path to a JSON file with the ingest body")
  .action(async (opts) => {
    try {
      const body = JSON.parse(readFileSync(opts.input, "utf8"));
      out(await getClient().post("events", body));
    } catch (err) {
      fail(err);
    }
  });

const usage = program.command("usage").description("Query usage aggregations");

for (const dim of ["app", "org", "user", "provider", "model", "action"] as const) {
  filterOpts(usage.command(`by-${dim}`).description(`Usage grouped by ${dim}`)).action(async (opts) => {
    try {
      out(await getClient().get(`usage/by-${dim}`, usageQuery(opts)));
    } catch (err) {
      fail(err);
    }
  });
}

filterOpts(usage.command("totals").description("Usage totals (with period-over-period delta)")).action(
  async (opts) => {
    try {
      out(await getClient().get("usage/totals", usageQuery(opts)));
    } catch (err) {
      fail(err);
    }
  },
);

filterOpts(
  program
    .command("profitability")
    .description("Revenue vs cost margin, grouped")
    .option("--by <dimension>", "Group by: app|org|user|provider|model|action"),
).action(async (opts) => {
  try {
    out(await getClient().get("breakdown/profitability", { ...usageQuery(opts), by: opts.by }));
  } catch (err) {
    fail(err);
  }
});

filterOpts(
  program.command("profitability-totals").description("Total revenue vs cost margin"),
).action(async (opts) => {
  try {
    out(await getClient().get("breakdown/profitability/totals", usageQuery(opts)));
  } catch (err) {
    fail(err);
  }
});

program
  .command("canary")
  .description("Run a tenant canary check")
  .action(async () => {
    try {
      out(await getClient().post("canary"));
    } catch (err) {
      fail(err);
    }
  });

program
  .command("status")
  .description("Service health (public endpoint)")
  .action(async () => {
    try {
      out(await getClient(false).raw("/api/health"));
    } catch (err) {
      fail(err);
    }
  });

program.parseAsync();
