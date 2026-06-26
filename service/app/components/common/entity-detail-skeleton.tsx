import { Skeleton } from "~/components/ui/skeleton";

const BAR_HEIGHTS = [
  "h-10",
  "h-16",
  "h-12",
  "h-24",
  "h-20",
  "h-32",
  "h-28",
  "h-20",
  "h-36",
  "h-24",
  "h-16",
  "h-28",
];
const LIST_WIDTHS = ["w-40", "w-28", "w-36", "w-24", "w-44", "w-32"];

export function ChartSkeleton() {
  return (
    <div className="flex h-[18rem] w-full items-end gap-1.5 overflow-hidden border border-border bg-muted/20 px-4 pb-0 pt-4">
      {BAR_HEIGHTS.map((h, i) => (
        <Skeleton key={i} className={`flex-1 ${h}`} />
      ))}
    </div>
  );
}

export function DetailStatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-px bg-border">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-card p-3">
          <Skeleton className="h-2.5 w-14" />
          <Skeleton className="mt-2 h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export default function EntityDetailSkeleton({
  tabs = 5,
  rows = 6,
}: {
  tabs?: number;
  rows?: number;
}) {
  return (
    <div className="space-y-6 px-4 pt-5 pb-6">
      <section>
        <Skeleton className="mb-2.5 h-2.5 w-36" />
        <ChartSkeleton />
      </section>

      <div className="flex w-full gap-1 border bg-card p-1">
        {Array.from({ length: tabs }).map((_, i) => (
          <Skeleton key={i} className="h-7 flex-1" />
        ))}
      </div>

      <ul className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 py-3">
            <Skeleton className="h-3 w-3 shrink-0" />
            <div className="min-w-0 flex-1">
              <Skeleton className={`h-3.5 ${LIST_WIDTHS[i % LIST_WIDTHS.length]}`} />
            </div>
            <Skeleton className="h-1.5 w-16" />
            <Skeleton className="h-3.5 w-14" />
          </li>
        ))}
      </ul>
    </div>
  );
}
