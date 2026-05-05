import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { cn } from "~/lib/utils";
import { formatMoney, formatNumber } from "~/utils/format";
import IdentityCell from "./identity-cell";
import type { UsageDimension, UsageGroup } from "~/types/usage.types";

type Row = UsageGroup;

interface Props {
  dimension: UsageDimension;
  groups: UsageGroup[];
  totalCost: number;
  emptyKeyLabel: string;
  searchPlaceholder?: string;
}

const dimensionMeta: Record<
  UsageDimension,
  { keyLabel: string; subjectLabel: string }
> = {
  app: { keyLabel: "App", subjectLabel: "app" },
  org: { keyLabel: "Organization", subjectLabel: "organization" },
  user: { keyLabel: "Person", subjectLabel: "person" },
  provider: { keyLabel: "Provider", subjectLabel: "provider" },
  model: { keyLabel: "Model", subjectLabel: "model" },
};

const formatShare = (cost: number, total: number): string => {
  if (total <= 0) return "—";
  const pct = (cost / total) * 100;
  if (pct >= 10) return `${Math.round(pct)}%`;
  if (pct >= 1) return `${pct.toFixed(1)}%`;
  return `<1%`;
};

export default function CostTable({
  dimension,
  groups,
  totalCost,
  emptyKeyLabel,
  searchPlaceholder,
}: Props) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "cost_usd", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const meta = dimensionMeta[dimension];

  const columns = useMemo<ColumnDef<Row>[]>(() => {
    const subjectCol: ColumnDef<Row> = {
      id: "subject",
      accessorFn: (row) => (row.name || row.key || "").toLowerCase(),
      header: () => <span>{meta.keyLabel}</span>,
      filterFn: (row, _id, filterValue) => {
        const v = String(filterValue ?? "").toLowerCase();
        if (!v) return true;
        const r = row.original;
        return [r.name, r.key, r.secondary]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(v));
      },
      cell: ({ row, table }) => {
        const r = row.original;
        const isTopRow = table.getSortedRowModel().rows[0]?.id === row.id;
        if (dimension === "user" || dimension === "org") {
          return (
            <IdentityCell
              name={r.name}
              secondary={r.secondary}
              fallbackId={r.key}
              fallbackLabel={emptyKeyLabel}
              imageUrl={r.imageUrl ?? null}
              accent={isTopRow}
            />
          );
        }
        return (
          <div className="flex items-center gap-2">
            <span className=" text-[10px] text-muted-foreground tabular-nums">
              {String(row.index + 1).padStart(2, "0")}
            </span>
            <span
              className={cn(
                "truncate text-[13px] font-medium",
                !r.key && "italic text-muted-foreground",
              )}
            >
              {r.key || emptyKeyLabel}
            </span>
          </div>
        );
      },
    };
    const costCol: ColumnDef<Row> = {
      id: "cost_usd",
      accessorKey: "cost_usd",
      header: () => <span className="block w-full text-right">Spend</span>,
      cell: ({ row }) => (
        <span className="block text-right  text-[14px] font-medium tabular-nums">
          {formatMoney(row.original.cost_usd)}
        </span>
      ),
    };
    const shareCol: ColumnDef<Row> = {
      id: "share",
      accessorFn: (row) => (totalCost > 0 ? row.cost_usd / totalCost : 0),
      header: () => <span className="block w-full text-right">Share</span>,
      cell: ({ row }) => (
        <span className="block text-right  text-[12px] text-muted-foreground tabular-nums">
          {formatShare(row.original.cost_usd, totalCost)}
        </span>
      ),
    };
    const reqCol: ColumnDef<Row> = {
      id: "requests",
      accessorKey: "requests",
      header: () => <span className="block w-full text-right">Calls</span>,
      cell: ({ row }) => (
        <span className="block text-right  text-[12px] text-muted-foreground tabular-nums">
          {formatNumber(row.original.requests)}
        </span>
      ),
    };
    const avgCol: ColumnDef<Row> = {
      id: "avg",
      accessorFn: (row) => (row.requests > 0 ? row.cost_usd / row.requests : 0),
      header: () => <span className="block w-full text-right">Avg/call</span>,
      cell: ({ row }) => {
        const r = row.original;
        const avg = r.requests > 0 ? r.cost_usd / r.requests : 0;
        return (
          <span className="block text-right  text-[12px] text-muted-foreground tabular-nums">
            {formatMoney(avg)}
          </span>
        );
      },
    };
    return [subjectCol, costCol, shareCol, reqCol, avgCol];
  }, [dimension, totalCost, meta.keyLabel, emptyKeyLabel]);

  const table = useReactTable({
    data: groups,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row, index) => `${row.key ?? "null"}-${index}`,
  });

  const subjectFilter = columnFilters.find((f) => f.id === "subject")?.value as
    | string
    | undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={subjectFilter ?? ""}
            onChange={(e) =>
              table.getColumn("subject")?.setFilterValue(e.target.value)
            }
            placeholder={searchPlaceholder ?? `Filter ${meta.subjectLabel}…`}
            className="h-9 w-full border bg-card pl-8 pr-3 text-[12.5px] placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
          />
        </div>
        <p className=" text-[10.5px] uppercase tracking-wider text-muted-foreground">
          {table.getRowModel().rows.length}/{groups.length} rows
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
                      scope="col"
                      className={cn(
                        "px-4 py-2.5 text-left font-medium",
                        i === 0 ? "w-auto" : "w-32",
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
                  {subjectFilter
                    ? `No ${meta.subjectLabel}s match "${subjectFilter}".`
                    : "No spend recorded in this window yet."}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b transition-colors last:border-b-0 hover:bg-muted/30",
                    idx === 0 &&
                      sorting.find((s) => s.id === "cost_usd")?.desc &&
                      "bg-primary/[0.035]",
                  )}
                >
                  {row.getVisibleCells().map((cell, i) => (
                    <td
                      key={cell.id}
                      className={cn("px-4 py-3 align-middle", i > 0 && "w-32")}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
