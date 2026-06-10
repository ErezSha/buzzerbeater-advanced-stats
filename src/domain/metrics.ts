export type NullableNumber = number | null;

export interface GameScoreInput {
  points?: number | null;
  fieldGoals?: number | null;
  fieldGoalAttempts?: number | null;
  freeThrows?: number | null;
  freeThrowAttempts?: number | null;
  offensiveRebounds?: number | null;
  defensiveRebounds?: number | null;
  steals?: number | null;
  assists?: number | null;
  blocks?: number | null;
  fouls?: number | null;
  turnovers?: number | null;
}

export interface PossessionInput {
  fieldGoalAttempts?: number | null;
  freeThrowAttempts?: number | null;
  offensiveRebounds?: number | null;
  turnovers?: number | null;
}

export function safeRatio(
  numerator: number | null | undefined,
  denominator: number | null | undefined,
): NullableNumber {
  if (!isFiniteNumber(numerator) || !isFiniteNumber(denominator) || denominator === 0) {
    return null;
  }

  return numerator / denominator;
}

export function fieldGoalPercentage(
  makes: number | null | undefined,
  attempts: number | null | undefined,
): NullableNumber {
  return safeRatio(makes, attempts);
}

export function effectiveFieldGoalPercentage(
  fieldGoals: number | null | undefined,
  threePointMakes: number | null | undefined,
  fieldGoalAttempts: number | null | undefined,
): NullableNumber {
  if (
    !isFiniteNumber(fieldGoals) ||
    !isFiniteNumber(threePointMakes) ||
    !isFiniteNumber(fieldGoalAttempts) ||
    fieldGoalAttempts === 0
  ) {
    return null;
  }

  return (fieldGoals + 0.5 * threePointMakes) / fieldGoalAttempts;
}

export function trueShootingAttempts(
  fieldGoalAttempts: number | null | undefined,
  freeThrowAttempts: number | null | undefined,
): NullableNumber {
  if (!isFiniteNumber(fieldGoalAttempts) || !isFiniteNumber(freeThrowAttempts)) {
    return null;
  }

  return fieldGoalAttempts + 0.44 * freeThrowAttempts;
}

export function trueShootingPercentage(
  points: number | null | undefined,
  fieldGoalAttempts: number | null | undefined,
  freeThrowAttempts: number | null | undefined,
): NullableNumber {
  const attempts = trueShootingAttempts(fieldGoalAttempts, freeThrowAttempts);

  if (!isFiniteNumber(points) || !isFiniteNumber(attempts) || attempts === 0) {
    return null;
  }

  return points / (2 * attempts);
}

export function turnoverPercentage(
  turnovers: number | null | undefined,
  fieldGoalAttempts: number | null | undefined,
  freeThrowAttempts: number | null | undefined,
): NullableNumber {
  const attempts = trueShootingAttempts(fieldGoalAttempts, freeThrowAttempts);

  if (!isFiniteNumber(turnovers) || !isFiniteNumber(attempts)) {
    return null;
  }

  return safeRatio(turnovers, attempts + turnovers);
}

export function gameScore(input: GameScoreInput): NullableNumber {
  const values = [
    input.points,
    input.fieldGoals,
    input.fieldGoalAttempts,
    input.freeThrows,
    input.freeThrowAttempts,
    input.offensiveRebounds,
    input.defensiveRebounds,
    input.steals,
    input.assists,
    input.blocks,
    input.fouls,
    input.turnovers,
  ];

  if (!values.every(isFiniteNumber)) {
    return null;
  }

  const {
    points,
    fieldGoals,
    fieldGoalAttempts,
    freeThrows,
    freeThrowAttempts,
    offensiveRebounds,
    defensiveRebounds,
    steals,
    assists,
    blocks,
    fouls,
    turnovers,
  } = input as {
    points: number;
    fieldGoals: number;
    fieldGoalAttempts: number;
    freeThrows: number;
    freeThrowAttempts: number;
    offensiveRebounds: number;
    defensiveRebounds: number;
    steals: number;
    assists: number;
    blocks: number;
    fouls: number;
    turnovers: number;
  };

  return (
    points +
    0.4 * fieldGoals -
    0.7 * fieldGoalAttempts -
    0.4 * (freeThrowAttempts - freeThrows) +
    0.7 * offensiveRebounds +
    0.3 * defensiveRebounds +
    steals +
    0.7 * assists +
    0.7 * blocks -
    0.4 * fouls -
    turnovers
  );
}

/**
 * The on-court minutes share `MP / (Tm MP / 5)` used by Basketball-Reference's
 * player rate stats (AST%, BLK%, STL%, TRB%, Usg%). Equivalent to `5 * MP / Tm MP`,
 * i.e. the fraction of the team's available on-court time the player was on the
 * floor. Returns null when minutes are unavailable so dependent stats degrade to
 * "Unavailable" rather than reporting an un-normalized value.
 */
export function minutesShare(
  playerMinutes: number | null | undefined,
  teamMinutes: number | null | undefined,
): NullableNumber {
  if (!isFiniteNumber(playerMinutes) || !isFiniteNumber(teamMinutes)) {
    return null;
  }

  return safeRatio(5 * playerMinutes, teamMinutes);
}

export function assistPercentage(
  assists: number | null | undefined,
  teamFieldGoals: number | null | undefined,
  playerFieldGoals: number | null | undefined,
  playerMinutes: number | null | undefined,
  teamMinutes: number | null | undefined,
): NullableNumber {
  const share = minutesShare(playerMinutes, teamMinutes);

  if (
    !isFiniteNumber(assists) ||
    !isFiniteNumber(teamFieldGoals) ||
    !isFiniteNumber(playerFieldGoals) ||
    !isFiniteNumber(share)
  ) {
    return null;
  }

  return safeRatio(assists, share * teamFieldGoals - playerFieldGoals);
}

export function blockPercentage(
  blocks: number | null | undefined,
  oppFieldGoalAttempts: number | null | undefined,
  oppThreePointAttempts: number | null | undefined,
  playerMinutes: number | null | undefined,
  teamMinutes: number | null | undefined,
): NullableNumber {
  const share = minutesShare(playerMinutes, teamMinutes);

  if (!isFiniteNumber(blocks) || !isFiniteNumber(oppFieldGoalAttempts) || !isFiniteNumber(share)) {
    return null;
  }

  const opp2PA = isFiniteNumber(oppThreePointAttempts)
    ? oppFieldGoalAttempts - oppThreePointAttempts
    : oppFieldGoalAttempts;

  return safeRatio(blocks, share * opp2PA);
}

export function stealPercentage(
  steals: number | null | undefined,
  oppFieldGoalAttempts: number | null | undefined,
  oppFreeThrowAttempts: number | null | undefined,
  oppOffensiveRebounds: number | null | undefined,
  oppTurnovers: number | null | undefined,
  playerMinutes: number | null | undefined,
  teamMinutes: number | null | undefined,
): NullableNumber {
  const share = minutesShare(playerMinutes, teamMinutes);

  if (!isFiniteNumber(steals) || !isFiniteNumber(share)) {
    return null;
  }

  // Opponent possessions use the simplified single-team estimate (see
  // estimatedPossessions); the full Dean Oliver averaged formula is an
  // intentional, documented deviation from the reference glossary.
  const oppPossessions = estimatedPossessions({
    fieldGoalAttempts: oppFieldGoalAttempts,
    freeThrowAttempts: oppFreeThrowAttempts,
    offensiveRebounds: oppOffensiveRebounds,
    turnovers: oppTurnovers,
  });

  if (!isFiniteNumber(oppPossessions)) {
    return null;
  }

  return safeRatio(steals, share * oppPossessions);
}

export function reboundPercentage(
  playerRebounds: number | null | undefined,
  teamRebounds: number | null | undefined,
  oppRebounds: number | null | undefined,
  playerMinutes: number | null | undefined,
  teamMinutes: number | null | undefined,
): NullableNumber {
  const share = minutesShare(playerMinutes, teamMinutes);

  if (
    !isFiniteNumber(playerRebounds) ||
    !isFiniteNumber(teamRebounds) ||
    !isFiniteNumber(oppRebounds) ||
    !isFiniteNumber(share)
  ) {
    return null;
  }

  return safeRatio(playerRebounds, share * (teamRebounds + oppRebounds));
}

export function usageRate(
  playerFieldGoalAttempts: number | null | undefined,
  playerFreeThrowAttempts: number | null | undefined,
  playerTurnovers: number | null | undefined,
  teamFieldGoalAttempts: number | null | undefined,
  teamFreeThrowAttempts: number | null | undefined,
  teamTurnovers: number | null | undefined,
  playerMinutes: number | null | undefined,
  teamMinutes: number | null | undefined,
): NullableNumber {
  const playerUsage = trueShootingAttempts(playerFieldGoalAttempts, playerFreeThrowAttempts);
  const teamUsage = trueShootingAttempts(teamFieldGoalAttempts, teamFreeThrowAttempts);
  const share = minutesShare(playerMinutes, teamMinutes);

  if (
    !isFiniteNumber(playerUsage) ||
    !isFiniteNumber(playerTurnovers) ||
    !isFiniteNumber(teamUsage) ||
    !isFiniteNumber(teamTurnovers) ||
    !isFiniteNumber(share)
  ) {
    return null;
  }

  return safeRatio(playerUsage + playerTurnovers, share * (teamUsage + teamTurnovers));
}

export function estimatedPossessions(input: PossessionInput): NullableNumber {
  if (
    !isFiniteNumber(input.fieldGoalAttempts) ||
    !isFiniteNumber(input.freeThrowAttempts) ||
    !isFiniteNumber(input.offensiveRebounds) ||
    !isFiniteNumber(input.turnovers)
  ) {
    return null;
  }

  return (
    input.fieldGoalAttempts +
    0.44 * input.freeThrowAttempts -
    input.offensiveRebounds +
    input.turnovers
  );
}

export function offensiveRating(
  points: number | null | undefined,
  possessions: number | null | undefined,
): NullableNumber {
  return safeRatio(isFiniteNumber(points) ? 100 * points : points, possessions);
}

export function defensiveRating(
  opponentPoints: number | null | undefined,
  possessions: number | null | undefined,
): NullableNumber {
  return safeRatio(
    isFiniteNumber(opponentPoints) ? 100 * opponentPoints : opponentPoints,
    possessions,
  );
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export interface FeatInput {
  points?: number | null;
  totalRebounds?: number | null;
  assists?: number | null;
  steals?: number | null;
  blocks?: number | null;
}

export interface FeatFlags {
  isDoubleDouble: boolean;
  isTripleDouble: boolean;
  isQuadrupleDouble: boolean;
  isFiveByFive: boolean;
}

export function detectFeat(stat: FeatInput): FeatFlags {
  const cats = [stat.points, stat.totalRebounds, stat.assists, stat.steals, stat.blocks];
  const doubleDigits = cats.filter((v) => (v ?? 0) >= 10).length;
  const isFiveByFive = cats.every((v) => (v ?? 0) >= 5);
  return {
    isDoubleDouble: doubleDigits >= 2,
    isTripleDouble: doubleDigits >= 3,
    isQuadrupleDouble: doubleDigits >= 4,
    isFiveByFive,
  };
}

// Dean Oliver's basketball exponent (Basketball on Paper, 2004), calibrated
// against NBA seasons (~200 combined pts/game). BuzzerBeater runs higher-scoring
// than the NBA, so this likely under-estimates separation — tune once multi-season
// data is available. See pythagoreanWins() below.
const PYTHAGOREAN_EXPONENT = 16.5;

// Pythagorean wins: expected W-L from scoring efficiency.
export function pythagoreanWins(
  pointsFor: number | null | undefined,
  pointsAgainst: number | null | undefined,
  games: number,
): NullableNumber {
  if (
    !isFiniteNumber(pointsFor) ||
    !isFiniteNumber(pointsAgainst) ||
    pointsFor <= 0 ||
    pointsAgainst <= 0 ||
    games === 0
  ) {
    return null;
  }
  const pfe = Math.pow(pointsFor, PYTHAGOREAN_EXPONENT);
  return (games * pfe) / (pfe + Math.pow(pointsAgainst, PYTHAGOREAN_EXPONENT));
}
