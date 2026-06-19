import { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, PlugZap, RefreshCw, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { DataTable } from "~/components/ui/data-table";
import { LoadingElement, ButtonElement } from "~/components/elements";
import TrackerForm from "~/components/cost-tracker/TrackerForm";
import { useCostTrackers } from "~/hooks/useCostTrackers";
import { providerLabel } from "~/utils/providers";
import { formatMoney, formatRelativeTime } from "~/utils/format";
import { cn } from "~/lib/utils";
import type { CostTracker } from "~/types/cost-tracker.types";

export default function TrackersPage() {
  const {
    trackers,
    loading,
    error,
    isSubmitting,
    syncingId,
    create,
    disconnect,
    sync,
  } = useCostTrackers();

  const activeCount = trackers.filter((t) => t.status === "active").length;
  const errorCount = trackers.filter((t) => t.status === "error").length;

  const columns = useMemo<ColumnDef<CostTracker>[]>(
    () => [
      {
        id: "label",
        accessorKey: "label",
        header: () => <span>Tracker</span>,
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">{t.label}</p>
              <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
                {providerLabel(t.provider)} · ····{t.key_last4}
              </p>
            </div>
          );
        },
      },
      {
        id: "app",
        accessorKey: "app",
        header: () => <span>App</span>,
        meta: { headClassName: "w-40", cellClassName: "w-40" },
        cell: ({ row }) => (
          <span className="font-mono text-[12px]">{row.original.app}</span>
        ),
      },
      {
        id: "pulled_cost_usd",
        accessorKey: "pulled_cost_usd",
        header: () => <span>Cost pulled</span>,
        meta: { align: "right", headClassName: "w-32", cellClassName: "w-32" },
        cell: ({ row }) => (
          <span className="font-mono text-[12px] tabular-nums">
            {formatMoney(row.original.pulled_cost_usd)}
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: () => <span>Status</span>,
        meta: { headClassName: "w-44", cellClassName: "w-44" },
        cell: ({ row }) => {
          const t = row.original;
          const ok = t.status === "active";
          return (
            <div className="leading-tight">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider",
                  ok ? "text-emerald-600" : "text-destructive",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    ok ? "bg-emerald-500" : "bg-destructive",
                  )}
                />
                {ok ? "Connected" : "Needs attention"}
              </span>
              <p className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">
                {t.last_synced_at
                  ? `synced ${formatRelativeTime(t.last_synced_at)}`
                  : "first pull running…"}
              </p>
              {!ok && t.last_error ? (
                <p className="mt-0.5 max-w-[12rem] truncate text-[10.5px] text-destructive/80">
                  {t.last_error}
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => <span>Actions</span>,
        meta: { align: "right", headClassName: "w-28", cellClassName: "w-28" },
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div className="flex justify-end gap-1">
              <ButtonElement
                variant="ghost"
                size="icon"
                loading={syncingId === t.id}
                onClick={() => sync(t.id)}
                className="text-muted-foreground hover:text-foreground"
                title="Refresh now"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </ButtonElement>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <ButtonElement
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    title="Disconnect"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </ButtonElement>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect this tracker?</AlertDialogTitle>
                    <AlertDialogDescription>
                      We stop pulling new cost from{" "}
                      <span className="font-medium">{t.label}</span> and delete the
                      stored key. The spend already pulled stays on your
                      dashboard.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => disconnect(t.id)}>
                      Disconnect
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        },
      },
    ],
    [disconnect, sync, syncingId],
  );

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
            Using a provider API directly, outside the SDK? Connect the account
            once and we pull the real billed cost for you. No code change.
          </p>
        </div>
        <TrackerForm onSubmit={create} loading={isSubmitting} />
      </header>

      <section className="space-y-4">
        <div className="flex items-end justify-between border-b border-dashed border-foreground/15 pb-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            ── /01 · connected accounts
          </p>
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground tabular-nums">
            {activeCount} connected · {errorCount} attention
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
        ) : trackers.length === 0 ? (
          <EmptyState />
        ) : (
          <DataTable
            columns={columns}
            data={trackers}
            initialSorting={[{ id: "pulled_cost_usd", desc: true }]}
            searchColumnId="label"
            searchPlaceholder="Filter by tracker name…"
            emptyMessage="No trackers yet."
            emptyFilteredMessage={(q) => `No trackers match "${q}".`}
          />
        )}
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border bg-card p-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center border">
        <PlugZap className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="mt-4 text-sm font-medium">No trackers connected.</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
        Connect an OpenAI or Anthropic admin key and we backfill the last 30
        days of real cost, then keep it fresh every day.
      </p>
    </div>
  );
}
