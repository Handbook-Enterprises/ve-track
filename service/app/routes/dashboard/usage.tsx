import { useCallback, useState } from "react";
import {
  AlertTriangle,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { useUsage } from "~/hooks/useUsage";
import { LoadingElement, ButtonElement } from "~/components/elements";
import StatCard from "~/components/common/stat-card";
import NarrativeSummary from "~/components/common/narrative-summary";
import ActionTable from "~/components/common/action-table";
import ActionDetailSheet from "~/components/common/action-detail-sheet";
import { cn } from "~/lib/utils";
import { formatMoney, formatNumber } from "~/utils/format";
import type { UsageGroup, UsageQueryFilters } from "~/types/usage.types";

type Range = 7 | 30 | 90;

const FILTER_LABELS: Partial<Record<keyof UsageQueryFilters, string>> = {
  app: "app",
  provider: "provider",
  clerk_org_id: "org",
  clerk_user_id: "user",
  action: "action",
};

export default function UsagePage() {
  const {
    overview,
    loading,
    error,
    canaryRunning,
    refetch,
    runCanary,
    filters,
    setFilters,
  } = useUsage({ fromDays: 7 });

  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const range = (filters.fromDays ?? 7) as Range;

  const setRange = useCallback(
    (r: Range) => {
      setFilters((prev) => ({ ...prev, fromDays: r }));
    },
    [setFilters],
  );

  const removeFilter = useCallback(
    (key: keyof UsageQueryFilters) => {
      setFilters((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [setFilters],
  );

  const clearFilters = useCallback(() => {
    setFilters((prev) => ({ fromDays: prev.fromDays ?? 7 }));
  }, [setFilters]);

  const handleSelectAction = useCallback((action: UsageGroup) => {
    setSelectedAction(action.key);
    setSheetOpen(true);
  }, []);

  const activeFilterEntries = (
    Object.entries(filters) as [keyof UsageQueryFilters, unknown][]
  ).filter(
    ([key, value]) =>
      key !== "fromDays" &&
      key in FILTER_LABELS &&
      value !== undefined &&
      value !== "",
  );

  if (loading && !overview.totals.requests) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LoadingElement size={28} />
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
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

  const totals = overview.totals;
  const costPerCall = totals.requests > 0 ? totals.cost_usd / totals.requests : 0;

  return (
    <div className="space-y-10 pb-16">
      <header className="border-b border-foreground/15 pb-7">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              ve-track · usage
            </p>
            <h1 className="mt-3 text-[clamp(2.4rem,4.8vw,3.2rem)] font-extrabold leading-[1.05] tracking-tight">
              Where the spend went.
            </h1>
            <p className="mt-2 text-[13.5px] text-muted-foreground">
              Click any action below to see which apps, people, orgs, and
              providers ran it.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex border">
              {([7, 30, 90] as Range[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "px-3 py-1 text-[11px] font-semibold tabular-nums transition-colors",
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

      <NarrativeSummary overview={overview} />

      {activeFilterEntries.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Filtering:
          </span>
          {activeFilterEntries.map(([key, value]) => (
            <button
              key={key}
              type="button"
              onClick={() => removeFilter(key)}
              className="group inline-flex items-center gap-1.5 border bg-card px-2.5 py-1 text-[11.5px] font-medium transition-colors hover:border-destructive/40 hover:text-destructive"
            >
              <span className="text-muted-foreground group-hover:text-destructive">
                {FILTER_LABELS[key]}:
              </span>
              <span className="tabular-nums">
                {String(value).length > 28
                  ? `${String(value).slice(0, 12)}…${String(value).slice(-6)}`
                  : String(value)}
              </span>
              <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearFilters}
            className="ml-1 text-[11px] uppercase tracking-wider text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            clear all
          </button>
        </div>
      ) : null}

      <section className="grid gap-px bg-border md:grid-cols-3">
        <StatCard
          marker="I"
          title={`Spend · last ${totals.fromDays}d`}
          value={formatMoney(totals.cost_usd)}
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
          description="provider requests captured"
        />
        <StatCard
          marker="III"
          title="Cost / call"
          value={formatMoney(costPerCall)}
          description="blended across providers"
        />
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between border-b border-dashed border-foreground/15 pb-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              ── /01 · Action ledger
            </p>
            <h2 className="mt-1 text-[18px] font-bold tracking-tight">
              Every action, what it costs, who ran it
            </h2>
          </div>
          <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
            click a row for the full story
          </p>
        </div>
        <ActionTable
          actions={overview.byAction}
          totalCost={totals.cost_usd}
          onSelect={handleSelectAction}
        />
      </section>

      <ActionDetailSheet
        action={selectedAction}
        fromDays={range}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
