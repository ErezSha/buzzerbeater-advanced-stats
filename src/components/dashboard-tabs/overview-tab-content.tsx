import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardViewModel } from "@/lib/api-types";
import {
  formatInteger,
  formatNumber,
  formatPercent,
  formatSigned,
} from "@/lib/format";

interface OverviewTabContentProps {
  data: DashboardViewModel | null;
  isLoading: boolean;
}

export function OverviewTabContent({ data, isLoading }: OverviewTabContentProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          Dashboard data is unavailable.
        </CardContent>
      </Card>
    );
  }

  const team = data.derived.team;
  const topPlayers = [...data.derived.players]
    .sort(
      (left, right) =>
        (right.gameScoreAverage ?? -999) - (left.gameScoreAverage ?? -999),
    )
    .slice(0, 5);
  const recentGames = [...data.derived.games.slice(-5)].reverse();
  const snapshotMetrics = [
    ["Record", `${team.wins}-${team.losses}`],
    [
      "Pyth W-L",
      team.pythagoreanWins !== null && team.pythagoreanLosses !== null
        ? `${formatNumber(team.pythagoreanWins)}-${formatNumber(team.pythagoreanLosses)}`
        : "Unavailable",
    ],
    ["ORtg", formatNumber(team.offensiveRating)],
    ["DRtg", formatNumber(team.defensiveRating)],
    ["eFG%", formatPercent(team.shooting.effectiveFieldGoalPercentage)],
    ["TOV%", formatPercent(team.turnoverPercentage)],
    ["Pace", formatNumber(team.averagePossessions)],
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Team Snapshot</CardTitle>
          <CardDescription>
            {data.team.name} across {formatInteger(team.games)} finished games.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {snapshotMetrics.map(([label, value]) => (
            <div key={label} className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="mt-1 text-xl font-semibold">{value}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
          <CardDescription>Simple data quality and performance notes.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {data.derived.alerts.length === 0 ? (
            <Badge variant="secondary">No active alerts</Badge>
          ) : (
            data.derived.alerts.map((alert) => (
              <div key={alert.code} className="rounded-md border p-3">
                <Badge variant={alert.severity === "warning" ? "warning" : "outline"}>
                  {alert.severity}
                </Badge>
                <div className="mt-2 font-medium">{alert.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Players</CardTitle>
          <CardDescription>Ranked by average Game Score.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {topPlayers.map((player) => (
            <div key={player.playerId} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="font-semibold text-primary">{player.name}</div>
                <div className="text-sm text-muted-foreground">
                  {player.position ?? "No position"} / {formatInteger(player.games)} games
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatNumber(player.gameScoreAverage)}</div>
                <div className="text-xs text-muted-foreground">Game Score</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Form</CardTitle>
          <CardDescription>Last five finished games with derived efficiency.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {recentGames.map((game) => (
            <div key={game.matchId} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border p-3 text-sm">
              <div>
                <div className="font-medium">{game.opponentName ?? "Opponent"}</div>
                <div className="text-muted-foreground">
                  {formatInteger(game.points)}-{formatInteger(game.opponentPoints)}
                </div>
              </div>
              <Badge variant={(game.margin ?? 0) >= 0 ? "secondary" : "outline"}>
                {formatSigned(game.margin)}
              </Badge>
              <div className="text-right">
                <div className="font-medium">{formatNumber(game.offensiveRating)}</div>
                <div className="text-xs text-muted-foreground">ORtg</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
