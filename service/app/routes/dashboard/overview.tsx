import { useMemo } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  KeyRound,
  Layers,
  Plug,
  Receipt,
  Sparkles,
  Users,
} from "lucide-react";
import { useUsage } from "~/hooks/useUsage";
import { useTenantContext } from "~/context/TenantContext";
import { useAuthContext } from "~/context/AuthContext";
import StatCard from "~/components/common/stat-card";
import DeltaBadge from "~/components/common/delta-badge";
import IdentityCell from "~/components/common/identity-cell";
import { LoadingElement } from "~/components/elements";
import { formatMoney, formatNumber } from "~/utils/format";
import { cn } from "~/lib/utils";
import type { UsageGroup } from "~/types/usage.types";

const formatUsd = (n: number): string => formatMoney(n);

const dailyAverage = (cost: number, days: number): string =>
  formatMoney(days > 0 ? cost / days : 0);

const TopList = ({
  title,
  marker,
  groups,
  totalCost,
  emptyKeyLabel,
  renderRow,
}: {
  title: string;
  marker: string;
  groups: UsageGroup[];
  totalCost: number;
  emptyKeyLabel: string;
  renderRow: (g: UsageGroup, isTop: boolean) => React.ReactNode;
}) => {
  const top = groups.slice(0, 5);
  return (
    <section className="border bg-card">
      <header className="flex items-end justify-between border-b px-5 py-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {marker}
          </p>
          <h3 className="mt-1 text-[15px] font-semibold">{title}</h3>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">
          top {top.length}/{groups.length}
        </p>
      </header>
      {top.length === 0 ? (
        <div className="flex h-[14rem] items-center justify-center px-5 text-[12.5px] text-muted-foreground">
          No spend in this window yet.
        </div>
      ) : (
        <ul>
          {top.map((g, i) => {
            const share = totalCost > 0 ? (g.cost_usd / totalCost) * 100 : 0;
            const isTop = i === 0;
            return (
              <li
                key={`${g.key ?? "null"}-${i}`}
                className={cn(
                  "flex items-center justify-between gap-4 border-b px-5 py-3 last:border-b-0",
                  isTop && "bg-primary/[0.035]",
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className={cn(
                      "w-6 shrink-0 font-mono text-[11px] tabular-nums",
                      isTop ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">{renderRow(g, isTop)}</div>
                </div>
                <div className="flex shrink-0 items-baseline gap-2">
                  <span className="font-mono text-[13.5px] font-medium tabular-nums">
                    {formatUsd(g.cost_usd)}
                  </span>
                  <span className="font-mono text-[10.5px] text-muted-foreground tabular-nums">
                    {share >= 1 ? `${Math.round(share)}%` : `<1%`}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

const PlainRow = ({ label, fallback }: { label: string | null; fallback: string }) => (
  <p
    className={cn(
      "truncate text-[13px] font-medium",
      !label && "italic text-muted-foreground",
    )}
  >
    {label || fallback}
  </p>
);

export default function OverviewPage() {
  const { tenant } = useTenantContext();
  const { userName, userEmail, organizationName } = useAuthContext();
  const { overview, loading } = useUsage({ fromDays: 7 });

  const totals = overview.totals;
  const updatedAt = useMemo(() => new Date().toISOString().slice(0, 16).replace("T", " · "), [loading]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingElement size={28} />
      </div>
    );
  }

  const subjectName = organizationName || tenant?.name || "Your tenant";
  const greetingName = userName?.split(" ")[0] || (userEmail ? userEmail.split("@")[0] : null);

  return (
    <div className="space-y-12 pb-16">
      <header className="border-b border-foreground/15 pb-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              ve-track ledger · {subjectName}
            </p>
            <h1 className="mt-3 text-[clamp(2.4rem,5vw,3.6rem)] font-bold leading-[0.95] tracking-tight">
              {greetingName ? (
                <>
                  Hello{" "}
                  <span className="text-primary">{greetingName}</span>
                  <span className="text-muted-foreground/60">.</span>
                </>
              ) : (
                <>
                  Spend, <span className="text-muted-foreground/60">at a glance.</span>
                </>
              )}
            </h1>
            <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-muted-foreground">
              Every external API call your apps make — priced, attributed, and
              rolled up. Last 7 days.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              as of
            </p>
            <p className="font-mono text-[12px] tabular-nums">{updatedAt} UTC</p>
          </div>
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex items-end justify-between border-b border-dashed border-foreground/15 pb-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            ── /01 · headline
          </p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            last {totals.fromDays}d
          </p>
        </div>

        <div className="grid gap-px bg-border md:grid-cols-[2fr_1fr_1fr]">
          <article className="relative overflow-hidden border bg-card p-7">
            <div className="absolute inset-x-0 top-0 h-px bg-primary/40" />
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                Total spend
              </span>
              <DeltaBadge delta={totals.delta} inverted size="md" />
            </div>
            <p className="mt-5 font-mono text-[clamp(2.6rem,5vw,3.8rem)] font-medium leading-none tracking-tight tabular-nums">
              {formatUsd(totals.cost_usd)}
            </p>
            <p className="mt-4 text-[12.5px] leading-relaxed text-muted-foreground">
              {totals.delta && totals.delta.previousCost > 0 ? (
                <>
                  vs.{" "}
                  <span className="font-mono tabular-nums">
                    {formatUsd(totals.delta.previousCost)}
                  </span>{" "}
                  the previous {totals.fromDays} days. Daily average{" "}
                  <span className="font-mono tabular-nums">
                    {dailyAverage(totals.cost_usd, totals.fromDays)}
                  </span>
                  .
                </>
              ) : totals.cost_usd > 0 ? (
                <>
                  Daily average{" "}
                  <span className="font-mono tabular-nums">
                    {dailyAverage(totals.cost_usd, totals.fromDays)}
                  </span>
                  . First period — no comparison yet.
                </>
              ) : (
                <>Wire an app's `VE_TRACK_KEY` and the meter starts here.</>
              )}
            </p>
          </article>

          <StatCard
            marker="II"
            title="API calls"
            value={formatNumber(totals.requests)}
            icon={Sparkles}
            description="provider requests captured"
          />

          <StatCard
            marker="III"
            title="Cost / call"
            value={
              totals.requests > 0
                ? formatUsd(totals.cost_usd / totals.requests)
                : "$0.00"
            }
            icon={Receipt}
            description="blended across providers"
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between border-b border-dashed border-foreground/15 pb-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            ── /02 · attribution
          </p>
          <Link
            to="/dashboard/usage"
            className="group inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            full attribution
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="grid gap-px bg-border lg:grid-cols-3">
          <TopList
            title="Where the dollars go"
            marker="·· apps"
            groups={overview.byApp}
            totalCost={totals.cost_usd}
            emptyKeyLabel="Unattributed"
            renderRow={(g) => (
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                <PlainRow label={g.key} fallback="Unattributed" />
              </div>
            )}
          />

          <TopList
            title="Top providers"
            marker="·· providers"
            groups={overview.byProvider}
            totalCost={totals.cost_usd}
            emptyKeyLabel="Unknown"
            renderRow={(g) => (
              <div className="flex items-center gap-2">
                <Plug className="h-3.5 w-3.5 text-muted-foreground" />
                <PlainRow label={g.key} fallback="Unknown" />
              </div>
            )}
          />

          <TopList
            title="Heaviest spenders"
            marker="·· organizations"
            groups={overview.byOrg}
            totalCost={totals.cost_usd}
            emptyKeyLabel="Personal / no org"
            renderRow={(g, isTop) => (
              <IdentityCell
                name={g.name}
                secondary={g.secondary}
                fallbackId={g.key}
                fallbackLabel="Personal / no org"
                imageUrl={g.imageUrl ?? null}
                accent={isTop}
              />
            )}
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Link
          to="/dashboard/usage"
          className="group relative flex items-center justify-between gap-6 overflow-hidden border bg-card p-6 transition-colors hover:border-primary/40"
        >
          <div className="absolute inset-y-0 left-0 w-px bg-foreground/15 transition-colors group-hover:bg-primary" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              go deeper
            </p>
            <h3 className="mt-2 text-[18px] font-semibold tracking-tight">
              Full attribution view
            </h3>
            <p className="mt-1 max-w-md text-[12.5px] leading-relaxed text-muted-foreground">
              Sortable, searchable breakdown by app, organization, person,
              provider, and model — for any time window.
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border transition-colors group-hover:border-primary group-hover:text-primary">
            <Users className="h-4 w-4" />
          </div>
        </Link>

        <Link
          to="/dashboard/keys"
          className="group relative flex items-center justify-between gap-6 overflow-hidden border bg-card p-6 transition-colors hover:border-primary/40"
        >
          <div className="absolute inset-y-0 left-0 w-px bg-foreground/15 transition-colors group-hover:bg-primary" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              wire a new app
            </p>
            <h3 className="mt-2 text-[18px] font-semibold tracking-tight">
              Issue an API key
            </h3>
            <p className="mt-1 max-w-md text-[12.5px] leading-relaxed text-muted-foreground">
              One key per app. Drop it in the env, wrap your worker, and watch
              it appear in the ledger above.
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border transition-colors group-hover:border-primary group-hover:text-primary">
            <KeyRound className="h-4 w-4" />
          </div>
        </Link>
      </section>
    </div>
  );
}
