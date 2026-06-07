import type { LeaguePlayerStatTotal } from "@/server/bbapi/adapters/league-team-stats";
import {
  addStatTotals,
  emptyTotals,
  shootingMetrics,
} from "@/domain/derive-utils";
import {
  assistPercentage,
  gameScore,
  reboundPercentage,
  safeRatio,
  turnoverPercentage,
  usageRate,
} from "@/domain/metrics";
import type { LeaguePlayerMetricSummary } from "@/domain/types";

export function deriveLeaguePlayerMetricSummaries(
  playerTotals: LeaguePlayerStatTotal[],
  teamId: string,
  teamName: string,
  // Estimated opponent rebounds: (leagueTotalReb - this team's reb) / (numTeams - 1)
  // Pass null if unknown; TRB% will be null.
  estimatedOppReb: number | null,
): LeaguePlayerMetricSummary[] {
  const teamTotals = playerTotals.reduce(
    (sum, p) => addStatTotals(sum, p.totals),
    emptyTotals(),
  );

  return playerTotals
    .filter((p) => p.games > 0)
    .map((p) => {
      const t = p.totals;
      const g = p.games;

      // GmSc is linear so avg_GmSc = GmSc(totals / games)
      const avgGmSc = gameScore({
        points: safeRatio(t.points, g),
        fieldGoals: safeRatio(t.fieldGoals, g),
        fieldGoalAttempts: safeRatio(t.fieldGoalAttempts, g),
        freeThrows: safeRatio(t.freeThrows, g),
        freeThrowAttempts: safeRatio(t.freeThrowAttempts, g),
        offensiveRebounds: safeRatio(t.offensiveRebounds, g),
        defensiveRebounds: safeRatio(t.defensiveRebounds, g),
        steals: safeRatio(t.steals, g),
        assists: safeRatio(t.assists, g),
        blocks: safeRatio(t.blocks, g),
        fouls: safeRatio(t.fouls, g),
        turnovers: safeRatio(t.turnovers, g),
      });

      return {
        playerId: p.playerId,
        name: p.name,
        position: null,
        rosterStatus: "active" as const,
        games: g,
        minutes: t.minutes,
        points: t.points,
        rebounds: t.totalRebounds ?? 0,
        assists: t.assists ?? 0,
        shooting: shootingMetrics(t),
        turnoverPercentage: turnoverPercentage(
          t.turnovers,
          t.fieldGoalAttempts,
          t.freeThrowAttempts,
        ),
        assistPercentage: assistPercentage(
          t.assists,
          teamTotals.fieldGoals,
          t.fieldGoals,
        ),
        // Approximate: (league_total_reb - this_team_reb) / (n_teams - 1)
        // gives average opponent season rebounds — a reasonable proxy since
        // each team faces the rest of the league on a roughly equal schedule.
        reboundPercentage: reboundPercentage(
          t.totalRebounds,
          teamTotals.totalRebounds,
          estimatedOppReb,
        ),
        usageRate: usageRate(
          t.fieldGoalAttempts,
          t.freeThrowAttempts,
          t.turnovers,
          teamTotals.fieldGoalAttempts,
          teamTotals.freeThrowAttempts,
          teamTotals.turnovers,
        ),
        // Require opponent data — remain null in lightweight mode.
        stealPercentage: null,
        blockPercentage: null,
        gameScoreTotal: avgGmSc !== null ? avgGmSc * g : null,
        gameScoreAverage: avgGmSc,
        seasonStat: null,
        teamId,
        teamName,
      };
    });
}
