import { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowRight } from "lucide-react";
import { DataTable } from "~/components/ui/data-table";
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
        header: () => <span>Share</span>,
        meta: { align: "right", headClassName: "w-24", cellClassName: "w-24" },
        cell: ({ row }) => (
          <span className="block text-right text-[12.5px] text-muted-foreground tabular-nums">
            {formatShare(row.original.cost_usd, totalCost)}
          </span>
        ),
      },
      {
        id: "requests",
        accessorKey: "requests",
        header: () => <span>Calls</span>,
        meta: { align: "right", headClassName: "w-24", cellClassName: "w-24" },
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
        header: () => <span>Avg/run</span>,
        meta: { align: "right", headClassName: "w-24", cellClassName: "w-24" },
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
        header: () => <span>Spend</span>,
        meta: { align: "right", headClassName: "w-24", cellClassName: "w-24" },
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
        meta: { align: "right", headClassName: "w-10", cellClassName: "w-10" },
        cell: () => (
          <span className="flex justify-end">
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
          </span>
        ),
      },
    ],
    [totalCost],
  );

  return (
    <div className="space-y-3">
      <DataTable
        columns={columns}
        data={actions}
        initialSorting={[{ id: "cost_usd", desc: true }]}
        searchColumnId="action"
        searchPlaceholder="Filter actions…"
        showCount
        countNoun="actions"
        onRowClick={onSelect}
        accentFirstRowWhenDesc
        getRowId={(row, idx) => `${row.key ?? "null"}-${idx}`}
        emptyMessage="No tracked actions in this window."
        emptyFilteredMessage={(q) => `No actions match "${q}".`}
      />
      <p className="text-[11px] text-muted-foreground">
        Click any row to see which apps, people, orgs, and providers ran it.
      </p>
    </div>
  );
}
