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
import { Button } from "@/components/ui/button";
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

interface GamesTabContentProps {
  data: DashboardViewModel | null;
  isLoading: boolean;
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

  return (
    <div className="grid gap-3">
      <div className="rounded-md border p-3">
        <div className="text-sm text-muted-foreground">{formatDate(game.date)}</div>
        <div className="mt-1 text-lg font-semibold">{game.opponentName ?? "Opponent"}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant={(game.margin ?? 0) >= 0 ? "secondary" : "outline"}>
            {formatInteger(game.points)}-{formatInteger(game.opponentPoints)}
          </Badge>
          <Badge variant="outline">{formatSigned(game.margin)}</Badge>
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

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

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
                  {[...finishedGames].reverse().map((game) => (
                    <TableRow key={game.matchId}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedMatchId(game.matchId)}
                        >
                          {formatDate(game.date)}
                        </Button>
                      </TableCell>
                      <TableCell>{game.opponentName ?? "Opponent"}</TableCell>
                      <TableCell>
                        {formatInteger(game.points)}-{formatInteger(game.opponentPoints)}
                      </TableCell>
                      <TableCell>{formatSigned(game.margin)}</TableCell>
                      <TableCell>{formatNumber(game.offensiveRating)}</TableCell>
                      <TableCell>{formatNumber(game.defensiveRating)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
