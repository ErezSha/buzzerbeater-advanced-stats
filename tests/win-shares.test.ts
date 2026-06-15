import {
  defensiveWinShares,
  estimatedPossessions,
  offensiveWinShares,
  winShares,
  type RatingStatLine,
} from "@/domain/metrics";

// Win Shares is composed on top of the (independently golden-tested) Dean Oliver
// building blocks. These tests reuse the same ~50-game season fixtures as the
// ORtg/DRtg suite so the golden values trace back to a known offensive/defensive
// profile, and pin the `mPPW = 0.32 * lgPtsPerPoss * teamPace` reduction.

describe("Win Shares (Dean Oliver / Basketball-Reference)", () => {
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

  const teamPossessions = estimatedPossessions(team)!; // 7736
  const teamGames = 50;
  // Self-contained baseline: the team plus the opponents it faced.
  const lgPtsPerPoss =
    (team.points! + opponent.points!) /
    (estimatedPossessions(team)! + estimatedPossessions(opponent)!); // 15600 / 15328
  const league = { pointsPerPossession: lgPtsPerPoss };

  it("computes offensive, defensive, and total Win Shares", () => {
    const ows = offensiveWinShares(player, team, opponent, teamPossessions, teamGames, league);
    const dws = defensiveWinShares(player, team, opponent, teamPossessions, teamGames, league);
    const ws = winShares(player, team, opponent, teamPossessions, teamGames, league);

    expect(ows).toBeCloseTo(1.46651, 3);
    expect(dws).toBeCloseTo(0.83361, 3);
    expect(ws).toBeCloseTo(2.30011, 3);
    // Win Shares is the sum of its parts.
    expect(ws!).toBeCloseTo(ows! + dws!, 9);
  });

  it("allows negative Offensive Win Shares for sub-replacement play", () => {
    // A scoring environment far richer than the player's production makes
    // marginal offense (and thus OWS) negative — the methodology permits this.
    const richLeague = { pointsPerPossession: 2.0 };
    const ows = offensiveWinShares(player, team, opponent, teamPossessions, teamGames, richLeague);
    expect(ows).not.toBeNull();
    expect(ows!).toBeLessThan(0);
  });

  it("returns null when the league baseline is unavailable", () => {
    const noBaseline = { pointsPerPossession: null };
    expect(offensiveWinShares(player, team, opponent, teamPossessions, teamGames, noBaseline)).toBeNull();
    expect(defensiveWinShares(player, team, opponent, teamPossessions, teamGames, noBaseline)).toBeNull();
    expect(winShares(player, team, opponent, teamPossessions, teamGames, noBaseline)).toBeNull();
  });

  it("returns null when marginal points per win is undefined", () => {
    // Zero games → teamPace undefined → mPPW null.
    expect(offensiveWinShares(player, team, opponent, teamPossessions, 0, league)).toBeNull();
    expect(defensiveWinShares(player, team, opponent, teamPossessions, 0, league)).toBeNull();
    // Missing team possessions → mPPW null.
    expect(offensiveWinShares(player, team, opponent, null, teamGames, league)).toBeNull();
  });

  it("returns null when a required player field is missing", () => {
    // OWS leans on Points Produced (needs FGM); DWS leans on minutes.
    expect(
      offensiveWinShares({ ...player, fieldGoals: null }, team, opponent, teamPossessions, teamGames, league),
    ).toBeNull();
    expect(
      defensiveWinShares({ ...player, minutes: null }, team, opponent, teamPossessions, teamGames, league),
    ).toBeNull();
    // Either part null → total null.
    expect(
      winShares({ ...player, minutes: null }, team, opponent, teamPossessions, teamGames, league),
    ).toBeNull();
  });
});
