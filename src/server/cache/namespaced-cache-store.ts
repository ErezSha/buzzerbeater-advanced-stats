import type { CacheEntryOptions, CacheStore } from "@/server/cache/cache-store";

/**
 * Wraps a {@link CacheStore} so every key is transparently prefixed with a
 * per-account namespace. This keeps one BuzzerBeater account's cached data
 * (their team, league, box scores, …) from being served to — or overwritten
 * by — a different account that shares the same warm server instance.
 *
 * The namespace is applied to `clearByPrefix` too, so a prefix sweep only ever
 * touches the calling account's entries.
 */
class NamespacedCacheStore implements CacheStore {
  readonly #store: CacheStore;
  readonly #prefix: string;

  constructor(store: CacheStore, namespace: string) {
    this.#store = store;
    this.#prefix = `u/${namespace}/`;
  }

  get<T>(key: string): Promise<T | null> {
    return this.#store.get<T>(this.#prefix + key);
  }

  set<T>(key: string, value: T, options?: CacheEntryOptions): Promise<void> {
    return this.#store.set<T>(this.#prefix + key, value, options);
  }

  delete(key: string): Promise<void> {
    return this.#store.delete(this.#prefix + key);
  }

  clearByPrefix(prefix: string): Promise<void> {
    return this.#store.clearByPrefix(this.#prefix + prefix);
  }
}

export function createNamespacedCacheStore(
  store: CacheStore,
  namespace: string,
): CacheStore {
  return new NamespacedCacheStore(store, namespace);
}
