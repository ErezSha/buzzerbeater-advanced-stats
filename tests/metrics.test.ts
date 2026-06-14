import {
  assistPercentage,
  blockPercentage,
  defensiveRating,
  defensiveStops,
  effectiveFieldGoalPercentage,
  estimatedPossessions,
  fieldGoalPercentage,
  gameScore,
  individualDefensiveRating,
  individualOffensiveRating,
  individualTotalPossessions,
  minutesShare,
  offensiveRating,
  pointsProduced,
  reboundPercentage,
  safeRatio,
  scoringPossessions,
  stealPercentage,
  stopPercentage,
  trueShootingAttempts,
  trueShootingPercentage,
  turnoverPercentage,
  usageRate,
  type RatingStatLine,
} from "@/domain/metrics";

describe("MVP metric formulas", () => {
  it("calculates ratios and percentages for normal inputs", () => {
    expect(safeRatio(5, 10)).toBe(0.5);
    expect(fieldGoalPercentage(8, 16)).toBe(0.5);
    expect(effectiveFieldGoalPercentage(8, 3, 16)).toBe(0.59375);
    expect(trueShootingAttempts(16, 5)).toBe(18.2);
    expect(trueShootingPercentage(23, 16, 5)).toBeCloseTo(0.631868);
    expect(turnoverPercentage(3, 16, 5)).toBeCloseTo(0.141509);
    expect(estimatedPossessions({
      fieldGoalAttempts: 16,
      freeThrowAttempts: 5,
      offensiveRebounds: 2,
      turnovers: 3,
    })).toBe(19.2);
    expect(offensiveRating(92, 80)).toBe(115);
    expect(defensiveRating(84, 80)).toBe(105);
  });

  it("calculates game score", () => {
    expect(gameScore({
      points: 23,
      fieldGoals: 8,
      fieldGoalAttempts: 15,
      freeThrows: 4,
      freeThrowAttempts: 5,
      offensiveRebounds: 2,
      defensiveRebounds: 5,
      steals: 2,
      assists: 6,
      blocks: 1,
      fouls: 4,
      turnovers: 3,
    })).toBeCloseTo(20.5);
  });

  it("normalizes player rate stats by on-court minutes share (Basketball-Reference)", () => {
    // mShare = MP / (Tm MP / 5) = 5 * MP / Tm MP. With MP=40, Tm MP=240 → 0.8333.
    expect(minutesShare(40, 240)).toBeCloseTo(0.833333);

    // Each value below equals the reference 100*(...) formula divided by 100,
    // since the app stores fractions and multiplies by 100 only at display.
    // AST%: 100*AST/((mShare)*TmFG - FG)
    expect(assistPercentage(6, 30, 4, 40, 240)).toBeCloseTo(0.285714);
    // BLK%: 100*(BLK*(TmMP/5))/(MP*(OppFGA - Opp3PA))
    expect(blockPercentage(3, 80, 20, 40, 240)).toBeCloseTo(0.06);
    // STL%: 100*(STL*(TmMP/5))/(MP*OppPoss), OppPoss = FGA+0.44*FTA-ORB+TOV
    expect(stealPercentage(5, 80, 20, 10, 14, 40, 240)).toBeCloseTo(0.064655);
    // TRB%: 100*(TRB*(TmMP/5))/(MP*(TmTRB+OppTRB))
    expect(reboundPercentage(10, 40, 42, 40, 240)).toBeCloseTo(0.146341);
    // Usg%: 100*((FGA+0.44*FTA+TOV)*(TmMP/5))/(MP*(TmFGA+0.44*TmFTA+TmTOV))
    expect(usageRate(12, 2, 2, 72, 21, 14, 40, 240)).toBeCloseTo(0.187485);
  });

  it("returns null when minutes are unavailable for rate stats", () => {
    expect(minutesShare(40, 0)).toBeNull();
    expect(minutesShare(null, 240)).toBeNull();
    expect(assistPercentage(6, 30, 4, null, 240)).toBeNull();
    expect(blockPercentage(3, 80, 20, 40, null)).toBeNull();
    expect(stealPercentage(5, 80, 20, 10, 14, null, 240)).toBeNull();
    expect(reboundPercentage(10, 40, 42, 40, 0)).toBeNull();
    expect(usageRate(12, 2, 2, 72, 21, 14, 40, null)).toBeNull();
  });

  it("returns null for zero denominators", () => {
    expect(safeRatio(1, 0)).toBeNull();
    expect(fieldGoalPercentage(0, 0)).toBeNull();
    expect(effectiveFieldGoalPercentage(0, 0, 0)).toBeNull();
    expect(trueShootingPercentage(0, 0, 0)).toBeNull();
    expect(turnoverPercentage(0, 0, 0)).toBeNull();
    expect(offensiveRating(100, 0)).toBeNull();
    expect(defensiveRating(100, 0)).toBeNull();
  });

  it("returns null for missing or unreliable inputs", () => {
    expect(safeRatio(undefined, 10)).toBeNull();
    expect(fieldGoalPercentage(4, undefined)).toBeNull();
    expect(effectiveFieldGoalPercentage(4, undefined, 10)).toBeNull();
    expect(trueShootingAttempts(undefined, 4)).toBeNull();
    expect(trueShootingPercentage(20, undefined, 4)).toBeNull();
    expect(turnoverPercentage(undefined, 10, 4)).toBeNull();
    expect(estimatedPossessions({
      fieldGoalAttempts: 10,
      freeThrowAttempts: null,
      offensiveRebounds: 2,
      turnovers: 1,
    })).toBeNull();
    expect(gameScore({
      points: 20,
      fieldGoals: 7,
      fieldGoalAttempts: 12,
      freeThrows: 4,
      freeThrowAttempts: 5,
      offensiveRebounds: 1,
      defensiveRebounds: null,
      steals: 1,
      assists: 3,
      blocks: 0,
      fouls: 2,
      turnovers: 2,
    })).toBeNull();
  });
});

describe("individual ORtg / DRtg (Dean Oliver)", () => {
  // Realistic ~50-game season totals. Golden values produced by an independent
  // transcription of docs/references/individual-ORtg-DRtg.md.
  const player: RatingStatLine = {
    minutes: 1000,
    points: 500,
    fieldGoals: 180,
    fieldGoalAttempts: 380,
    threePointMakes: 40,
    freeThrows: 100,
    freeThrowAttempts: 120,
    offensiveRebounds: 40,
    defensiveRebounds: 120,
    assists: 120,
    steals: 40,
    blocks: 20,
    turnovers: 80,
    fouls: 90,
  };
  const team: RatingStatLine = {
    minutes: 12000,
    points: 8000,
    fieldGoals: 3000,
    fieldGoalAttempts: 6500,
    threePointMakes: 600,
    freeThrows: 1400,
    freeThrowAttempts: 1900,
    offensiveRebounds: 700,
    defensiveRebounds: 2200,
    assists: 1800,
    steals: 600,
    blocks: 350,
    turnovers: 1100,
    fouls: 1600,
  };
  const opponent: RatingStatLine = {
    minutes: 12000,
    points: 7600,
    fieldGoals: 2900,
    fieldGoalAttempts: 6400,
    threePointMakes: 550,
    freeThrows: 1300,
    freeThrowAttempts: 1800,
    offensiveRebounds: 750,
    defensiveRebounds: 2100,
    assists: 1700,
    steals: 620,
    blocks: 330,
    turnovers: 1150,
    fouls: 1550,
  };
  const teamPossessions = estimatedPossessions(team); // 7736

  it("matches the reference formula building blocks", () => {
    expect(scoringPossessions(player, team, opponent)).toBeCloseTo(227.2251, 3);
    expect(individualTotalPossessions(player, team, opponent)).toBeCloseTo(455.0584, 3);
    expect(pointsProduced(player, team, opponent)).toBeCloseTo(499.9787, 3);
    expect(defensiveStops(player, team, opponent)).toBeCloseTo(269.6413, 3);
    expect(stopPercentage(player, team, opponent, teamPossessions)).toBeCloseTo(0.418265, 5);
  });

  it("computes individual ORtg and DRtg", () => {
    const ortg = individualOffensiveRating(player, team, opponent);
    const drtg = individualDefensiveRating(player, team, opponent, teamPossessions);
    expect(ortg).toBeCloseTo(109.8713, 3);
    expect(drtg).toBeCloseTo(103.4008, 3);
    // Sanity: both land in the plausible per-100-possessions range.
    expect(ortg).toBeGreaterThan(80);
    expect(ortg).toBeLessThan(130);
    expect(drtg).toBeGreaterThan(80);
    expect(drtg).toBeLessThan(130);
  });

  it("falls back to TRB - ORB when defensive rebounds are absent", () => {
    const { defensiveRebounds: _drop, ...noDrb } = player;
    const withTrb: RatingStatLine = { ...noDrb, totalRebounds: 160, offensiveRebounds: 40 };
    expect(defensiveStops(withTrb, team, opponent)).toBeCloseTo(269.6413, 3);
  });

  it("returns null for missing inputs", () => {
    expect(individualOffensiveRating({ ...player, fieldGoals: null }, team, opponent)).toBeNull();
    expect(individualOffensiveRating(player, { ...team, freeThrowAttempts: null }, opponent)).toBeNull();
    expect(scoringPossessions(player, team, { ...opponent, defensiveRebounds: null, totalRebounds: null })).toBeNull();
    expect(individualDefensiveRating(player, team, { ...opponent, fieldGoalAttempts: null }, teamPossessions)).toBeNull();
    expect(individualDefensiveRating(player, team, opponent, null)).toBeNull();
  });

  it("returns null for zero denominators", () => {
    // Zero opponent FGA → DFG% undefined.
    expect(defensiveStops(player, team, { ...opponent, fieldGoalAttempts: 0 })).toBeNull();
    // Zero team possessions → DRtg and Stop% undefined.
    expect(stopPercentage(player, team, opponent, 0)).toBeNull();
    expect(individualDefensiveRating(player, team, opponent, 0)).toBeNull();
    // Player with no FGA → ORtg undefined.
    expect(individualOffensiveRating({ ...player, fieldGoalAttempts: 0 }, team, opponent)).toBeNull();
  });
});
