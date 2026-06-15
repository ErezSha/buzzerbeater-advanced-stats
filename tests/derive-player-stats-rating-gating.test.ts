import { derivePlayerMetricSummaries } from "@/domain/derive-player-stats";
import type { BoxScore, Player, PlayerGameStat, TeamGameStat } from "@/domain/types";

// The Dean Oliver ratings are gated on complete box scores: a game contributes
// to ORtg/DRtg only when its player/team/opponent lines carry every field the
// formulas need. These tests pin that behavior — one incomplete game must lower
// the `ratingGames` coverage count instead of nulling the season ratings.

const player: Player = {
  id: "P",
  name: "Target",
  position: "PG",
  rosterStatus: "active",
};

function targetStat(matchId: string, overrides: Partial<PlayerGameStat> = {}): PlayerGameStat {
  return {
    matchId,
    playerId: "P",
    teamId: "H",
    minutes: 40,
    points: 23,
    fieldGoals: 8,
    fieldGoalAttempts: 15,
    threePointMakes: 2,
    freeThrows: 4,
    freeThrowAttempts: 5,
    offensiveRebounds: 2,
    defensiveRebounds: 5,
    assists: 6,
    steals: 2,
    blocks: 1,
    turnovers: 3,
    fouls: 4,
    ...overrides,
  };
}

const homeTeam: Omit<TeamGameStat, "matchId"> = {
  teamId: "H",
  offStrategy: null,
  defStrategy: null,
  points: 92,
  fieldGoals: 35,
  fieldGoalAttempts: 75,
  threePointMakes: 8,
  freeThrows: 14,
  freeThrowAttempts: 20,
  offensiveRebounds: 10,
  defensiveRebounds: 28,
  totalRebounds: 38,
  assists: 20,
  steals: 7,
  blocks: 4,
  turnovers: 12,
  fouls: 18,
};

const awayTeam: Omit<TeamGameStat, "matchId"> = {
  teamId: "A",
  offStrategy: null,
  defStrategy: null,
  points: 88,
  fieldGoals: 34,
  fieldGoalAttempts: 74,
  threePointMakes: 7,
  freeThrows: 13,
  freeThrowAttempts: 19,
  offensiveRebounds: 9,
  defensiveRebounds: 27,
  totalRebounds: 36,
  assists: 19,
  steals: 6,
  blocks: 3,
  turnovers: 13,
  fouls: 17,
};

function game(matchId: string, target: PlayerGameStat, awayOverrides: Partial<TeamGameStat> = {}): BoxScore {
  return {
    matchId,
    homeTeam: { ...homeTeam, matchId },
    awayTeam: { ...awayTeam, ...awayOverrides, matchId },
    players: [
      target,
      // Home teammate: only minutes matter (team box totals come from homeTeam).
      { matchId, playerId: "Hb", teamId: "H", minutes: 200 },
      // Opponent player supplies the opponent minutes used by DRtg's Stop%.
      { matchId, playerId: "Ax", teamId: "A", minutes: 240 },
    ],
  };
}

describe("individual rating gating in derivePlayerMetricSummaries", () => {
  it("counts every complete game toward the ratings", () => {
    const [summary] = derivePlayerMetricSummaries(
      [player],
      [],
      [game("g1", targetStat("g1")), game("g2", targetStat("g2"))],
    );

    expect(summary.games).toBe(2);
    expect(summary.ratingGames).toBe(2);
    expect(summary.offensiveRating).not.toBeNull();
    expect(summary.defensiveRating).not.toBeNull();
  });

  it("excludes a game missing a player field without nulling the ratings", () => {
    const [summary] = derivePlayerMetricSummaries(
      [player],
      [],
      [game("g1", targetStat("g1")), game("g2", targetStat("g2", { threePointMakes: null }))],
    );

    // The incomplete game still counts as a played game...
    expect(summary.games).toBe(2);
    // ...but only the complete one feeds the ratings, which stay computable.
    expect(summary.ratingGames).toBe(1);
    expect(summary.offensiveRating).not.toBeNull();
    expect(summary.defensiveRating).not.toBeNull();
  });

  it("excludes a game missing an opponent field", () => {
    const [summary] = derivePlayerMetricSummaries(
      [player],
      [],
      [game("g1", targetStat("g1")), game("g2", targetStat("g2"), { points: null })],
    );

    expect(summary.ratingGames).toBe(1);
    expect(summary.offensiveRating).not.toBeNull();
    expect(summary.defensiveRating).not.toBeNull();
  });

  it("leaves ratings null when no game is complete", () => {
    const [summary] = derivePlayerMetricSummaries(
      [player],
      [],
      [game("g1", targetStat("g1", { freeThrowAttempts: null }))],
    );

    expect(summary.ratingGames).toBe(0);
    expect(summary.offensiveRating).toBeNull();
    expect(summary.defensiveRating).toBeNull();
  });
});
