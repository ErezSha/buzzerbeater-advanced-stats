import type {
  BoxScore,
  Match,
  Team,
  TeamGameMetrics,
  TeamSeasonMetrics,
} from "@/domain/types";
import {
  addPlayerStat,
  average,
  emptyTotals,
  freeThrowRate,
  shootingMetrics,
  totalsFromTeamStat,
  type StatTotals,
} from "@/domain/derive-utils";
import {
  defensiveRating,
  estimatedPossessions,
  offensiveRating,
  safeRatio,
  turnoverPercentage,
} from "@/domain/metrics";

export function deriveTeamGameMetrics(
  team: Team,
  matches: Match[],
  boxScores: BoxScore[],
): TeamGameMetrics[] {
  const matchesById = new Map(matches.map((match) => [match.id, match]));

  return boxScores.flatMap((boxScore) => {
    const match = matchesById.get(boxScore.matchId);
    const teamTotals = totalsForTeam(boxScore, team.id);
    const opponentTotals = totalsForOpponent(boxScore, team.id);

    if (!match || !teamTotals) {
      return [];
    }

    // Find the raw TeamGameStat for our team to pull strategy/effort strings.
    const rawTeamStat =
      boxScore.homeTeam?.teamId === team.id
        ? boxScore.homeTeam
        : boxScore.awayTeam?.teamId === team.id
          ? boxScore.awayTeam
          : null;

    return [
      {
        ...deriveTeamGameMetric({ match, teamTotals, opponentTotals }),
        offStrategy: rawTeamStat?.offStrategy ?? null,
        defStrategy: rawTeamStat?.defStrategy ?? null,
        effort: rawTeamStat?.effort ?? null,
      },
    ];
  });
}

export function deriveTeamSeasonMetrics(games: TeamGameMetrics[]): TeamSeasonMetrics {
  const totals = games.reduce(
    (record, game) => ({
      points: record.points + (game.points ?? 0),
      opponentPoints: record.opponentPoints + (game.opponentPoints ?? 0),
      wins: record.wins + (game.margin !== null && game.margin > 0 ? 1 : 0),
      losses: record.losses + (game.margin !== null && game.margin < 0 ? 1 : 0),
    }),
    { points: 0, opponentPoints: 0, wins: 0, losses: 0 },
  );

  return {
    games: games.length,
    wins: totals.wins,
    losses: totals.losses,
    pointsPerGame: safeRatio(totals.points, games.length),
    opponentPointsPerGame: safeRatio(totals.opponentPoints, games.length),
    averageMargin: average(games.map((game) => game.margin)),
    averagePossessions: average(games.map((game) => game.possessions)),
    offensiveRating: average(games.map((game) => game.offensiveRating)),
    defensiveRating: average(games.map((game) => game.defensiveRating)),
    shooting: {
      fieldGoalPercentage: average(
        games.map((game) => game.shooting.fieldGoalPercentage),
      ),
      twoPointPercentage: average(
        games.map((game) => game.shooting.twoPointPercentage),
      ),
      threePointPercentage: average(
        games.map((game) => game.shooting.threePointPercentage),
      ),
      freeThrowPercentage: average(
        games.map((game) => game.shooting.freeThrowPercentage),
      ),
      effectiveFieldGoalPercentage: average(
        games.map((game) => game.shooting.effectiveFieldGoalPercentage),
      ),
      trueShootingAttempts: average(
        games.map((game) => game.shooting.trueShootingAttempts),
      ),
      trueShootingPercentage: average(
        games.map((game) => game.shooting.trueShootingPercentage),
      ),
    },
    turnoverPercentage: average(games.map((game) => game.turnoverPercentage)),
    offensiveReboundPercentage: average(
      games.map((game) => game.offensiveReboundPercentage),
    ),
    freeThrowRate: average(games.map((game) => game.freeThrowRate)),
  };
}

function deriveTeamGameMetric(input: {
  match: Match;
  teamTotals: StatTotals;
  opponentTotals: StatTotals | null;
}): TeamGameMetrics {
  const { match, teamTotals, opponentTotals } = input;
  const possessions = estimatedPossessions(teamTotals);
  const opponentPoints = opponentTotals?.points ?? null;
  const points = teamTotals.points;

  return {
    matchId: match.id,
    date: match.date,
    opponentName: match.opponentName,
    matchType: match.type,
    points,
    opponentPoints,
    margin: opponentPoints !== null ? points - opponentPoints : null,
    possessions,
    pace: possessions,
    offensiveRating: offensiveRating(points, possessions),
    defensiveRating: defensiveRating(opponentPoints, possessions),
    shooting: shootingMetrics(teamTotals),
    turnoverPercentage: turnoverPercentage(
      teamTotals.turnovers,
      teamTotals.fieldGoalAttempts,
      teamTotals.freeThrowAttempts,
    ),
    offensiveReboundPercentage: safeRatio(
      teamTotals.offensiveRebounds,
      (teamTotals.offensiveRebounds ?? 0) + (opponentTotals?.defensiveRebounds ?? 0),
    ),
    freeThrowRate: freeThrowRate(teamTotals),
  };
}

function totalsForTeam(boxScore: BoxScore, teamId: string): StatTotals | null {
  const explicitTeam =
    boxScore.homeTeam?.teamId === teamId
      ? boxScore.homeTeam
      : boxScore.awayTeam?.teamId === teamId
        ? boxScore.awayTeam
        : null;
  const playerTotals = boxScore.players
    .filter((stat) => stat.teamId === teamId)
    .reduce(addPlayerStat, emptyTotals());

  if (playerTotals.fieldGoalAttempts !== 0 || playerTotals.points !== 0) {
    return playerTotals;
  }

  return explicitTeam ? totalsFromTeamStat(explicitTeam) : null;
}

function totalsForOpponent(boxScore: BoxScore, teamId: string): StatTotals | null {
  const explicitTeam =
    boxScore.homeTeam?.teamId && boxScore.homeTeam.teamId !== teamId
      ? boxScore.homeTeam
      : boxScore.awayTeam?.teamId && boxScore.awayTeam.teamId !== teamId
        ? boxScore.awayTeam
        : null;
  const playerTotals = boxScore.players
    .filter((stat) => stat.teamId && stat.teamId !== teamId)
    .reduce(addPlayerStat, emptyTotals());

  if (playerTotals.fieldGoalAttempts !== 0 || playerTotals.points !== 0) {
    return playerTotals;
  }

  return explicitTeam ? totalsFromTeamStat(explicitTeam) : null;
}
