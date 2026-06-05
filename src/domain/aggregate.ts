import type {
  DerivedDashboardMetrics,
  NormalizedBbapiData,
} from "@/domain/types";
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

  return {
    players: derivePlayerMetricSummaries(
      data.players,
      data.playerSeasonStats,
      data.boxScores,
    ),
    games,
    team: deriveTeamSeasonMetrics(games),
    trends: {
      games: deriveTrendPoints(games),
      rollingAverages: deriveRollingAverages(games),
    },
    alerts: deriveAlerts(games),
  };
}
