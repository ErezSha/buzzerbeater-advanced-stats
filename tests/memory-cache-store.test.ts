import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryCacheStore } from "@/server/cache/memory-cache-store";

describe("memory cache store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores and retrieves a value", async () => {
    const cache = createMemoryCacheStore();
    await cache.set("alpha", { count: 1 });

    expect(await cache.get<{ count: number }>("alpha")).toEqual({ count: 1 });
  });

  it("returns null for a missing key", async () => {
    const cache = createMemoryCacheStore();

    expect(await cache.get("missing")).toBeNull();
  });

  it("expires entries after the ttl elapses", async () => {
    const cache = createMemoryCacheStore();
    await cache.set("ttl-key", "value", { ttlMs: 1000 });

    expect(await cache.get("ttl-key")).toBe("value");

    vi.advanceTimersByTime(1001);

    expect(await cache.get("ttl-key")).toBeNull();
  });

  it("keeps entries with no ttl indefinitely", async () => {
    const cache = createMemoryCacheStore();
    await cache.set("forever", "value");

    vi.advanceTimersByTime(10 * 365 * 24 * 60 * 60 * 1000);

    expect(await cache.get("forever")).toBe("value");
  });

  it("deletes a key", async () => {
    const cache = createMemoryCacheStore();
    await cache.set("gone", "value");
    await cache.delete("gone");

    expect(await cache.get("gone")).toBeNull();
  });

  it("clears keys by prefix", async () => {
    const cache = createMemoryCacheStore();
    await cache.set("raw/teaminfo", 1);
    await cache.set("raw/roster", 2);
    await cache.set("normalized/dashboard", 3);

    await cache.clearByPrefix("raw/");

    expect(await cache.get("raw/teaminfo")).toBeNull();
    expect(await cache.get("raw/roster")).toBeNull();
    expect(await cache.get("normalized/dashboard")).toBe(3);
  });
});
