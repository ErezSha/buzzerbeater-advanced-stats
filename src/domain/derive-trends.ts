import type {
  DashboardAlert,
  TeamGameMetrics,
  TeamSeasonMetrics,
  TrendPoint,
} from "@/domain/types";
import { deriveTeamSeasonMetrics } from "@/domain/derive-team-stats";

export function deriveTrendPoints(games: TeamGameMetrics[]): TrendPoint[] {
  return games.map((game) => ({
    matchId: game.matchId,
    date: game.date,
    points: game.points,
    opponentPoints: game.opponentPoints,
    margin: game.margin,
    possessions: game.possessions,
    offensiveRating: game.offensiveRating,
    defensiveRating: game.defensiveRating,
  }));
}

export function deriveRollingAverages(games: TeamGameMetrics[]): {
  last3: TeamSeasonMetrics | null;
  last5: TeamSeasonMetrics | null;
  last10: TeamSeasonMetrics | null;
} {
  return {
    last3: rolling(games, 3),
    last5: rolling(games, 5),
    last10: rolling(games, 10),
  };
}

export function deriveAlerts(games: TeamGameMetrics[]): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  if (games.length < 3) {
    alerts.push({
      code: "low-sample",
      severity: "info",
      title: "Small sample",
      message: "Fewer than three finished box scores are available, so trends may swing.",
    });
  }

  const recent = games.slice(-3);
  const recentTurnovers = recent
    .map((game) => game.turnoverPercentage)
    .filter((value): value is number => value !== null);

  if (
    recentTurnovers.length === 3 &&
    recentTurnovers.every((value) => value >= 15)
  ) {
    alerts.push({
      code: "recent-turnovers",
      severity: "warning",
      title: "Turnovers are elevated",
      message: "The last three box scores all have TOV% at or above 15.",
    });
  }

  return alerts;
}

function rolling(games: TeamGameMetrics[], size: number): TeamSeasonMetrics | null {
  if (games.length < size) {
    return null;
  }

  return deriveTeamSeasonMetrics(games.slice(-size));
}
