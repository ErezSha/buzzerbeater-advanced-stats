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

export function assistPercentage(
  assists: number | null | undefined,
  teamFieldGoals: number | null | undefined,
  playerFieldGoals: number | null | undefined,
): NullableNumber {
  if (!isFiniteNumber(assists) || !isFiniteNumber(teamFieldGoals) || !isFiniteNumber(playerFieldGoals)) {
    return null;
  }

  return safeRatio(assists, teamFieldGoals - playerFieldGoals);
}

export function blockPercentage(
  blocks: number | null | undefined,
  oppFieldGoalAttempts: number | null | undefined,
  oppThreePointAttempts: number | null | undefined,
): NullableNumber {
  if (!isFiniteNumber(blocks) || !isFiniteNumber(oppFieldGoalAttempts)) {
    return null;
  }

  const opp2PA = isFiniteNumber(oppThreePointAttempts)
    ? oppFieldGoalAttempts - oppThreePointAttempts
    : oppFieldGoalAttempts;

  return safeRatio(blocks, opp2PA);
}

export function stealPercentage(
  steals: number | null | undefined,
  oppFieldGoalAttempts: number | null | undefined,
  oppFreeThrowAttempts: number | null | undefined,
  oppOffensiveRebounds: number | null | undefined,
  oppTurnovers: number | null | undefined,
): NullableNumber {
  if (!isFiniteNumber(steals)) {
    return null;
  }

  const oppPossessions = estimatedPossessions({
    fieldGoalAttempts: oppFieldGoalAttempts,
    freeThrowAttempts: oppFreeThrowAttempts,
    offensiveRebounds: oppOffensiveRebounds,
    turnovers: oppTurnovers,
  });

  return safeRatio(steals, oppPossessions);
}

export function reboundPercentage(
  playerRebounds: number | null | undefined,
  teamRebounds: number | null | undefined,
  oppRebounds: number | null | undefined,
): NullableNumber {
  if (!isFiniteNumber(playerRebounds) || !isFiniteNumber(teamRebounds) || !isFiniteNumber(oppRebounds)) {
    return null;
  }

  return safeRatio(playerRebounds, teamRebounds + oppRebounds);
}

export function usageRate(
  playerFieldGoalAttempts: number | null | undefined,
  playerFreeThrowAttempts: number | null | undefined,
  playerTurnovers: number | null | undefined,
  teamFieldGoalAttempts: number | null | undefined,
  teamFreeThrowAttempts: number | null | undefined,
  teamTurnovers: number | null | undefined,
): NullableNumber {
  const playerUsage = trueShootingAttempts(playerFieldGoalAttempts, playerFreeThrowAttempts);
  const teamUsage = trueShootingAttempts(teamFieldGoalAttempts, teamFreeThrowAttempts);

  if (
    !isFiniteNumber(playerUsage) ||
    !isFiniteNumber(playerTurnovers) ||
    !isFiniteNumber(teamUsage) ||
    !isFiniteNumber(teamTurnovers)
  ) {
    return null;
  }

  return safeRatio(playerUsage + playerTurnovers, teamUsage + teamTurnovers);
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
