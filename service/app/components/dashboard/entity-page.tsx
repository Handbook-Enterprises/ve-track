import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useUsage } from "~/hooks/useUsage";
import { useActionAdmin } from "~/hooks/useActionAdmin";
import { ButtonElement } from "~/components/elements";
import DateRangePicker from "~/components/common/date-range-picker";
import EntityTable from "~/components/common/entity-table";
import EntityTableSkeleton from "~/components/common/entity-table-skeleton";
import NullSegmentStrip from "~/components/common/null-segment-strip";
import EntityDetailSheet from "~/components/common/entity-detail-sheet";
import ActionRowMenu from "~/components/action/ActionRowMenu";
import RenameActionDialog from "~/components/action/RenameActionDialog";
import MergeActionDialog from "~/components/action/MergeActionDialog";
import {
  ENTITIES,
  type EntityConfig,
  type EntityId,
} from "~/utils/entity-dimensions";
import {
  DEFAULT_PRESET_ID,
  buildPreset,
  isLifetimePreset,
  type DateRange,
  type RangePresetId,
} from "~/utils/date-range";
import type { UsageGroup } from "~/types/usage.types";

interface Props {
  config: EntityConfig;
}

export default function EntityPage({ config }: Props) {
  const [range, setRange] = useState<DateRange>(() =>
    buildPreset(DEFAULT_PRESET_ID),
  );
  const [activePresetId, setActivePresetId] = useState<RangePresetId | null>(
    DEFAULT_PRESET_ID,
  );

  const { overview, loading, error, refetch, setFilters } = useUsage({
    from: range.from,
    to: range.to,
    lifetime: isLifetimePreset(DEFAULT_PRESET_ID),
  });

  const [selected, setSelected] = useState<{
    id: EntityId;
    group: UsageGroup;
  } | null>(null);
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

  const openEntity = (id: EntityId, group: UsageGroup) => {
    setSelected({ id, group });
    setSheetOpen(true);
  };

  const { rows, nullGroup } = useMemo(() => {
    const groups = config.pick(overview).filter((g) => g.key !== "canary");
    if (!config.nullSegment) return { rows: groups, nullGroup: null };
    const nullRow = groups.find(
      (g) => g.key == null && (g.cost_usd > 0 || g.requests > 0),
    );
    return {
      rows: groups.filter((g) => g.key != null),
      nullGroup: nullRow ?? null,
    };
  }, [config, overview]);

  const [renameTarget, setRenameTarget] = useState<UsageGroup | null>(null);
  const [mergeSource, setMergeSource] = useState<UsageGroup | null>(null);
  const { rename, merge } = useActionAdmin(refetch);

  const actionCandidates = useMemo(
    () =>
      overview.byAction.filter((g) => g.key != null && g.key !== "canary"),
    [overview],
  );

  const handleRename = useCallback(
    async (slug: string, name: string) => {
      const ok = await rename(slug, name);
      if (ok) {
        setSelected((s) =>
          s && s.group.key === slug
            ? { ...s, group: { ...s.group, name } }
            : s,
        );
      }
      return ok;
    },
    [rename],
  );

  const handleMerge = useCallback(
    async (from: string, into: string) => {
      const ok = await merge(from, into);
      if (ok) {
        setSheetOpen((wasOpen) => {
          if (wasOpen && selected?.group.key === from) return false;
          return wasOpen;
        });
      }
      return ok;
    },
    [merge, selected],
  );

  const selectedConfig = selected ? ENTITIES[selected.id] : config;
  const nounLabel = config.noun.replace(/^./, (c) => c.toUpperCase());

  return (
    <div className="space-y-8 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-foreground/15 pb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Usage
          </p>
          <h1 className="mt-2 text-[clamp(1.9rem,4vw,2.6rem)] font-bold leading-none tracking-tight">
            {config.navLabel}
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
        <EntityTableSkeleton nounLabel={nounLabel} />
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
        <EntityTable
          config={config}
          rows={rows}
          totalCost={overview.totals.cost_usd}
          onSelect={(group) => openEntity(config.id, group)}
          rowActions={
            config.id === "action"
              ? (group) => (
                  <ActionRowMenu
                    group={group}
                    onRename={setRenameTarget}
                    onMerge={setMergeSource}
                  />
                )
              : undefined
          }
        />
      )}
      {!loading && !error && nullGroup && config.nullSegment ? (
        <NullSegmentStrip
          title={config.nullSegment.title}
          description={config.nullSegment.description}
          group={nullGroup}
          onSelect={(group) => openEntity(config.id, group)}
        />
      ) : null}
      {!loading && !error ? (
        <p className="text-[11px] text-muted-foreground">
          Click a {config.noun} to see its spend over time and how it relates to
          every other entity. Then click any row inside to jump straight to that
          entity.
        </p>
      ) : null}

      <EntityDetailSheet
        config={selectedConfig}
        entity={selected?.group ?? null}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initialRange={range}
        initialPresetId={activePresetId}
        onDrill={openEntity}
        onRenameAction={setRenameTarget}
        onMergeAction={setMergeSource}
      />

      <RenameActionDialog
        open={renameTarget != null}
        onOpenChange={(next) => {
          if (!next) setRenameTarget(null);
        }}
        action={renameTarget}
        onSubmit={handleRename}
      />
      <MergeActionDialog
        open={mergeSource != null}
        onOpenChange={(next) => {
          if (!next) setMergeSource(null);
        }}
        source={mergeSource}
        candidates={actionCandidates}
        onSubmit={handleMerge}
      />
    </div>
  );
}
