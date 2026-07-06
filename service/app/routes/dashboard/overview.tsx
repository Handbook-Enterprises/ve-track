import { useEffect, useMemo, useRef, useState } from "react";
import { Coins, Crown, Layers, Wallet } from "lucide-react";
import { useUsage } from "~/hooks/useUsage";
import { useTenantContext } from "~/context/TenantContext";
import { useAuthContext } from "~/context/AuthContext";
import { useOnboarding } from "~/context/OnboardingContext";
import StatCard from "~/components/common/stat-card";
import DateRangePicker from "~/components/common/date-range-picker";
import SpendAreaChart from "~/components/common/spend-area-chart";
import ProviderRanking from "~/components/common/provider-ranking";
import GettingStartedChecklist from "~/components/common/getting-started-checklist";
import { Skeleton } from "~/components/ui/skeleton";
import { ChartSkeleton } from "~/components/common/entity-detail-skeleton";
import { formatMoney, formatNumber } from "~/utils/format";
import {
  buildPreset,
  isLifetimePreset,
  type DateRange,
  type RangePresetId,
} from "~/utils/date-range";

const INITIAL_PRESET_ID: RangePresetId = "last_28";

const SectionCard = ({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: React.ReactNode;
}) => (
  <section className="border bg-card">
    <header className="flex items-end justify-between border-b px-5 py-4">
      <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {caption}
      </p>
    </header>
    {children}
  </section>
);

const OverviewSkeleton = () => (
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
    <SectionCard title="Overview" caption="Loading">
      <div className="p-5">
        <ChartSkeleton />
      </div>
    </SectionCard>
    <SectionCard title="Top 5 providers" caption="Loading">
      <div className="divide-y px-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3.5">
            <Skeleton className="h-3 w-3 shrink-0" />
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="ml-auto h-1.5 w-20" />
            <Skeleton className="h-3.5 w-14" />
          </div>
        ))}
      </div>
    </SectionCard>
  </>
);

export default function OverviewPage() {
  const { tenant } = useTenantContext();
  const { organizationName } = useAuthContext();
  const { hasSeen, openOnboarding } = useOnboarding();

  const promptedRef = useRef(false);
  useEffect(() => {
    if (!hasSeen && !promptedRef.current) {
      promptedRef.current = true;
      openOnboarding();
    }
  }, [hasSeen, openOnboarding]);

  const [range, setRange] = useState<DateRange>(() =>
    buildPreset(INITIAL_PRESET_ID),
  );
  const [activePresetId, setActivePresetId] = useState<RangePresetId | null>(
    INITIAL_PRESET_ID,
  );

  const { overview, loading, setFilters } = useUsage({
    from: range.from,
    to: range.to,
    lifetime: isLifetimePreset(INITIAL_PRESET_ID),
  });

  const handleRangeChange = (next: DateRange, presetId: RangePresetId | null) => {
    setRange(next);
    setActivePresetId(presetId);
    setFilters({
      from: next.from,
      to: next.to,
      lifetime: isLifetimePreset(presetId),
    });
  };

  const providers = useMemo(
    () => overview.byProvider.filter((p) => p.key !== "canary"),
    [overview.byProvider],
  );
  const topProvider = providers[0] ?? null;
  const totalCost = overview.totals.cost_usd;
  const hasSpend = totalCost > 0 || overview.totals.requests > 0;
  const subjectName = organizationName || tenant?.name || "your tenant";

  return (
    <div className="space-y-8 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-foreground/15 pb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {subjectName}
          </p>
          <h1 className="mt-2 text-[clamp(1.9rem,4vw,2.6rem)] font-bold leading-none tracking-tight">
            Overview
          </h1>
        </div>
        <DateRangePicker
          value={range}
          activePresetId={activePresetId}
          onChange={handleRangeChange}
        />
      </header>

      {loading ? (
        <OverviewSkeleton />
      ) : (
        <>
      <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          accent
          marker="01"
          title="Total spend"
          value={formatMoney(totalCost)}
          icon={Wallet}
          description={range.label}
          delta={overview.totals.delta}
          deltaInverted
        />
        <StatCard
          marker="02"
          title="Credits used"
          value={
            overview.totals.credits > 0
              ? formatNumber(overview.totals.credits)
              : "None"
          }
          icon={Coins}
          description={
            overview.totals.credits > 0 ? range.label : "no credits tracked yet"
          }
        />
        <StatCard
          marker="03"
          title="Providers"
          value={providers.length}
          icon={Layers}
          description="active providers"
        />
        <StatCard
          marker="04"
          title="Most expensive"
          value={topProvider?.key ? topProvider.key : "None"}
          icon={Crown}
          description={
            topProvider ? `${formatMoney(topProvider.cost_usd)} spent` : "no spend yet"
          }
          className="[&_p.font-mono]:capitalize"
        />
      </div>

      <GettingStartedChecklist hasSpend={hasSpend} />

      <SectionCard title="Overview" caption={range.label}>
        <div className="p-5">
          <SpendAreaChart data={overview.series} from={range.from} to={range.to} />
        </div>
      </SectionCard>

      <SectionCard
        title="Top 5 providers"
        caption={`${providers.length} total`}
      >
        <ProviderRanking providers={providers} totalCost={totalCost} />
      </SectionCard>
        </>
      )}
    </div>
  );
}
