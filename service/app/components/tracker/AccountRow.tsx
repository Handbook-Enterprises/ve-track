import { useState } from "react";
import {
  Building2,
  KeyRound,
  MoreVertical,
  RefreshCw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ButtonElement } from "~/components/elements";
import { Badge } from "~/components/ui/badge";
import EditKeyDialog from "./EditKeyDialog";
import { providerLabel } from "~/utils/providers";
import { formatRelativeTime } from "~/utils/format";
import { primaryMetric, formatMetric } from "~/utils/tracker-metric";
import { cn } from "~/lib/utils";
import type { Tracker } from "~/types/tracker.types";

export default function AccountRow({
  account,
  provider,
  isLifetime,
  periodLabel,
  isLast,
  syncing,
  onSync,
  onUpdateKey,
  onDisconnect,
  onOpen,
  orgClash = false,
}: {
  account: Tracker;
  provider: string;
  isLifetime: boolean;
  periodLabel: string;
  isLast: boolean;
  syncing: boolean;
  onSync: (id: string) => void;
  onUpdateKey: (id: string, apiKey: string) => Promise<unknown>;
  onDisconnect: (id: string) => void;
  onOpen?: () => void;
  orgClash?: boolean;
}) {
  const ok = account.status === "active";
  const primary = primaryMetric(account);
  const value = isLifetime ? primary.value : account.window_spend;
  const valueIsMoney = isLifetime ? primary.isMoney : account.is_money;
  const valueLabel = isLifetime ? primary.label : periodLabel;
  const [editOpen, setEditOpen] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const clickable = Boolean(onOpen);
  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (clickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen?.();
        }
      }}
      className={cn(
        "group flex items-center gap-3 px-4 py-3 pl-6 transition-colors",
        clickable && "cursor-pointer hover:bg-[#fd5200]/[0.04]",
        !isLast && "border-b border-foreground/10",
      )}
    >
      <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-mono text-[12px]">
            {account.account_ref ?? `Account ····${account.key_last4}`}
          </p>
          {orgClash ? (
            <Badge
              variant="warning"
              className="h-auto shrink-0 px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wider"
            >
              <TriangleAlert />
              same org
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
          key ····{account.key_last4} ·{" "}
          {account.last_synced_at
            ? `synced ${formatRelativeTime(account.last_synced_at)}`
            : "first pull running…"}
        </p>
        {!ok && account.last_error ? (
          <p className="mt-0.5 max-w-[16rem] truncate text-[10px] text-destructive/80">
            key needs attention · {account.last_error}
          </p>
        ) : null}
      </div>
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          ok ? "bg-emerald-500" : "bg-destructive",
        )}
      />
      <div className="w-24 shrink-0 text-right">
        <p className="font-mono text-[12px] font-semibold tabular-nums">
          {formatMetric(value, valueIsMoney)}
        </p>
        <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">
          {valueLabel}
        </p>
      </div>
      <div
        className="flex shrink-0 items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ButtonElement
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Account actions"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </ButtonElement>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <KeyRound className="h-3.5 w-3.5" />
              Update key
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={syncing}
              onSelect={(e) => {
                e.preventDefault();
                onSync(account.id);
              }}
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", syncing && "animate-spin")}
              />
              {syncing ? "Refreshing…" : "Refresh"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setDisconnectOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <EditKeyDialog
          account={account}
          onSubmit={onUpdateKey}
          open={editOpen}
          onOpenChange={setEditOpen}
        />

        <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect this account?</AlertDialogTitle>
              <AlertDialogDescription>
                We stop pulling new cost from this {providerLabel(provider)}{" "}
                account, delete the stored key, and remove the spend this
                account pulled from your dashboard totals.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDisconnect(account.id)}>
                Disconnect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
