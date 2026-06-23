import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/ui/chart";
import { formatMoney, formatNumber } from "~/utils/format";
import type { UsageSeriesPoint } from "~/types/usage.types";

const DAY_MS = 86_400_000;

const toUtcKey = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

const fillSeries = (
  data: UsageSeriesPoint[],
  from: number,
  to: number,
): UsageSeriesPoint[] => {
  const map = new Map(data.map((d) => [d.day, d]));
  const out: UsageSeriesPoint[] = [];
  const start = new Date(from);
  start.setUTCHours(0, 0, 0, 0);
  for (let t = start.getTime(); t <= to; t += DAY_MS) {
    const key = toUtcKey(t);
    const hit = map.get(key);
    out.push({
      day: key,
      cost_usd: hit?.cost_usd ?? 0,
      requests: hit?.requests ?? 0,
    });
  }
  return out;
};

function EmptyGraph({
  title,
  hint,
}: {
  title: string;
  hint?: string | null;
}) {
  return (
    <div className="relative h-[18rem] w-full overflow-hidden border border-border bg-muted/20">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0, transparent 47px, var(--border) 47px, var(--border) 48px)",
        }}
      />
      <div className="absolute inset-x-0 bottom-12 border-t border-dashed border-border" />
      <div className="relative flex h-full flex-col items-center justify-center gap-2.5 px-6 text-center">
        <span className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary">
          <TrendingUp className="h-[18px] w-[18px]" />
        </span>
        <p className="text-[13.5px] font-semibold tracking-tight text-foreground">
          {title}
        </p>
        {hint ? (
          <p className="max-w-[19rem] text-[12px] leading-relaxed text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

interface Props {
  data: UsageSeriesPoint[];
  from: number;
  to: number;
  emptyTitle?: string;
  emptyHint?: string | null;
  isMoney?: boolean;
}

export default function SpendAreaChart({
  data,
  from,
  to,
  emptyTitle = "No spend yet",
  emptyHint = "Wire an app's VE_TRACK_KEY and the meter starts here.",
  isMoney = true,
}: Props) {
  const series = useMemo(() => fillSeries(data, from, to), [data, from, to]);
  const hasSpend = useMemo(
    () => series.some((p) => p.cost_usd > 0),
    [series],
  );
  const fmt = (value: number) =>
    isMoney ? formatMoney(value) : formatNumber(value);
  const chartConfig: ChartConfig = {
    cost_usd: { label: isMoney ? "Spend" : "Credits", color: "var(--chart-1)" },
  };

  if (!hasSpend) {
    return <EmptyGraph title={emptyTitle} hint={emptyHint} />;
  }

  return (
    <ChartContainer config={chartConfig} className="h-[18rem] w-full">
      <AreaChart data={series} margin={{ left: 6, right: 6, top: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="spend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="2 4" strokeOpacity={0.5} />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          minTickGap={32}
          tickFormatter={(value: string) => format(parseISO(value), "MMM d")}
          className="text-[11px]"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={(value: number) => fmt(value)}
          className="text-[11px]"
        />
        <ChartTooltip
          cursor={{ stroke: "var(--chart-1)", strokeOpacity: 0.2 }}
          content={
            <ChartTooltipContent
              labelFormatter={(value) => format(parseISO(String(value)), "EEE, MMM d")}
              formatter={(value) => (
                <span className="font-mono tabular-nums">
                  {fmt(Number(value))}
                </span>
              )}
            />
          }
        />
        <Area
          dataKey="cost_usd"
          type="natural"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#spend-fill)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
