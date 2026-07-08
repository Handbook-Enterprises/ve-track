import { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "~/components/ui/data-table";
import IdentityCell from "./identity-cell";
import { cn } from "~/lib/utils";
import { formatMoney, formatNumber, formatShare } from "~/utils/format";
import type { ProfitabilityGroup } from "~/types/credits.types";

interface Props {
  rows: ProfitabilityGroup[];
  noun: string;
  nounPlural: string;
  totalRevenue: number;
  variant?: "plain" | "identity";
  fallbackLabel?: string;
}

const rowLabel = (row: ProfitabilityGroup): string =>
  row.name ?? row.key ?? "Unattributed";

export default function ProfitabilityTable({
  rows,
  noun,
  nounPlural,
  totalRevenue,
  variant = "plain",
  fallbackLabel,
}: Props) {
  const columns = useMemo<ColumnDef<ProfitabilityGroup>[]>(
    () => [
      {
        id: "name",
        accessorFn: (row) => rowLabel(row).toLowerCase(),
        header: () => <span>{noun.replace(/^./, (c) => c.toUpperCase())}</span>,
        filterFn: (row, _id, value) => {
          const v = String(value ?? "").toLowerCase();
          if (!v) return true;
          return rowLabel(row.original).toLowerCase().includes(v);
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
              {variant === "identity" ? (
                <IdentityCell
                  name={row.original.name}
                  secondary={row.original.secondary}
                  fallbackId={row.original.key}
                  fallbackLabel={fallbackLabel ?? "Unknown"}
                  imageUrl={row.original.imageUrl ?? null}
                  accent={isTop}
                />
              ) : (
                <span className="truncate text-[13.5px] font-semibold">
                  {rowLabel(row.original)}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "share",
        accessorFn: (row) =>
          totalRevenue > 0 ? row.revenue_usd / totalRevenue : 0,
        header: () => <span>Share</span>,
        meta: { align: "right", headClassName: "w-36", cellClassName: "w-36" },
        cell: ({ row }) => {
          const pct =
            totalRevenue > 0 ? (row.original.revenue_usd / totalRevenue) * 100 : 0;
          return (
            <div className="flex items-center justify-end gap-2.5">
              <div className="h-1 w-16 overflow-hidden bg-muted">
                <div
                  className="h-full bg-primary/70"
                  style={{ width: `${Math.max(pct, 1.5)}%` }}
                />
              </div>
              <span className="w-10 text-right text-[12.5px] text-muted-foreground tabular-nums">
                {formatShare(row.original.revenue_usd, totalRevenue)}
              </span>
            </div>
          );
        },
      },
      {
        id: "credits",
        accessorFn: (row) => row.credits_charged ?? 0,
        header: () => <span>Credits</span>,
        meta: { align: "right", headClassName: "w-24", cellClassName: "w-24" },
        cell: ({ row }) => {
          const credits = row.original.credits_charged ?? 0;
          return (
            <span className="block text-right text-[12.5px] text-muted-foreground tabular-nums">
              {credits > 0 ? formatNumber(credits) : "—"}
            </span>
          );
        },
      },
      {
        id: "revenue_usd",
        accessorKey: "revenue_usd",
        header: () => <span>Revenue</span>,
        meta: { align: "right", headClassName: "w-28", cellClassName: "w-28" },
        cell: ({ row }) => (
          <span className="block text-right text-[13px] font-medium tabular-nums">
            {formatMoney(row.original.revenue_usd)}
          </span>
        ),
      },
      {
        id: "cost_usd",
        accessorKey: "cost_usd",
        header: () => <span>Cost</span>,
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
        meta: { align: "right", headClassName: "w-28", cellClassName: "w-28" },
        cell: ({ row }) => (
          <span
            className={cn(
              "block text-right text-[14px] font-bold tabular-nums",
              row.original.margin_usd < 0
                ? "text-destructive"
                : "text-[color:var(--color-positive)]",
            )}
          >
            {formatMoney(row.original.margin_usd)}
          </span>
        ),
      },
      {
        id: "margin_pct",
        accessorFn: (row) => row.margin_pct ?? Number.NEGATIVE_INFINITY,
        header: () => <span>Margin %</span>,
        meta: { align: "right", headClassName: "w-24", cellClassName: "w-24" },
        cell: ({ row }) => {
          const pct = row.original.margin_pct;
          return (
            <span className="block text-right text-[12.5px] text-muted-foreground tabular-nums">
              {pct == null ? "—" : `${pct.toFixed(1)}%`}
            </span>
          );
        },
      },
    ],
    [noun, variant, fallbackLabel, totalRevenue],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      initialSorting={[{ id: "margin_usd", desc: true }]}
      searchColumnId="name"
      searchPlaceholder={`Filter ${nounPlural}…`}
      showCount
      countNoun={nounPlural}
      accentFirstRowWhenDesc
      getRowId={(row, idx) => `${row.key ?? "null"}-${idx}`}
      emptyMessage={`No ${noun} credit activity in this window yet.`}
      emptyFilteredMessage={(q) => `No ${nounPlural} match "${q}".`}
    />
  );
}
