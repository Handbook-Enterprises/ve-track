import { useMemo } from "react";
import { formatMoney } from "~/utils/format";
import type { UsageOverview } from "~/types/usage.types";
import DeltaBadge from "./delta-badge";

interface Props {
  overview: UsageOverview;
}

const compactNumber = (n: number): string => {
  if (n < 1000) return n.toString();
  if (n < 10_000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  if (n < 1_000_000) return Math.round(n / 1000) + "k";
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "m";
};

const personLabel = (n: number) => `${n} ${n === 1 ? "person" : "people"}`;
const orgLabel = (n: number) => `${n} ${n === 1 ? "org" : "orgs"}`;
const appLabel = (n: number) => `${n} ${n === 1 ? "app" : "apps"}`;

export default function NarrativeSummary({ overview }: Props) {
  const sentence = useMemo(() => {
    const totals = overview.totals;
    const fromDays = totals.fromDays;
    const totalCost = totals.cost_usd;
    const totalRequests = totals.requests;
    const apps = overview.byApp.filter((g) => !!g.key).length;
    const users = overview.byUser.filter((g) => !!g.key).length;
    const orgs = overview.byOrg.filter((g) => !!g.key).length;
    const topAction = overview.byAction[0];
    const topActionShare =
      topAction && totalCost > 0
        ? (topAction.cost_usd / totalCost) * 100
        : 0;
    const topOrg = overview.byOrg[0];
    const topOrgShare =
      topOrg && totalCost > 0 ? (topOrg.cost_usd / totalCost) * 100 : 0;
    const rangeLabel =
      fromDays === 7
        ? "last 7 days"
        : fromDays === 30
          ? "last 30 days"
          : fromDays === 90
            ? "last 90 days"
            : `last ${fromDays} days`;
    return {
      rangeLabel,
      totalCost,
      totalRequests,
      apps,
      users,
      orgs,
      topAction,
      topActionShare,
      topOrg,
      topOrgShare,
    };
  }, [overview]);

  if (sentence.totalCost === 0 && sentence.totalRequests === 0) {
    return (
      <p className="max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
        No tracked activity in the {sentence.rangeLabel}. Wire an app's
        <code className="mx-1 bg-muted px-1.5 py-0.5 text-[12.5px]">
          VE_TRACK_KEY
        </code>
        and the meter starts here.
      </p>
    );
  }

  return (
    <div className="max-w-3xl space-y-2">
      <p className="text-[15px] leading-[1.55] text-foreground/85">
        In the{" "}
        <span className="font-medium text-foreground">{sentence.rangeLabel}</span>
        ,{" "}
        <span className="font-semibold tabular-nums text-foreground">
          {appLabel(sentence.apps)}
        </span>{" "}
        processed{" "}
        <span className="font-semibold tabular-nums text-foreground">
          {compactNumber(sentence.totalRequests)} API calls
        </span>{" "}
        for{" "}
        <span className="font-semibold tabular-nums text-foreground">
          {personLabel(sentence.users)}
        </span>{" "}
        across{" "}
        <span className="font-semibold tabular-nums text-foreground">
          {orgLabel(sentence.orgs)}
        </span>
        , totaling{" "}
        <span className="font-bold text-primary tabular-nums">
          {formatMoney(sentence.totalCost)}
        </span>
        .
      </p>
      {sentence.topAction || sentence.topOrg ? (
        <p className="text-[14px] leading-relaxed text-muted-foreground">
          {sentence.topAction && sentence.totalCost > 0 ? (
            <>
              Biggest line item is{" "}
              <span className="font-semibold text-foreground">
                {sentence.topAction.key || "untagged"}
              </span>{" "}
              at{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {formatMoney(sentence.topAction.cost_usd)}
              </span>{" "}
              <span className="tabular-nums">
                ({Math.round(sentence.topActionShare)}% of spend)
              </span>
              .{" "}
            </>
          ) : null}
          {sentence.topOrg && sentence.topOrgShare >= 1 ? (
            <>
              <span className="font-semibold text-foreground">
                {sentence.topOrg.name || sentence.topOrg.key || "Personal use"}
              </span>{" "}
              accounts for{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {formatMoney(sentence.topOrg.cost_usd)}
              </span>{" "}
              of that.
            </>
          ) : null}
        </p>
      ) : null}
      {overview.totals.delta ? (
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            vs prior {overview.totals.fromDays} days
          </span>
          <DeltaBadge delta={overview.totals.delta} inverted size="md" />
        </div>
      ) : null}
    </div>
  );
}
