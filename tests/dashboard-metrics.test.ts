import { readFileSync } from "node:fs";
import { join } from "node:path";
import { deriveDashboardMetrics } from "@/domain/aggregate";
import type { BoxScore, Match, Player, Team } from "@/domain/types";
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

  it("feeds availability with minutes per game instead of cumulative minutes", () => {
    const team: Team = { id: "100", name: "Test Club" };
    const players: Player[] = [
      {
        id: "501",
        name: "Injured Starter",
        rosterStatus: "active",
        injured: true,
        gameShape: 7,
      },
    ];
    const matches: Match[] = [
      finishedMatch("9001", "2026-06-01"),
      finishedMatch("9002", "2026-06-08"),
    ];
    const boxScores: BoxScore[] = [
      boxScore("9001", team.id, players[0].id, 20),
      boxScore("9002", team.id, players[0].id, 20),
    ];

    const derived = deriveDashboardMetrics({
      team,
      players,
      matches,
      playerSeasonStats: [],
      boxScores,
      refreshedAt: "2026-06-09T00:00:00.000Z",
    });

    expect(derived.availability?.players[0]?.minutes).toBeCloseTo(20);
    expect(derived.availability?.strengthModifier).toBeCloseTo(0.975);
  });
});

function finishedMatch(id: string, date: string): Match {
  return {
    id,
    date,
    homeTeamId: "100",
    awayTeamId: "200",
    opponentName: "Opponent",
    status: "finished",
  };
}

function boxScore(
  matchId: string,
  teamId: string,
  playerId: string,
  minutes: number,
): BoxScore {
  return {
    matchId,
    homeTeam: {
      matchId,
      teamId,
      points: 10,
      offStrategy: null,
      defStrategy: null,
    },
    awayTeam: {
      matchId,
      teamId: "200",
      points: 8,
      offStrategy: null,
      defStrategy: null,
    },
    players: [
      {
        matchId,
        playerId,
        playerName: "Injured Starter",
        teamId,
        minutes,
        points: 10,
        fieldGoals: 5,
        fieldGoalAttempts: 10,
        freeThrowAttempts: 0,
        offensiveRebounds: 0,
        defensiveRebounds: 0,
        totalRebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        turnovers: 0,
        fouls: 0,
      },
      {
        matchId,
        playerId: "opp",
        playerName: "Opponent",
        teamId: "200",
        minutes,
        points: 8,
        fieldGoals: 4,
        fieldGoalAttempts: 10,
        freeThrowAttempts: 0,
        offensiveRebounds: 0,
        defensiveRebounds: 0,
        totalRebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        turnovers: 0,
        fouls: 0,
      },
    ],
  };
}

function fixture(fileName: string, endpoint: Parameters<typeof parseBbapiXml>[1]): BbapiXmlDocument {
  const xml = readFileSync(
    join(process.cwd(), "tests", "fixtures", "bbapi", fileName),
    "utf8",
  );

  return parseBbapiXml(xml, endpoint);
}
