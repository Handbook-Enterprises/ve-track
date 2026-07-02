import { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "~/components/ui/data-table";
import { cn } from "~/lib/utils";
import { formatMoney, formatNumber } from "~/utils/format";
import type { CreditGroup } from "~/types/credit.types";

interface Props {
  rows: CreditGroup[];
  noun: string;
  nounPlural: string;
  emptyLabel: string;
  onSelect?: (row: CreditGroup) => void;
}

const marginTone = (margin: number): string =>
  margin > 0
    ? "text-[color:var(--color-positive)]"
    : margin < 0
      ? "text-destructive"
      : "text-muted-foreground";

const formatMarginPct = (pct: number | null): string => {
  if (pct == null) return "—";
  return `${pct.toFixed(pct % 1 === 0 ? 0 : 1)}%`;
};

export default function CreditTable({
  rows,
  noun,
  nounPlural,
  emptyLabel,
  onSelect,
}: Props) {
  const columns = useMemo<ColumnDef<CreditGroup>[]>(
    () => [
      {
        id: "name",
        accessorFn: (row) => (row.key ?? emptyLabel).toLowerCase(),
        header: () => (
          <span>{noun.replace(/^./, (c) => c.toUpperCase())}</span>
        ),
        filterFn: (row, _id, value) => {
          const v = String(value ?? "").toLowerCase();
          if (!v) return true;
          return (row.original.key ?? emptyLabel).toLowerCase().includes(v);
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
                {row.original.key || emptyLabel}
              </span>
            </div>
          );
        },
      },
      {
        id: "charges",
        accessorKey: "charges",
        header: () => <span>Charges</span>,
        meta: { align: "right", headClassName: "w-24", cellClassName: "w-24" },
        cell: ({ row }) => (
          <span className="block text-right text-[12.5px] text-muted-foreground tabular-nums">
            {formatNumber(row.original.charges)}
          </span>
        ),
      },
      {
        id: "credits",
        accessorKey: "credits",
        header: () => <span>Credits</span>,
        meta: { align: "right", headClassName: "w-28", cellClassName: "w-28" },
        cell: ({ row }) => (
          <span className="block text-right text-[13px] font-medium tabular-nums">
            {formatNumber(row.original.credits)}
          </span>
        ),
      },
      {
        id: "cost_usd",
        accessorKey: "cost_usd",
        header: () => <span>Provider cost</span>,
        meta: { align: "right", headClassName: "w-28", cellClassName: "w-28" },
        cell: ({ row }) => (
          <span className="block text-right text-[12.5px] text-muted-foreground tabular-nums">
            {formatMoney(row.original.cost_usd)}
          </span>
        ),
      },
      {
        id: "margin_usd",
        accessorKey: "margin_usd",
        header: () => <span>Margin</span>,
        meta: { align: "right", headClassName: "w-32", cellClassName: "w-32" },
        cell: ({ row }) => (
          <span
            className={cn(
              "block text-right text-[13px] font-medium tabular-nums",
              marginTone(row.original.margin_usd),
            )}
          >
            {formatMoney(row.original.margin_usd)}
            <span className="ml-1 text-[10.5px] text-muted-foreground">
              {formatMarginPct(row.original.margin_pct)}
            </span>
          </span>
        ),
      },
      {
        id: "revenue_usd",
        accessorKey: "revenue_usd",
        header: () => <span>Revenue</span>,
        meta: { align: "right", headClassName: "w-28", cellClassName: "w-28" },
        cell: ({ row }) => (
          <span className="block text-right text-[14.5px] font-bold tabular-nums">
            {formatMoney(row.original.revenue_usd)}
          </span>
        ),
      },
    ],
    [noun, emptyLabel],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      initialSorting={[{ id: "revenue_usd", desc: true }]}
      searchColumnId="name"
      searchPlaceholder={`Filter ${nounPlural}…`}
      showCount
      countNoun={nounPlural}
      accentFirstRowWhenDesc
      onRowClick={onSelect}
      getRowId={(row, idx) => `${row.key ?? "null"}-${idx}`}
      emptyMessage={`No credit charges in this window yet.`}
      emptyFilteredMessage={(q) => `No ${nounPlural} match "${q}".`}
    />
  );
}
