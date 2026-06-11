import { describe, expect, it } from "vitest";
import {
  GAME_SHAPE_BASELINE,
  HOME_COURT_POINTS,
  MARGIN_STD_DEV,
  STRENGTH_MODIFIER_MAX,
  STRENGTH_MODIFIER_MIN,
  normalCdf,
  predictMatchup,
  teamStrengthModifier,
  type MatchupTeam,
} from "@/domain/matchup";

const balanced: MatchupTeam = {
  offensiveRating: 108,
  defensiveRating: 104,
  pace: 70,
};

describe("predictMatchup", () => {
  it("favors the home side by exactly the home-court bonus when teams are identical", () => {
    const { spread, total, expectedPointsHome, expectedPointsAway, homeWinProbability } =
      predictMatchup(balanced, balanced);

    // base points = (108 + 104) / 2 / 100 * 70 = 74.2 each; ±1.5 home court
    expect(expectedPointsHome).toBeCloseTo(75.7, 5);
    expect(expectedPointsAway).toBeCloseTo(72.7, 5);
    expect(spread).toBeCloseTo(HOME_COURT_POINTS, 5);
    expect(total).toBeCloseTo(148.4, 5);
    expect(homeWinProbability).toBeCloseTo(normalCdf(HOME_COURT_POINTS / MARGIN_STD_DEV), 10);
    expect(homeWinProbability!).toBeGreaterThan(0.5);
  });

  it("is symmetric net of home court when home and away are swapped", () => {
    const a: MatchupTeam = { offensiveRating: 115, defensiveRating: 100, pace: 72 };
    const b: MatchupTeam = { offensiveRating: 100, defensiveRating: 105, pace: 68 };

    const home = predictMatchup(a, b).spread!;
    const away = predictMatchup(b, a).spread!;

    // The two orientations differ only by which side gets the home bonus, so the
    // model component (spread minus home court) negates exactly.
    expect(home - HOME_COURT_POINTS).toBeCloseTo(-(away - HOME_COURT_POINTS), 5);
    // Equivalently, the spreads sum to twice the home-court bonus.
    expect(home + away).toBeCloseTo(2 * HOME_COURT_POINTS, 5);
  });

  it("applies home court to whichever side is home", () => {
    // Even matchup: the only edge is home court, so the home team is favored by
    // exactly HOME_COURT_POINTS regardless of orientation, and the favorite is
    // always more favored at home than on the road.
    const strong: MatchupTeam = { offensiveRating: 115, defensiveRating: 100, pace: 70 };
    const weak: MatchupTeam = { offensiveRating: 100, defensiveRating: 105, pace: 70 };

    expect(predictMatchup(balanced, balanced).spread).toBeCloseTo(HOME_COURT_POINTS, 5);
    expect(predictMatchup(strong, weak).spread!).toBeGreaterThan(
      predictMatchup(weak, strong).spread!,
    );
  });

  it("collapses dependent outputs to null when an input is missing", () => {
    const noPace = predictMatchup({ ...balanced, pace: null }, balanced);
    expect(noPace.expectedPointsHome).toBeNull();
    expect(noPace.expectedPointsAway).toBeNull();
    expect(noPace.spread).toBeNull();
    expect(noPace.total).toBeNull();
    expect(noPace.homeWinProbability).toBeNull();

    const noOrtg = predictMatchup({ ...balanced, offensiveRating: null }, balanced);
    expect(noOrtg.expectedPointsHome).toBeNull();
    // Away points still computable (away offense vs home defense), but the
    // margin-dependent fields require both sides.
    expect(noOrtg.spread).toBeNull();
    expect(noOrtg.homeWinProbability).toBeNull();
  });

  it("is monotonic in strengthModifier — a weaker roster lowers spread and win prob", () => {
    const full = predictMatchup({ ...balanced, strengthModifier: 1 }, balanced);
    const weakened = predictMatchup({ ...balanced, strengthModifier: 0.85 }, balanced);

    expect(weakened.expectedPointsHome!).toBeLessThan(full.expectedPointsHome!);
    expect(weakened.spread!).toBeLessThan(full.spread!);
    expect(weakened.homeWinProbability!).toBeLessThan(full.homeWinProbability!);
  });
});

describe("teamStrengthModifier", () => {
  it("returns a neutral 1.0 for an empty rotation", () => {
    expect(teamStrengthModifier([])).toBe(1);
  });

  it("returns 1.0 when everyone is healthy and at baseline game shape", () => {
    const mod = teamStrengthModifier([
      { minutes: 30, injured: false, gameShape: GAME_SHAPE_BASELINE },
      { minutes: 25, injured: false, gameShape: GAME_SHAPE_BASELINE },
    ]);
    expect(mod).toBeCloseTo(1, 10);
  });

  it("drops below 1.0 when a high-minutes player is injured", () => {
    const mod = teamStrengthModifier([
      { minutes: 36, injured: true, gameShape: 7 },
      { minutes: 30, injured: false, gameShape: 7 },
      { minutes: 24, injured: false, gameShape: 7 },
    ]);
    expect(mod).toBeLessThan(1);
    expect(mod).toBeGreaterThanOrEqual(STRENGTH_MODIFIER_MIN);
  });

  it("rises above 1.0 when the healthy rotation is in good form", () => {
    const mod = teamStrengthModifier([
      { minutes: 30, injured: false, gameShape: 10 },
      { minutes: 28, injured: false, gameShape: 9 },
    ]);
    expect(mod).toBeGreaterThan(1);
    expect(mod).toBeLessThanOrEqual(STRENGTH_MODIFIER_MAX);
  });

  it("clamps within bounds even with extreme inputs", () => {
    // With the 240-denominator and 0.7 replacement rate, two players totalling
    // 60 min only cuts ~7.5% — well above the floor. Verify we stay in bounds
    // and below 1 (net negative without any form signal).
    const everyoneOut = teamStrengthModifier([
      { minutes: 30, injured: true, gameShape: 1 },
      { minutes: 30, injured: true, gameShape: 1 },
    ]);
    expect(everyoneOut).toBeGreaterThanOrEqual(STRENGTH_MODIFIER_MIN);
    expect(everyoneOut).toBeLessThanOrEqual(STRENGTH_MODIFIER_MAX);
    expect(everyoneOut).toBeLessThan(1);
  });

  it("ignores missing game shape and zero-minute players", () => {
    const mod = teamStrengthModifier([
      { minutes: 32, injured: false, gameShape: null },
      { minutes: 0, injured: true, gameShape: 7 },
    ]);
    // No usable game-shape signal and the injured player has no minutes weight.
    expect(mod).toBeCloseTo(1, 10);
  });
});

describe("normalCdf", () => {
  it("is 0.5 at the mean and symmetric about it", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(-1.5)).toBeCloseTo(1 - normalCdf(1.5), 6);
  });

  it("matches known standard-normal values", () => {
    expect(normalCdf(1)).toBeCloseTo(0.8413, 4);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 4);
  });
});
