import type {
  BoxScore,
  Player,
  PlayerGameStat,
  PlayerMetricSummary,
  PlayerSeasonStat,
  TeamGameStat,
} from "@/domain/types";
import {
  addPlayerStat,
  addStatTotals,
  emptyTotals,
  shootingMetrics,
  type StatTotals,
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
  isFiniteNumber,
  reboundPercentage,
  safeRatio,
  stealPercentage,
  turnoverPercentage,
  usageRate,
} from "@/domain/metrics";

/**
 * Defensive rebounds are usable when DRB is on the line, or when both TRB and
 * ORB are (the formulas fall back to TRB − ORB). Mirrors metrics.defensiveRebounds.
 */
function defensiveReboundsAvailable(line: {
  defensiveRebounds?: number | null;
  totalRebounds?: number | null;
  offensiveRebounds?: number | null;
}): boolean {
  return (
    isFiniteNumber(line.defensiveRebounds) ||
    (isFiniteNumber(line.totalRebounds) && isFiniteNumber(line.offensiveRebounds))
  );
}

function allFinite<T>(obj: T, keys: Array<keyof T>): boolean {
  return keys.every((key) => isFiniteNumber(obj[key]));
}

// Fields the ORtg/DRtg formulas read off each stat line. A game contributes to
// the ratings only when its box score carries all of them (see hasRatingFields),
// so one incomplete game no longer nullifies a player's season-long ratings.
const PLAYER_RATING_FIELDS: Array<keyof PlayerGameStat> = [
  "minutes",
  "points",
  "fieldGoals",
  "fieldGoalAttempts",
  "threePointMakes",
  "freeThrows",
  "freeThrowAttempts",
  "offensiveRebounds",
  "assists",
  "steals",
  "blocks",
  "turnovers",
  "fouls",
];
// `points` is checked on the raw box score below, not here: totalsFromTeamStat
// coerces a missing team/opponent points to 0, so it would always pass `allFinite`.
const TEAM_RATING_FIELDS: Array<keyof StatTotals> = [
  "minutes",
  "fieldGoals",
  "fieldGoalAttempts",
  "threePointMakes",
  "freeThrows",
  "freeThrowAttempts",
  "offensiveRebounds",
  "assists",
  "steals",
  "blocks",
  "turnovers",
  "fouls",
];
const OPP_RATING_FIELDS: Array<keyof StatTotals> = [
  "minutes",
  "fieldGoals",
  "fieldGoalAttempts",
  "freeThrows",
  "freeThrowAttempts",
  "offensiveRebounds",
  "turnovers",
];

/** Whether a single game has the complete field set the rating formulas need. */
function hasRatingFields(
  player: PlayerGameStat,
  team: StatTotals,
  teamRaw: TeamGameStat | null | undefined,
  opponent: StatTotals,
  opponentRaw: TeamGameStat | null | undefined,
): boolean {
  return (
    allFinite(player, PLAYER_RATING_FIELDS) &&
    defensiveReboundsAvailable(player) &&
    allFinite(team, TEAM_RATING_FIELDS) &&
    defensiveReboundsAvailable(team) &&
    isFiniteNumber(teamRaw?.points) &&
    allFinite(opponent, OPP_RATING_FIELDS) &&
    defensiveReboundsAvailable(opponent) &&
    isFiniteNumber(opponentRaw?.points)
  );
}

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
  // Parallel totals restricted to games with a complete box score, used solely
  // for the Dean Oliver ratings so partial data degrades the coverage count
  // rather than nulling the ratings outright.
  const ratingPlayerTotalsByPlayer = new Map<string, ReturnType<typeof emptyTotals>>();
  const ratingTeamTotalsByPlayer = new Map<string, ReturnType<typeof emptyTotals>>();
  const ratingOppTotalsByPlayer = new Map<string, ReturnType<typeof emptyTotals>>();
  const ratingGamesByPlayer = new Map<string, number>();
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
        const myTeamRaw = isHome ? boxScore.homeTeam : boxScore.awayTeam;
        const oppRaw = isHome ? boxScore.awayTeam : boxScore.homeTeam;
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

        // Only fold this game into the rating inputs when its box score is
        // complete; otherwise it would poison the whole-season totals.
        if (hasRatingFields(stat, myTeamTotals, myTeamRaw, oppTotals, oppRaw)) {
          ratingPlayerTotalsByPlayer.set(
            stat.playerId,
            addPlayerStat(ratingPlayerTotalsByPlayer.get(stat.playerId) ?? emptyTotals(), stat),
          );
          ratingTeamTotalsByPlayer.set(
            stat.playerId,
            addStatTotals(ratingTeamTotalsByPlayer.get(stat.playerId) ?? emptyTotals(), myTeamTotals),
          );
          ratingOppTotalsByPlayer.set(
            stat.playerId,
            addStatTotals(ratingOppTotalsByPlayer.get(stat.playerId) ?? emptyTotals(), oppTotals),
          );
          ratingGamesByPlayer.set(stat.playerId, (ratingGamesByPlayer.get(stat.playerId) ?? 0) + 1);
        }
      }
    }
  }

  return players.map((player) => {
    const totals = statsByPlayer.get(player.id) ?? emptyTotals();
    const teamTotals = teamTotalsByPlayer.get(player.id) ?? emptyTotals();
    const oppTotals = oppTotalsByPlayer.get(player.id) ?? emptyTotals();
    // Ratings draw from the complete-game subset (see hasRatingFields).
    const ratingPlayerTotals = ratingPlayerTotalsByPlayer.get(player.id) ?? emptyTotals();
    const ratingTeamTotals = ratingTeamTotalsByPlayer.get(player.id) ?? emptyTotals();
    const ratingOppTotals = ratingOppTotalsByPlayer.get(player.id) ?? emptyTotals();
    const ratingGames = ratingGamesByPlayer.get(player.id) ?? 0;
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
      offensiveRating: individualOffensiveRating(
        ratingPlayerTotals,
        ratingTeamTotals,
        ratingOppTotals,
      ),
      defensiveRating: individualDefensiveRating(
        ratingPlayerTotals,
        ratingTeamTotals,
        ratingOppTotals,
        estimatedPossessions(ratingTeamTotals),
      ),
      ratingGames,
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
