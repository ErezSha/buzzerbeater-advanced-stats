import { readFileSync } from "node:fs";
import { join } from "node:path";
import { deriveDashboardMetrics } from "@/domain/aggregate";
import type { NormalizedBbapiData } from "@/domain/types";
import type { BbapiClient } from "@/server/bbapi/client";
import type { BbapiDataEndpoint, BbapiRequestParams } from "@/server/bbapi/endpoints";
import type { BbapiXmlDocument } from "@/server/bbapi/xml";
import { parseBbapiXml } from "@/server/bbapi/xml";
import type { CacheStore } from "@/server/cache/cache-store";
import { loadDashboardData } from "@/server/data/load-dashboard-data";
import { refreshDashboardData } from "@/server/data/refresh-dashboard-data";

describe("dashboard data orchestration", () => {
  it("returns a fresh cached dashboard without calling BBAPI", async () => {
    const cache = new MemoryCacheStore();
    const cachedBase = {
      team: {
        id: "100",
        name: "Cached Club",
      },
      players: [],
      matches: [],
      playerSeasonStats: [],
      boxScores: [],
      refreshedAt: "2026-06-05T00:00:00.000Z",
    };
    const cached: NormalizedBbapiData = {
      ...cachedBase,
      derived: deriveDashboardMetrics(cachedBase),
    };

    await cache.set("normalized/dashboard", cached);

    const client = new FixtureBbapiClient();
    const loaded = await loadDashboardData({ cache, client });

    expect(loaded.data.team.name).toBe("Cached Club");
    expect(loaded.cacheStatus.source).toBe("fresh-cache");
    expect(client.requests).toEqual([]);
  });

  it("refreshes normalized data and logs out after fetching finished box scores", async () => {
    const cache = new MemoryCacheStore();
    const client = new FixtureBbapiClient();

    const data = await refreshDashboardData({ cache, client });

    expect(data.team).toMatchObject({ id: "100", name: "Test Club" });
    expect(data.players).toHaveLength(1);
    // schedule.xml has 5 matches; 4 are finished stat matches (9001 rs +
    // 9003/9004/9005 playoffs), 9002 is a future regular-season game.
    expect(data.matches).toHaveLength(5);
    expect(data.boxScores).toHaveLength(4);
    expect(data.derived.players[0]).toMatchObject({
      playerId: "501",
      gameScoreAverage: expect.any(Number),
    });
    expect(data.derived.games[0]).toMatchObject({
      matchId: "9001",
      offensiveRating: expect.any(Number),
    });
    expect(client.requests.map((request) => request.endpoint)).toEqual([
      "teaminfo.aspx",
      "roster.aspx",
      "schedule.aspx",
      "teamstats.aspx",
      "boxscore.aspx",
      "boxscore.aspx",
      "boxscore.aspx",
      "boxscore.aspx",
    ]);
    expect(client.loggedOut).toBe(true);
    await expect(cache.get("normalized/dashboard")).resolves.toMatchObject({
      team: { id: "100" },
    });
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

class FixtureBbapiClient implements BbapiClient {
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
      case "teaminfo.aspx":
        return fixture("teaminfo.xml", endpoint);
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

function fixture(fileName: string, endpoint: BbapiDataEndpoint): BbapiXmlDocument {
  const xml = readFileSync(
    join(process.cwd(), "tests", "fixtures", "bbapi", fileName),
    "utf8",
  );

  return parseBbapiXml(xml, endpoint);
}
