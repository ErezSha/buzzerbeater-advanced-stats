import { readFileSync } from "node:fs";
import { join } from "node:path";
import { deriveDashboardMetrics } from "@/domain/aggregate";
import { parseBoxScore } from "@/server/bbapi/adapters/box-score";
import { parseRoster } from "@/server/bbapi/adapters/roster";
import { parseSchedule } from "@/server/bbapi/adapters/schedule";
import { parseTeamInfo } from "@/server/bbapi/adapters/team-info";
import { parseTeamStats } from "@/server/bbapi/adapters/team-stats";
import { parseBbapiXml, type BbapiXmlDocument } from "@/server/bbapi/xml";

describe("dashboard metric derivation", () => {
  it("derives player, game, team, trend, and alert summaries", () => {
    const team = parseTeamInfo(fixture("teaminfo.xml", "teaminfo.aspx"));
    const matches = parseSchedule(fixture("schedule.xml", "schedule.aspx"), team.id);
    const boxScores = [
      parseBoxScore(fixture("boxscore.xml", "boxscore.aspx"), "9001"),
    ];
    const derived = deriveDashboardMetrics({
      team,
      players: parseRoster(fixture("roster.xml", "roster.aspx")),
      matches,
      playerSeasonStats: parseTeamStats(fixture("teamstats.xml", "teamstats.aspx")),
      boxScores,
      refreshedAt: "2026-06-05T00:00:00.000Z",
    });

    expect(derived.players[0]).toMatchObject({
      playerId: "501",
      games: 1,
      points: 23,
      rebounds: 7,
      assists: 6,
    });
    expect(derived.players[0]?.shooting.effectiveFieldGoalPercentage).toBeCloseTo(
      0.633333,
    );
    expect(derived.players[0]?.gameScoreAverage).toBeCloseTo(20.5);
    expect(derived.games[0]).toMatchObject({
      matchId: "9001",
      points: 23,
      opponentPoints: 15,
      margin: 8,
    });
    expect(derived.games[0]?.possessions).toBeCloseTo(18.2);
    expect(derived.games[0]?.offensiveRating).toBeCloseTo(126.373626);
    expect(derived.team).toMatchObject({
      games: 1,
      wins: 1,
      losses: 0,
    });
    expect(derived.trends.games).toHaveLength(1);
    expect(derived.trends.rollingAverages.last3).toBeNull();
    expect(derived.alerts).toContainEqual(
      expect.objectContaining({ code: "low-sample" }),
    );
  });
});

function fixture(fileName: string, endpoint: Parameters<typeof parseBbapiXml>[1]): BbapiXmlDocument {
  const xml = readFileSync(
    join(process.cwd(), "tests", "fixtures", "bbapi", fileName),
    "utf8",
  );

  return parseBbapiXml(xml, endpoint);
}
