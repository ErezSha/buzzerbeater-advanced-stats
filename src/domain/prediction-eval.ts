/**
 * Accuracy math for the win-probability validation harness.
 *
 * Pure functions only — these are what `scripts/settle.ts` runs over the settled
 * prediction rows, and the only genuinely new logic worth unit-testing (the rest
 * of the harness reuses existing adapters/domain code). Inputs are assumed finite
 * (the settle step skips predictions with null outputs); aggregates still guard
 * against an empty sample.
 */

/** The fields each settled prediction contributes to the accuracy metrics. */
export interface SettledPrediction {
  /** Model's pre-game P(home win), in [0, 1]. */
  homeWinProbability: number;
  /** Predicted home − away margin (points). */
  predictedSpread: number;
  /** Predicted combined points. */
  predictedTotal: number;
  /** Actual home − away margin (points). BuzzerBeater has no draws ⇒ never 0. */
  actualMargin: number;
  /** Actual combined points. */
  actualTotal: number;
  /** Whether the home team actually won. */
  homeWon: boolean;
}

export interface AggregateMetrics {
  /** Number of settled games scored. */
  count: number;
  /** Mean absolute error of the predicted spread vs. actual margin. */
  spreadMae: number | null;
  /** Root-mean-square error of the predicted spread vs. actual margin. */
  spreadRmse: number | null;
  /** Mean absolute error of the predicted total vs. actual total. */
  totalMae: number | null;
  /** Mean Brier score of the home-win probability (lower is better; 0.25 = coin flip). */
  meanBrier: number | null;
  /** Fraction of games where the favoured side matched the actual winner, in [0, 1]. */
  sideAccuracy: number | null;
}

export interface CalibrationBucket {
  /** Inclusive lower probability bound of the bucket. */
  lo: number;
  /** Exclusive upper bound (inclusive for the final bucket). */
  hi: number;
  /** Mean predicted home-win probability of games in the bucket, or null when empty. */
  predictedMean: number | null;
  /** Observed home-win rate of games in the bucket, or null when empty. */
  observedWinRate: number | null;
  /** Number of games that fell in the bucket. */
  count: number;
}

/** Squared error between two values. */
export function squaredError(predicted: number, actual: number): number {
  const d = predicted - actual;
  return d * d;
}

/** Absolute error between two values. */
export function absError(predicted: number, actual: number): number {
  return Math.abs(predicted - actual);
}

/**
 * Brier contribution for a single game: `(prob − outcome)²`, where `outcome` is 1
 * if the home team won and 0 otherwise. 0 = perfect, 1 = maximally wrong, 0.25 for
 * a 50% call.
 */
export function brierComponent(prob: number, homeWon: boolean): number {
  return squaredError(prob, homeWon ? 1 : 0);
}

/** True when the predicted favourite matched the actual winner (no draws in BB). */
export function sideCorrect(predictedSpread: number, actualMargin: number): boolean {
  return predictedSpread > 0 === actualMargin > 0;
}

/** Aggregate accuracy across all settled games. Returns nulls for an empty sample. */
export function aggregateMetrics(rows: SettledPrediction[]): AggregateMetrics {
  const count = rows.length;
  if (count === 0) {
    return {
      count: 0,
      spreadMae: null,
      spreadRmse: null,
      totalMae: null,
      meanBrier: null,
      sideAccuracy: null,
    };
  }

  let spreadAbs = 0;
  let spreadSq = 0;
  let totalAbs = 0;
  let brierSum = 0;
  let sideHits = 0;

  for (const row of rows) {
    spreadAbs += absError(row.predictedSpread, row.actualMargin);
    spreadSq += squaredError(row.predictedSpread, row.actualMargin);
    totalAbs += absError(row.predictedTotal, row.actualTotal);
    brierSum += brierComponent(row.homeWinProbability, row.homeWon);
    if (sideCorrect(row.predictedSpread, row.actualMargin)) sideHits += 1;
  }

  return {
    count,
    spreadMae: spreadAbs / count,
    spreadRmse: Math.sqrt(spreadSq / count),
    totalMae: totalAbs / count,
    meanBrier: brierSum / count,
    sideAccuracy: sideHits / count,
  };
}

/**
 * Group games into equal-width probability buckets and report, per bucket, the
 * mean predicted probability vs. the observed home-win rate — the data behind a
 * reliability diagram. A well-calibrated model has `predictedMean ≈ observedWinRate`
 * in every populated bucket.
 *
 * Probabilities are clamped to [0, 1]; the upper edge (1.0) falls in the final
 * bucket. Empty buckets are returned with null rates so the table stays stable.
 */
export function calibrationBuckets(
  rows: SettledPrediction[],
  bucketCount = 10,
): CalibrationBucket[] {
  const buckets = Math.max(1, Math.floor(bucketCount));
  const width = 1 / buckets;

  const probSum = new Array<number>(buckets).fill(0);
  const winSum = new Array<number>(buckets).fill(0);
  const counts = new Array<number>(buckets).fill(0);

  for (const row of rows) {
    const p = Math.min(1, Math.max(0, row.homeWinProbability));
    const index = Math.min(buckets - 1, Math.floor(p / width));
    probSum[index] += p;
    winSum[index] += row.homeWon ? 1 : 0;
    counts[index] += 1;
  }

  return Array.from({ length: buckets }, (_, i) => ({
    lo: i * width,
    hi: i === buckets - 1 ? 1 : (i + 1) * width,
    predictedMean: counts[i] > 0 ? probSum[i] / counts[i] : null,
    observedWinRate: counts[i] > 0 ? winSum[i] / counts[i] : null,
    count: counts[i],
  }));
}
