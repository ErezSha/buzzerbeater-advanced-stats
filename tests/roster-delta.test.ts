import { describe, expect, it } from "vitest";
import {
  computeRosterDelta,
  rosterDeltaFactor,
  rosterDisruption,
  type CurrentPlayer,
  type WindowPlayer,
} from "@/domain/roster-delta";

/** A window rotation player with sane defaults; override per case. */
function win(p: Partial<WindowPlayer> & { playerId: string }): WindowPlayer {
  return { mpg: 30, gmScore: 10, salary: 1000, dmi: 100, ...p };
}
function cur(p: Partial<CurrentPlayer> & { playerId: string }): CurrentPlayer {
  return { salary: 1000, dmi: 100, ...p };
}

describe("computeRosterDelta", () => {
  it("reports no change when the roster is stable", () => {
    const window = [win({ playerId: "a" }), win({ playerId: "b" })];
    const current = [cur({ playerId: "a" }), cur({ playerId: "b" })];
    const delta = computeRosterDelta(window, current);
    expect(delta.departed).toHaveLength(0);
    expect(delta.arrived).toHaveLength(0);
    expect(delta.windowSalary).toBe(2000);
    expect(delta.windowMinutes).toBe(60);
  });

  it("detects a sold rotation player as departed", () => {
    const window = [
      win({ playerId: "star", mpg: 34, salary: 5000, dmi: 400 }),
      win({ playerId: "b", mpg: 28 }),
    ];
    const current = [cur({ playerId: "b" })];
    const delta = computeRosterDelta(window, current);
    expect(delta.departed.map((p) => p.playerId)).toEqual(["star"]);
    expect(delta.departedSalary).toBe(5000);
    expect(delta.departedMinutes).toBe(34);
    expect(delta.arrived).toHaveLength(0);
  });

  it("detects a bought player as arrived, valued only by salary/DMI", () => {
    const window = [win({ playerId: "a" }), win({ playerId: "b" })];
    const current = [
      cur({ playerId: "a" }),
      cur({ playerId: "b" }),
      cur({ playerId: "new", salary: 4000, dmi: 300 }),
    ];
    const delta = computeRosterDelta(window, current);
    expect(delta.arrived.map((p) => p.playerId)).toEqual(["new"]);
    expect(delta.arrivedSalary).toBe(4000);
    // arrivals carry no minutes/GmSc — only value signals.
    expect(delta.arrived[0].mpg).toBeNull();
    expect(delta.arrived[0].gmScore).toBeNull();
  });

  it("ignores a sold deep-bench player below the rotation threshold", () => {
    const window = [
      win({ playerId: "a", mpg: 30 }),
      win({ playerId: "scrub", mpg: 4, salary: 800 }),
    ];
    const current = [cur({ playerId: "a" })];
    const delta = computeRosterDelta(window, current);
    expect(delta.departed).toHaveLength(0);
    expect(delta.windowSalary).toBe(1000); // scrub excluded from the base too
  });

  it("does not treat a returning low-minute player as a new arrival", () => {
    const window = [win({ playerId: "a", mpg: 30 }), win({ playerId: "deep", mpg: 3 })];
    const current = [cur({ playerId: "a" }), cur({ playerId: "deep" })];
    const delta = computeRosterDelta(window, current);
    expect(delta.arrived).toHaveLength(0); // "deep" appeared in the window
  });
});

describe("rosterDeltaFactor", () => {
  const stable = computeRosterDelta(
    [win({ playerId: "a" }), win({ playerId: "b" })],
    [cur({ playerId: "a" }), cur({ playerId: "b" })],
  );

  it("is neutral (1.0) on a stable roster for every proxy", () => {
    expect(rosterDeltaFactor(stable, "salary")).toBe(1);
    expect(rosterDeltaFactor(stable, "dmi")).toBe(1);
    expect(rosterDeltaFactor(stable, "minutes")).toBe(1);
    expect(rosterDeltaFactor(stable, "none")).toBe(1);
  });

  it("discounts a pure sale by the departed salary share", () => {
    // window salary 10000; sell 2000 → 1 - 0.2 = 0.8
    const delta = computeRosterDelta(
      [
        win({ playerId: "star", salary: 2000 }),
        win({ playerId: "b", salary: 8000 }),
      ],
      [cur({ playerId: "b", salary: 8000 })],
    );
    expect(rosterDeltaFactor(delta, "salary")).toBeCloseTo(0.8, 10);
  });

  it("rewards a pure purchase by the arrived salary share", () => {
    // window salary 10000; buy 1500 → 1 + 0.15 = 1.15
    const delta = computeRosterDelta(
      [win({ playerId: "a", salary: 4000 }), win({ playerId: "b", salary: 6000 })],
      [
        cur({ playerId: "a", salary: 4000 }),
        cur({ playerId: "b", salary: 6000 }),
        cur({ playerId: "new", salary: 1500 }),
      ],
    );
    expect(rosterDeltaFactor(delta, "salary")).toBeCloseTo(1.15, 10);
  });

  it("nets a simultaneous buy and sell (salary), where minutes only see the sale", () => {
    // window salary 10000; sell 3000, buy 1000 → net -2000 → 0.8
    const delta = computeRosterDelta(
      [
        win({ playerId: "star", mpg: 30, salary: 3000 }),
        win({ playerId: "b", mpg: 30, salary: 7000 }),
      ],
      [cur({ playerId: "b", salary: 7000 }), cur({ playerId: "new", salary: 1000 })],
    );
    expect(rosterDeltaFactor(delta, "salary")).toBeCloseTo(0.8, 10);
    // minutes proxy normalizes by a full game (240): departed 30/240 → 0.875.
    expect(rosterDeltaFactor(delta, "minutes")).toBeCloseTo(0.875, 10);
  });

  it("falls back to the minutes discount when a departed player can't be priced", () => {
    // Cold start: a sold rotation player has no captured salary (null). The salary
    // proxy must NOT credit the arrival alone — it discounts via minutes instead.
    const delta = computeRosterDelta(
      [
        win({ playerId: "sold", mpg: 36, salary: null, dmi: null }),
        win({ playerId: "b", mpg: 30, salary: 5000 }),
      ],
      [cur({ playerId: "b", salary: 5000 }), cur({ playerId: "new", salary: 4000 })],
    );
    // Without the guard this would boost (only the 4000 arrival is priced).
    // With it: minutes discount 1 − 36/240 = 0.85 — a sale, not a strengthening.
    expect(rosterDeltaFactor(delta, "salary")).toBeCloseTo(0.85, 10);
  });

  it("clamps an extreme fire-sale to the floor", () => {
    const delta = computeRosterDelta(
      [
        win({ playerId: "star", salary: 9000 }),
        win({ playerId: "b", salary: 1000 }),
      ],
      [cur({ playerId: "b", salary: 1000 })],
    );
    // 1 - 0.9 = 0.1 → clamped to ROSTER_DELTA_MIN
    expect(rosterDeltaFactor(delta, "salary")).toBe(0.6);
  });

  it("is neutral when there is no change and no signal at all", () => {
    const delta = computeRosterDelta([], []);
    expect(rosterDeltaFactor(delta, "salary")).toBe(1);
    expect(rosterDeltaFactor(delta, "dmi")).toBe(1);
    expect(rosterDeltaFactor(delta, "minutes")).toBe(1);
  });
});

describe("rosterDisruption", () => {
  it("is zero on a stable roster", () => {
    const delta = computeRosterDelta(
      [win({ playerId: "a" })],
      [cur({ playerId: "a" })],
    );
    expect(rosterDisruption(delta)).toBe(0);
  });

  it("reports the larger of minutes share and salary swing", () => {
    // departed minutes 36/240 = 0.15; salary swing 3000/10000 = 0.3 → max 0.3
    const delta = computeRosterDelta(
      [
        win({ playerId: "star", mpg: 36, salary: 3000 }),
        win({ playerId: "b", mpg: 30, salary: 7000 }),
      ],
      [cur({ playerId: "b", salary: 7000 })],
    );
    expect(rosterDisruption(delta)).toBeCloseTo(0.3, 10);
  });
});
