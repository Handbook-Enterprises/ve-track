import { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { format, formatDistanceToNowStrict } from "date-fns";
import { Fingerprint, Trash2 } from "lucide-react";
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
import { Badge } from "~/components/ui/badge";
import { DataTable } from "~/components/ui/data-table";
import { LoadingElement, ButtonElement } from "~/components/elements";
import AddAppKeyDialog from "./AddAppKeyDialog";
import UpdateAppKeyDialog from "./UpdateAppKeyDialog";
import { useIdentityKeys } from "~/hooks/useIdentityKeys";
import type { IdentityKeyEntry } from "~/types/identity-key.types";

export default function AppKeysTab() {
  const {
    identityKeys,
    loading,
    error,
    isSubmitting,
    create,
    updateKey,
    remove,
  } = useIdentityKeys();

  const columns = useMemo<ColumnDef<IdentityKeyEntry>[]>(
    () => [
      {
        id: "label",
        accessorKey: "label",
        header: () => <span>App</span>,
        filterFn: (row, _id, value) => {
          const v = String(value ?? "").toLowerCase();
          if (!v) return true;
          return [row.original.label, row.original.account_ref].some((s) =>
            String(s ?? "")
              .toLowerCase()
              .includes(v),
          );
        },
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium">
              {row.original.label}
            </p>
            <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
              {row.original.status}
            </p>
          </div>
        ),
      },
      {
        id: "provider",
        accessorKey: "provider",
        header: () => <span>Provider</span>,
        meta: { headClassName: "w-32", cellClassName: "w-32" },
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono text-[10.5px] uppercase">
            {row.original.provider}
          </Badge>
        ),
      },
      {
        id: "key",
        enableSorting: false,
        header: () => <span>Key</span>,
        meta: { headClassName: "w-44", cellClassName: "w-44" },
        cell: ({ row }) => (
          <span className="font-mono text-[12px] tabular-nums">
            {row.original.account_ref ?? `····${row.original.key_last4}`}
          </span>
        ),
      },
      {
        id: "created_at",
        accessorKey: "created_at",
        header: () => <span>Added</span>,
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
        meta: { align: "right", headClassName: "w-32", cellClassName: "w-32" },
        cell: ({ row }) => {
          const entry = row.original;
          return (
            <div className="flex justify-end gap-1">
              <UpdateAppKeyDialog entry={entry} onSubmit={updateKey} />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <ButtonElement
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </ButtonElement>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Remove the {entry.label} key?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Users and organizations from this app will show as raw
                      IDs again. Usage data is not affected.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => remove(entry.id)}>
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        },
      },
    ],
    [updateKey, remove],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between border-b border-dashed border-foreground/15 pb-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          ── /01 · app keys
        </p>
        <AddAppKeyDialog onSubmit={create} loading={isSubmitting} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingElement size={24} />
        </div>
      ) : error ? (
        <div className="border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : identityKeys.length === 0 ? (
        <EmptyState />
      ) : (
        <DataTable
          columns={columns}
          data={identityKeys}
          initialSorting={[{ id: "created_at", desc: true }]}
          searchColumnId="label"
          searchPlaceholder="Filter by app…"
          emptyMessage="No app keys to show."
          emptyFilteredMessage={(q) => `No app keys match "${q}".`}
        />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border bg-card p-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center border">
        <Fingerprint className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="mt-4 text-sm font-medium">No app keys yet.</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
        Seeing raw IDs instead of names on People or Organizations? That app
        uses its own Clerk instance. Paste its Clerk secret key here and the
        names resolve on the next load. Only apps that use Clerk for auth are
        supported for now.
      </p>
    </div>
  );
}
