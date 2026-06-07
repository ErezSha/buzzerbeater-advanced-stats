import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TeamGameMetrics } from "@/domain/types";
import type { DashboardViewModel } from "@/lib/api-types";
import {
  formatDate,
  formatInteger,
  formatNumber,
  formatPercent,
  formatSigned,
} from "@/lib/format";
import { cn } from "@/lib/utils";

interface GamesTabContentProps {
  data: DashboardViewModel | null;
  isLoading: boolean;
}

function isScrimm(game: TeamGameMetrics): boolean {
  const t = game.matchType?.toLowerCase() ?? "";
  return t.includes("scrimmage") || t.includes("friendly");
}

function record(games: TeamGameMetrics[], n: number): { wins: number; losses: number; actual: number } | null {
  const nonScrimm = games.filter((g) => !isScrimm(g));
  const slice = nonScrimm.slice(-n);
  if (slice.length === 0) return null;
  const wins = slice.filter((g) => (g.margin ?? 0) > 0).length;
  const losses = slice.filter((g) => (g.margin ?? 0) < 0).length;
  return { wins, losses, actual: slice.length };
}

function RecentRecords({ games }: { games: TeamGameMetrics[] }) {
  const slots = [
    { label: "L3", n: 3 },
    { label: "L5", n: 5 },
    { label: "L10", n: 10 },
  ];

  const entries = slots
    .map(({ label, n }) => ({ label, n, rec: record(games, n) }))
    .filter(({ rec }) => rec !== null);

  if (entries.length === 0) return null;

  return (
    <div className="rounded-md border p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Recent record (excl. scrimmages)
      </div>
      <div className="flex flex-wrap gap-4">
        {entries.map(({ label, n, rec }) => {
          if (!rec) return null;
          const display =
            rec.actual < n
              ? `${rec.wins}-${rec.losses} (${rec.actual})`
              : `${rec.wins}-${rec.losses}`;
          return (
            <div key={label}>
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="font-semibold">{display}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GameDetail({ game }: { game: TeamGameMetrics | null }) {
  if (!game) {
    return (
      <EmptyState
        title="Select a finished game"
        message="Finished matches with available box scores show efficiency, shooting, turnover, and pace details."
      />
    );
  }

  const factors = [
    ["eFG%", formatPercent(game.shooting.effectiveFieldGoalPercentage)],
    ["TS%", formatPercent(game.shooting.trueShootingPercentage)],
    ["TOV%", formatPercent(game.turnoverPercentage)],
    ["ORB%", formatPercent(game.offensiveReboundPercentage)],
    ["FTr", formatNumber(game.freeThrowRate)],
    ["Pace", formatNumber(game.pace)],
  ];

  const won = (game.margin ?? 0) > 0;
  const lost = (game.margin ?? 0) < 0;

  return (
    <div className="grid gap-3">
      <div className="rounded-md border p-3">
        <div className="text-sm text-muted-foreground">{formatDate(game.date)}</div>
        <div className="mt-1 text-lg font-semibold text-primary">{game.opponentName ?? "Opponent"}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge
            variant={(game.margin ?? 0) >= 0 ? "secondary" : "outline"}
            className={cn(won && "text-green-600", lost && "text-red-500")}
          >
            {formatInteger(game.points)}-{formatInteger(game.opponentPoints)}
          </Badge>
          <Badge
            variant="outline"
            className={cn(won && "text-green-600", lost && "text-red-500")}
          >
            {formatSigned(game.margin)}
          </Badge>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">ORtg</div>
          <div className="mt-1 text-xl font-semibold">{formatNumber(game.offensiveRating)}</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">DRtg</div>
          <div className="mt-1 text-xl font-semibold">{formatNumber(game.defensiveRating)}</div>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {factors.map(([label, value]) => (
          <div key={label} className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-1 font-semibold">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GamesTabContent({ data, isLoading }: GamesTabContentProps) {
  const finishedGames = data?.derived.games ?? [];
  const scheduledGames =
    data?.matches.filter((match) => match.status !== "finished").slice(0, 6) ?? [];
  const [selectedMatchId, setSelectedMatchId] = React.useState<string | null>(null);
  const fallbackGame = finishedGames[finishedGames.length - 1] ?? null;
  const selectedGame = selectedMatchId
    ? (finishedGames.find((game) => game.matchId === selectedMatchId) ?? fallbackGame)
    : fallbackGame;

  const bestMargin = React.useMemo(() => {
    const vals = finishedGames.map((g) => g.margin).filter((v): v is number => v !== null);
    return vals.length > 0 ? Math.max(...vals) : null;
  }, [finishedGames]);

  const bestORtg = React.useMemo(() => {
    const vals = finishedGames.map((g) => g.offensiveRating).filter((v): v is number => v !== null);
    return vals.length > 0 ? Math.max(...vals) : null;
  }, [finishedGames]);

  const bestDRtg = React.useMemo(() => {
    const vals = finishedGames.map((g) => g.defensiveRating).filter((v): v is number => v !== null);
    return vals.length > 0 ? Math.min(...vals) : null;
  }, [finishedGames]);

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  const displayedGames = [...finishedGames].reverse();

  return (
    <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
      <Card>
        <CardHeader>
          <CardTitle>Games</CardTitle>
          <CardDescription>
            Finished matches use cached box scores; scheduled matches stay clearly marked.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {finishedGames.length === 0 ? (
            <EmptyState
              title="No finished box scores yet"
              message="Finished games will appear here after BBAPI returns box score data."
            />
          ) : (
            <>
              <RecentRecords games={finishedGames} />
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Opponent</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Margin</TableHead>
                      <TableHead>ORtg</TableHead>
                      <TableHead>DRtg</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedGames.map((game) => {
                      const won = (game.margin ?? 0) > 0;
                      const lost = (game.margin ?? 0) < 0;
                      const resultClass = cn(won && "text-green-600", lost && "text-red-500");
                      const isBestMargin = bestMargin !== null && game.margin === bestMargin;
                      const isBestORtg = bestORtg !== null && game.offensiveRating === bestORtg;
                      const isBestDRtg = bestDRtg !== null && game.defensiveRating === bestDRtg;

                      const isSelected =
                        selectedGame?.matchId === game.matchId;

                      return (
                        <TableRow
                          key={game.matchId}
                          className={cn(
                            "cursor-pointer hover:bg-primary/10",
                            isSelected && "bg-primary/10",
                          )}
                          onClick={() => setSelectedMatchId(game.matchId)}
                        >
                          <TableCell>{formatDate(game.date)}</TableCell>
                          <TableCell className="font-medium text-primary">
                            {game.opponentName ?? "Opponent"}
                          </TableCell>
                          <TableCell className={resultClass}>
                            {formatInteger(game.points)}-{formatInteger(game.opponentPoints)}
                          </TableCell>
                          <TableCell className={cn(resultClass, isBestMargin && "font-bold text-primary")}>
                            {formatSigned(game.margin)}
                          </TableCell>
                          <TableCell className={cn(isBestORtg && "font-bold text-primary")}>
                            {formatNumber(game.offensiveRating)}
                          </TableCell>
                          <TableCell className={cn(isBestDRtg && "font-bold text-primary")}>
                            {formatNumber(game.defensiveRating)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {scheduledGames.length > 0 ? (
            <div>
              <div className="mb-2 text-sm font-medium">Upcoming or unavailable box scores</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {scheduledGames.map((match) => (
                  <div key={match.id} className="rounded-md border p-3 text-sm">
                    <div className="font-medium">{match.opponentName ?? "Opponent"}</div>
                    <div className="text-muted-foreground">{formatDate(match.date)}</div>
                    <Badge className="mt-2" variant="outline">
                      Box score not available yet
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Game Detail</CardTitle>
          <CardDescription>Efficiency and four-factor summary.</CardDescription>
        </CardHeader>
        <CardContent>
          <GameDetail game={selectedGame} />
        </CardContent>
      </Card>
    </div>
  );
}
