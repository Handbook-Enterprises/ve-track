import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

const HEAD = [
  { label: "", className: "" },
  { label: "Share", className: "w-40 text-right" },
  { label: "Calls", className: "w-24 text-right" },
  { label: "Tokens", className: "w-28 text-right" },
  { label: "Avg/call", className: "w-24 text-right" },
  { label: "Spend", className: "w-28 text-right" },
];

const NAME_WIDTHS = ["w-40", "w-28", "w-36", "w-24", "w-44", "w-32", "w-28", "w-36"];

export default function EntityTableSkeleton({
  rows = 8,
  nounLabel = "Name",
}: {
  rows?: number;
  nounLabel?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-full max-w-xs rounded-none" />
        <Skeleton className="h-3 w-24 rounded-none" />
      </div>

      <div className="border bg-card">
        <Table className="border-collapse">
          <TableHeader>
            <TableRow className="border-b text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:bg-transparent">
              {HEAD.map((h, i) => (
                <TableHead
                  key={i}
                  className={cn(
                    "h-auto px-4 py-2.5 font-medium text-muted-foreground",
                    h.className,
                  )}
                >
                  {i === 0 ? nounLabel : h.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }).map((_, idx) => (
              <TableRow
                key={idx}
                className="border-b last:border-b-0 hover:bg-transparent"
              >
                <TableCell className="px-4 py-3 align-middle">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="h-6 w-6 shrink-0 rounded-none" />
                    <Skeleton
                      className={cn(
                        "h-3.5 rounded-none",
                        NAME_WIDTHS[idx % NAME_WIDTHS.length],
                      )}
                    />
                  </div>
                </TableCell>
                <TableCell className="w-40 px-4 py-3 align-middle">
                  <div className="flex items-center justify-end gap-2.5">
                    <Skeleton className="h-1.5 w-16 rounded-none" />
                    <Skeleton className="h-3 w-8 rounded-none" />
                  </div>
                </TableCell>
                <TableCell className="w-24 px-4 py-3 align-middle">
                  <Skeleton className="ml-auto h-3 w-10 rounded-none" />
                </TableCell>
                <TableCell className="w-28 px-4 py-3 align-middle">
                  <Skeleton className="ml-auto h-3 w-12 rounded-none" />
                </TableCell>
                <TableCell className="w-24 px-4 py-3 align-middle">
                  <Skeleton className="ml-auto h-3 w-10 rounded-none" />
                </TableCell>
                <TableCell className="w-28 px-4 py-3 align-middle">
                  <Skeleton className="ml-auto h-3.5 w-14 rounded-none" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
