import type {
  DerivedDashboardMetrics,
  NormalizedBbapiData,
} from "@/domain/types";
import { deriveAvailability } from "@/domain/derive-availability";
import { derivePlayerMetricSummaries } from "@/domain/derive-player-stats";
import {
  deriveTeamGameMetrics,
  deriveTeamSeasonMetrics,
} from "@/domain/derive-team-stats";
import {
  deriveAlerts,
  deriveRollingAverages,
  deriveTrendPoints,
} from "@/domain/derive-trends";

export function deriveDashboardMetrics(
  data: Omit<NormalizedBbapiData, "derived">,
): DerivedDashboardMetrics {
  const games = deriveTeamGameMetrics(data.team, data.matches, data.boxScores);
  const players = derivePlayerMetricSummaries(
    data.players,
    data.playerSeasonStats,
    data.boxScores,
  );

  const minutesPerGameByPlayerId = new Map(
    players.map((player) => [
      player.playerId,
      minutesPerGame(player.minutes, player.games, player.seasonStat?.minutesPerGame),
    ]),
  );

  return {
    players,
    games,
    team: deriveTeamSeasonMetrics(games),
    availability: deriveAvailability(data.players, minutesPerGameByPlayerId),
    trends: {
      games: deriveTrendPoints(games),
      rollingAverages: deriveRollingAverages(games),
    },
    alerts: deriveAlerts(games),
  };
}

function minutesPerGame(
  totalMinutes: number | null,
  games: number,
  fallback: number | null | undefined,
): number {
  if (totalMinutes !== null && games > 0) {
    return totalMinutes / games;
  }
  return fallback ?? 0;
}
