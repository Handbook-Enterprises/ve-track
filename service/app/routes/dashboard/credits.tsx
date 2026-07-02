import { useMemo, useState } from "react";
import { AlertTriangle, Coins, DollarSign, RefreshCw, TrendingUp, Wallet } from "lucide-react";
import { useCredits } from "~/hooks/useCredits";
import { ButtonElement } from "~/components/elements";
import DateRangePicker from "~/components/common/date-range-picker";
import StatCard from "~/components/common/stat-card";
import CreditTable from "~/components/common/credit-table";
import CreditDetailSheet from "~/components/common/credit-detail-sheet";
import EntityTableSkeleton from "~/components/common/entity-table-skeleton";
import { cn } from "~/lib/utils";
import { formatMoney, formatNumber } from "~/utils/format";
import {
  DEFAULT_PRESET_ID,
  buildPreset,
  isLifetimePreset,
  type DateRange,
  type RangePresetId,
} from "~/utils/date-range";
import type { CreditDimension, CreditGroup } from "~/types/credit.types";

type TableDimension = "app" | "action" | "org";

const DIMENSION_META: Record<
  TableDimension,
  { label: string; noun: string; nounPlural: string; emptyLabel: string }
> = {
  app: { label: "Apps", noun: "app", nounPlural: "apps", emptyLabel: "Unattributed" },
  action: { label: "Actions", noun: "action", nounPlural: "actions", emptyLabel: "Untagged" },
  org: {
    label: "Organizations",
    noun: "organization",
    nounPlural: "organizations",
    emptyLabel: "Personal / no org",
  },
};

const DIMENSION_ORDER: TableDimension[] = ["app", "action", "org"];

export default function CreditsPage() {
  const [range, setRange] = useState<DateRange>(() =>
    buildPreset(DEFAULT_PRESET_ID),
  );
  const [activePresetId, setActivePresetId] = useState<RangePresetId | null>(
    DEFAULT_PRESET_ID,
  );
  const [dimension, setDimension] = useState<TableDimension>("app");

  const { summary, loading, error, refetch, setFilters } = useCredits({
    from: range.from,
    to: range.to,
    lifetime: isLifetimePreset(DEFAULT_PRESET_ID),
  });

  const [selected, setSelected] = useState<CreditGroup | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

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

  const rows = useMemo(() => {
    const source =
      dimension === "app"
        ? summary.byApp
        : dimension === "action"
          ? summary.byAction
          : summary.byOrg;
    return source.filter((g) => g.key !== "canary");
  }, [dimension, summary]);

  const totals = summary.totals;
  const revenueDelta = totals.delta
    ? {
        previousCost: totals.delta.previousRevenue,
        pctChange: totals.delta.pctChange,
        direction: totals.delta.direction,
      }
    : undefined;
  const meta = DIMENSION_META[dimension];

  const openEntity = (group: CreditGroup) => {
    setSelected(group);
    setSheetOpen(true);
  };

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

      <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
        <StatCard
          title="Revenue"
          value={formatMoney(totals.revenue_usd)}
          icon={DollarSign}
          accent
          delta={revenueDelta}
          description="credits charged × price"
        />
        <StatCard
          title="Credits charged"
          value={formatNumber(totals.credits)}
          icon={Coins}
          description={`${formatNumber(totals.charges)} charges`}
        />
        <StatCard
          title="Provider cost"
          value={formatMoney(totals.cost_usd)}
          icon={Wallet}
        />
        <StatCard
          title="Margin"
          value={formatMoney(totals.margin_usd)}
          icon={TrendingUp}
          description={
            totals.margin_pct != null
              ? `${totals.margin_pct.toFixed(totals.margin_pct % 1 === 0 ? 0 : 1)}% margin`
              : undefined
          }
        />
      </div>

      <div className="flex items-center gap-1.5">
        {DIMENSION_ORDER.map((id) => (
          <ButtonElement
            key={id}
            variant={dimension === id ? "default" : "outline"}
            size="sm"
            onClick={() => setDimension(id)}
            className={cn("h-8 text-xs", dimension === id && "pointer-events-none")}
          >
            {DIMENSION_META[id].label}
          </ButtonElement>
        ))}
      </div>

      {loading ? (
        <EntityTableSkeleton nounLabel={meta.noun.replace(/^./, (c) => c.toUpperCase())} />
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
        <CreditTable
          rows={rows}
          noun={meta.noun}
          nounPlural={meta.nounPlural}
          emptyLabel={meta.emptyLabel}
          onSelect={openEntity}
        />
      )}

      {!loading && !error ? (
        <p className="text-[11px] text-muted-foreground">
          Click a {meta.noun} to see its revenue over time and the breakdown of
          credits charged.
        </p>
      ) : null}

      <CreditDetailSheet
        dimension={dimension as CreditDimension}
        entity={selected}
        emptyLabel={meta.emptyLabel}
        nounSingular={meta.noun}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initialRange={range}
        initialPresetId={activePresetId}
      />
    </div>
  );
}
