import { isFiniteNumber, type NullableNumber } from "@/domain/metrics";

// ── Calibration constants ────────────────────────────────────────────────────
// These start from basketball priors rather than BuzzerBeater-calibrated values
// (we lack the multi-season sample to fit them). Tune once historical data
// across many games is available. See docs/prd/roadmap.md.

/** Flat home-court advantage, in points, split evenly between the two teams. */
export const HOME_COURT_POINTS = 3;

/**
 * Game-to-game margin standard deviation, used to convert an expected margin
 * into a win probability via the normal CDF. Larger = predictions pulled toward
 * 50%. Measured at ~23 from the residual spread (actual margin − predicted) over
 * the first settled sample — much wider than NBA's ~12, so an earlier 12 left the
 * model badly overconfident (Brier 0.285 → 0.242 at 23). Re-measure as the
 * settled set grows via `npm run settle -- --marginStdDev=N`.
 */
export const MARGIN_STD_DEV = 23;

/** Game shape that maps to a neutral (1.0) form multiplier. BB game shape is 1–10. */
export const GAME_SHAPE_BASELINE = 7;

/** Per-point-of-game-shape swing applied to a team's efficiency. */
export const GAME_SHAPE_WEIGHT = 0.01;

/** Clamp bounds for the roster strength modifier so one noisy signal can't dominate. */
export const STRENGTH_MODIFIER_MIN = 0.8;
export const STRENGTH_MODIFIER_MAX = 1.15;

/**
 * Total player-minutes in a BB game (48 min × 5 players). Used as the
 * denominator for injured-minutes share so we measure contribution relative to
 * the whole game, not just the observed rotation slice.
 */
export const TOTAL_GAME_MINUTES = 240;

/**
 * Fraction of an injured player's output assumed to be covered by their
 * replacement. 0.7 = backup provides 70% of the starter's contribution, so we
 * only penalise the remaining 30%.
 *
 * V1 prior — flat rate. Future iterations could derive this per-player from the
 * salary ratio between the injured player and their likely replacement, which is
 * meaningful in BB because salary is directly tied to skill ratings (no
 * contracts/negotiations — salary adjusts automatically each season). DMI is a
 * secondary, noisier proxy for the same thing.
 */
export const REPLACEMENT_RATE = 0.7;

// ── Engine inputs / outputs ──────────────────────────────────────────────────

export interface MatchupTeam {
  offensiveRating: number | null;
  defensiveRating: number | null;
  pace: number | null;
  /**
   * Roster-availability multiplier applied to the team's expected efficiency.
   * 1.0 = full strength; < 1 down-weights for injuries / poor form. Defaults to
   * 1.0 when omitted. See {@link teamStrengthModifier}.
   */
  strengthModifier?: number;
}

export interface MatchupPrediction {
  expectedPointsHome: number | null;
  expectedPointsAway: number | null;
  /** Home − away expected margin. Negative ⇒ home favored by |spread|. */
  spread: number | null;
  /** Expected combined points (over/under). */
  total: number | null;
  /** Probability the home team wins, in [0, 1]. */
  homeWinProbability: number | null;
}

// ── Prediction ───────────────────────────────────────────────────────────────

/**
 * Predict a single matchup from both teams' efficiency profiles.
 *
 * Each team's expected efficiency is the symmetric blend of its own offense and
 * the opponent's defense, scaled by its roster strength modifier:
 *   expEff = ((ORtg + oppDRtg) / 2) × strengthModifier
 * Points = expEff / 100 × game pace, where game pace is the mean of both teams'
 * pace. A flat home-court bonus is split between the sides. Win probability comes
 * from the normal CDF of the expected margin over {@link MARGIN_STD_DEV}.
 *
 * League-relative normalization is intentionally skipped (league-wide pace is not
 * available); the symmetric blend is a documented approximation. Any missing
 * input collapses the dependent outputs to null rather than guessing.
 */
export function predictMatchup(
  home: MatchupTeam,
  away: MatchupTeam,
): MatchupPrediction {
  const gamePace = mean(home.pace, away.pace);

  const expEffHome = blendedEfficiency(
    home.offensiveRating,
    away.defensiveRating,
    home.strengthModifier,
  );
  const expEffAway = blendedEfficiency(
    away.offensiveRating,
    home.defensiveRating,
    away.strengthModifier,
  );

  let expectedPointsHome = expectedPoints(expEffHome, gamePace);
  let expectedPointsAway = expectedPoints(expEffAway, gamePace);

  if (expectedPointsHome !== null && expectedPointsAway !== null) {
    expectedPointsHome += HOME_COURT_POINTS / 2;
    expectedPointsAway -= HOME_COURT_POINTS / 2;
  }

  const spread =
    expectedPointsHome !== null && expectedPointsAway !== null
      ? expectedPointsHome - expectedPointsAway
      : null;
  const total =
    expectedPointsHome !== null && expectedPointsAway !== null
      ? expectedPointsHome + expectedPointsAway
      : null;
  const homeWinProbability =
    spread !== null ? normalCdf(spread / MARGIN_STD_DEV) : null;

  return {
    expectedPointsHome,
    expectedPointsAway,
    spread,
    total,
    homeWinProbability,
  };
}

function blendedEfficiency(
  offensiveRating: number | null,
  opponentDefensiveRating: number | null,
  strengthModifier: number | undefined,
): NullableNumber {
  if (!isFiniteNumber(offensiveRating) || !isFiniteNumber(opponentDefensiveRating)) {
    return null;
  }
  const modifier = isFiniteNumber(strengthModifier) ? strengthModifier : 1;
  return ((offensiveRating + opponentDefensiveRating) / 2) * modifier;
}

function expectedPoints(
  efficiency: number | null,
  gamePace: number | null,
): NullableNumber {
  if (!isFiniteNumber(efficiency) || !isFiniteNumber(gamePace)) {
    return null;
  }
  return (efficiency / 100) * gamePace;
}

function mean(a: number | null, b: number | null): NullableNumber {
  if (!isFiniteNumber(a) || !isFiniteNumber(b)) {
    return null;
  }
  return (a + b) / 2;
}

// ── Roster availability → strength modifier ──────────────────────────────────

export interface RosterPlayerAvailability {
  /** Playing-time weight (e.g. minutes per game). Null/zero contributes nothing. */
  minutes: number | null;
  injured: boolean;
  /** BuzzerBeater game shape (1–10), or null when unknown. */
  gameShape: number | null;
}

/**
 * Combine injury and game-shape signals across a team's rotation into a single
 * strength multiplier for {@link MatchupTeam.strengthModifier}.
 *
 *   availabilityFactor = 1 − (minutes-weighted share of injured players)
 *   formMultiplier     = 1 + (avg healthy game shape − BASELINE) × WEIGHT
 *   modifier           = clamp(formMultiplier × availabilityFactor)
 *
 * Players are weighted by minutes so bench absences barely move the number.
 * Returns 1.0 (neutral) when the rotation is empty or carries no usable signal.
 */
export function teamStrengthModifier(
  rotation: RosterPlayerAvailability[],
): number {
  if (rotation.length === 0) {
    return 1;
  }

  const weightOf = (p: RosterPlayerAvailability): number =>
    isFiniteNumber(p.minutes) && p.minutes > 0 ? p.minutes : 0;

  const totalWeight = rotation.reduce((sum, p) => sum + weightOf(p), 0);

  // Injury: share of total game minutes lost to injury, discounted by the
  // fraction a replacement can cover. Denominator is the full game (240 min)
  // so we measure contribution relative to the whole game, not just the
  // observed rotation slice.
  const injuredWeight = rotation.reduce(
    (sum, p) => sum + (p.injured ? weightOf(p) : 0),
    0,
  );
  const availabilityFactor =
    1 - (injuredWeight / TOTAL_GAME_MINUTES) * (1 - REPLACEMENT_RATE);

  // Form: minutes-weighted average game shape of the healthy players.
  let shapeWeight = 0;
  let shapeSum = 0;
  for (const p of rotation) {
    if (p.injured || !isFiniteNumber(p.gameShape)) continue;
    const w = weightOf(p) || 1;
    shapeWeight += w;
    shapeSum += w * p.gameShape;
  }
  const formMultiplier =
    shapeWeight > 0
      ? 1 + (shapeSum / shapeWeight - GAME_SHAPE_BASELINE) * GAME_SHAPE_WEIGHT
      : 1;

  return clamp(
    formMultiplier * availabilityFactor,
    STRENGTH_MODIFIER_MIN,
    STRENGTH_MODIFIER_MAX,
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Standard normal CDF via the Abramowitz & Stegun 7.1.26 approximation
 * (|error| < 7.5e-8). Local to this file; we have no stats dependency.
 */
export function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-(x * x) / 2);
  const poly =
    t * (0.319381530 +
      t * (-0.356563782 +
        t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const prob = d * poly;
  return x >= 0 ? 1 - prob : prob;
}
