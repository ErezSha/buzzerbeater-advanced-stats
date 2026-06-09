import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BbapiClient } from "@/server/bbapi/client";
import type {
  BbapiDataEndpoint,
  BbapiRequestParams,
} from "@/server/bbapi/endpoints";
import type { BbapiXmlDocument } from "@/server/bbapi/xml";
import { parseBbapiXml } from "@/server/bbapi/xml";
import type { CacheStore } from "@/server/cache/cache-store";
import { refreshLeagueDataFull } from "@/server/data/refresh-league-data-full";

// schedule.xml fixture finished league matches:
//   9001 league.rs           (regular)
//   9003 league.quarterfinal (playoff)
//   9004 league.semifinal    (playoff)
//   9005 league.final        (playoff)
// 9002 (league.rs) is in the future -> scheduled, never fetched.
describe("refreshLeagueDataFull segmentation", () => {
  it("partitions league box scores into regular / playoff / all segments", async () => {
    const cache = new MemoryCacheStore();
    const client = new LeagueFixtureClient();

    const { data } = await refreshLeagueDataFull({ cache, client });

    expect(data.tier).toBe("full");

    // Only finished league matches were requested; the scheduled rs game (9002)
    // and any non-league type are excluded.
    const requestedMatchIds = client.requests
      .filter((r) => r.endpoint === "boxscore.aspx")
      .map((r) => r.params?.matchid);
    expect(new Set(requestedMatchIds)).toEqual(
      new Set(["9001", "9003", "9004", "9005"]),
    );
    expect(requestedMatchIds).not.toContain("9002");

    // All three segments derive from box scores, so each has players.
    expect(data.players.regular.length).toBeGreaterThan(0);
    expect(data.players.playoff.length).toBeGreaterThan(0);
    expect(data.players.all.length).toBeGreaterThan(0);
  });

  it("populates seasonStat only for the regular segment", async () => {
    const cache = new MemoryCacheStore();
    const client = new LeagueFixtureClient();

    const { data } = await refreshLeagueDataFull({ cache, client });

    // teamstats.xml has season stats for player 501 -> regular segment carries it.
    const regular501 = data.players.regular.find((p) => p.playerId === "501");
    expect(regular501?.seasonStat).toBeTruthy();

    // seasonStat is regular-season-only and must never leak into playoff/all.
    expect(
      data.players.playoff.every((p) => p.seasonStat == null),
    ).toBe(true);
    expect(data.players.all.every((p) => p.seasonStat == null)).toBe(true);
  });
});

class MemoryCacheStore implements CacheStore {
  readonly values = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | null> {
    return (this.values.get(key) as T | undefined) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.values.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }

  async clearByPrefix(prefix: string): Promise<void> {
    for (const key of Array.from(this.values.keys())) {
      if (key.startsWith(prefix)) {
        this.values.delete(key);
      }
    }
  }
}

class LeagueFixtureClient implements BbapiClient {
  readonly requests: Array<{
    endpoint: BbapiDataEndpoint;
    params: BbapiRequestParams | undefined;
  }> = [];
  loggedOut = false;

  async login(): Promise<void> {
    return;
  }

  async logout(): Promise<void> {
    this.loggedOut = true;
  }

  async requestPage(
    endpoint: BbapiDataEndpoint,
    params?: BbapiRequestParams,
  ): Promise<BbapiXmlDocument> {
    this.requests.push({ endpoint, params });

    switch (endpoint) {
      case "standings.aspx":
        return fixture("standings.xml", endpoint);
      case "roster.aspx":
        return fixture("roster.xml", endpoint);
      case "schedule.aspx":
        return fixture("schedule.xml", endpoint);
      case "teamstats.aspx":
        return fixture("teamstats.xml", endpoint);
      case "boxscore.aspx":
        return fixture("boxscore.xml", endpoint);
      default:
        throw new Error(`Unexpected endpoint: ${endpoint}`);
    }
  }
}

function fixture(
  fileName: string,
  endpoint: BbapiDataEndpoint,
): BbapiXmlDocument {
  const xml = readFileSync(
    join(process.cwd(), "tests", "fixtures", "bbapi", fileName),
    "utf8",
  );

  return parseBbapiXml(xml, endpoint);
}
