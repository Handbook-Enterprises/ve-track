import { useMemo } from "react";
import { Link } from "react-router";
import { Plug } from "lucide-react";
import { useTrackers } from "~/hooks/useTrackers";
import AccountRow from "./AccountRow";
import { AccountRowsSkeleton } from "./tracker-skeletons";
import { providerLabel } from "~/utils/providers";
import { isLifetimePreset } from "~/utils/date-range";
import type { DateRange, RangePresetId } from "~/utils/date-range";

interface Props {
  providerKey: string;
  range: DateRange;
  presetId: RangePresetId | null;
}

export default function ProviderTrackersTab({
  providerKey,
  range,
  presetId,
}: Props) {
  const isLifetime = isLifetimePreset(presetId);
  const period = useMemo(
    () => ({ range, presetId, isLifetime }),
    [range, presetId, isLifetime],
  );
  const { groups, loading, syncingId, sync, updateKey, disconnect } =
    useTrackers(period);

  const accounts = useMemo(() => {
    const key = providerKey.toLowerCase();
    return (
      groups.find((g) => g.provider.toLowerCase() === key)?.accounts ?? []
    );
  }, [groups, providerKey]);

  if (loading && accounts.length === 0) {
    return <AccountRowsSkeleton rows={2} />;
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 border border-dashed border-foreground/15 px-6 py-12 text-center">
        <Plug className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-[13px] font-semibold">No connected accounts</p>
          <p className="mt-1 max-w-[18rem] text-[11.5px] text-muted-foreground">
            Connect a {providerLabel(providerKey)} API key to track its spend
            alongside this usage.
          </p>
        </div>
        <Link
          to="/dashboard/trackers"
          className="border border-foreground/20 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors hover:bg-[#fd5200]/[0.06]"
        >
          Connect account
        </Link>
      </div>
    );
  }

  return (
    <div className="border border-foreground/15 bg-card">
      {accounts.map((a, i) => (
        <AccountRow
          key={a.id}
          account={a}
          provider={providerKey}
          isLifetime={isLifetime}
          periodLabel={range.label}
          isLast={i === accounts.length - 1}
          syncing={syncingId === a.id}
          onSync={sync}
          onUpdateKey={updateKey}
          onDisconnect={disconnect}
        />
      ))}
    </div>
  );
}
