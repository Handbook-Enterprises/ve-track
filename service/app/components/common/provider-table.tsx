import { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "~/components/ui/data-table";
import { cn } from "~/lib/utils";
import { formatMoney, formatNumber } from "~/utils/format";
import type { UsageGroup } from "~/types/usage.types";

interface Props {
  providers: UsageGroup[];
  totalCost: number;
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Gemini",
  perplexity: "Perplexity",
  openrouter: "OpenRouter",
  cloro: "Cloro",
  fal: "Fal",
  zyte: "Zyte",
  dataforseo: "DataForSEO",
  apify: "Apify",
  firecrawl: "Firecrawl",
  brightdata: "BrightData",
};

const labelFor = (key: string | null): string => {
  if (!key) return "Unknown";
  return PROVIDER_LABELS[key.toLowerCase()] ?? key.charAt(0).toUpperCase() + key.slice(1);
};

const formatShare = (cost: number, total: number): string => {
  if (total <= 0) return "—";
  const pct = (cost / total) * 100;
  if (pct >= 10) return `${Math.round(pct)}%`;
  if (pct >= 1) return `${pct.toFixed(1)}%`;
  return "<1%";
};

export default function ProviderTable({ providers, totalCost }: Props) {
  const columns = useMemo<ColumnDef<UsageGroup>[]>(
    () => [
      {
        id: "provider",
        accessorFn: (row) => labelFor(row.key).toLowerCase(),
        header: () => <span>Provider</span>,
        filterFn: (row, _id, value) => {
          const v = String(value ?? "").toLowerCase();
          if (!v) return true;
          return labelFor(row.original.key).toLowerCase().includes(v);
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
              <span className="truncate text-[13.5px] font-semibold">
                {labelFor(row.original.key)}
              </span>
            </div>
          );
        },
      },
      {
        id: "share",
        accessorFn: (row) => (totalCost > 0 ? row.cost_usd / totalCost : 0),
        header: () => <span>Share</span>,
        meta: { align: "right", headClassName: "w-40", cellClassName: "w-40" },
        cell: ({ row }) => {
          const pct = totalCost > 0 ? (row.original.cost_usd / totalCost) * 100 : 0;
          return (
            <div className="flex items-center justify-end gap-2.5">
              <div className="h-1 w-16 overflow-hidden bg-muted">
                <div
                  className="h-full bg-primary/70"
                  style={{ width: `${Math.max(pct, 1.5)}%` }}
                />
              </div>
              <span className="w-10 text-right text-[12.5px] text-muted-foreground tabular-nums">
                {formatShare(row.original.cost_usd, totalCost)}
              </span>
            </div>
          );
        },
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
        id: "tokens",
        accessorFn: (row) => (row.prompt_tokens ?? 0) + (row.completion_tokens ?? 0),
        header: () => <span>Tokens</span>,
        meta: { align: "right", headClassName: "w-28", cellClassName: "w-28" },
        cell: ({ row }) => {
          const total = (row.original.prompt_tokens ?? 0) + (row.original.completion_tokens ?? 0);
          return (
            <span className="block text-right text-[12.5px] text-muted-foreground tabular-nums">
              {total > 0 ? formatNumber(total) : "—"}
            </span>
          );
        },
      },
      {
        id: "avg",
        accessorFn: (row) => (row.requests > 0 ? row.cost_usd / row.requests : 0),
        header: () => <span>Avg/call</span>,
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
        meta: { align: "right", headClassName: "w-28", cellClassName: "w-28" },
        cell: ({ row }) => (
          <span className="block text-right text-[14.5px] font-bold tabular-nums">
            {formatMoney(row.original.cost_usd)}
          </span>
        ),
      },
    ],
    [totalCost],
  );

  return (
    <DataTable
      columns={columns}
      data={providers}
      initialSorting={[{ id: "cost_usd", desc: true }]}
      searchColumnId="provider"
      searchPlaceholder="Filter providers…"
      showCount
      countNoun="providers"
      accentFirstRowWhenDesc
      getRowId={(row, idx) => `${row.key ?? "null"}-${idx}`}
      emptyMessage="No provider spend in this window yet."
      emptyFilteredMessage={(q) => `No providers match "${q}".`}
    />
  );
}
