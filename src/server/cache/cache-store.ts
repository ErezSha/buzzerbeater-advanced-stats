export interface CacheEntryOptions {
  ttlMs?: number | null;
}

export interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheEntryOptions): Promise<void>;
  delete(key: string): Promise<void>;
  clearByPrefix(prefix: string): Promise<void>;
}
