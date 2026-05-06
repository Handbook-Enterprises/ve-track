import { useEffect, useState } from "react";
import { Layers, Building2, User2, Plug, Cpu, Target } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { useAuthContext } from "~/context/AuthContext";
import { UsageService } from "~/services/usage.service";
import { LoadingElement } from "~/components/elements";
import IdentityCell from "./identity-cell";
import { cn } from "~/lib/utils";
import { formatMoney, formatNumber } from "~/utils/format";
import type { UsageGroup, UsageOverview } from "~/types/usage.types";

interface Props {
  action: string | null;
  fromDays: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ActionDetailSheet({
  action,
  fromDays,
  open,
  onOpenChange,
}: Props) {
  const { authFetch } = useAuthContext();
  const [overview, setOverview] = useState<UsageOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !action) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    UsageService.getOverview(authFetch, { fromDays, action })
      .then((data) => {
        if (!cancelled) setOverview(data.overview);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, action, fromDays, authFetch]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-xl"
      >
        <SheetHeader className="border-b pb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            ── Action detail
          </p>
          <SheetTitle className="text-[24px] font-bold leading-tight tracking-tight">
            {action || "untagged"}
          </SheetTitle>
          {overview ? (
            <ActionHeadline overview={overview} fromDays={fromDays} />
          ) : null}
        </SheetHeader>

        {loading || !overview ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            {error ? (
              <p className="max-w-xs text-center text-[12.5px] text-destructive">
                {error}
              </p>
            ) : (
              <LoadingElement size={20} />
            )}
          </div>
        ) : (
          <div className="grid gap-px bg-border md:grid-cols-2">
            <DetailPanel
              title="Apps running it"
              icon={Layers}
              groups={overview.byApp}
              total={overview.totals.cost_usd}
              emptyLabel="Untagged"
            />
            <DetailPanel
              title="Top providers"
              icon={Plug}
              groups={overview.byProvider}
              total={overview.totals.cost_usd}
              emptyLabel="Unknown"
            />
            <IdentityPanel
              title="Heaviest people"
              icon={User2}
              groups={overview.byUser}
              total={overview.totals.cost_usd}
              fallbackLabel="Anonymous"
            />
            <IdentityPanel
              title="Heaviest organizations"
              icon={Building2}
              groups={overview.byOrg}
              total={overview.totals.cost_usd}
              fallbackLabel="Personal / no org"
            />
            <DetailPanel
              title="Models"
              icon={Cpu}
              groups={overview.byModel}
              total={overview.totals.cost_usd}
              emptyLabel="—"
              span={2}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ActionHeadline({
  overview,
  fromDays,
}: {
  overview: UsageOverview;
  fromDays: number;
}) {
  const cost = overview.totals.cost_usd;
  const calls = overview.totals.requests;
  const avg = calls > 0 ? cost / calls : 0;
  const apps = overview.byApp.filter((g) => !!g.key).length;
  const people = overview.byUser.filter((g) => !!g.key).length;
  return (
    <div className="space-y-3 pt-1">
      <p className="text-[14px] leading-relaxed text-muted-foreground">
        Over the last {fromDays} days, this action ran{" "}
        <span className="font-semibold tabular-nums text-foreground">
          {formatNumber(calls)} times
        </span>{" "}
        across{" "}
        <span className="font-semibold tabular-nums text-foreground">
          {apps} {apps === 1 ? "app" : "apps"}
        </span>
        , for{" "}
        <span className="font-semibold tabular-nums text-foreground">
          {people} {people === 1 ? "person" : "people"}
        </span>
        .
      </p>
      <div className="grid grid-cols-3 gap-px bg-border">
        <Stat label="Total spend" value={formatMoney(cost)} accent />
        <Stat label="Avg per run" value={formatMoney(avg)} />
        <Stat label="Calls" value={formatNumber(calls)} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={cn("bg-card p-3", accent && "bg-primary/5")}>
      <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-[16px] font-bold tabular-nums leading-none",
          accent && "text-primary",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function DetailPanel({
  title,
  icon: Icon,
  groups,
  total,
  emptyLabel,
  span,
}: {
  title: string;
  icon: typeof Target;
  groups: UsageGroup[];
  total: number;
  emptyLabel: string;
  span?: number;
}) {
  const top = groups.filter((g) => g.cost_usd > 0 || g.requests > 0).slice(0, 5);
  return (
    <div
      className={cn("bg-card p-5", span === 2 && "md:col-span-2")}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </p>
      </div>
      {top.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-muted-foreground">No data.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {top.map((g, i) => {
            const share = total > 0 ? (g.cost_usd / total) * 100 : 0;
            return (
              <li
                key={`${g.key ?? "null"}-${i}`}
                className="flex items-center justify-between gap-3"
              >
                <span
                  className={cn(
                    "truncate text-[13px]",
                    !g.key && "italic text-muted-foreground",
                    i === 0 ? "font-semibold" : "font-medium",
                  )}
                >
                  {g.key || emptyLabel}
                </span>
                <div className="flex shrink-0 items-baseline gap-2">
                  <span className="text-[13px] font-semibold tabular-nums">
                    {formatMoney(g.cost_usd)}
                  </span>
                  <span className="text-[10.5px] text-muted-foreground tabular-nums">
                    {share >= 1 ? `${Math.round(share)}%` : "<1%"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function IdentityPanel({
  title,
  icon: Icon,
  groups,
  total,
  fallbackLabel,
}: {
  title: string;
  icon: typeof Target;
  groups: UsageGroup[];
  total: number;
  fallbackLabel: string;
}) {
  const top = groups.filter((g) => g.cost_usd > 0 || g.requests > 0).slice(0, 5);
  return (
    <div className="bg-card p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </p>
      </div>
      {top.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-muted-foreground">No data.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {top.map((g, i) => {
            const share = total > 0 ? (g.cost_usd / total) * 100 : 0;
            return (
              <li
                key={`${g.key ?? "null"}-${i}`}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <IdentityCell
                    name={g.name}
                    secondary={g.secondary}
                    fallbackId={g.key}
                    fallbackLabel={fallbackLabel}
                    imageUrl={g.imageUrl ?? null}
                    accent={i === 0}
                  />
                </div>
                <div className="flex shrink-0 items-baseline gap-2">
                  <span className="text-[13px] font-semibold tabular-nums">
                    {formatMoney(g.cost_usd)}
                  </span>
                  <span className="text-[10.5px] text-muted-foreground tabular-nums">
                    {share >= 1 ? `${Math.round(share)}%` : "<1%"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
