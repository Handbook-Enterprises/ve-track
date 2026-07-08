import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { format, parseISO } from "date-fns";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/ui/chart";
import { EmptyGraph } from "~/components/common/spend-area-chart";
import { formatMoney } from "~/utils/format";
import type { ProfitabilitySeriesPoint } from "~/types/credits.types";

const DAY_MS = 86_400_000;

const toUtcKey = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

const fillSeries = (
  data: ProfitabilitySeriesPoint[],
  from: number,
  to: number,
): ProfitabilitySeriesPoint[] => {
  const map = new Map(data.map((d) => [d.day, d]));
  const out: ProfitabilitySeriesPoint[] = [];
  const start = new Date(from);
  start.setUTCHours(0, 0, 0, 0);
  for (let t = start.getTime(); t <= to; t += DAY_MS) {
    const key = toUtcKey(t);
    const hit = map.get(key);
    out.push({
      day: key,
      revenue_usd: hit?.revenue_usd ?? 0,
      cost_usd: hit?.cost_usd ?? 0,
      margin_usd: hit?.margin_usd ?? 0,
      credits: hit?.credits ?? 0,
      requests: hit?.requests ?? 0,
    });
  }
  return out;
};

interface Props {
  data: ProfitabilitySeriesPoint[];
  from: number;
  to: number;
}

export default function RevenueCostChart({ data, from, to }: Props) {
  const series = useMemo(() => fillSeries(data, from, to), [data, from, to]);
  const hasActivity = useMemo(
    () => series.some((p) => p.revenue_usd > 0 || p.cost_usd > 0),
    [series],
  );

  const chartConfig: ChartConfig = {
    revenue_usd: { label: "Revenue", color: "var(--chart-1)" },
    cost_usd: { label: "Cost", color: "var(--chart-3)" },
    margin_usd: { label: "Margin", color: "var(--chart-4)" },
  };

  if (!hasActivity) {
    return (
      <EmptyGraph
        title="No credit activity yet"
        hint="Report credit deductions with trackCredits in the SDK and revenue vs cost appears here."
      />
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[18rem] w-full">
      <AreaChart data={series} margin={{ left: 6, right: 6, top: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="credits-revenue-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="credits-cost-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.16} />
            <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0} />
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
          domain={[0, "auto"]}
          allowDataOverflow={false}
          tickFormatter={(value: number) => formatMoney(value)}
          className="text-[11px]"
        />
        <ChartTooltip
          cursor={{ stroke: "var(--chart-1)", strokeOpacity: 0.2 }}
          content={
            <ChartTooltipContent
              labelFormatter={(value) => format(parseISO(String(value)), "EEE, MMM d")}
              formatter={(value, name, item, index) => (
                <>
                  <div
                    className="h-2.5 w-2.5 shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground">
                    {chartConfig[name as keyof typeof chartConfig]?.label ?? name}
                  </span>
                  <span className="ml-auto font-mono font-medium tabular-nums">
                    {formatMoney(Number(value))}
                  </span>
                  {index === 1 ? (
                    <div className="flex w-full items-center justify-between border-t border-border/50 pt-1">
                      <span className="text-muted-foreground">Margin</span>
                      <span className="font-mono font-medium tabular-nums">
                        {formatMoney(item.payload.margin_usd)}
                      </span>
                    </div>
                  ) : null}
                </>
              )}
            />
          }
        />
        <Area
          dataKey="cost_usd"
          type="linear"
          stroke="var(--chart-3)"
          strokeWidth={1.5}
          fill="url(#credits-cost-fill)"
          dot={false}
          activeDot={{ r: 3.5, strokeWidth: 0 }}
        />
        <Area
          dataKey="revenue_usd"
          type="linear"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#credits-revenue-fill)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
