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
import { DASHBOARD_CACHE_KEY } from "@/server/cache/cache-keys";
import { createNamespacedCacheStore } from "@/server/cache/namespaced-cache-store";
import { credentialsNamespace } from "@/server/data/request-context";
import { loadDashboardData } from "@/server/data/load-dashboard-data";

/**
 * Simulates the production multi-user scenario without a second BuzzerBeater
 * account: one warm server instance (a single backing cache) serving two
 * different accounts. Proves the fix end-to-end through the dashboard loader —
 * account B never sees A's warmed data, and each account gets its own.
 */
describe("dashboard cache isolation across accounts", () => {
  it("does not serve one account's dashboard to another", async () => {
    // One shared store == one warm Vercel instance's memory cache.
    const backing = new MemoryCacheStore();

    const accountA = {
      login: "coach-a@example.com",
      securityCode: "code-a",
      secondTeam: false,
    };
    const accountB = {
      login: "coach-b@example.com",
      securityCode: "code-b",
      secondTeam: false,
    };

    // The exact cache view each account's request would receive.
    const cacheA = createNamespacedCacheStore(
      backing,
      credentialsNamespace(accountA),
    );
    const cacheB = createNamespacedCacheStore(
      backing,
      credentialsNamespace(accountB),
    );

    // Account A loads first (the "computer" that warms the cache).
    const loadedA = await loadDashboardData({
      cache: cacheA,
      client: new AccountFixtureClient("Alice Club"),
    });
    expect(loadedA.data.team.name).toBe("Alice Club");
    expect(loadedA.cacheStatus.source).toBe("refreshed");

    // Account B loads next. Before the fix this was a cache HIT returning
    // Alice Club. Now B's namespace is empty, so it fetches its own data.
    const bClient = new AccountFixtureClient("Bob Club");
    const loadedB = await loadDashboardData({ cache: cacheB, client: bClient });

    expect(loadedB.cacheStatus.source).toBe("refreshed"); // cache miss → fetched
    expect(bClient.fetched).toBe(true); // B actually hit BBAPI for itself
    expect(loadedB.data.team.name).toBe("Bob Club"); // not "Alice Club"

    // A second A request is still A's data, untouched by B's refresh.
    const reloadedA = await loadDashboardData({
      cache: cacheA,
      client: new AccountFixtureClient("Alice Club"),
    });
    expect(reloadedA.cacheStatus.source).toBe("fresh-cache");
    expect(reloadedA.data.team.name).toBe("Alice Club");

    // And the two accounts wrote to genuinely different backing keys.
    const keys = Array.from(backing.values.keys());
    expect(keys.some((k) => k.endsWith(DASHBOARD_CACHE_KEY))).toBe(true);
    expect(
      keys.filter((k) => k.endsWith(DASHBOARD_CACHE_KEY)).length,
    ).toBe(2);
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

/**
 * Returns the shared BBAPI fixtures, but rewrites the team name in teaminfo so
 * each simulated account has visibly distinct data. The team id stays "100" so
 * the schedule/box-score fixtures still line up.
 */
class AccountFixtureClient implements BbapiClient {
  fetched = false;

  constructor(private readonly teamName: string) {}

  async login(): Promise<void> {}

  async logout(): Promise<void> {}

  async requestPage(
    endpoint: BbapiDataEndpoint,
  ): Promise<BbapiXmlDocument> {
    this.fetched = true;

    switch (endpoint) {
      case "teaminfo.aspx":
        return fixture("teaminfo.xml", endpoint, (xml) =>
          xml.replace("Test Club", this.teamName),
        );
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
  transform: (xml: string) => string = (xml) => xml,
): BbapiXmlDocument {
  const xml = readFileSync(
    join(process.cwd(), "tests", "fixtures", "bbapi", fileName),
    "utf8",
  );

  return parseBbapiXml(transform(xml), endpoint);
}
