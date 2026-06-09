import type { CacheStore } from "@/server/cache/cache-store";
import { createFileCacheStore } from "@/server/cache/file-cache-store";
import { createMemoryCacheStore } from "@/server/cache/memory-cache-store";

/**
 * Selects the default server cache store for the current environment.
 *
 * On Vercel (including the Hobby tier) the deployment filesystem is read-only
 * apart from an ephemeral `/tmp`, so the file cache cannot be used — we fall
 * back to an in-memory store that persists for the life of a warm instance.
 * Locally we keep the file cache so data survives dev-server restarts.
 *
 * A future Upstash / Vercel KV store would slot in here behind the same
 * `CacheStore` interface with no changes to callers.
 */
export function getCacheStore(): CacheStore {
  if (process.env.VERCEL) {
    return createMemoryCacheStore();
  }

  return createFileCacheStore();
}
