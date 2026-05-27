import { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "~/components/ui/data-table";
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
  action: { keyLabel: "Action", subjectLabel: "action" },
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
            <span className="text-[10px] text-muted-foreground tabular-nums">
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
      header: () => <span>Spend</span>,
      meta: { align: "right", headClassName: "w-32", cellClassName: "w-32" },
      cell: ({ row }) => (
        <span className="block text-right text-[14px] font-medium tabular-nums">
          {formatMoney(row.original.cost_usd)}
        </span>
      ),
    };
    const shareCol: ColumnDef<Row> = {
      id: "share",
      accessorFn: (row) => (totalCost > 0 ? row.cost_usd / totalCost : 0),
      header: () => <span>Share</span>,
      meta: { align: "right", headClassName: "w-32", cellClassName: "w-32" },
      cell: ({ row }) => (
        <span className="block text-right text-[12px] text-muted-foreground tabular-nums">
          {formatShare(row.original.cost_usd, totalCost)}
        </span>
      ),
    };
    const reqCol: ColumnDef<Row> = {
      id: "requests",
      accessorKey: "requests",
      header: () => <span>Calls</span>,
      meta: { align: "right", headClassName: "w-32", cellClassName: "w-32" },
      cell: ({ row }) => (
        <span className="block text-right text-[12px] text-muted-foreground tabular-nums">
          {formatNumber(row.original.requests)}
        </span>
      ),
    };
    const avgCol: ColumnDef<Row> = {
      id: "avg",
      accessorFn: (row) => (row.requests > 0 ? row.cost_usd / row.requests : 0),
      header: () => <span>Avg/call</span>,
      meta: { align: "right", headClassName: "w-32", cellClassName: "w-32" },
      cell: ({ row }) => {
        const r = row.original;
        const avg = r.requests > 0 ? r.cost_usd / r.requests : 0;
        return (
          <span className="block text-right text-[12px] text-muted-foreground tabular-nums">
            {formatMoney(avg)}
          </span>
        );
      },
    };
    return [subjectCol, costCol, shareCol, reqCol, avgCol];
  }, [dimension, totalCost, meta.keyLabel, emptyKeyLabel]);

  return (
    <DataTable
      columns={columns}
      data={groups}
      initialSorting={[{ id: "cost_usd", desc: true }]}
      searchColumnId="subject"
      searchPlaceholder={searchPlaceholder ?? `Filter ${meta.subjectLabel}…`}
      showCount
      countNoun="rows"
      accentFirstRowWhenDesc
      getRowId={(row, index) => `${row.key ?? "null"}-${index}`}
      emptyMessage="No spend recorded in this window yet."
      emptyFilteredMessage={(q) => `No ${meta.subjectLabel}s match "${q}".`}
    />
  );
}
