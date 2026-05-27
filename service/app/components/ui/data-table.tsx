import { useState, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: "left" | "right";
    headClassName?: string;
    cellClassName?: string;
  }
}

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  initialSorting?: SortingState;
  searchColumnId?: string;
  searchPlaceholder?: string;
  countNoun?: string;
  showCount?: boolean;
  toolbarEnd?: ReactNode;
  onRowClick?: (row: TData) => void;
  accentFirstRowWhenDesc?: boolean;
  rowClassName?: (row: TData, index: number) => string | undefined;
  emptyMessage?: string;
  emptyFilteredMessage?: (query: string) => string;
  getRowId?: (row: TData, index: number) => string;
  className?: string;
}

export function DataTable<TData>({
  columns,
  data,
  initialSorting = [],
  searchColumnId,
  searchPlaceholder = "Filter…",
  countNoun = "rows",
  showCount = false,
  toolbarEnd,
  onRowClick,
  accentFirstRowWhenDesc = false,
  rowClassName,
  emptyMessage = "No results.",
  emptyFilteredMessage,
  getRowId,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(getRowId ? { getRowId } : {}),
  });

  const rows = table.getRowModel().rows;
  const searchValue = searchColumnId
    ? ((table.getColumn(searchColumnId)?.getFilterValue() as string) ?? "")
    : "";
  const firstSortDesc = sorting[0]?.desc ?? false;
  const showToolbar = !!searchColumnId || showCount || !!toolbarEnd;

  return (
    <div className="space-y-3">
      {showToolbar && (
        <div className="flex items-center justify-between gap-3">
          {searchColumnId ? (
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) =>
                  table.getColumn(searchColumnId)?.setFilterValue(e.target.value)
                }
                placeholder={searchPlaceholder}
                className="h-9 w-full border bg-card pl-8 pr-3 text-[12.5px] placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
              />
            </div>
          ) : (
            <span />
          )}
          {showCount ? (
            <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground tabular-nums">
              {rows.length}/{data.length} {countNoun}
            </p>
          ) : null}
          {toolbarEnd}
        </div>
      )}

      <div className={cn("border bg-card", className)}>
        <Table className="border-collapse">
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow
                key={hg.id}
                className="border-b text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:bg-transparent"
              >
                {hg.headers.map((header) => {
                  const meta = header.column.columnDef.meta;
                  const align = meta?.align ?? "left";
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "h-auto px-4 py-2.5 font-medium text-muted-foreground",
                        align === "right" && "text-right",
                        meta?.headClassName,
                      )}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            "inline-flex w-full items-center gap-1.5 transition-colors hover:text-foreground",
                            align === "right" && "justify-end",
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
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-[12.5px] text-muted-foreground"
                >
                  {searchValue && emptyFilteredMessage
                    ? emptyFilteredMessage(searchValue)
                    : emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, idx) => (
                <TableRow
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(
                    "border-b transition-colors last:border-b-0",
                    onRowClick
                      ? "group cursor-pointer hover:bg-muted/40"
                      : "hover:bg-muted/30",
                    accentFirstRowWhenDesc &&
                      idx === 0 &&
                      firstSortDesc &&
                      "bg-primary/[0.04]",
                    rowClassName?.(row.original, idx),
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta;
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "px-4 py-3 align-middle",
                          meta?.cellClassName,
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
