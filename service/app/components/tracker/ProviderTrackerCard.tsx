import { useState } from "react";
import { ChevronDown, TriangleAlert } from "lucide-react";
import AccountRow from "./AccountRow";
import OrgClashAlert from "./OrgClashAlert";
import { Badge } from "~/components/ui/badge";
import { providerLabel } from "~/utils/providers";
import { cn } from "~/lib/utils";
import type { ProviderGroup, Tracker } from "~/types/tracker.types";

interface Props {
  group: ProviderGroup;
  isLifetime: boolean;
  periodLabel: string;
  syncingId: string | null;
  onSync: (id: string) => void;
  onUpdateKey: (id: string, apiKey: string) => Promise<unknown>;
  onDisconnect: (id: string) => void;
  onOpenAccount: (account: Tracker) => void;
}

export default function ProviderTrackerCard({
  group,
  isLifetime,
  periodLabel,
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
            {group.orgClashIds.size > 0 ? (
              <Badge
                variant="warning"
                className="h-auto px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider"
              >
                <TriangleAlert />
                duplicate org
              </Badge>
            ) : null}
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
          {group.orgClashIds.size > 0 ? (
            <OrgClashAlert
              provider={group.provider}
              count={group.orgClashIds.size}
              className="border-x-0 border-t-0"
            />
          ) : null}
          {group.accounts.map((a, i) => (
            <AccountRow
              key={a.id}
              account={a}
              provider={group.provider}
              isLifetime={isLifetime}
              periodLabel={periodLabel}
              isLast={i === group.accounts.length - 1}
              syncing={syncingId === a.id}
              onSync={onSync}
              onUpdateKey={onUpdateKey}
              onDisconnect={onDisconnect}
              onOpen={() => onOpenAccount(a)}
              orgClash={group.orgClashIds.has(a.id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
