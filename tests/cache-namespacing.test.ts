import type { CacheStore } from "@/server/cache/cache-store";
import { createNamespacedCacheStore } from "@/server/cache/namespaced-cache-store";
import { credentialsNamespace } from "@/server/data/request-context";

class MemoryCacheStore implements CacheStore {
  readonly values = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | null> {
    return (this.values.get(key) as T | undefined) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.values.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }

  async clearByPrefix(prefix: string): Promise<void> {
    for (const key of Array.from(this.values.keys())) {
      if (key.startsWith(prefix)) {
        this.values.delete(key);
      }
    }
  }
}

describe("per-account cache namespacing", () => {
  it("isolates the same logical key between two accounts", async () => {
    const backing = new MemoryCacheStore();
    const alice = createNamespacedCacheStore(backing, "alice");
    const bob = createNamespacedCacheStore(backing, "bob");

    await alice.set("normalized/dashboard", { team: "Alice FC" });
    await bob.set("normalized/dashboard", { team: "Bob FC" });

    expect(await alice.get("normalized/dashboard")).toEqual({
      team: "Alice FC",
    });
    expect(await bob.get("normalized/dashboard")).toEqual({ team: "Bob FC" });
  });

  it("does not leak a written key into a different account's view", async () => {
    const backing = new MemoryCacheStore();
    const alice = createNamespacedCacheStore(backing, "alice");
    const bob = createNamespacedCacheStore(backing, "bob");

    await alice.set("normalized/dashboard", { team: "Alice FC" });

    // Bob never wrote anything, so a previously-warmed Alice entry must not be
    // served to Bob — this is the exact cross-user leak being fixed.
    expect(await bob.get("normalized/dashboard")).toBeNull();
  });

  it("scopes clearByPrefix to the calling account", async () => {
    const backing = new MemoryCacheStore();
    const alice = createNamespacedCacheStore(backing, "alice");
    const bob = createNamespacedCacheStore(backing, "bob");

    await alice.set("raw/teaminfo", { id: "1" });
    await bob.set("raw/teaminfo", { id: "2" });

    await alice.clearByPrefix("raw/");

    expect(await alice.get("raw/teaminfo")).toBeNull();
    expect(await bob.get("raw/teaminfo")).toEqual({ id: "2" });
  });
});

describe("credentialsNamespace", () => {
  const base = { login: "coach@example.com", securityCode: "secret" };

  it("is stable for the same credentials", () => {
    const a = credentialsNamespace({ ...base, secondTeam: false });
    const b = credentialsNamespace({ ...base, secondTeam: false });
    expect(a).toBe(b);
  });

  it("differs by login", () => {
    const a = credentialsNamespace({ ...base, secondTeam: false });
    const b = credentialsNamespace({
      ...base,
      login: "other@example.com",
      secondTeam: false,
    });
    expect(a).not.toBe(b);
  });

  it("differs between a login's first and second team", () => {
    const first = credentialsNamespace({ ...base, secondTeam: false });
    const second = credentialsNamespace({ ...base, secondTeam: true });
    expect(first).not.toBe(second);
  });

  it("does not embed the raw login in the namespace", () => {
    const namespace = credentialsNamespace({ ...base, secondTeam: false });
    expect(namespace).not.toContain("coach");
    expect(namespace).toMatch(/^[0-9a-f]{16}$/);
  });
});
