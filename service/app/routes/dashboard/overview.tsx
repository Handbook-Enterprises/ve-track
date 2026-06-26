import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, Layers, Wallet } from "lucide-react";
import { useUsage } from "~/hooks/useUsage";
import { useTenantContext } from "~/context/TenantContext";
import { useAuthContext } from "~/context/AuthContext";
import { useOnboarding } from "~/context/OnboardingContext";
import StatCard from "~/components/common/stat-card";
import DateRangePicker from "~/components/common/date-range-picker";
import SpendAreaChart from "~/components/common/spend-area-chart";
import ProviderRanking from "~/components/common/provider-ranking";
import QuickActions from "~/components/common/quick-actions";
import { LoadingElement } from "~/components/elements";
import { formatMoney } from "~/utils/format";
import {
  buildPreset,
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
    lifetime: INITIAL_PRESET_ID === "lifetime",
  });

  const handleRangeChange = (next: DateRange, presetId: RangePresetId | null) => {
    setRange(next);
    setActivePresetId(presetId);
    setFilters({
      from: next.from,
      to: next.to,
      lifetime: presetId === "lifetime",
    });
  };

  const providers = useMemo(
    () => overview.byProvider.filter((p) => p.key !== "canary"),
    [overview.byProvider],
  );
  const topProvider = providers[0] ?? null;
  const totalCost = overview.totals.cost_usd;
  const subjectName = organizationName || tenant?.name || "your tenant";

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingElement size={28} />
      </div>
    );
  }

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

      <div className="grid gap-px bg-border sm:grid-cols-3">
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
          title="Providers"
          value={providers.length}
          icon={Layers}
          description="active providers"
        />
        <StatCard
          marker="03"
          title="Most expensive"
          value={topProvider?.key ? topProvider.key : "None"}
          icon={Crown}
          description={
            topProvider ? `${formatMoney(topProvider.cost_usd)} spent` : "no spend yet"
          }
          className="[&_p.font-mono]:capitalize"
        />
      </div>

      <QuickActions />

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
    </div>
  );
}
