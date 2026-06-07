import type { LeagueViewModel } from "@/lib/api-types";
import {
  LEAGUE_CACHE_KEY,
  LEAGUE_FULL_CACHE_KEY,
} from "@/server/cache/cache-keys";
import { getCacheStore } from "@/server/cache/get-cache-store";
import type { CacheStore } from "@/server/cache/cache-store";
import { refreshLeagueData } from "@/server/data/refresh-league-data";

export interface LoadLeagueDataResult {
  data: LeagueViewModel;
  refreshedAt: string;
  cacheSource: "full-cache" | "lightweight-cache" | "refreshed";
}

export async function loadLeagueData(
  cache: CacheStore = getCacheStore(),
): Promise<LoadLeagueDataResult> {
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

  const result = await refreshLeagueData({ cache });
  return { ...result, cacheSource: "refreshed" };
}
