import { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { format, formatDistanceToNowStrict } from "date-fns";
import { KeyRound, ShieldOff, Trash2 } from "lucide-react";
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
import ApiKeyForm from "~/components/api-key/ApiKeyForm";
import ApiKeyRevealDialog from "~/components/api-key/ApiKeyRevealDialog";
import { useApiKeys } from "~/hooks/useApiKeys";
import { cn } from "~/lib/utils";
import type { ApiKey } from "~/types/api-key.types";

export default function KeysPage() {
  const {
    apiKeys,
    loading,
    error,
    isSubmitting,
    revealedKey,
    setRevealedKey,
    create,
    revoke,
  } = useApiKeys();

  const liveCount = apiKeys.filter((k) => !k.revoked_at).length;
  const revokedCount = apiKeys.filter((k) => k.revoked_at).length;

  const columns = useMemo<ColumnDef<ApiKey>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: () => <span>Name</span>,
        filterFn: (row, _id, value) => {
          const v = String(value ?? "").toLowerCase();
          if (!v) return true;
          return [row.original.name, row.original.prefix].some((s) =>
            String(s).toLowerCase().includes(v),
          );
        },
        cell: ({ row }) => {
          const revoked = !!row.original.revoked_at;
          return (
            <div className="min-w-0">
              <p
                className={cn(
                  "truncate text-[13px] font-medium",
                  revoked && "text-muted-foreground line-through",
                )}
              >
                {row.original.name}
              </p>
              <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
                {revoked ? "revoked" : "live"}
              </p>
            </div>
          );
        },
      },
      {
        id: "prefix",
        accessorKey: "prefix",
        header: () => <span>Prefix</span>,
        meta: { headClassName: "w-40", cellClassName: "w-40" },
        cell: ({ row }) => (
          <span className="font-mono text-[12px] tabular-nums">
            {row.original.prefix}…
          </span>
        ),
      },
      {
        id: "created_at",
        accessorKey: "created_at",
        header: () => <span>Created</span>,
        meta: { align: "right", headClassName: "w-40", cellClassName: "w-40" },
        cell: ({ row }) => {
          const d = new Date(row.original.created_at);
          return (
            <div className="text-right leading-tight">
              <p className="font-mono text-[12px] tabular-nums">
                {format(d, "MMM d, yyyy")}
              </p>
              <p className="font-mono text-[10.5px] text-muted-foreground tabular-nums">
                {formatDistanceToNowStrict(d, { addSuffix: true })}
              </p>
            </div>
          );
        },
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => <span>Actions</span>,
        meta: { align: "right", headClassName: "w-40", cellClassName: "w-40" },
        cell: ({ row }) => {
          const apiKey = row.original;
          const revoked = !!apiKey.revoked_at;
          return (
            <div className="flex justify-end">
              {revoked ? (
                <ShieldOff className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <ButtonElement
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </ButtonElement>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revoke this key?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Apps using <span className="font-mono">{apiKey.prefix}…</span>{" "}
                        will stop ingesting events immediately. This can't be
                        undone — issue a new key first if you're rotating.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => revoke(apiKey.id)}>
                        Revoke
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          );
        },
      },
    ],
    [revoke],
  );

  return (
    <div className="space-y-10 pb-16">
      <header className="border-b border-foreground/15 pb-7">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          ve-track · API keys
        </p>
        <h1 className="mt-3 text-[clamp(2.1rem,4.4vw,3rem)] font-bold leading-[1] tracking-tight">
          Keys.
        </h1>
        <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
          One key per app. Each key is scoped to this tenant and can't read
          another tenant's data.
        </p>
      </header>

      <section className="border bg-card p-6">
        <ApiKeyForm onSubmit={create} loading={isSubmitting} />
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between border-b border-dashed border-foreground/15 pb-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            ── /01 · keys
          </p>
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground tabular-nums">
            {liveCount} live · {revokedCount} revoked
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingElement size={24} />
          </div>
        ) : error ? (
          <div className="border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : apiKeys.length === 0 ? (
          <EmptyState />
        ) : (
          <DataTable
            columns={columns}
            data={apiKeys}
            initialSorting={[{ id: "created_at", desc: true }]}
            searchColumnId="name"
            searchPlaceholder="Filter by name or prefix…"
            rowClassName={(row) => (row.revoked_at ? "opacity-60" : undefined)}
            emptyMessage="No keys to show."
            emptyFilteredMessage={(q) => `No keys match "${q}".`}
          />
        )}
      </section>

      <ApiKeyRevealDialog
        apiKey={revealedKey}
        onClose={() => setRevealedKey(null)}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border bg-card p-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center border">
        <KeyRound className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="mt-4 text-sm font-medium">No keys yet.</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
        Create your first key above. Drop it in your app's env as VE_TRACK_KEY,
        wrap your worker handler, and you're tracking.
      </p>
    </div>
  );
}
