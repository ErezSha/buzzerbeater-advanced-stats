import type {
  BoxScore,
  Player,
  PlayerMetricSummary,
  PlayerSeasonStat,
} from "@/domain/types";
import { addPlayerStat, emptyTotals, shootingMetrics } from "@/domain/derive-utils";
import { gameScore, safeRatio, turnoverPercentage } from "@/domain/metrics";

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

  for (const boxScore of boxScores) {
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
    }
  }

  return players.map((player) => {
    const totals = statsByPlayer.get(player.id) ?? emptyTotals();
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
      shooting: shootingMetrics(totals),
      turnoverPercentage: turnoverPercentage(
        totals.turnovers,
        totals.fieldGoalAttempts,
        totals.freeThrowAttempts,
      ),
      gameScoreTotal,
      gameScoreAverage: safeRatio(gameScoreTotal, gameScores.length),
      seasonStat,
    };
  });
}
