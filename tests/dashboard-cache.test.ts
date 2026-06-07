import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DashboardViewModel } from "@/lib/api-types";
import {
  DASHBOARD_CACHE_SCHEMA_VERSION,
  createIdbDashboardCache,
} from "@/lib/client-cache/dashboard-cache";

const sampleData = {
  team: { id: "1", name: "Test Club" },
  players: [],
  matches: [],
  playerSeasonStats: [],
  boxScores: [],
  derived: {},
  refreshedAt: "2026-06-07T00:00:00.000Z",
} as unknown as DashboardViewModel;

describe("idb dashboard cache", () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
    await createIdbDashboardCache("test:key").clear();
  });

  it("round-trips a written entry", async () => {
    const cache = createIdbDashboardCache("test:key");
    await cache.write({
      version: DASHBOARD_CACHE_SCHEMA_VERSION,
      refreshedAt: sampleData.refreshedAt,
      data: sampleData,
    });

    const result = await cache.read();
    expect(result?.refreshedAt).toBe(sampleData.refreshedAt);
    expect(result?.data.team.name).toBe("Test Club");
  });

  it("returns null when nothing is cached", async () => {
    const cache = createIdbDashboardCache("test:empty");
    expect(await cache.read()).toBeNull();
  });

  it("discards entries with a mismatched schema version", async () => {
    const cache = createIdbDashboardCache("test:key");
    await cache.write({
      version: DASHBOARD_CACHE_SCHEMA_VERSION + 1,
      refreshedAt: sampleData.refreshedAt,
      data: sampleData,
    });

    expect(await cache.read()).toBeNull();
    // The mismatched entry should have been cleared.
    expect(await cache.read()).toBeNull();
  });

  it("degrades to null when IndexedDB is unavailable", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const cache = createIdbDashboardCache("test:key");

    await expect(cache.read()).resolves.toBeNull();
    await expect(
      cache.write({
        version: DASHBOARD_CACHE_SCHEMA_VERSION,
        refreshedAt: sampleData.refreshedAt,
        data: sampleData,
      }),
    ).resolves.toBeUndefined();
  });
});
