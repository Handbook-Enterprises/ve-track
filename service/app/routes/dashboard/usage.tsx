import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  Cpu,
  DollarSign,
  Layers,
  Plug,
  RefreshCw,
  Search,
  User2,
} from "lucide-react";
import { useUsage } from "~/hooks/useUsage";
import { LoadingElement, ButtonElement } from "~/components/elements";
import StatCard from "~/components/common/stat-card";
import UsageRow from "~/components/common/usage-row";
import { cn } from "~/lib/utils";
import { formatMoney } from "~/utils/format";
import type {
  UsageDimension,
  UsageGroup,
  UsageQueryFilters,
} from "~/types/usage.types";

type Range = 7 | 30 | 90;

const TABS: {
  key: UsageDimension;
  number: string;
  label: string;
  icon: typeof Layers;
  emptyKey: string;
}[] = [
  { key: "app", number: "01", label: "Per App", icon: Layers, emptyKey: "Unknown app" },
  { key: "org", number: "02", label: "Per Org", icon: Building2, emptyKey: "No org" },
  { key: "user", number: "03", label: "Per User", icon: User2, emptyKey: "Anonymous" },
  { key: "provider", number: "04", label: "Per Provider", icon: Plug, emptyKey: "Unknown" },
  { key: "model", number: "05", label: "Per Model", icon: Cpu, emptyKey: "—" },
];

export default function UsagePage() {
  const [range, setRange] = useState<Range>(7);
  const [tab, setTab] = useState<UsageDimension>("app");
  const [search, setSearch] = useState("");

  const filters: UsageQueryFilters = useMemo(() => ({ fromDays: range }), [range]);
  const { overview, loading, error, canaryRunning, refetch, runCanary } =
    useUsage(filters);

  const activeGroups: UsageGroup[] = useMemo(() => {
    if (tab === "app") return overview.byApp;
    if (tab === "org") return overview.byOrg;
    if (tab === "user") return overview.byUser;
    if (tab === "provider") return overview.byProvider;
    return overview.byModel;
  }, [tab, overview]);

  const filtered = useMemo(() => {
    if (!search.trim()) return activeGroups;
    const q = search.toLowerCase();
    return activeGroups.filter((g) => (g.key ?? "").toLowerCase().includes(q));
  }, [activeGroups, search]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LoadingElement size={28} />
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Pulling usage…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center border border-destructive/30">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          {error}
        </p>
        <ButtonElement variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Try again
        </ButtonElement>
      </div>
    );
  }

  const activeTab = TABS.find((t) => t.key === tab)!;
  const totals = overview.totals;
  const top = activeGroups[0];

  return (
    <div className="space-y-10 pb-16">
      <header className="border-b-2 border-foreground pb-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          ve-track · usage
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-4xl font-bold uppercase tracking-tight">
              Where the spend went
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Live aggregates from every event your apps shipped to ve-track.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border">
              {([7, 30, 90] as Range[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "px-3 py-1 text-[11px] font-medium tracking-wide transition-colors",
                    range === r
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {r}D
                </button>
              ))}
            </div>
            <ButtonElement
              variant="outline"
              size="sm"
              onClick={refetch}
              className="gap-2 text-xs"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </ButtonElement>
            <ButtonElement
              variant="outline"
              size="sm"
              onClick={runCanary}
              disabled={canaryRunning}
              loading={canaryRunning}
              className="gap-2 text-xs"
            >
              <Activity className="h-3 w-3" />
              Canary
            </ButtonElement>
          </div>
        </div>
      </header>

      <section>
        <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={`Spend · last ${totals.fromDays}d`}
            value={formatMoney(totals.cost_usd)}
            icon={DollarSign}
            description="across every tracked provider"
            accent
          />
          <StatCard
            title="Total requests"
            value={totals.requests.toLocaleString()}
            icon={Activity}
            description="provider calls captured"
          />
          <StatCard
            title="Prompt tokens"
            value={totals.prompt_tokens.toLocaleString()}
            icon={Layers}
            description="input across LLM calls"
          />
          <StatCard
            title="Completion tokens"
            value={totals.completion_tokens.toLocaleString()}
            icon={Layers}
            description="output across LLM calls"
            accent
          />
        </div>
      </section>

      {top && (
        <section className="border border-primary/30 bg-primary/5 p-5">
          <p className="text-[10px] uppercase tracking-[0.15em] text-primary">
            Highest {activeTab.label.toLowerCase()} this window
          </p>
          <div className="mt-2 flex items-end justify-between">
            <p className="font-display text-2xl font-bold">
              {top.key || activeTab.emptyKey}
            </p>
            <p className="font-display text-2xl font-bold tabular-nums">
              {formatMoney(top.cost_usd)}
            </p>
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              /06 · Attribution
            </p>
            <h2 className="mt-1 text-base font-medium">
              Break the spend down
            </h2>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-56 border bg-card pl-8 pr-3 text-[13px] placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="flex border-b">
          {TABS.map((t) => {
            const groups =
              t.key === "app"
                ? overview.byApp
                : t.key === "org"
                  ? overview.byOrg
                  : t.key === "user"
                    ? overview.byUser
                    : t.key === "provider"
                      ? overview.byProvider
                      : overview.byModel;
            const cost = groups.reduce((sum, g) => sum + g.cost_usd, 0);
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key);
                  setSearch("");
                }}
                className={cn(
                  "group relative flex-1 px-4 py-4 text-left transition-colors",
                  tab === t.key ? "bg-card" : "bg-transparent hover:bg-muted/40",
                )}
              >
                {tab === t.key && (
                  <div className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
                )}
                <p
                  className={cn(
                    "text-[10px] uppercase tracking-[0.15em]",
                    tab === t.key ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  /{t.number}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {t.label}
                </p>
                <p className="mt-1 font-display text-base font-bold tabular-nums">
                  {formatMoney(cost)}
                </p>
              </button>
            );
          })}
        </div>

        <div className="border bg-card">
          <div className="grid grid-cols-[3rem_minmax(0,1fr)_8rem_8rem_8rem] items-center gap-3 border-b px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>Rank</span>
            <span>{activeTab.label.replace("Per ", "")}</span>
            <span className="text-right">Cost</span>
            <span className="text-right">Requests</span>
            <span className="text-right">Tokens</span>
          </div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center border text-muted-foreground">
                <activeTab.icon className="h-4 w-4" />
              </div>
              <p className="text-sm font-medium">
                {search ? "Nothing matches that search" : "No usage in this window yet"}
              </p>
              <p className="max-w-sm text-xs text-muted-foreground">
                {search
                  ? "Try a different name or ID."
                  : "Once an app fires its first tracked fetch, it shows up here."}
              </p>
            </div>
          ) : (
            filtered.map((g, i) => (
              <UsageRow
                key={`${tab}-${g.key ?? "null"}-${i}`}
                rank={i + 1}
                group={g}
                totalCost={totals.cost_usd}
                emptyKeyLabel={activeTab.emptyKey}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
