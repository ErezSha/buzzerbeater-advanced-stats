import type { LeagueViewModel } from "@/lib/api-types";
import {
  LEAGUE_CACHE_KEY,
  LEAGUE_FULL_CACHE_KEY,
} from "@/server/cache/cache-keys";
import type { CacheStore } from "@/server/cache/cache-store";
import type { BbapiClient } from "@/server/bbapi/client";
import { refreshLeagueData } from "@/server/data/refresh-league-data";
import { getRequestContext } from "@/server/data/request-context";

export interface LoadLeagueDataResult {
  data: LeagueViewModel;
  refreshedAt: string;
  cacheSource: "full-cache" | "lightweight-cache" | "refreshed";
}

export async function loadLeagueData(
  cache?: CacheStore,
): Promise<LoadLeagueDataResult> {
  // No injected cache means a production request: resolve the signed-in account
  // so the read is authenticated and the cache is scoped to that account.
  // standings.aspx returns the *logged-in user's* league, so an unscoped cache
  // would otherwise hand one user's league to another.
  let client: BbapiClient | undefined;

  if (!cache) {
    const context = await getRequestContext();
    cache = context.cache;
    client = context.client;
  }

  const fullCached = await cache.get<{ data: LeagueViewModel; refreshedAt: string }>(
    LEAGUE_FULL_CACHE_KEY,
  );

  if (fullCached) {
    return { ...fullCached, cacheSource: "full-cache" };
  }

  const lightCached = await cache.get<{ data: LeagueViewModel; refreshedAt: string }>(
    LEAGUE_CACHE_KEY,
  );

  if (lightCached) {
    return { ...lightCached, cacheSource: "lightweight-cache" };
  }

  const result = await refreshLeagueData({ cache, client });
  return { ...result, cacheSource: "refreshed" };
}
