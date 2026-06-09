import { leagueDataTtlMs, playerAnalysisTtlMs } from "@/server/cache/cache-keys";

// Dates below are local time (the TTL helpers read local getDay/getHours):
//   2026-06-09 = Tuesday, 2026-06-10 = Wednesday, 2026-06-13 = Saturday.
// League games tip off Tue & Sat at 17:55.
const POST_GAME_TTL_MS = 20 * 60 * 1000;
const PRE_GAME_BUFFER_MS = 5 * 60 * 1000;

function at(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  return new Date(year, monthIndex, day, hour, minute, 0, 0);
}

describe("leagueDataTtlMs", () => {
  it("uses the short settling TTL during the post-game window (Tue 18:30)", () => {
    expect(leagueDataTtlMs(at(2026, 5, 9, 18, 30))).toBe(POST_GAME_TTL_MS);
  });

  it("uses the short settling TTL up to 3 hours after kickoff (Sat 20:45)", () => {
    expect(leagueDataTtlMs(at(2026, 5, 13, 20, 45))).toBe(POST_GAME_TTL_MS);
  });

  it("caches until the next game once the settling window closes (Tue 21:30 -> Sat)", () => {
    const now = at(2026, 5, 9, 21, 30); // Tue, >3h after kickoff
    const nextGame = at(2026, 5, 13, 17, 55); // Sat 17:55
    expect(leagueDataTtlMs(now)).toBe(
      nextGame.getTime() - now.getTime() - PRE_GAME_BUFFER_MS,
    );
  });

  it("does not expire on non-league game days (Wed noon -> Sat)", () => {
    const now = at(2026, 5, 10, 12, 0); // Wednesday
    const nextGame = at(2026, 5, 13, 17, 55); // Sat 17:55
    expect(leagueDataTtlMs(now)).toBe(
      nextGame.getTime() - now.getTime() - PRE_GAME_BUFFER_MS,
    );
    // Spans ~3 days — far longer than the old flat 15-minute TTL.
    expect(leagueDataTtlMs(now)).toBeGreaterThan(2 * 24 * 60 * 60 * 1000);
  });
});

describe("playerAnalysisTtlMs vs leagueDataTtlMs divergence", () => {
  it("treats Wednesday as a game day for player analysis but not for the league", () => {
    const now = at(2026, 5, 10, 18, 30); // Wed, 35m after kickoff
    // Player analysis covers Wed games -> short settling TTL.
    expect(playerAnalysisTtlMs(now)).toBe(POST_GAME_TTL_MS);
    // The league does not play Wed -> long cache until the next league game.
    expect(leagueDataTtlMs(now)).toBeGreaterThan(2 * 24 * 60 * 60 * 1000);
  });
});
