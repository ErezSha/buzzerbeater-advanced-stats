import type { NormalizedBbapiData } from "@/domain/types";
import type { CacheStatus } from "@/lib/api-types";
import { DASHBOARD_CACHE_KEY } from "@/server/cache/cache-keys";
import { createFileCacheStore } from "@/server/cache/file-cache-store";
import {
  refreshDashboardData,
  type RefreshDashboardDataOptions,
} from "@/server/data/refresh-dashboard-data";

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
  const cache = options.cache ?? createFileCacheStore();

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
    client: options.client,
  });

  return {
    data,
    cacheStatus: {
      source: "refreshed",
      refreshedAt: data.refreshedAt,
    },
  };
}
