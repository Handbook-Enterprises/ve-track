import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { format, formatDistanceToNowStrict } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  KeyRound,
  Search,
  ShieldOff,
  Trash2,
} from "lucide-react";
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

  const [filter, setFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true },
  ]);

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
          return [row.original.name, row.original.prefix]
            .some((s) => String(s).toLowerCase().includes(v));
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
        cell: ({ row }) => (
          <span className="font-mono text-[12px] tabular-nums">
            {row.original.prefix}…
          </span>
        ),
      },
      {
        id: "created_at",
        accessorKey: "created_at",
        header: () => <span className="block w-full text-right">Created</span>,
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
        header: () => <span className="block w-full text-right">Actions</span>,
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

  const table = useReactTable({
    data: apiKeys,
    columns,
    state: { sorting, columnFilters: filter ? [{ id: "name", value: filter }] : [] },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

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
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="relative max-w-xs flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter by name or prefix…"
                  className="h-9 w-full border bg-card pl-8 pr-3 text-[12.5px] placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="border bg-card">
              <table className="w-full border-collapse">
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr
                      key={hg.id}
                      className="border-b text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                    >
                      {hg.headers.map((header, i) => {
                        const sortDir = header.column.getIsSorted();
                        const canSort = header.column.getCanSort();
                        return (
                          <th
                            key={header.id}
                            className={cn(
                              "px-4 py-2.5 text-left font-medium",
                              i === 0 ? "" : "w-40",
                            )}
                          >
                            {canSort ? (
                              <button
                                type="button"
                                onClick={header.column.getToggleSortingHandler()}
                                className={cn(
                                  "inline-flex w-full items-center gap-1.5 transition-colors hover:text-foreground",
                                  i > 0 && "justify-end",
                                )}
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {sortDir === "asc" ? (
                                  <ArrowUp className="h-3 w-3" />
                                ) : sortDir === "desc" ? (
                                  <ArrowDown className="h-3 w-3" />
                                ) : (
                                  <ArrowUpDown className="h-3 w-3 opacity-40" />
                                )}
                              </button>
                            ) : (
                              flexRender(header.column.columnDef.header, header.getContext())
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="px-4 py-12 text-center text-[12.5px] text-muted-foreground"
                      >
                        No keys match "{filter}".
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className={cn(
                          "border-b transition-colors last:border-b-0 hover:bg-muted/30",
                          !!row.original.revoked_at && "opacity-60",
                        )}
                      >
                        {row.getVisibleCells().map((cell, i) => (
                          <td
                            key={cell.id}
                            className={cn("px-4 py-3 align-middle", i > 0 && "w-40")}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
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
