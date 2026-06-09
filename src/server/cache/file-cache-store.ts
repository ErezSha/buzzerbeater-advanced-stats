import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CacheEntryOptions, CacheStore } from "@/server/cache/cache-store";

interface PersistedCacheEntry<T> {
  expiresAt: string | null;
  value: T;
}

export class FileCacheStore implements CacheStore {
  readonly #directory: string;

  constructor(directory = join(process.cwd(), ".cache", "bbapi")) {
    this.#directory = directory;
  }

  async get<T>(key: string): Promise<T | null> {
    const filePath = this.#filePath(key);

    try {
      const raw = await readFile(filePath, "utf8");
      const entry = JSON.parse(raw) as PersistedCacheEntry<T>;

      if (entry.expiresAt && Date.parse(entry.expiresAt) <= Date.now()) {
        await this.delete(key);
        return null;
      }

      return entry.value;
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  }

  async set<T>(
    key: string,
    value: T,
    options: CacheEntryOptions = {},
  ): Promise<void> {
    await mkdir(this.#directory, { recursive: true });

    const expiresAt =
      options.ttlMs === null || options.ttlMs === undefined
        ? null
        : new Date(Date.now() + options.ttlMs).toISOString();
    const entry: PersistedCacheEntry<T> = { expiresAt, value };

    await writeFile(this.#filePath(key), JSON.stringify(entry, null, 2), "utf8");
  }

  async delete(key: string): Promise<void> {
    await rm(this.#filePath(key), { force: true });
  }

  async clearByPrefix(prefix: string): Promise<void> {
    try {
      const files = await readdir(this.#directory);
      const safePrefix = safeCacheFileName(prefix);

      await Promise.all(
        files
          .filter((file) => file.startsWith(safePrefix))
          .map((file) => rm(join(this.#directory, file), { force: true })),
      );
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error;
      }
    }
  }

  #filePath(key: string): string {
    return join(this.#directory, `${safeCacheFileName(key)}.json`);
  }
}

export function createFileCacheStore(): CacheStore {
  return new FileCacheStore();
}

function safeCacheFileName(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]+/g, "__");
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
