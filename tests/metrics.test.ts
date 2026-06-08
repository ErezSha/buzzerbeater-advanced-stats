import {
  assistPercentage,
  blockPercentage,
  defensiveRating,
  effectiveFieldGoalPercentage,
  estimatedPossessions,
  fieldGoalPercentage,
  gameScore,
  minutesShare,
  offensiveRating,
  reboundPercentage,
  safeRatio,
  stealPercentage,
  trueShootingAttempts,
  trueShootingPercentage,
  turnoverPercentage,
  usageRate,
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
