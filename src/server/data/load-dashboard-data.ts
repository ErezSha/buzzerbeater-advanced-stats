import type { NormalizedBbapiData } from "@/domain/types";
import type { CacheStatus } from "@/lib/api-types";
import { DASHBOARD_CACHE_KEY } from "@/server/cache/cache-keys";
import {
  refreshDashboardData,
  type RefreshDashboardDataOptions,
} from "@/server/data/refresh-dashboard-data";
import { getRequestContext } from "@/server/data/request-context";

export interface LoadedDashboardData {
  data: NormalizedBbapiData;
  cacheStatus: CacheStatus;
}

export interface LoadDashboardDataOptions extends RefreshDashboardDataOptions {
  forceRefresh?: boolean;
}

export async function loadDashboardData(
  options: LoadDashboardDataOptions = {},
): Promise<LoadedDashboardData> {
  // Tests inject an explicit cache (and client); production callers don't, so
  // we resolve the signed-in account here. This both gates the read on
  // authentication and scopes the cache to the account, so a cache hit can't
  // serve one user's dashboard to another.
  let cache = options.cache;
  let client = options.client;

  if (!cache) {
    const context = await getRequestContext();
    cache = context.cache;
    client = client ?? context.client;
  }

  if (!options.forceRefresh) {
    const cached = await cache.get<NormalizedBbapiData>(DASHBOARD_CACHE_KEY);

    if (cached) {
      return {
        data: cached,
        cacheStatus: {
          source: "fresh-cache",
          refreshedAt: cached.refreshedAt,
        },
      };
    }
  }

  const data = await refreshDashboardData({
    cache,
    client,
  });

  return {
    data,
    cacheStatus: {
      source: "refreshed",
      refreshedAt: data.refreshedAt,
    },
  };
}
