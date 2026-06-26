import { Database } from "bun:sqlite";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const D1_DIR = join(
  import.meta.dir,
  "..",
  ".wrangler",
  "state",
  "v3",
  "d1",
  "miniflare-D1DatabaseObject",
);

function discoverDb(): string {
  const explicit = process.argv[2];
  if (explicit) return explicit;
  let best: { path: string; rows: number } | null = null;
  for (const name of readdirSync(D1_DIR)) {
    if (!name.endsWith(".sqlite") || name.startsWith("metadata")) continue;
    const path = join(D1_DIR, name);
    if (!statSync(path).isFile()) continue;
    try {
      const probe = new Database(path, { readonly: true });
      const has = probe
        .query(
          "select count(*) c from sqlite_master where type='table' and name='usage_events'",
        )
        .get() as { c: number };
      const rows = has.c
        ? (probe.query("select count(*) c from usage_events").get() as { c: number }).c
        : -1;
      probe.close();
      if (rows >= 0 && (!best || rows > best.rows)) best = { path, rows };
    } catch {
      continue;
    }
  }
  if (!best)
    throw new Error(
      `No usable D1 sqlite found under ${D1_DIR}. Pass a path: bun scripts/reconcile.ts <file.sqlite>`,
    );
  return best.path;
}

const DB_PATH = discoverDb();
console.log(`DB: ${DB_PATH}\n`);
const db = new Database(DB_PATH, { readonly: true });
const NOW = Date.now();
const DAY = 86_400_000;

const fail: string[] = [];
const warn: string[] = [];
const ok = (label: string) => console.log(`  PASS  ${label}`);
const bad = (label: string) => {
  fail.push(label);
  console.log(`  FAIL  ${label}`);
};
const flag = (label: string) => {
  warn.push(label);
  console.log(`  WARN  ${label}`);
};

const round6 = (n: number) => Math.round(n * 1_000_000) / 1_000_000;
const cls = (a: number, b: number, eps = 1e-5) => Math.abs(a - b) <= eps;
const money = (n: number) => `$${n.toFixed(6)}`;

const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const endOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};
const lastDays = (n: number) => ({
  from: startOfDay(NOW - (n - 1) * DAY),
  to: endOfDay(NOW),
});
const monthRange = (offset: number) => {
  const d = new Date(NOW);
  const from = new Date(d.getFullYear(), d.getMonth() - offset, 1).getTime();
  const to =
    offset === 0
      ? endOfDay(NOW)
      : new Date(d.getFullYear(), d.getMonth() - offset + 1, 0, 23, 59, 59, 999).getTime();
  return { from, to };
};
const yearRange = (offset: number) => {
  const y = new Date(NOW).getFullYear() - offset;
  const from = new Date(y, 0, 1).getTime();
  const to = offset === 0 ? endOfDay(NOW) : new Date(y, 11, 31, 23, 59, 59, 999).getTime();
  return { from, to };
};

interface Preset {
  id: string;
  label: string;
  from: number;
  to: number;
  lifetime: boolean;
}
const PRESETS: Preset[] = [
  { id: "last_7", label: "Last 7 days", ...lastDays(7), lifetime: false },
  { id: "last_28", label: "Last 28 days", ...lastDays(28), lifetime: false },
  { id: "last_90", label: "Last 90 days", ...lastDays(90), lifetime: false },
  { id: "last_365", label: "Last 365 days", ...lastDays(365), lifetime: false },
  { id: "month_0", label: "This month", ...monthRange(0), lifetime: false },
  { id: "year_0", label: "This year", ...yearRange(0), lifetime: false },
  {
    id: "lifetime",
    label: "Lifetime",
    from: startOfDay(NOW - 5 * 365 * DAY),
    to: endOfDay(NOW),
    lifetime: true,
  },
];

const trackers = db
  .query(
    "select id, provider, status, pulled_cost_usd, monthly_spend, weekly_spend, balance_usd, total_usage_usd, total_usage_credits, credits_remaining, request_count from trackers",
  )
  .all() as any[];
const snaps = db
  .query(
    "select tracker_id, day, ts, daily_spend, total_usage_usd, monthly_spend, balance_usd, credits_remaining, total_usage_credits, request_count from tracker_snapshots order by ts asc",
  )
  .all() as any[];
const events = db
  .query(
    "select provider, timestamp, cost_usd, prompt_tokens, completion_tokens from usage_events",
  )
  .all() as any[];

const metricKind = (m: any): string =>
  m.monthly_spend != null
    ? "cumulative"
    : m.total_usage_usd != null
      ? "usage"
      : m.total_usage_credits != null
        ? "credits_used"
        : m.balance_usd != null
          ? "balance"
          : m.credits_remaining != null
            ? "credits"
            : m.request_count != null
              ? "requests"
              : "none";
const isMoneyKind = (k: string) =>
  k === "cumulative" || k === "usage" || k === "balance";

const moneyTrackers = trackers.filter((t) => isMoneyKind(metricKind(t)));
const snapsByTracker = new Map<string, any[]>();
for (const s of snaps) {
  const arr = snapsByTracker.get(s.tracker_id) ?? [];
  arr.push(s);
  snapsByTracker.set(s.tracker_id, arr);
}

function trackerContribution(p: Preset) {
  const byProvider = new Map<string, number>();
  let total = 0;
  const moneyIds = new Set(moneyTrackers.map((t) => t.id));
  if (p.lifetime) {
    for (const t of moneyTrackers) {
      const spend = t.pulled_cost_usd ?? 0;
      if (spend <= 0) continue;
      total += spend;
      byProvider.set(t.provider, (byProvider.get(t.provider) ?? 0) + spend);
    }
  } else {
    const providerOf = new Map(moneyTrackers.map((t) => [t.id, t.provider]));
    for (const s of snaps) {
      if (!moneyIds.has(s.tracker_id)) continue;
      const ts = s.ts ?? Date.parse(`${s.day}T00:00:00Z`);
      const spend = s.daily_spend ?? 0;
      if (spend <= 0) continue;
      if (ts >= p.from && ts <= p.to) {
        total += spend;
        const prov = providerOf.get(s.tracker_id)!;
        byProvider.set(prov, (byProvider.get(prov) ?? 0) + spend);
      }
    }
  }
  for (const [k, v] of byProvider) byProvider.set(k, round6(v));
  return { total: round6(total), byProvider };
}

function sdkAgg(p: Preset, exclude: Set<string>) {
  const byProvider = new Map<
    string,
    { cost: number; pt: number; ct: number; req: number }
  >();
  let total = 0;
  for (const e of events) {
    if (e.timestamp < p.from || e.timestamp >= p.to) continue;
    if (exclude.has(e.provider)) continue;
    const row = byProvider.get(e.provider) ?? { cost: 0, pt: 0, ct: 0, req: 0 };
    row.cost += e.cost_usd ?? 0;
    row.pt += e.prompt_tokens ?? 0;
    row.ct += e.completion_tokens ?? 0;
    row.req += 1;
    byProvider.set(e.provider, row);
    total += e.cost_usd ?? 0;
  }
  return { total: round6(total), byProvider };
}

console.log("================ TABLE-LEVEL AUDIT ================");
console.log(
  `events=${events.length}  trackers=${trackers.length}  snapshots=${snaps.length}  money_trackers=${moneyTrackers.length}`,
);

const nonMoney = trackers.filter((t) => !isMoneyKind(metricKind(t)));
if (nonMoney.length)
  flag(
    `non-money trackers excluded from cost: ${nonMoney.map((t) => `${t.provider}(${metricKind(t)})`).join(", ")}`,
  );
else ok("all trackers are money-kind (none silently dropped from cost)");

const negCost = events.filter((e) => (e.cost_usd ?? 0) < 0).length;
negCost ? bad(`${negCost} events with negative cost`) : ok("no negative-cost events");

const trackerIds = new Set(trackers.map((t) => t.id));
const orphan = snaps.filter((s) => !trackerIds.has(s.tracker_id));
orphan.length
  ? bad(`${orphan.length} orphan snapshots (tracker missing)`)
  : ok("no orphan snapshots");

const negDelta = snaps.filter((s) => (s.daily_spend ?? 0) < 0).length;
negDelta ? bad(`${negDelta} snapshots with negative daily_spend`) : ok("no negative daily_spend");

const evProviders = new Map<string, string>();
for (const e of events) evProviders.set(e.provider.toLowerCase(), e.provider);
let caseHit = false;
for (const t of moneyTrackers) {
  const ev = evProviders.get(t.provider.toLowerCase());
  if (ev && ev !== t.provider) {
    caseHit = true;
    bad(
      `casing mismatch: tracker provider "${t.provider}" vs event provider "${ev}" — exclusion is case-sensitive, double-count risk`,
    );
  }
}
if (!caseHit) ok("no tracker/event provider casing mismatches (exclusion safe)");

console.log("\n================ LIFETIME vs WINDOWS GAP (per tracker) ================");
console.log("pulled_cost_usd = provider lifetime total; windowable = sum of all daily_spend deltas");
for (const t of moneyTrackers) {
  const arr = snapsByTracker.get(t.id) ?? [];
  const windowable = round6(
    arr.reduce((a, s) => a + Math.max(0, s.daily_spend ?? 0), 0),
  );
  const baseline = round6((t.pulled_cost_usd ?? 0) - windowable);
  console.log(
    `  ${t.provider.padEnd(12)} lifetime=${money(t.pulled_cost_usd ?? 0).padStart(14)}  windowable=${money(windowable).padStart(12)}  pre-connection_baseline=${money(baseline).padStart(12)}`,
  );
}

console.log("\n================ PER-PRESET RECONCILIATION ================");
for (const p of PRESETS) {
  const tc = trackerContribution(p);
  const exclude = new Set(tc.byProvider.keys());
  const sdk = sdkAgg(p, exclude);

  const merged = new Map<
    string,
    { cost: number; pt: number; ct: number; req: number }
  >();
  for (const [k, v] of sdk.byProvider) merged.set(k, { ...v });
  for (const [k, v] of tc.byProvider) {
    const row = merged.get(k);
    if (row) row.cost = round6(row.cost + v);
    else merged.set(k, { cost: v, pt: 0, ct: 0, req: 0 });
  }
  const mergedTotal = round6(sdk.total + tc.total);
  const sumProviders = round6(
    [...merged.values()].reduce((a, r) => a + r.cost, 0),
  );

  console.log(`\n— ${p.label} (${p.id}${p.lifetime ? ", lifetime=1" : ""})`);
  const rows = [...merged.entries()].sort((a, b) => b[1].cost - a[1].cost);
  for (const [prov, r] of rows) {
    const src =
      tc.byProvider.has(prov) && !sdk.byProvider.has(prov)
        ? "tracker"
        : sdk.byProvider.has(prov) && tc.byProvider.has(prov)
          ? "BOTH"
          : "sdk";
    console.log(
      `    ${prov.padEnd(12)} ${money(r.cost).padStart(14)}  calls=${String(r.req).padStart(4)}  tok=${String(r.pt + r.ct).padStart(6)}  [${src}]`,
    );
  }
  console.log(
    `    total: sdk=${money(sdk.total)} + tracker=${money(tc.total)} = ${money(mergedTotal)} | Σproviders=${money(sumProviders)}`,
  );

  if (cls(sumProviders, mergedTotal))
    ok(`${p.id}: provider breakdown reconciles to total`);
  else
    bad(
      `${p.id}: Σproviders ${money(sumProviders)} != total ${money(mergedTotal)} (diff ${money(mergedTotal - sumProviders)})`,
    );

  for (const [prov] of merged) {
    if (tc.byProvider.has(prov) && sdk.byProvider.has(prov))
      bad(`${p.id}: provider "${prov}" counted from BOTH tracker and SDK (double-count)`);
  }

  if (p.lifetime) {
    const expected = round6(
      moneyTrackers.reduce((a, t) => a + (t.pulled_cost_usd ?? 0), 0),
    );
    if (cls(tc.total, expected))
      ok(`lifetime tracker total == Σ pulled_cost_usd (${money(expected)})`);
    else bad(`lifetime tracker total ${money(tc.total)} != Σ pulled ${money(expected)}`);
    for (const [prov, r] of merged) {
      if (tc.byProvider.has(prov) && r.req !== 0)
        flag(`${p.id}: tracker provider "${prov}" shows calls=${r.req} (expected 0)`);
    }
  }
}

console.log("\n================ SUMMARY ================");
console.log(`FAIL: ${fail.length}   WARN: ${warn.length}`);
if (fail.length) {
  console.log("FAILURES:");
  for (const f of fail) console.log("  - " + f);
}
if (warn.length) {
  console.log("WARNINGS:");
  for (const w of warn) console.log("  - " + w);
}
if (!fail.length) console.log("All reconciliation invariants hold");
process.exit(fail.length ? 1 : 0);
