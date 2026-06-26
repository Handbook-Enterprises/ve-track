import { Skeleton } from "~/components/ui/skeleton";

export function AccountRowsSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="border border-foreground/15 bg-card">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`flex items-center gap-3 px-4 py-3 pl-6 ${i < rows - 1 ? "border-b border-foreground/10" : ""}`}
        >
          <Skeleton className="h-3.5 w-3.5 shrink-0" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-2 w-28" />
          </div>
          <Skeleton className="h-1.5 w-1.5 shrink-0 rounded-full" />
          <div className="w-24 shrink-0 space-y-1.5">
            <Skeleton className="ml-auto h-3 w-16" />
            <Skeleton className="ml-auto h-2 w-10" />
          </div>
          <Skeleton className="h-7 w-7 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export default function TrackerCardsSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="border border-foreground/15 bg-card">
          <div className="flex items-center gap-4 p-4">
            <Skeleton className="h-10 w-10 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-2.5 w-44" />
            </div>
            <div className="space-y-1.5 text-right">
              <Skeleton className="ml-auto h-3.5 w-20" />
              <Skeleton className="ml-auto h-2 w-14" />
            </div>
            <Skeleton className="h-4 w-4 shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
