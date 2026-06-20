import { useState } from "react";
import { AlertTriangle, PlugZap } from "lucide-react";
import { LoadingElement } from "~/components/elements";
import AddTrackerDialog from "~/components/tracker/AddTrackerDialog";
import ProviderTrackerCard from "~/components/tracker/ProviderTrackerCard";
import TrackerDetailSheet from "~/components/tracker/TrackerDetailSheet";
import { useTrackers } from "~/hooks/useTrackers";
import { DEFAULT_PRESET_ID, buildPreset } from "~/utils/date-range";
import type { Tracker } from "~/types/tracker.types";

export default function TrackersPage() {
  const {
    groups,
    trackers,
    loading,
    error,
    isSubmitting,
    syncingId,
    create,
    updateKey,
    disconnect,
    sync,
  } = useTrackers();

  const [range] = useState(() => buildPreset(DEFAULT_PRESET_ID));
  const [account, setAccount] = useState<Tracker | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const openAccount = (next: Tracker) => {
    setAccount(next);
    setSheetOpen(true);
  };

  const errorCount = trackers.filter((t) => t.status === "error").length;

  return (
    <div className="space-y-10 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-foreground/15 pb-7">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            ve-track · trackers
          </p>
          <h1 className="mt-3 text-[clamp(2.1rem,4.4vw,3rem)] font-bold leading-[1] tracking-tight">
            Trackers.
          </h1>
          <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
            Every provider you track, in one place. Integrate the SDK into an app,
            or connect a provider account directly. Connect as many keys as you
            use, costs from the same provider combine into one total.
          </p>
        </div>
        <AddTrackerDialog onSubmit={create} loading={isSubmitting} />
      </header>

      <section className="space-y-4">
        <div className="flex items-end justify-between border-b border-dashed border-foreground/15 pb-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            ── /01 · providers
          </p>
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground tabular-nums">
            {groups.length} {groups.length === 1 ? "provider" : "providers"} ·{" "}
            {trackers.length} {trackers.length === 1 ? "account" : "accounts"}
            {errorCount > 0 ? ` · ${errorCount} attention` : ""}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingElement size={24} />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 border border-destructive/30 bg-destructive/5 p-6 text-center">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : groups.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {groups.map((g) => (
              <ProviderTrackerCard
                key={g.provider}
                group={g}
                syncingId={syncingId}
                onSync={sync}
                onUpdateKey={updateKey}
                onDisconnect={disconnect}
                onOpenAccount={openAccount}
              />
            ))}
          </div>
        )}
      </section>

      <TrackerDetailSheet
        account={account}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initialRange={range}
        initialPresetId={DEFAULT_PRESET_ID}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border bg-card p-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center border">
        <PlugZap className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="mt-4 text-sm font-medium">No trackers yet.</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
        Add a tracker to start. Integrate the SDK into an app, or connect an
        OpenAI or Anthropic admin key and we backfill the last 30 days of real
        cost.
      </p>
    </div>
  );
}
