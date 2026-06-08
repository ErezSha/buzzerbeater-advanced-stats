"use client";

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
import type { TeamGameMetrics, Match } from "@/domain/types";
import type {
  DashboardViewModel,
  OpponentApiResponse,
  OpponentGameLog,
  OpponentScoutData,
} from "@/lib/api-types";
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

// ── helpers ────────────────────────────────────────────────────────────────

function isScrimm(game: TeamGameMetrics): boolean {
  const t = game.matchType?.toLowerCase() ?? "";
  return t.includes("scrimmage") || t.includes("friendly");
}

/**
 * Split PascalCase / camelCase into words and capitalise the first letter.
 * "ManToMan" → "Man To Man"   "takeItEasy" → "Take It Easy"
 */
function formatCamelCase(s: string | null | undefined): string {
  if (!s) return "—";
  const spaced = s.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function record(
  games: TeamGameMetrics[],
  n: number,
): { wins: number; losses: number; actual: number } | null {
  const nonScrimm = games.filter((g) => !isScrimm(g));
  const slice = nonScrimm.slice(-n);
  if (slice.length === 0) return null;
  const wins = slice.filter((g) => (g.margin ?? 0) > 0).length;
  const losses = slice.filter((g) => (g.margin ?? 0) < 0).length;
  return { wins, losses, actual: slice.length };
}

// ── RecentRecords ──────────────────────────────────────────────────────────

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

// ── GameDetail (finished game) ─────────────────────────────────────────────

function GameDetail({ game }: { game: TeamGameMetrics | null }) {
  if (!game) {
    return (
      <EmptyState
        title="Select a game"
        message="Click a finished game for efficiency details, or an upcoming game for opponent scouting."
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

  const strategyItems = [
    game.offStrategy && `Off: ${formatCamelCase(game.offStrategy)}`,
    game.defStrategy && `Def: ${formatCamelCase(game.defStrategy)}`,
    game.effort && `Effort: ${formatCamelCase(game.effort)}`,
  ].filter(Boolean);

  const won = (game.margin ?? 0) > 0;
  const lost = (game.margin ?? 0) < 0;

  return (
    <div className="grid gap-3">
      <div className="rounded-md border p-3">
        <div className="text-sm text-muted-foreground">
          {formatDate(game.date)}
        </div>
        <div className="mt-1 text-lg font-semibold text-primary">
          {game.opponentName ?? "Opponent"}
        </div>
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
      {strategyItems.length > 0 && (
        <div className="rounded-md border p-3 text-sm">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {strategyItems.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">ORtg</div>
          <div className="mt-1 text-xl font-semibold">
            {formatNumber(game.offensiveRating)}
          </div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">DRtg</div>
          <div className="mt-1 text-xl font-semibold">
            {formatNumber(game.defensiveRating)}
          </div>
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

// ── UpcomingGameDetail (opponent scouting) ─────────────────────────────────

function ScoutingGameRow({ g }: { g: OpponentGameLog }) {
  const won = (g.margin ?? 0) > 0;
  const lost = (g.margin ?? 0) < 0;
  const resultClass = cn(won && "text-green-600", lost && "text-red-500");

  return (
    <div className="grid gap-1 rounded-md border p-3 text-sm">
      {/* Row 1: date + score */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {formatDate(g.date)}
        </span>
        {g.teamScore !== null ? (
          <span className={cn("font-semibold", resultClass)}>
            {formatInteger(g.teamScore)}–{formatInteger(g.vsScore)}{" "}
            <span className="text-xs">({formatSigned(g.margin)})</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">No score</span>
        )}
      </div>
      {/* Row 2: vs. name */}
      {g.vsName && (
        <div className="text-xs text-muted-foreground">
          vs. <span className="font-medium text-foreground">{g.vsName}</span>
        </div>
      )}
      {/* Row 3: strategies + effort */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {g.offStrategy && (
          <span>
            <span className="text-muted-foreground">Off: </span>
            {formatCamelCase(g.offStrategy)}
          </span>
        )}
        {g.defStrategy && (
          <span>
            <span className="text-muted-foreground">Def: </span>
            {formatCamelCase(g.defStrategy)}
          </span>
        )}
        {g.effort && (
          <span>
            <span className="text-muted-foreground">Effort: </span>
            {formatCamelCase(g.effort)}
          </span>
        )}
      </div>
      {/* Row 4: top scorer + top usage */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {g.topScorer && (
          <span>
            <span className="text-muted-foreground">Top scorer: </span>
            <span className="font-medium">{g.topScorer.name}</span>
            {g.topScorer.position && (
              <span className="text-muted-foreground">
                {" "}
                ({g.topScorer.position})
              </span>
            )}
            {g.topScorer.points != null && (
              <span className="text-muted-foreground">
                {" "}
                {g.topScorer.points} pts
              </span>
            )}
          </span>
        )}
        {g.topUsage && (
          <span>
            <span className="text-muted-foreground">Top USG: </span>
            <span className="font-medium">{g.topUsage.name}</span>
            {g.topUsage.position && (
              <span className="text-muted-foreground">
                {" "}
                ({g.topUsage.position})
              </span>
            )}
            {g.topUsage.usageRate != null && (
              <span className="text-muted-foreground">
                {" "}
                {formatPercent(g.topUsage.usageRate)}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

function UpcomingGameDetail({
  match,
  myTeamId,
}: {
  match: Match;
  myTeamId: string;
}) {
  const opponentTeamId =
    match.homeTeamId === myTeamId ? match.awayTeamId : match.homeTeamId;

  // The component is keyed by match id in the parent, so it remounts with this
  // initial state whenever the selected match changes — no in-effect resets.
  const [scouting, setScouting] = React.useState<OpponentScoutData | null>(
    null,
  );
  const [loading, setLoading] = React.useState(Boolean(opponentTeamId));
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!opponentTeamId) return;

    const controller = new AbortController();

    fetch(`/api/opponent/${opponentTeamId}`, { signal: controller.signal })
      .then((r) => r.json() as Promise<OpponentApiResponse>)
      .then((response) => {
        if (response.ok) {
          setScouting(response.data);
        } else {
          setFetchError(response.error.message);
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setFetchError("Failed to load scouting data.");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [opponentTeamId]);

  if (!opponentTeamId) {
    return (
      <div className="rounded-md border p-3 text-sm text-destructive">
        Opponent team ID is unavailable.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-md border p-3">
        <div className="text-sm text-muted-foreground">
          {formatDate(match.date)}
        </div>
        <div className="mt-1 text-lg font-semibold text-primary">
          {match.opponentName ?? "Opponent"}
        </div>
        <Badge className="mt-2" variant="outline">
          Upcoming
        </Badge>
      </div>

      {loading && (
        <div className="grid gap-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      )}

      {fetchError && !loading && (
        <div className="rounded-md border p-3 text-sm text-destructive">
          {fetchError}
        </div>
      )}

      {scouting && !loading && scouting.games.length === 0 && (
        <EmptyState
          title="No recent games"
          message="No competitive box scores found for this opponent."
        />
      )}

      {scouting && !loading && scouting.games.length > 0 && (
        <div className="grid gap-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Last {scouting.games.length} competitive games
          </div>
          {[...scouting.games].reverse().map((g) => (
            <ScoutingGameRow key={g.matchId} g={g} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── GamesTabContent ────────────────────────────────────────────────────────

export function GamesTabContent({ data, isLoading }: GamesTabContentProps) {
  const finishedGames = React.useMemo(() => data?.derived.games ?? [], [data]);
  const myTeamId = data?.team.id ?? "";

  // Filter upcoming: remove games where opponentName is null (all-star exhibitions
  // where our team isn't a participant) and show at most 6.
  const scheduledGames = (
    data?.matches.filter(
      (match) => match.status !== "finished" && match.opponentName !== null,
    ) ?? []
  ).slice(0, 6);

  // Two independent selection states — only one active at a time.
  const [selectedFinishedId, setSelectedFinishedId] = React.useState<
    string | null
  >(null);
  const [selectedUpcomingId, setSelectedUpcomingId] = React.useState<
    string | null
  >(null);

  const fallbackGame = finishedGames[finishedGames.length - 1] ?? null;
  const selectedGame = selectedUpcomingId
    ? null
    : selectedFinishedId
      ? (finishedGames.find((g) => g.matchId === selectedFinishedId) ??
        fallbackGame)
      : fallbackGame;

  const selectedUpcomingMatch = selectedUpcomingId
    ? (scheduledGames.find((m) => m.id === selectedUpcomingId) ?? null)
    : null;

  // Best-value trackers for the finished-games table.
  const bestMargin = React.useMemo(() => {
    const vals = finishedGames
      .map((g) => g.margin)
      .filter((v): v is number => v !== null);
    return vals.length > 0 ? Math.max(...vals) : null;
  }, [finishedGames]);

  const bestORtg = React.useMemo(() => {
    const vals = finishedGames
      .map((g) => g.offensiveRating)
      .filter((v): v is number => v !== null);
    return vals.length > 0 ? Math.max(...vals) : null;
  }, [finishedGames]);

  const bestDRtg = React.useMemo(() => {
    const vals = finishedGames
      .map((g) => g.defensiveRating)
      .filter((v): v is number => v !== null);
    return vals.length > 0 ? Math.min(...vals) : null;
  }, [finishedGames]);

  function selectFinished(matchId: string) {
    setSelectedFinishedId(matchId);
    setSelectedUpcomingId(null);
  }

  function selectUpcoming(matchId: string) {
    setSelectedUpcomingId(matchId);
    setSelectedFinishedId(null);
  }

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  const displayedGames = [...finishedGames].reverse();

  return (
    <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
      {/* Left column ── game list */}
      <Card>
        <CardHeader>
          <CardTitle>Games</CardTitle>
          <CardDescription>
            Finished matches use cached box scores; scheduled matches stay
            clearly marked.
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
                    const resultClass = cn(
                      won && "text-green-600",
                      lost && "text-red-500",
                    );
                    const isBestMargin =
                      bestMargin !== null && game.margin === bestMargin;
                    const isBestORtg =
                      bestORtg !== null && game.offensiveRating === bestORtg;
                    const isBestDRtg =
                      bestDRtg !== null && game.defensiveRating === bestDRtg;
                    const isSelected =
                      !selectedUpcomingId &&
                      selectedGame?.matchId === game.matchId;

                    return (
                      <TableRow
                        key={game.matchId}
                        className={cn(
                          "cursor-pointer hover:bg-primary/10",
                          isSelected && "bg-primary/10",
                        )}
                        onClick={() => selectFinished(game.matchId)}
                      >
                        <TableCell>{formatDate(game.date)}</TableCell>
                        <TableCell className="font-medium text-primary">
                          <div
                            className="max-w-[8rem] truncate"
                            title={game.opponentName ?? "Opponent"}
                          >
                            {game.opponentName ?? "Opponent"}
                          </div>
                        </TableCell>
                        <TableCell className={resultClass}>
                          {formatInteger(game.points)}-
                          {formatInteger(game.opponentPoints)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            resultClass,
                            isBestMargin && "font-bold text-primary",
                          )}
                        >
                          {formatSigned(game.margin)}
                        </TableCell>
                        <TableCell
                          className={cn(isBestORtg && "font-bold text-primary")}
                        >
                          {formatNumber(game.offensiveRating)}
                        </TableCell>
                        <TableCell
                          className={cn(isBestDRtg && "font-bold text-primary")}
                        >
                          {formatNumber(game.defensiveRating)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}

          {scheduledGames.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-medium">
                Upcoming or unavailable box scores
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {scheduledGames.map((match) => {
                  const isSelected = selectedUpcomingId === match.id;
                  return (
                    <div
                      key={match.id}
                      className={cn(
                        "cursor-pointer rounded-md border p-3 text-sm transition-colors hover:bg-primary/10",
                        isSelected && "bg-primary/10",
                      )}
                      onClick={() => selectUpcoming(match.id)}
                    >
                      <div className="font-medium text-primary">
                        {match.opponentName}
                      </div>
                      <div className="text-muted-foreground">
                        {formatDate(match.date)}
                      </div>
                      <Badge className="mt-2" variant="outline">
                        Upcoming
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Right column ── detail / scouting panel */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedUpcomingMatch ? "Opponent Preview" : "Game Detail"}
          </CardTitle>
          <CardDescription>
            {selectedUpcomingMatch
              ? "Last 5 competitive games for this opponent."
              : "Efficiency and four-factor summary."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedUpcomingMatch ? (
            <UpcomingGameDetail
              key={selectedUpcomingMatch.id}
              match={selectedUpcomingMatch}
              myTeamId={myTeamId}
            />
          ) : (
            <GameDetail game={selectedGame} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
