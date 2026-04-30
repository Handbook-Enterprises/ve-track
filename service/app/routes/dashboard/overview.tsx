import { Link } from "react-router";
import { Activity, ArrowRight, DollarSign, KeyRound, Layers } from "lucide-react";
import { useUsage } from "~/hooks/useUsage";
import { useTenantContext } from "~/context/TenantContext";
import StatCard from "~/components/common/stat-card";
import { LoadingElement } from "~/components/elements";
import { formatMoney } from "~/utils/format";

export default function OverviewPage() {
  const { tenant } = useTenantContext();
  const { overview, loading } = useUsage({ fromDays: 7 });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingElement size={28} />
      </div>
    );
  }

  const totals = overview.totals;

  return (
    <div className="space-y-10 pb-16">
      <header className="border-b-2 border-foreground pb-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          ve-track · overview
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold uppercase tracking-tight">
          {tenant?.name ?? "Your tenant"}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Snapshot of the last 7 days. Drop into Usage for full attribution.
        </p>
      </header>

      <section>
        <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Spend · last 7d"
            value={formatMoney(totals.cost_usd)}
            icon={DollarSign}
            description="across every tracked provider"
            accent
          />
          <StatCard
            title="Total requests"
            value={totals.requests.toLocaleString()}
            icon={Activity}
            description="provider calls captured"
          />
          <StatCard
            title="Top app"
            value={overview.byApp[0]?.key ?? "—"}
            icon={Layers}
            description={
              overview.byApp[0]
                ? formatMoney(overview.byApp[0].cost_usd)
                : "no events yet"
            }
          />
          <StatCard
            title="Top provider"
            value={overview.byProvider[0]?.key ?? "—"}
            icon={Activity}
            description={
              overview.byProvider[0]
                ? formatMoney(overview.byProvider[0].cost_usd)
                : "no events yet"
            }
            accent
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Link
          to="/dashboard/keys"
          className="group flex items-center justify-between border bg-card p-6 transition-colors hover:border-primary/40"
        >
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Quick action
            </p>
            <h3 className="mt-2 font-display text-xl font-bold uppercase tracking-tight">
              Manage API keys
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Issue per-app keys, rotate, revoke.
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center border transition-colors group-hover:border-primary group-hover:text-primary">
            <KeyRound className="h-4 w-4" />
          </div>
        </Link>

        <Link
          to="/dashboard/usage"
          className="group flex items-center justify-between border bg-card p-6 transition-colors hover:border-primary/40"
        >
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Quick action
            </p>
            <h3 className="mt-2 font-display text-xl font-bold uppercase tracking-tight">
              Usage attribution
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Break down by app, org, user, provider, model.
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center border transition-colors group-hover:border-primary group-hover:text-primary">
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      </section>
    </div>
  );
}
