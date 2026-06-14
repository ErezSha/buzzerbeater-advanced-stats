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
  detectFeat,
  estimatedPossessions,
  gameScore,
  individualDefensiveRating,
  individualOffensiveRating,
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
  const plusMinusByPlayer = new Map<string, number>();
  const featsByPlayer = new Map<string, { dd: number; td: number; qd: number; fiveX5: number }>();

  for (const boxScore of boxScores) {
    const homeTeamTotals = totalsFromTeamStat(boxScore.homeTeam);
    const awayTeamTotals = totalsFromTeamStat(boxScore.awayTeam);
    const homeTeamId = boxScore.homeTeam?.teamId ?? null;
    const awayTeamId = boxScore.awayTeam?.teamId ?? null;

    // Team minutes (Tm MP) are not on the team-totals payload, so recover them
    // by summing each side's player minutes. Needed for the minutes-share factor
    // in AST%, BLK%, STL%, TRB%, and Usg%.
    const teamMinutesById = new Map<string, number>();
    for (const player of boxScore.players) {
      if (player.teamId != null && player.minutes != null) {
        teamMinutesById.set(
          player.teamId,
          (teamMinutesById.get(player.teamId) ?? 0) + player.minutes,
        );
      }
    }

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

      if (stat.plusMinus !== null && stat.plusMinus !== undefined) {
        plusMinusByPlayer.set(
          stat.playerId,
          (plusMinusByPlayer.get(stat.playerId) ?? 0) + stat.plusMinus,
        );
      }

      const feat = detectFeat(stat);
      const feats = featsByPlayer.get(stat.playerId) ?? { dd: 0, td: 0, qd: 0, fiveX5: 0 };
      featsByPlayer.set(stat.playerId, {
        dd: feats.dd + (feat.isDoubleDouble ? 1 : 0),
        td: feats.td + (feat.isTripleDouble ? 1 : 0),
        qd: feats.qd + (feat.isQuadrupleDouble ? 1 : 0),
        fiveX5: feats.fiveX5 + (feat.isFiveByFive ? 1 : 0),
      });

      if (stat.teamId && (homeTeamId || awayTeamId)) {
        const isHome = stat.teamId === homeTeamId;
        const myTeamTotals = {
          ...(isHome ? homeTeamTotals : awayTeamTotals),
          minutes: teamMinutesById.get(stat.teamId) ?? null,
        };
        // Opponent minutes (Opp MP) are needed for the individual DRtg Stop%
        // term; recover them the same way as team minutes.
        const oppTeamId = isHome ? awayTeamId : homeTeamId;
        const oppTotals = {
          ...(isHome ? awayTeamTotals : homeTeamTotals),
          minutes: oppTeamId ? teamMinutesById.get(oppTeamId) ?? null : null,
        };

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
        totals.minutes,
        teamTotals.minutes,
      ),
      blockPercentage: blockPercentage(
        totals.blocks,
        oppTotals.fieldGoalAttempts,
        oppTotals.threePointAttempts,
        totals.minutes,
        teamTotals.minutes,
      ),
      stealPercentage: stealPercentage(
        totals.steals,
        oppTotals.fieldGoalAttempts,
        oppTotals.freeThrowAttempts,
        oppTotals.offensiveRebounds,
        oppTotals.turnovers,
        totals.minutes,
        teamTotals.minutes,
      ),
      reboundPercentage: reboundPercentage(
        totals.totalRebounds,
        teamTotals.totalRebounds,
        oppTotals.totalRebounds,
        totals.minutes,
        teamTotals.minutes,
      ),
      usageRate: usageRate(
        totals.fieldGoalAttempts,
        totals.freeThrowAttempts,
        totals.turnovers,
        teamTotals.fieldGoalAttempts,
        teamTotals.freeThrowAttempts,
        teamTotals.turnovers,
        totals.minutes,
        teamTotals.minutes,
      ),
      offensiveRating: individualOffensiveRating(totals, teamTotals, oppTotals),
      defensiveRating: individualDefensiveRating(
        totals,
        teamTotals,
        oppTotals,
        estimatedPossessions(teamTotals),
      ),
      gameScoreTotal,
      gameScoreAverage: safeRatio(gameScoreTotal, gameScores.length),
      plusMinus: plusMinusByPlayer.get(player.id) ?? null,
      doubleDoubles: featsByPlayer.get(player.id)?.dd ?? 0,
      tripleDoubles: featsByPlayer.get(player.id)?.td ?? 0,
      quadrupleDoubles: featsByPlayer.get(player.id)?.qd ?? 0,
      fiveByFives: featsByPlayer.get(player.id)?.fiveX5 ?? 0,
      seasonStat,
    };
  });
}
