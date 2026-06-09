import type { CacheEntryOptions, CacheStore } from "@/server/cache/cache-store";

interface MemoryCacheEntry {
  expiresAt: number | null;
  value: unknown;
}

/**
 * Module-level store so the cache survives across requests within a single warm
 * serverless instance (Vercel) or Node process. Cold starts simply repopulate
 * from BBAPI.
 */
const store = new Map<string, MemoryCacheEntry>();

class MemoryCacheStore implements CacheStore {
  async get<T>(key: string): Promise<T | null> {
    const entry = store.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(
    key: string,
    value: T,
    options: CacheEntryOptions = {},
  ): Promise<void> {
    const expiresAt =
      options.ttlMs === null || options.ttlMs === undefined
        ? null
        : Date.now() + options.ttlMs;

    store.set(key, { expiresAt, value });
  }

  async delete(key: string): Promise<void> {
    store.delete(key);
  }

  async clearByPrefix(prefix: string): Promise<void> {
    for (const key of Array.from(store.keys())) {
      if (key.startsWith(prefix)) {
        store.delete(key);
      }
    }
  }
}

export function createMemoryCacheStore(): CacheStore {
  return new MemoryCacheStore();
}
