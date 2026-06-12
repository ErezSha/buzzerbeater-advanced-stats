import {
  absError,
  aggregateMetrics,
  brierComponent,
  calibrationBuckets,
  sideCorrect,
  squaredError,
  type SettledPrediction,
} from "@/domain/prediction-eval";

function row(overrides: Partial<SettledPrediction> = {}): SettledPrediction {
  return {
    homeWinProbability: 0.5,
    predictedSpread: 0,
    predictedTotal: 160,
    actualMargin: 1,
    actualTotal: 160,
    homeWon: true,
    ...overrides,
  };
}

describe("prediction-eval pointwise helpers", () => {
  it("squaredError and absError", () => {
    expect(squaredError(5, 3)).toBe(4);
    expect(absError(5, 3)).toBe(2);
    expect(absError(-2, 6)).toBe(8);
  });

  it("brierComponent: perfect, worst, coin-flip", () => {
    expect(brierComponent(1, true)).toBe(0);
    expect(brierComponent(0, false)).toBe(0);
    expect(brierComponent(1, false)).toBe(1);
    expect(brierComponent(0, true)).toBe(1);
    expect(brierComponent(0.5, true)).toBeCloseTo(0.25, 10);
    expect(brierComponent(0.5, false)).toBeCloseTo(0.25, 10);
  });

  it("sideCorrect compares the favoured side to the actual winner", () => {
    expect(sideCorrect(5, 3)).toBe(true); // home favoured, home won
    expect(sideCorrect(-2, 6)).toBe(false); // away favoured, home won
    expect(sideCorrect(-4, -7)).toBe(true); // away favoured, away won
  });
});

describe("aggregateMetrics", () => {
  it("returns nulls for an empty sample", () => {
    expect(aggregateMetrics([])).toEqual({
      count: 0,
      spreadMae: null,
      spreadRmse: null,
      totalMae: null,
      meanBrier: null,
      sideAccuracy: null,
    });
  });

  it("computes metrics on a hand-checked fixture", () => {
    const rows: SettledPrediction[] = [
      {
        homeWinProbability: 0.8,
        predictedSpread: 5,
        predictedTotal: 160,
        actualMargin: 3,
        actualTotal: 158,
        homeWon: true,
      },
      {
        homeWinProbability: 0.4,
        predictedSpread: -2,
        predictedTotal: 150,
        actualMargin: 6,
        actualTotal: 162,
        homeWon: true,
      },
    ];

    const m = aggregateMetrics(rows);
    expect(m.count).toBe(2);
    // |5-3|=2, |-2-6|=8 → mean 5
    expect(m.spreadMae).toBeCloseTo(5, 10);
    // (4 + 64)/2 = 34 → sqrt
    expect(m.spreadRmse).toBeCloseTo(Math.sqrt(34), 10);
    // |160-158|=2, |150-162|=12 → mean 7
    expect(m.totalMae).toBeCloseTo(7, 10);
    // (0.04 + 0.36)/2 = 0.2
    expect(m.meanBrier).toBeCloseTo(0.2, 10);
    // home favoured+won (hit); away favoured but home won (miss) → 1/2
    expect(m.sideAccuracy).toBeCloseTo(0.5, 10);
  });
});

describe("calibrationBuckets", () => {
  it("returns the full set of empty buckets with stable edges", () => {
    const buckets = calibrationBuckets([], 10);
    expect(buckets).toHaveLength(10);
    expect(buckets[0]).toEqual({
      lo: 0,
      hi: 0.1,
      predictedMean: null,
      observedWinRate: null,
      count: 0,
    });
    expect(buckets[9].lo).toBeCloseTo(0.9, 10);
    expect(buckets[9].hi).toBe(1);
    expect(buckets.every((b) => b.count === 0)).toBe(true);
  });

  it("collapses to a single bucket spanning [0, 1]", () => {
    const buckets = calibrationBuckets(
      [row({ homeWinProbability: 0.2 }), row({ homeWinProbability: 0.9 })],
      1,
    );
    expect(buckets).toHaveLength(1);
    expect(buckets[0].lo).toBe(0);
    expect(buckets[0].hi).toBe(1);
    expect(buckets[0].count).toBe(2);
    expect(buckets[0].predictedMean).toBeCloseTo(0.55, 10);
  });

  it("places boundary probabilities (0 and 1) in the first and last buckets", () => {
    const buckets = calibrationBuckets(
      [
        row({ homeWinProbability: 0, homeWon: true }),
        row({ homeWinProbability: 0.1, homeWon: false }),
        row({ homeWinProbability: 1, homeWon: true }),
      ],
      10,
    );

    expect(buckets[0].count).toBe(1);
    expect(buckets[0].predictedMean).toBeCloseTo(0, 10);
    expect(buckets[0].observedWinRate).toBeCloseTo(1, 10);

    expect(buckets[1].count).toBe(1);
    expect(buckets[1].predictedMean).toBeCloseTo(0.1, 10);
    expect(buckets[1].observedWinRate).toBeCloseTo(0, 10);

    expect(buckets[9].count).toBe(1);
    expect(buckets[9].predictedMean).toBeCloseTo(1, 10);
    expect(buckets[9].observedWinRate).toBeCloseTo(1, 10);

    // The middle buckets stay empty.
    const populated = buckets.filter((b) => b.count > 0);
    expect(populated).toHaveLength(3);
  });

  it("averages predicted probability and win rate within a bucket", () => {
    const buckets = calibrationBuckets(
      [
        row({ homeWinProbability: 0.62, homeWon: true }),
        row({ homeWinProbability: 0.68, homeWon: false }),
      ],
      10,
    );
    expect(buckets[6].count).toBe(2);
    expect(buckets[6].predictedMean).toBeCloseTo(0.65, 10);
    expect(buckets[6].observedWinRate).toBeCloseTo(0.5, 10);
  });
});
