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
import { ArrowDown, ArrowUp, ArrowUpDown, Search, ArrowRight } from "lucide-react";
import { cn } from "~/lib/utils";
import { formatMoney, formatNumber } from "~/utils/format";
import type { UsageGroup } from "~/types/usage.types";

interface Props {
  actions: UsageGroup[];
  totalCost: number;
  onSelect: (action: UsageGroup) => void;
}

const formatShare = (cost: number, total: number): string => {
  if (total <= 0) return "—";
  const pct = (cost / total) * 100;
  if (pct >= 10) return `${Math.round(pct)}%`;
  if (pct >= 1) return `${pct.toFixed(1)}%`;
  return `<1%`;
};

export default function ActionTable({ actions, totalCost, onSelect }: Props) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "cost_usd", desc: true },
  ]);
  const [filter, setFilter] = useState("");

  const columns = useMemo<ColumnDef<UsageGroup>[]>(
    () => [
      {
        id: "action",
        accessorFn: (row) => (row.key ?? "").toLowerCase(),
        header: () => <span>Action</span>,
        filterFn: (row, _id, value) => {
          const v = String(value ?? "").toLowerCase();
          if (!v) return true;
          return (row.original.key ?? "").toLowerCase().includes(v);
        },
        cell: ({ row, table }) => {
          const isTop = table.getSortedRowModel().rows[0]?.id === row.id;
          return (
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "inline-flex h-6 w-6 shrink-0 items-center justify-center text-[11px] font-semibold tabular-nums",
                  isTop
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {row.index + 1}
              </span>
              <span
                className={cn(
                  "truncate text-[13.5px] font-semibold",
                  !row.original.key && "italic text-muted-foreground",
                )}
              >
                {row.original.key || "untagged"}
              </span>
            </div>
          );
        },
      },
      {
        id: "share",
        accessorFn: (row) => (totalCost > 0 ? row.cost_usd / totalCost : 0),
        header: () => (
          <span className="block w-full text-right">Share</span>
        ),
        cell: ({ row }) => (
          <span className="block text-right text-[12.5px] text-muted-foreground tabular-nums">
            {formatShare(row.original.cost_usd, totalCost)}
          </span>
        ),
      },
      {
        id: "requests",
        accessorKey: "requests",
        header: () => <span className="block w-full text-right">Calls</span>,
        cell: ({ row }) => (
          <span className="block text-right text-[12.5px] text-muted-foreground tabular-nums">
            {formatNumber(row.original.requests)}
          </span>
        ),
      },
      {
        id: "avg",
        accessorFn: (row) =>
          row.requests > 0 ? row.cost_usd / row.requests : 0,
        header: () => <span className="block w-full text-right">Avg/run</span>,
        cell: ({ row }) => {
          const avg =
            row.original.requests > 0
              ? row.original.cost_usd / row.original.requests
              : 0;
          return (
            <span className="block text-right text-[13px] font-medium tabular-nums">
              {formatMoney(avg)}
            </span>
          );
        },
      },
      {
        id: "cost_usd",
        accessorKey: "cost_usd",
        header: () => <span className="block w-full text-right">Spend</span>,
        cell: ({ row }) => (
          <span className="block text-right text-[14.5px] font-bold tabular-nums">
            {formatMoney(row.original.cost_usd)}
          </span>
        ),
      },
      {
        id: "open",
        enableSorting: false,
        header: () => <span className="sr-only">Open</span>,
        cell: () => (
          <span className="flex justify-end">
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
          </span>
        ),
      },
    ],
    [totalCost],
  );

  const table = useReactTable({
    data: actions,
    columns,
    state: {
      sorting,
      columnFilters: filter ? [{ id: "action", value: filter }] : [],
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row, idx) => `${row.key ?? "null"}-${idx}`,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter actions…"
            className="h-9 w-full border bg-card pl-8 pr-3 text-[13px] placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
          />
        </div>
        <p className="text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
          {table.getRowModel().rows.length}/{actions.length} actions
        </p>
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
                        "px-4 py-3 text-left font-semibold",
                        i === 0 ? "" : i === 5 ? "w-10" : "w-24",
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
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {sortDir === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : sortDir === "desc" ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
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
                  {filter
                    ? `No actions match "${filter}".`
                    : "No tracked actions in this window."}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, idx) => (
                <tr
                  key={row.id}
                  onClick={() => onSelect(row.original)}
                  className={cn(
                    "group cursor-pointer border-b transition-colors last:border-b-0 hover:bg-muted/40",
                    idx === 0 && sorting[0]?.desc && "bg-primary/[0.04]",
                  )}
                >
                  {row.getVisibleCells().map((cell, i) => (
                    <td
                      key={cell.id}
                      className={cn(
                        "px-4 py-3.5 align-middle",
                        i > 0 && i !== 5 ? "w-24" : "",
                        i === 5 && "w-10",
                      )}
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
      <p className="text-[11px] text-muted-foreground">
        Click any row to see which apps, people, orgs, and providers ran it.
      </p>
    </div>
  );
}
