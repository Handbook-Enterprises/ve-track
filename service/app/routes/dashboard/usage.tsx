import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Cpu,
  DollarSign,
  Layers,
  Plug,
  Receipt,
  RefreshCw,
  Sparkles,
  User2,
} from "lucide-react";
import { useUsage } from "~/hooks/useUsage";
import { LoadingElement, ButtonElement } from "~/components/elements";
import StatCard from "~/components/common/stat-card";
import CostTable from "~/components/common/cost-table";
import IdentityCell from "~/components/common/identity-cell";
import DeltaBadge from "~/components/common/delta-badge";
import { cn } from "~/lib/utils";
import { formatMoney, formatNumber } from "~/utils/format";
import type {
  UsageDimension,
  UsageGroup,
  UsageQueryFilters,
} from "~/types/usage.types";

type Range = 7 | 30 | 90;

const TABS: {
  key: UsageDimension;
  marker: string;
  label: string;
  icon: typeof Layers;
  emptyKey: string;
}[] = [
  { key: "app", marker: "01", label: "By App", icon: Layers, emptyKey: "Unattributed" },
  { key: "org", marker: "02", label: "By Organization", icon: Building2, emptyKey: "Personal / no org" },
  { key: "user", marker: "03", label: "By Person", icon: User2, emptyKey: "Anonymous" },
  { key: "provider", marker: "04", label: "By Provider", icon: Plug, emptyKey: "Unknown" },
  { key: "model", marker: "05", label: "By Model", icon: Cpu, emptyKey: "—" },
];

export default function UsagePage() {
  const [range, setRange] = useState<Range>(7);
  const [tab, setTab] = useState<UsageDimension>("app");

  const filters: UsageQueryFilters = useMemo(() => ({ fromDays: range }), [range]);
  const { overview, loading, error, canaryRunning, refetch, runCanary } =
    useUsage(filters);

  const groupsByTab = useMemo(
    () => ({
      app: overview.byApp,
      org: overview.byOrg,
      user: overview.byUser,
      provider: overview.byProvider,
      model: overview.byModel,
    }),
    [overview],
  );
  const activeGroups: UsageGroup[] = groupsByTab[tab];
  const activeTab = TABS.find((t) => t.key === tab)!;
  const totals = overview.totals;
  const top = activeGroups[0];

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LoadingElement size={28} />
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Pulling ledger…
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

  const renderTopCallout = () => {
    if (!top) return null;
    if (tab === "user" || tab === "org") {
      return (
        <section className="border border-primary/30 bg-primary/[0.04] p-5">
          <div className="flex items-end justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
                Top {tab === "user" ? "spender" : "organization"} ·{" "}
                {totals.fromDays}d
              </span>
            </div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {totals.cost_usd > 0
                ? `${Math.round((top.cost_usd / totals.cost_usd) * 100)}% of spend`
                : ""}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <IdentityCell
              name={top.name}
              secondary={top.secondary}
              fallbackId={top.key}
              fallbackLabel={activeTab.emptyKey}
              imageUrl={top.imageUrl ?? null}
              accent
            />
            <p className="font-mono text-[1.6rem] font-medium tabular-nums">
              {formatMoney(top.cost_usd)}
            </p>
          </div>
        </section>
      );
    }
    return (
      <section className="border border-primary/30 bg-primary/[0.04] p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
              Most expensive {tab} · {totals.fromDays}d
            </p>
            <p className="mt-2 text-[1.4rem] font-semibold leading-tight">
              {top.key || activeTab.emptyKey}
            </p>
          </div>
          <p className="font-mono text-[1.6rem] font-medium tabular-nums">
            {formatMoney(top.cost_usd)}
          </p>
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-10 pb-16">
      <header className="border-b border-foreground/15 pb-7">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              ve-track ledger · attribution
            </p>
            <h1 className="mt-3 text-[clamp(2.1rem,4.4vw,3rem)] font-bold leading-[1] tracking-tight">
              Where the spend went.
            </h1>
            <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
              Live aggregates from every event your apps shipped. Switch the
              dimension to see who, where, and how.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex border">
              {([7, 30, 90] as Range[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "px-3 py-1 font-mono text-[11px] tabular-nums transition-colors",
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
              <Sparkles className="h-3 w-3" />
              Canary
            </ButtonElement>
          </div>
        </div>
      </header>

      <section className="grid gap-px bg-border md:grid-cols-3">
        <StatCard
          marker="I"
          title={`Spend · last ${totals.fromDays}d`}
          value={formatMoney(totals.cost_usd)}
          icon={DollarSign}
          delta={totals.delta}
          deltaInverted
          description={
            totals.delta && totals.delta.previousCost > 0
              ? `vs ${formatMoney(totals.delta.previousCost)} prior period`
              : "across every tracked provider"
          }
          accent
        />
        <StatCard
          marker="II"
          title="API calls"
          value={formatNumber(totals.requests)}
          icon={Sparkles}
          description="provider requests captured"
        />
        <StatCard
          marker="III"
          title="Cost / call"
          value={
            totals.requests > 0
              ? formatMoney(totals.cost_usd / totals.requests)
              : "$0.00"
          }
          icon={Receipt}
          description="blended across providers"
        />
      </section>

      {renderTopCallout()}

      <section className="space-y-4">
        <div className="flex items-end justify-between border-b border-dashed border-foreground/15 pb-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            ── /04 · breakdown
          </p>
          {totals.delta ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                vs prev {totals.fromDays}d
              </span>
              <DeltaBadge delta={totals.delta} inverted />
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-5">
          {TABS.map((t) => {
            const groups = groupsByTab[t.key];
            const cost = groups.reduce((sum, g) => sum + g.cost_usd, 0);
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "group relative flex flex-col items-start gap-1 px-4 py-3 text-left transition-colors",
                  active ? "bg-card" : "bg-card/40 hover:bg-muted/40",
                )}
              >
                {active ? (
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
                ) : null}
                <div className="flex w-full items-center justify-between">
                  <span
                    className={cn(
                      "font-mono text-[10px] uppercase tracking-[0.16em]",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    /{t.marker}
                  </span>
                  <Icon className="h-3 w-3 text-muted-foreground" />
                </div>
                <p className="text-[12.5px] font-medium">{t.label}</p>
                <p className="font-mono text-[13.5px] tabular-nums">
                  {formatMoney(cost)}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground tabular-nums">
                  {groups.length} {groups.length === 1 ? "row" : "rows"}
                </p>
              </button>
            );
          })}
        </div>

        <CostTable
          dimension={tab}
          groups={activeGroups}
          totalCost={totals.cost_usd}
          emptyKeyLabel={activeTab.emptyKey}
          searchPlaceholder={`Search ${activeTab.label.replace("By ", "").toLowerCase()}…`}
        />
      </section>
    </div>
  );
}
