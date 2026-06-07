import { readFileSync } from "node:fs";
import { join } from "node:path";
import { derivePlayerMetricSummaries } from "@/domain/derive-player-stats";
import { parsePlayerDetail } from "@/server/bbapi/adapters/player";
import { parseBbapiXml, type BbapiXmlDocument } from "@/server/bbapi/xml";

describe("single player analysis smoke test", () => {
  it("can build a player summary shell from player.aspx but cannot derive advanced stats without stat sources", () => {
    const player = parsePlayerDetail(fixture("player.xml", "player.aspx"));
    const [summary] = derivePlayerMetricSummaries([player], [], []);

    expect(summary).toMatchObject({
      playerId: "55713639",
      name: "Alex Prospect",
      position: "PG",
      rosterStatus: "unknown",
      games: 0,
      points: 0,
      rebounds: 0,
      assists: 0,
    });
    expect(summary?.minutes).toBe(0);
    expect(summary?.usageRate).toBeNull();
    expect(summary?.gameScoreAverage).toBeNull();
    expect(summary?.shooting.trueShootingPercentage).toBeNull();
  });
});

function fixture(fileName: string, endpoint: Parameters<typeof parseBbapiXml>[1]): BbapiXmlDocument {
  const xml = readFileSync(
    join(process.cwd(), "tests", "fixtures", "bbapi", fileName),
    "utf8",
  );

  return parseBbapiXml(xml, endpoint);
}
