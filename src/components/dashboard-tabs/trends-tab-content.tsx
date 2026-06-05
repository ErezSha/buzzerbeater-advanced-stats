"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { TeamSeasonMetrics, TrendPoint } from "@/domain/types";
import type { DashboardViewModel } from "@/lib/api-types";
import { formatDate, formatNumber } from "@/lib/format";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface TrendsTabContentProps {
  data: DashboardViewModel | null;
  isLoading: boolean;
}

function chartData(points: TrendPoint[]) {
  return points.map((point) => ({
    ...point,
    label: formatDate(point.date),
  }));
}

function RollingCard({
  label,
  value,
}: {
  label: string;
  value: TeamSeasonMetrics | null;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-sm font-medium">{label}</div>
      {value ? (
        <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Margin</div>
            <div className="font-semibold">
              {formatNumber(value.averageMargin)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">ORtg</div>
            <div className="font-semibold">
              {formatNumber(value.offensiveRating)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">DRtg</div>
            <div className="font-semibold">
              {formatNumber(value.defensiveRating)}
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Unavailable until enough games are loaded.
        </p>
      )}
    </div>
  );
}

export function TrendsTabContent({ data, isLoading }: TrendsTabContentProps) {
  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  const points = data?.derived.trends.games ?? [];
  const rolling = data?.derived.trends.rollingAverages;

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Team Trends</CardTitle>
          <CardDescription>
            Margin, offensive rating, and defensive rating by finished game.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {points.length < 2 ? (
            <EmptyState
              title="Not enough finished games"
              message="Trend charts need at least two finished games with derived metrics."
            />
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
                initialDimension={{ width: 100, height: 50 }}
              >
                <LineChart
                  data={chartData(points)}
                  margin={{ left: 0, right: 12, top: 12, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickMargin={8} />
                  <YAxis width={42} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="margin"
                    name="Margin"
                    stroke="#0f766e"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="offensiveRating"
                    name="ORtg"
                    stroke="#be123c"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="defensiveRating"
                    name="DRtg"
                    stroke="#4b5563"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rolling Averages</CardTitle>
          <CardDescription>
            Recent form once the available sample is large enough.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <RollingCard label="Last 3" value={rolling?.last3 ?? null} />
          <RollingCard label="Last 5" value={rolling?.last5 ?? null} />
          <RollingCard label="Last 10" value={rolling?.last10 ?? null} />
        </CardContent>
      </Card>
    </div>
  );
}
