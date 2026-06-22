import { useState } from "react";
import {
  Building2,
  ChevronDown,
  KeyRound,
  MoreVertical,
  RefreshCw,
  Trash2,
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
import EditKeyDialog from "./EditKeyDialog";
import { providerLabel } from "~/utils/providers";
import { formatRelativeTime } from "~/utils/format";
import { primaryMetric, formatMetric } from "~/utils/tracker-metric";
import { cn } from "~/lib/utils";
import type { ProviderGroup, Tracker } from "~/types/tracker.types";

interface Props {
  group: ProviderGroup;
  syncingId: string | null;
  onSync: (id: string) => void;
  onUpdateKey: (id: string, apiKey: string) => Promise<unknown>;
  onDisconnect: (id: string) => void;
  onOpenAccount: (account: Tracker) => void;
}

export default function ProviderTrackerCard({
  group,
  syncingId,
  onSync,
  onUpdateKey,
  onDisconnect,
  onOpenAccount,
}: Props) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((v) => !v);

  return (
    <div className="border border-foreground/15 bg-card">
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        className="flex cursor-pointer select-none items-center gap-4 p-4 transition-colors hover:bg-[#fd5200]/[0.04]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-foreground/15 font-mono text-[13px] font-semibold uppercase">
          {providerLabel(group.provider).slice(0, 2)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-semibold">
              {providerLabel(group.provider)}
            </p>
            <span className="border border-foreground/20 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">
              {group.accounts.length}{" "}
              {group.accounts.length === 1 ? "account" : "accounts"}
            </span>
            {group.hasError ? (
              <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
            ) : null}
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {open ? "Click an account for its cost summary" : "Tap to view accounts"}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[14px] font-semibold tabular-nums">
            {group.metricValue}
          </p>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
            {group.metricLabel}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </div>

      {open ? (
        <div className="border-t border-foreground/10">
          {group.accounts.map((a, i) => (
            <AccountRow
              key={a.id}
              account={a}
              provider={group.provider}
              isLast={i === group.accounts.length - 1}
              syncing={syncingId === a.id}
              onSync={onSync}
              onUpdateKey={onUpdateKey}
              onDisconnect={onDisconnect}
              onOpen={() => onOpenAccount(a)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AccountRow({
  account,
  provider,
  isLast,
  syncing,
  onSync,
  onUpdateKey,
  onDisconnect,
  onOpen,
}: {
  account: Tracker;
  provider: string;
  isLast: boolean;
  syncing: boolean;
  onSync: (id: string) => void;
  onUpdateKey: (id: string, apiKey: string) => Promise<unknown>;
  onDisconnect: (id: string) => void;
  onOpen: () => void;
}) {
  const ok = account.status === "active";
  const primary = primaryMetric(account);
  const [editOpen, setEditOpen] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "group flex cursor-pointer items-center gap-3 px-4 py-3 pl-6 transition-colors hover:bg-[#fd5200]/[0.04]",
        !isLast && "border-b border-foreground/10",
      )}
    >
      <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-[12px]">
          {account.account_ref ?? `Account ····${account.key_last4}`}
        </p>
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
          {formatMetric(primary.value, primary.isMoney)}
        </p>
        <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">
          {primary.label}
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
                account and delete the stored key. Spend already pulled stays on
                your dashboard.
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
