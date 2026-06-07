import type {
  BoxScore,
  Player,
  PlayerMetricSummary,
  PlayerSeasonStat,
} from "@/domain/types";
import {
  addPlayerStat,
  addStatTotals,
  emptyTotals,
  shootingMetrics,
  totalsFromTeamStat,
} from "@/domain/derive-utils";
import {
  assistPercentage,
  blockPercentage,
  gameScore,
  reboundPercentage,
  safeRatio,
  stealPercentage,
  turnoverPercentage,
  usageRate,
} from "@/domain/metrics";

export function derivePlayerMetricSummaries(
  players: Player[],
  playerSeasonStats: PlayerSeasonStat[],
  boxScores: BoxScore[],
): PlayerMetricSummary[] {
  const seasonStatsByPlayer = new Map(
    playerSeasonStats.map((stat) => [stat.playerId, stat]),
  );
  const statsByPlayer = new Map<string, ReturnType<typeof emptyTotals>>();
  const gamesByPlayer = new Map<string, Set<string>>();
  const gameScoresByPlayer = new Map<string, number[]>();
  const teamTotalsByPlayer = new Map<string, ReturnType<typeof emptyTotals>>();
  const oppTotalsByPlayer = new Map<string, ReturnType<typeof emptyTotals>>();

  for (const boxScore of boxScores) {
    const homeTeamTotals = totalsFromTeamStat(boxScore.homeTeam);
    const awayTeamTotals = totalsFromTeamStat(boxScore.awayTeam);
    const homeTeamId = boxScore.homeTeam?.teamId ?? null;
    const awayTeamId = boxScore.awayTeam?.teamId ?? null;

    for (const stat of boxScore.players) {
      const totals = statsByPlayer.get(stat.playerId) ?? emptyTotals();
      statsByPlayer.set(stat.playerId, addPlayerStat(totals, stat));

      const games = gamesByPlayer.get(stat.playerId) ?? new Set<string>();
      games.add(stat.matchId);
      gamesByPlayer.set(stat.playerId, games);

      const score = gameScore(stat);
      if (score !== null) {
        const scores = gameScoresByPlayer.get(stat.playerId) ?? [];
        scores.push(score);
        gameScoresByPlayer.set(stat.playerId, scores);
      }

      if (stat.teamId && (homeTeamId || awayTeamId)) {
        const isHome = stat.teamId === homeTeamId;
        const myTeamTotals = isHome ? homeTeamTotals : awayTeamTotals;
        const oppTotals = isHome ? awayTeamTotals : homeTeamTotals;

        const existingTeam = teamTotalsByPlayer.get(stat.playerId) ?? emptyTotals();
        teamTotalsByPlayer.set(stat.playerId, addStatTotals(existingTeam, myTeamTotals));

        const existingOpp = oppTotalsByPlayer.get(stat.playerId) ?? emptyTotals();
        oppTotalsByPlayer.set(stat.playerId, addStatTotals(existingOpp, oppTotals));
      }
    }
  }

  return players.map((player) => {
    const totals = statsByPlayer.get(player.id) ?? emptyTotals();
    const teamTotals = teamTotalsByPlayer.get(player.id) ?? emptyTotals();
    const oppTotals = oppTotalsByPlayer.get(player.id) ?? emptyTotals();
    const seasonStat = seasonStatsByPlayer.get(player.id) ?? null;
    const gameScores = gameScoresByPlayer.get(player.id) ?? [];
    const gameScoreTotal =
      gameScores.length > 0
        ? gameScores.reduce((sum, score) => sum + score, 0)
        : null;

    return {
      playerId: player.id,
      name: player.name,
      position: player.position,
      rosterStatus: player.rosterStatus,
      games: gamesByPlayer.get(player.id)?.size ?? seasonStat?.games ?? 0,
      minutes: totals.minutes,
      points: totals.points,
      rebounds: totals.totalRebounds ?? 0,
      assists: totals.assists ?? 0,
      steals: totals.steals ?? 0,
      blocks: totals.blocks ?? 0,
      turnovers: totals.turnovers ?? 0,
      fouls: totals.fouls ?? 0,
      shooting: shootingMetrics(totals),
      turnoverPercentage: turnoverPercentage(
        totals.turnovers,
        totals.fieldGoalAttempts,
        totals.freeThrowAttempts,
      ),
      assistPercentage: assistPercentage(
        totals.assists,
        teamTotals.fieldGoals,
        totals.fieldGoals,
      ),
      blockPercentage: blockPercentage(
        totals.blocks,
        oppTotals.fieldGoalAttempts,
        oppTotals.threePointAttempts,
      ),
      stealPercentage: stealPercentage(
        totals.steals,
        oppTotals.fieldGoalAttempts,
        oppTotals.freeThrowAttempts,
        oppTotals.offensiveRebounds,
        oppTotals.turnovers,
      ),
      reboundPercentage: reboundPercentage(
        totals.totalRebounds,
        teamTotals.totalRebounds,
        oppTotals.totalRebounds,
      ),
      usageRate: usageRate(
        totals.fieldGoalAttempts,
        totals.freeThrowAttempts,
        totals.turnovers,
        teamTotals.fieldGoalAttempts,
        teamTotals.freeThrowAttempts,
        teamTotals.turnovers,
      ),
      gameScoreTotal,
      gameScoreAverage: safeRatio(gameScoreTotal, gameScores.length),
      seasonStat,
    };
  });
}
