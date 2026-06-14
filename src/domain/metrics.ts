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

// ---------------------------------------------------------------------------
// Individual Offensive / Defensive Rating (Dean Oliver, Basketball on Paper)
//
// Box-score estimates — no play-by-play needed. See
// docs/references/individual-ORtg-DRtg.md for the source formulas. All three
// operands are season-cumulative stat lines (the player, the player's team, and
// the opponents faced); ratings are computed from the aggregated totals, the
// same way Basketball-Reference produces season ORtg/DRtg.
//
// MP / Tm MP here are BuzzerBeater's per-position-summed minutes (~240 per game),
// matching the convention already used by minutesShare() and the rate stats.
//
// Every intermediate returns null the moment a required input is missing or a
// denominator is 0, so nulls cascade to the final rating.
// ---------------------------------------------------------------------------

export interface RatingStatLine {
  minutes?: number | null;
  points?: number | null;
  fieldGoals?: number | null;
  fieldGoalAttempts?: number | null;
  threePointMakes?: number | null;
  freeThrows?: number | null;
  freeThrowAttempts?: number | null;
  offensiveRebounds?: number | null;
  defensiveRebounds?: number | null;
  totalRebounds?: number | null;
  assists?: number | null;
  steals?: number | null;
  blocks?: number | null;
  turnovers?: number | null;
  fouls?: number | null;
}

/** Defensive rebounds, falling back to TRB − ORB when DRB isn't on the line. */
function defensiveRebounds(line: RatingStatLine): NullableNumber {
  if (isFiniteNumber(line.defensiveRebounds)) {
    return line.defensiveRebounds;
  }
  if (isFiniteNumber(line.totalRebounds) && isFiniteNumber(line.offensiveRebounds)) {
    return line.totalRebounds - line.offensiveRebounds;
  }
  return null;
}

/** `(1 - makes/attempts)^2`, the missed-FT factor shared by several terms. */
function missWeight(makes: number, attempts: number): number {
  return Math.pow(1 - makes / attempts, 2);
}

interface TeamOffenseContext {
  teamScoringPoss: number; // Team_Scoring_Poss
  teamPlayPct: number; // Team_Play%
  teamOrbPct: number; // Team_ORB%
  teamOrbWeight: number; // Team_ORB_Weight
}

/** Team-level factors reused across ScPoss, TotPoss, and PProd. */
function teamOffenseContext(
  team: RatingStatLine,
  opponent: RatingStatLine,
): TeamOffenseContext | null {
  const teamFgm = team.fieldGoals;
  const teamFga = team.fieldGoalAttempts;
  const teamFtm = team.freeThrows;
  const teamFta = team.freeThrowAttempts;
  const teamTov = team.turnovers;
  const teamOrb = team.offensiveRebounds;
  const oppDrb = defensiveRebounds(opponent);

  if (
    !isFiniteNumber(teamFgm) ||
    !isFiniteNumber(teamFga) ||
    !isFiniteNumber(teamFtm) ||
    !isFiniteNumber(teamFta) ||
    !isFiniteNumber(teamTov) ||
    !isFiniteNumber(teamOrb) ||
    !isFiniteNumber(oppDrb) ||
    teamFta === 0
  ) {
    return null;
  }

  const teamScoringPoss = teamFgm + (1 - missWeight(teamFtm, teamFta)) * teamFta * 0.4;

  const playDenom = teamFga + teamFta * 0.4 + teamTov;
  const orbDenom = teamOrb + oppDrb;
  if (playDenom === 0 || orbDenom === 0) {
    return null;
  }
  const teamPlayPct = teamScoringPoss / playDenom;
  const teamOrbPct = teamOrb / orbDenom;

  const weightDenom = (1 - teamOrbPct) * teamPlayPct + teamOrbPct * (1 - teamPlayPct);
  if (weightDenom === 0) {
    return null;
  }
  const teamOrbWeight = ((1 - teamOrbPct) * teamPlayPct) / weightDenom;

  return { teamScoringPoss, teamPlayPct, teamOrbPct, teamOrbWeight };
}

/** qAST — share of the player's made FGs that were assisted by teammates. */
function qAssist(player: RatingStatLine, team: RatingStatLine): NullableNumber {
  const mp = player.minutes;
  const ast = player.assists;
  const fgm = player.fieldGoals;
  const teamMp = team.minutes;
  const teamAst = team.assists;
  const teamFgm = team.fieldGoals;

  if (
    !isFiniteNumber(mp) ||
    !isFiniteNumber(ast) ||
    !isFiniteNumber(fgm) ||
    !isFiniteNumber(teamMp) ||
    !isFiniteNumber(teamAst) ||
    !isFiniteNumber(teamFgm) ||
    teamMp === 0 ||
    teamFgm === 0
  ) {
    return null;
  }

  const share = mp / (teamMp / 5); // MP / (Team_MP / 5)
  const term1 = share * (1.14 * ((teamAst - ast) / teamFgm));

  const denom2 = (teamFgm / teamMp) * mp * 5 - fgm;
  if (denom2 === 0) {
    return null;
  }
  const numer2 = (teamAst / teamMp) * mp * 5 - ast;
  const term2 = (numer2 / denom2) * (1 - share);

  return term1 + term2;
}

/** Scoring Possessions (ScPoss) — possessions the player ends by scoring. */
export function scoringPossessions(
  player: RatingStatLine,
  team: RatingStatLine,
  opponent: RatingStatLine,
): NullableNumber {
  const ctx = teamOffenseContext(team, opponent);
  const qast = qAssist(player, team);
  const fgm = player.fieldGoals;
  const fga = player.fieldGoalAttempts;
  const ftm = player.freeThrows;
  const fta = player.freeThrowAttempts;
  const pts = player.points;
  const ast = player.assists;
  const orb = player.offensiveRebounds;
  const teamPts = team.points;
  const teamFtm = team.freeThrows;
  const teamFga = team.fieldGoalAttempts;
  const teamOrb = team.offensiveRebounds;

  if (
    ctx === null ||
    !isFiniteNumber(qast) ||
    !isFiniteNumber(fgm) ||
    !isFiniteNumber(fga) ||
    !isFiniteNumber(ftm) ||
    !isFiniteNumber(fta) ||
    !isFiniteNumber(pts) ||
    !isFiniteNumber(ast) ||
    !isFiniteNumber(orb) ||
    !isFiniteNumber(teamPts) ||
    !isFiniteNumber(teamFtm) ||
    !isFiniteNumber(teamFga) ||
    !isFiniteNumber(teamOrb) ||
    fga === 0 ||
    ctx.teamScoringPoss === 0
  ) {
    return null;
  }

  const fgPart = fgm * (1 - 0.5 * ((pts - ftm) / (2 * fga)) * qast);

  const astDenom = 2 * (teamFga - fga);
  if (astDenom === 0) {
    return null;
  }
  const astPart = 0.5 * ((teamPts - teamFtm - (pts - ftm)) / astDenom) * ast;

  // No FTAs contribute no scoring possessions from the line.
  const ftPart = fta === 0 ? 0 : (1 - missWeight(ftm, fta)) * 0.4 * fta;

  const orbPart = orb * ctx.teamOrbWeight * ctx.teamPlayPct;

  return (
    (fgPart + astPart + ftPart) *
      (1 - (teamOrb / ctx.teamScoringPoss) * ctx.teamOrbWeight * ctx.teamPlayPct) +
    orbPart
  );
}

/** Individual Total Possessions (TotPoss) = ScPoss + FGxPoss + FTxPoss + TOV. */
export function individualTotalPossessions(
  player: RatingStatLine,
  team: RatingStatLine,
  opponent: RatingStatLine,
): NullableNumber {
  const scPoss = scoringPossessions(player, team, opponent);
  const ctx = teamOffenseContext(team, opponent);
  const fgm = player.fieldGoals;
  const fga = player.fieldGoalAttempts;
  const ftm = player.freeThrows;
  const fta = player.freeThrowAttempts;
  const tov = player.turnovers;

  if (
    !isFiniteNumber(scPoss) ||
    ctx === null ||
    !isFiniteNumber(fgm) ||
    !isFiniteNumber(fga) ||
    !isFiniteNumber(ftm) ||
    !isFiniteNumber(fta) ||
    !isFiniteNumber(tov)
  ) {
    return null;
  }

  const fgxPoss = (fga - fgm) * (1 - 1.07 * ctx.teamOrbPct);
  const ftxPoss = fta === 0 ? 0 : missWeight(ftm, fta) * 0.4 * fta;

  return scPoss + fgxPoss + ftxPoss + tov;
}

/** Individual Points Produced (PProd). */
export function pointsProduced(
  player: RatingStatLine,
  team: RatingStatLine,
  opponent: RatingStatLine,
): NullableNumber {
  const ctx = teamOffenseContext(team, opponent);
  const qast = qAssist(player, team);
  const fgm = player.fieldGoals;
  const fga = player.fieldGoalAttempts;
  const tpm = player.threePointMakes;
  const ftm = player.freeThrows;
  const pts = player.points;
  const ast = player.assists;
  const orb = player.offensiveRebounds;
  const teamFgm = team.fieldGoals;
  const teamFga = team.fieldGoalAttempts;
  const teamTpm = team.threePointMakes;
  const teamPts = team.points;
  const teamFtm = team.freeThrows;
  const teamOrb = team.offensiveRebounds;

  if (
    ctx === null ||
    !isFiniteNumber(qast) ||
    !isFiniteNumber(fgm) ||
    !isFiniteNumber(fga) ||
    !isFiniteNumber(tpm) ||
    !isFiniteNumber(ftm) ||
    !isFiniteNumber(pts) ||
    !isFiniteNumber(ast) ||
    !isFiniteNumber(orb) ||
    !isFiniteNumber(teamFgm) ||
    !isFiniteNumber(teamFga) ||
    !isFiniteNumber(teamTpm) ||
    !isFiniteNumber(teamPts) ||
    !isFiniteNumber(teamFtm) ||
    !isFiniteNumber(teamOrb) ||
    fga === 0 ||
    ctx.teamScoringPoss === 0
  ) {
    return null;
  }

  const pProdFgPart = 2 * (fgm + 0.5 * tpm) * (1 - 0.5 * ((pts - ftm) / (2 * fga)) * qast);

  const astFgDenom = teamFgm - fgm;
  const astDenom = 2 * (teamFga - fga);
  if (astFgDenom === 0 || astDenom === 0) {
    return null;
  }
  const pProdAstPart =
    2 *
    ((teamFgm - fgm + 0.5 * (teamTpm - tpm)) / astFgDenom) *
    0.5 *
    ((teamPts - teamFtm - (pts - ftm)) / astDenom) *
    ast;

  // Denominator equals Team_Scoring_Poss (same formula), already in ctx.
  const pProdOrbPart =
    orb * ctx.teamOrbWeight * ctx.teamPlayPct * (teamPts / ctx.teamScoringPoss);

  return (
    (pProdFgPart + pProdAstPart + ftm) *
      (1 - (teamOrb / ctx.teamScoringPoss) * ctx.teamOrbWeight * ctx.teamPlayPct) +
    pProdOrbPart
  );
}

/** Individual Offensive Rating — points produced per 100 individual possessions. */
export function individualOffensiveRating(
  player: RatingStatLine,
  team: RatingStatLine,
  opponent: RatingStatLine,
): NullableNumber {
  const pProd = pointsProduced(player, team, opponent);
  const totPoss = individualTotalPossessions(player, team, opponent);
  return safeRatio(isFiniteNumber(pProd) ? 100 * pProd : pProd, totPoss);
}

/** Defensive Stops (Stops = Stops1 + Stops2). */
export function defensiveStops(
  player: RatingStatLine,
  team: RatingStatLine,
  opponent: RatingStatLine,
): NullableNumber {
  const stl = player.steals;
  const blk = player.blocks;
  const drb = defensiveRebounds(player);
  const pf = player.fouls;
  const mp = player.minutes;
  const teamMp = team.minutes;
  const teamBlk = team.blocks;
  const teamStl = team.steals;
  const teamDrb = defensiveRebounds(team);
  const teamPf = team.fouls;
  const oppFga = opponent.fieldGoalAttempts;
  const oppFgm = opponent.fieldGoals;
  const oppTov = opponent.turnovers;
  const oppFta = opponent.freeThrowAttempts;
  const oppFtm = opponent.freeThrows;
  const oppOrb = opponent.offensiveRebounds;

  if (
    !isFiniteNumber(stl) ||
    !isFiniteNumber(blk) ||
    !isFiniteNumber(drb) ||
    !isFiniteNumber(pf) ||
    !isFiniteNumber(mp) ||
    !isFiniteNumber(teamMp) ||
    !isFiniteNumber(teamBlk) ||
    !isFiniteNumber(teamStl) ||
    !isFiniteNumber(teamDrb) ||
    !isFiniteNumber(teamPf) ||
    !isFiniteNumber(oppFga) ||
    !isFiniteNumber(oppFgm) ||
    !isFiniteNumber(oppTov) ||
    !isFiniteNumber(oppFta) ||
    !isFiniteNumber(oppFtm) ||
    !isFiniteNumber(oppOrb) ||
    oppFga === 0 ||
    teamMp === 0
  ) {
    return null;
  }

  const dorDenom = oppOrb + teamDrb;
  if (dorDenom === 0) {
    return null;
  }
  const dorPct = oppOrb / dorDenom; // DOR%
  const dfgPct = oppFgm / oppFga; // DFG%

  const fmDenom = dfgPct * (1 - dorPct) + (1 - dfgPct) * dorPct;
  if (fmDenom === 0) {
    return null;
  }
  const fmwt = (dfgPct * (1 - dorPct)) / fmDenom; // Forced Miss weight

  const stops1 = stl + blk * fmwt * (1 - 1.07 * dorPct) + drb * (1 - fmwt);

  let ftStop = 0;
  if (oppFta !== 0) {
    if (teamPf === 0) {
      return null;
    }
    ftStop = (pf / teamPf) * 0.4 * oppFta * missWeight(oppFtm, oppFta);
  }
  const stops2 =
    (((oppFga - oppFgm - teamBlk) / teamMp) * fmwt * (1 - 1.07 * dorPct) +
      (oppTov - teamStl) / teamMp) *
      mp +
    ftStop;

  return stops1 + stops2;
}

/** Stop% — rate the player forces a stop on possessions faced. */
export function stopPercentage(
  player: RatingStatLine,
  team: RatingStatLine,
  opponent: RatingStatLine,
  teamPossessions: number | null | undefined,
): NullableNumber {
  const stops = defensiveStops(player, team, opponent);
  const oppMp = opponent.minutes;
  const mp = player.minutes;

  if (
    !isFiniteNumber(stops) ||
    !isFiniteNumber(oppMp) ||
    !isFiniteNumber(mp) ||
    !isFiniteNumber(teamPossessions)
  ) {
    return null;
  }

  return safeRatio(stops * oppMp, teamPossessions * mp);
}

/** Individual Defensive Rating — points allowed per 100 possessions faced. */
export function individualDefensiveRating(
  player: RatingStatLine,
  team: RatingStatLine,
  opponent: RatingStatLine,
  teamPossessions: number | null | undefined,
): NullableNumber {
  const stopPct = stopPercentage(player, team, opponent, teamPossessions);
  const oppPts = opponent.points;
  const oppFgm = opponent.fieldGoals;
  const oppFta = opponent.freeThrowAttempts;
  const oppFtm = opponent.freeThrows;

  if (
    !isFiniteNumber(stopPct) ||
    !isFiniteNumber(oppPts) ||
    !isFiniteNumber(oppFgm) ||
    !isFiniteNumber(oppFta) ||
    !isFiniteNumber(oppFtm) ||
    !isFiniteNumber(teamPossessions) ||
    teamPossessions === 0
  ) {
    return null;
  }

  const teamDRtg = 100 * (oppPts / teamPossessions);

  const scDenom = oppFgm + (oppFta === 0 ? 0 : (1 - missWeight(oppFtm, oppFta)) * oppFta * 0.4);
  if (scDenom === 0) {
    return null;
  }
  const dPtsPerScPoss = oppPts / scDenom;

  return teamDRtg + 0.2 * (100 * dPtsPerScPoss * (1 - stopPct) - teamDRtg);
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
