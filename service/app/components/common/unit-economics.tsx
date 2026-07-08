import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import {
  formatMoney,
  formatNumber,
  formatPreciseMoney,
} from "~/utils/format";
import type { CreditsTotals, ProfitabilityGroup } from "~/types/credits.types";

interface Props {
  creditPriceUsd: number | null;
  totals: CreditsTotals;
  byUser: ProfitabilityGroup[];
  windowDays: number;
}

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

const UnitCell = ({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: string;
  caption: string;
  tone?: "positive" | "negative" | null;
}) => (
  <div className="flex-1 bg-card px-5 py-4">
    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
      {label}
    </p>
    <p
      className={cn(
        "mt-2 font-mono text-[1.6rem] font-bold leading-none tracking-tight tabular-nums",
        tone === "positive" && "text-[color:var(--color-positive)]",
        tone === "negative" && "text-destructive",
      )}
    >
      {value}
    </p>
    <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
      {caption}
    </p>
  </div>
);

const InsightCell = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-card px-5 py-3.5">
    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
      {label}
    </p>
    <p className="mt-1.5 text-[15px] font-semibold tabular-nums">{value}</p>
  </div>
);

export default function UnitEconomics({
  creditPriceUsd,
  totals,
  byUser,
  windowDays,
}: Props) {
  const [freeCredits, setFreeCredits] = useState("100");

  const credits = totals.credits_charged;
  const costPerCredit = credits > 0 ? totals.cost_usd / credits : null;
  const effectivePrice = credits > 0 ? totals.revenue_usd / credits : null;
  const unitMargin =
    effectivePrice != null && costPerCredit != null
      ? effectivePrice - costPerCredit
      : null;

  const creditUsers = useMemo(
    () => byUser.filter((g) => g.key != null && g.credits_charged > 0),
    [byUser],
  );
  const monthlyFactor = windowDays > 0 ? 30 / windowDays : 0;
  const avgCreditsPerUser =
    creditUsers.length > 0
      ? (creditUsers.reduce((s, g) => s + g.credits_charged, 0) /
          creditUsers.length) *
        monthlyFactor
      : null;
  const medianCreditsPerUser = useMemo(() => {
    const m = median(creditUsers.map((g) => g.credits_charged));
    return m == null ? null : m * monthlyFactor;
  }, [creditUsers, monthlyFactor]);

  const markup =
    creditPriceUsd != null && costPerCredit != null && costPerCredit > 0
      ? creditPriceUsd / costPerCredit
      : null;

  const grantSize = Math.max(0, Math.floor(Number(freeCredits) || 0));
  const grantCost =
    costPerCredit != null ? grantSize * costPerCredit : null;

  return (
    <section className="border bg-card">
      <header className="flex items-end justify-between border-b px-5 py-4">
        <h2 className="text-[15px] font-semibold tracking-tight">
          Unit economics
        </h2>
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          For every 1 credit
        </p>
      </header>

      <div className="flex flex-col gap-px bg-border sm:flex-row">
        <UnitCell
          label="You charge"
          value={effectivePrice != null ? formatPreciseMoney(effectivePrice) : "—"}
          caption="realized average price per credit in this window"
        />
        <UnitCell
          label="It costs you"
          value={costPerCredit != null ? formatPreciseMoney(costPerCredit) : "—"}
          caption="blended provider cost per credit, also your break even price"
        />
        <UnitCell
          label="You keep"
          value={unitMargin != null ? formatPreciseMoney(unitMargin) : "—"}
          caption={
            unitMargin == null
              ? "needs credit activity to compute"
              : unitMargin >= 0
                ? "margin on every credit charged"
                : "you lose this on every credit charged"
          }
          tone={
            unitMargin == null ? null : unitMargin >= 0 ? "positive" : "negative"
          }
        />
      </div>

      <div className="grid gap-px border-t bg-border sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card px-5 py-3.5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Configured price
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[15px] font-semibold tabular-nums">
            {creditPriceUsd != null ? (
              formatPreciseMoney(creditPriceUsd)
            ) : (
              <Link
                to="/dashboard/settings"
                className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
              >
                Set in Settings
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </p>
        </div>
        <InsightCell
          label="Markup over cost"
          value={markup != null ? `${markup.toFixed(1)}x` : "—"}
        />
        <InsightCell
          label="Users charged credits"
          value={creditUsers.length > 0 ? formatNumber(creditUsers.length) : "—"}
        />
        <InsightCell
          label="Credits per user monthly"
          value={
            avgCreditsPerUser != null
              ? `${formatNumber(Math.round(avgCreditsPerUser))} avg · ${formatNumber(Math.round(medianCreditsPerUser ?? 0))} median`
              : "—"
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t px-5 py-4">
        <p className="text-[13px] text-muted-foreground">
          Giving new signups
        </p>
        <Input
          type="number"
          min={0}
          step={50}
          value={freeCredits}
          onChange={(e) => setFreeCredits(e.target.value)}
          className="h-8 w-24 text-center font-mono text-[13px] tabular-nums"
          aria-label="Free signup credits"
        />
        <p className="text-[13px] text-muted-foreground">
          free credits would cost you
          <span className="mx-1.5 font-mono text-[14px] font-bold text-foreground tabular-nums">
            {grantCost != null ? formatMoney(grantCost) : "—"}
          </span>
          per signup at your current cost per credit
          {creditPriceUsd != null && grantSize > 0 ? (
            <span className="text-muted-foreground">
              {" "}
              ({formatMoney(grantSize * creditPriceUsd)} in credit value)
            </span>
          ) : null}
          .
        </p>
      </div>
    </section>
  );
}
