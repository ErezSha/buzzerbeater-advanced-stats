import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseBoxScore } from "@/server/bbapi/adapters/box-score";
import { parseRoster } from "@/server/bbapi/adapters/roster";
import { parseSchedule } from "@/server/bbapi/adapters/schedule";
import { parseTeamInfo } from "@/server/bbapi/adapters/team-info";
import { parseTeamStats } from "@/server/bbapi/adapters/team-stats";
import { parseBbapiXml, type BbapiXmlDocument } from "@/server/bbapi/xml";

describe("BBAPI XML adapters", () => {
  it("normalizes team info attributes and child elements", () => {
    const team = parseTeamInfo(fixture("teaminfo.xml", "teaminfo.aspx"));

    expect(team).toEqual({
      id: "100",
      name: "Test Club",
      owner: "Test Manager",
      leagueId: "22",
      countryId: "1",
    });
  });

  it("normalizes roster players", () => {
    const players = parseRoster(fixture("roster.xml", "roster.aspx"));

    expect(players).toEqual([
      {
        id: "501",
        name: "Alex Example",
        position: "SG",
        age: 27,
        height: "6-5",
        salary: 12345,
        rosterStatus: "active",
      },
    ]);
  });

  it("normalizes schedule score children and own-team opponent names", () => {
    const matches = parseSchedule(fixture("schedule.xml", "schedule.aspx"), "100");

    expect(matches).toMatchObject([
      {
        id: "9001",
        season: "72",
        homeScore: 88,
        awayScore: 80,
        opponentName: "Opponent One",
        status: "finished",
      },
      {
        id: "9002",
        homeScore: null,
        awayScore: null,
        opponentName: "Opponent Two",
        status: "scheduled",
      },
    ]);
  });

  it("normalizes team season stat rows", () => {
    const stats = parseTeamStats(fixture("teamstats.xml", "teamstats.aspx"));

    expect(stats[0]).toMatchObject({
      playerId: "501",
      games: 11,
      minutesPerGame: 33.5,
      pointsPerGame: 18.2,
      fieldGoalPercentage: 48.1,
      turnoversPerGame: 2.2,
      rating: 8.7,
    });
  });

  it("normalizes nested box score player rows and derives two-point stats", () => {
    const boxScore = parseBoxScore(
      fixture("boxscore.xml", "boxscore.aspx"),
      "fallback",
    );

    expect(boxScore.matchId).toBe("9001");
    expect(boxScore.homeTeam).toMatchObject({
      teamId: "100",
      teamName: "Test Club",
      isHome: true,
    });
    expect(boxScore.players).toHaveLength(2);
    expect(boxScore.players[0]).toMatchObject({
      matchId: "9001",
      playerId: "501",
      playerName: "Alex Example",
      teamId: "100",
      fieldGoals: 8,
      fieldGoalAttempts: 15,
      twoPointMakes: 5,
      twoPointAttempts: 8,
      defensiveRebounds: 5,
      fouls: 4,
    });
  });
});

function fixture(fileName: string, endpoint: Parameters<typeof parseBbapiXml>[1]): BbapiXmlDocument {
  const xml = readFileSync(
    join(process.cwd(), "tests", "fixtures", "bbapi", fileName),
    "utf8",
  );

  return parseBbapiXml(xml, endpoint);
}
