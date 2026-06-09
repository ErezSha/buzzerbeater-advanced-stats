import { del, get, set } from "idb-keyval";
import type { LeagueViewModel } from "@/lib/api-types";

// v2: players changed from a flat array to segmented { all, regular, playoff }.
export const LEAGUE_CACHE_SCHEMA_VERSION = 2;
export const LEAGUE_IDB_CACHE_KEY = "bbas:league";

export interface CachedLeague {
  version: number;
  refreshedAt: string;
  data: LeagueViewModel;
}

export interface ClientLeagueCache {
  read(): Promise<CachedLeague | null>;
  write(entry: CachedLeague): Promise<void>;
  clear(): Promise<void>;
}

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

export function createIdbLeagueCache(
  key: string = LEAGUE_IDB_CACHE_KEY,
): ClientLeagueCache {
  return {
    async read() {
      if (!isIndexedDbAvailable()) return null;

      try {
        const entry = await get<CachedLeague>(key);

        if (!entry) return null;

        if (entry.version !== LEAGUE_CACHE_SCHEMA_VERSION) {
          await this.clear();
          return null;
        }

        return entry;
      } catch {
        return null;
      }
    },

    async write(entry) {
      if (!isIndexedDbAvailable()) return;

      try {
        await set(key, entry);
      } catch {
        // Best-effort — ignore quota / availability errors.
      }
    },

    async clear() {
      if (!isIndexedDbAvailable()) return;

      try {
        await del(key);
      } catch {
        // Ignore.
      }
    },
  };
}
