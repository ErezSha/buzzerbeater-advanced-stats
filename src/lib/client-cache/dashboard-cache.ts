import { del, get, set } from "idb-keyval";
import type { DashboardViewModel } from "@/lib/api-types";

/**
 * Bump whenever the shape of {@link DashboardViewModel} (NormalizedBbapiData)
 * changes. A stored entry with a mismatching version is discarded on read so
 * stale shapes never reach the UI.
 */
export const DASHBOARD_CACHE_SCHEMA_VERSION = 1;

export const DASHBOARD_CACHE_KEY = "bbas:dashboard";

export interface CachedDashboard {
  version: number;
  refreshedAt: string;
  data: DashboardViewModel;
}

export interface ClientDashboardCache {
  read(): Promise<CachedDashboard | null>;
  write(entry: CachedDashboard): Promise<void>;
  clear(): Promise<void>;
}

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

/**
 * IndexedDB-backed persistence for the rendered dashboard view model.
 *
 * The whole payload lives under a single key (idb-keyval structured-clones it,
 * so no manual JSON serialization). All operations degrade to a no-op / null
 * when IndexedDB is unavailable (SSR, private browsing, locked DB) so callers
 * can treat "no cache" and "failed cache" identically.
 */
export function createIdbDashboardCache(
  key: string = DASHBOARD_CACHE_KEY,
): ClientDashboardCache {
  return {
    async read() {
      if (!isIndexedDbAvailable()) {
        return null;
      }

      try {
        const entry = await get<CachedDashboard>(key);

        if (!entry) {
          return null;
        }

        if (entry.version !== DASHBOARD_CACHE_SCHEMA_VERSION) {
          await this.clear();
          return null;
        }

        return entry;
      } catch {
        return null;
      }
    },

    async write(entry) {
      if (!isIndexedDbAvailable()) {
        return;
      }

      try {
        await set(key, entry);
      } catch {
        // Ignore quota / availability errors — the cache is best-effort.
      }
    },

    async clear() {
      if (!isIndexedDbAvailable()) {
        return;
      }

      try {
        await del(key);
      } catch {
        // Ignore — nothing else we can do if the delete fails.
      }
    },
  };
}
