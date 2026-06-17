import { useMemo, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useUsage } from "~/hooks/useUsage";
import { LoadingElement, ButtonElement } from "~/components/elements";
import DateRangePicker from "~/components/common/date-range-picker";
import ProviderTable from "~/components/common/provider-table";
import ProviderDetailSheet from "~/components/common/provider-detail-sheet";
import {
  DEFAULT_PRESET_ID,
  buildPreset,
  type DateRange,
  type RangePresetId,
} from "~/utils/date-range";
import type { UsageGroup } from "~/types/usage.types";

export default function UsagePage() {
  const [range, setRange] = useState<DateRange>(() =>
    buildPreset(DEFAULT_PRESET_ID),
  );
  const [activePresetId, setActivePresetId] = useState<RangePresetId | null>(
    DEFAULT_PRESET_ID,
  );

  const { overview, loading, error, refetch, setFilters } = useUsage({
    from: range.from,
    to: range.to,
  });

  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleRangeChange = (
    next: DateRange,
    presetId: RangePresetId | null,
  ) => {
    setRange(next);
    setActivePresetId(presetId);
    setFilters({ from: next.from, to: next.to });
  };

  const handleSelectProvider = (provider: UsageGroup) => {
    setSelectedProvider(provider.key);
    setSheetOpen(true);
  };

  const providers = useMemo(
    () => overview.byProvider.filter((p) => p.key !== "canary"),
    [overview.byProvider],
  );

  if (loading && !overview.totals.requests) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <LoadingElement size={28} />
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

  return (
    <div className="space-y-8 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-foreground/15 pb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Usage
          </p>
          <h1 className="mt-2 text-[clamp(1.9rem,4vw,2.6rem)] font-bold leading-none tracking-tight">
            Usage Logs
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

      <ProviderTable
        providers={providers}
        totalCost={overview.totals.cost_usd}
        onSelect={handleSelectProvider}
      />
      <p className="text-[11px] text-muted-foreground">
        Click a provider to see its spend over time and the breakdown by model, action, app, person, and organization.
      </p>

      <ProviderDetailSheet
        provider={selectedProvider}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initialRange={range}
        initialPresetId={activePresetId}
      />
    </div>
  );
}
