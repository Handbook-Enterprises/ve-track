import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Coins,
  HandCoins,
  Receipt,
  RefreshCw,
  Scale,
} from "lucide-react";
import { useCredits } from "~/hooks/useCredits";
import { ButtonElement } from "~/components/elements";
import StatCard from "~/components/common/stat-card";
import DateRangePicker from "~/components/common/date-range-picker";
import SectionCard from "~/components/common/section-card";
import RevenueCostChart from "~/components/common/revenue-cost-chart";
import ProfitabilityTable from "~/components/common/profitability-table";
import UnitEconomics from "~/components/common/unit-economics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Skeleton } from "~/components/ui/skeleton";
import { ChartSkeleton } from "~/components/common/entity-detail-skeleton";
import { formatMoney, formatNumber } from "~/utils/format";
import {
  DEFAULT_PRESET_ID,
  buildPreset,
  isLifetimePreset,
  rangeSpanDays,
  type DateRange,
  type RangePresetId,
} from "~/utils/date-range";
import type { CreditsOverview, ProfitabilityGroup } from "~/types/credits.types";

const CANARY_KEYS = new Set(["canary", "ve-track-canary", "canary-user"]);

const DIMENSION_TABS: {
  id: string;
  label: string;
  noun: string;
  nounPlural: string;
  variant: "plain" | "identity";
  fallbackLabel?: string;
  pick: (c: CreditsOverview) => ProfitabilityGroup[];
}[] = [
  {
    id: "app",
    label: "Apps",
    noun: "app",
    nounPlural: "apps",
    variant: "plain",
    pick: (c) => c.byApp,
  },
  {
    id: "action",
    label: "Actions",
    noun: "action",
    nounPlural: "actions",
    variant: "plain",
    pick: (c) => c.byAction,
  },
  {
    id: "user",
    label: "People",
    noun: "person",
    nounPlural: "people",
    variant: "identity",
    fallbackLabel: "Unknown user",
    pick: (c) => c.byUser,
  },
  {
    id: "org",
    label: "Organizations",
    noun: "organization",
    nounPlural: "organizations",
    variant: "identity",
    fallbackLabel: "Unknown org",
    pick: (c) => c.byOrg,
  },
  {
    id: "provider",
    label: "Providers",
    noun: "provider",
    nounPlural: "providers",
    variant: "plain",
    pick: (c) => c.byProvider,
  },
  {
    id: "model",
    label: "Models",
    noun: "model",
    nounPlural: "models",
    variant: "plain",
    pick: (c) => c.byModel,
  },
];

const CreditsSkeleton = () => (
  <>
    <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card p-5">
          <Skeleton className="h-2.5 w-6" />
          <Skeleton className="mt-3 h-2.5 w-20" />
          <Skeleton className="mt-3 h-6 w-28" />
        </div>
      ))}
    </div>
    <SectionCard title="Revenue vs cost" caption="Loading">
      <div className="p-5">
        <ChartSkeleton />
      </div>
    </SectionCard>
    <SectionCard title="Unit economics" caption="Loading">
      <div className="grid gap-px bg-border sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card p-5">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="mt-3 h-7 w-24" />
            <Skeleton className="mt-3 h-2.5 w-32" />
          </div>
        ))}
      </div>
    </SectionCard>
  </>
);

function EmptyCredits() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 border bg-card px-6 py-16 text-center">
      <span className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary">
        <Coins className="h-[18px] w-[18px]" />
      </span>
      <p className="text-[14px] font-semibold tracking-tight">
        No credit events yet
      </p>
      <p className="max-w-md text-[12.5px] leading-relaxed text-muted-foreground">
        Report credit deductions from your apps with trackCredits in the SDK, or
        pass creditsCharged on trackUsage. Once events land here you will see
        revenue, margins, and the numbers to price your credits.
      </p>
    </div>
  );
}

export default function CreditsPage() {
  const [range, setRange] = useState<DateRange>(() =>
    buildPreset(DEFAULT_PRESET_ID),
  );
  const [activePresetId, setActivePresetId] = useState<RangePresetId | null>(
    DEFAULT_PRESET_ID,
  );

  const { credits, loading, error, refetch, setFilters } = useCredits({
    from: range.from,
    to: range.to,
    lifetime: isLifetimePreset(DEFAULT_PRESET_ID),
  });

  const handleRangeChange = (
    next: DateRange,
    presetId: RangePresetId | null,
  ) => {
    setRange(next);
    setActivePresetId(presetId);
    setFilters({
      from: next.from,
      to: next.to,
      lifetime: isLifetimePreset(presetId),
    });
  };

  const totals = credits.totals;
  const hasCreditActivity =
    totals.credits_charged > 0 || totals.revenue_usd > 0;
  const marginClassName = !hasCreditActivity
    ? undefined
    : totals.margin_usd < 0
      ? "[&_p.font-mono]:text-destructive"
      : "[&_p.font-mono]:text-[color:var(--color-positive)]";

  const tabRows = useMemo(
    () =>
      new Map(
        DIMENSION_TABS.map((tab) => [
          tab.id,
          tab.pick(credits).filter((g) => !CANARY_KEYS.has(g.key ?? "")),
        ]),
      ),
    [credits],
  );

  return (
    <div className="space-y-8 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-foreground/15 pb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Billing
          </p>
          <h1 className="mt-2 text-[clamp(1.9rem,4vw,2.6rem)] font-bold leading-none tracking-tight">
            Credits
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker
            value={range}
            activePresetId={activePresetId}
            onChange={handleRangeChange}
          />
          <ButtonElement
            variant="outline"
            size="sm"
            onClick={refetch}
            className="h-9 gap-2 text-xs"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </ButtonElement>
        </div>
      </header>

      {loading ? (
        <CreditsSkeleton />
      ) : error ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
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
      ) : (
        <>
          <div>
            <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                accent
                title="Revenue"
                value={formatMoney(totals.revenue_usd)}
                icon={HandCoins}
                description={range.label}
                delta={totals.deltas?.revenue}
              />
              <StatCard
                title="Provider cost"
                value={formatMoney(totals.cost_usd)}
                icon={Receipt}
                description={range.label}
                delta={totals.deltas?.cost}
                deltaInverted
              />
              <StatCard
                title="Margin"
                value={formatMoney(totals.margin_usd)}
                icon={Scale}
                description={
                  totals.margin_pct != null
                    ? `${totals.margin_pct.toFixed(1)}% of revenue`
                    : "no revenue yet"
                }
                className={marginClassName}
              />
              <StatCard
                title="Credits charged"
                value={
                  totals.credits_charged > 0
                    ? formatNumber(totals.credits_charged)
                    : "None"
                }
                icon={Coins}
                description={
                  totals.credits_charged > 0
                    ? range.label
                    : "no credits tracked yet"
                }
                delta={totals.deltas?.credits}
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Headline cost blends connected tracker billing. Breakdown tables
              show SDK event cost only.
            </p>
          </div>

          <SectionCard title="Revenue vs cost" caption={range.label}>
            <div className="p-5">
              <RevenueCostChart
                data={credits.series}
                from={range.from}
                to={range.to}
              />
            </div>
          </SectionCard>

          {hasCreditActivity ? (
            <>
              <UnitEconomics
                creditPriceUsd={credits.creditPriceUsd}
                totals={totals}
                byUser={tabRows.get("user") ?? []}
                windowDays={rangeSpanDays(range.from, range.to)}
              />

              <SectionCard title="Breakdown" caption={range.label}>
                <div className="p-5">
                  <Tabs defaultValue="app">
                    <TabsList className="mb-4">
                      {DIMENSION_TABS.map((tab) => (
                        <TabsTrigger key={tab.id} value={tab.id}>
                          {tab.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {DIMENSION_TABS.map((tab) => (
                      <TabsContent key={tab.id} value={tab.id}>
                        <ProfitabilityTable
                          rows={tabRows.get(tab.id) ?? []}
                          noun={tab.noun}
                          nounPlural={tab.nounPlural}
                          variant={tab.variant}
                          fallbackLabel={tab.fallbackLabel}
                          totalRevenue={totals.revenue_usd}
                        />
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>
              </SectionCard>
            </>
          ) : (
            <EmptyCredits />
          )}
        </>
      )}
    </div>
  );
}
