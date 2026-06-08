import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// In-memory stand-in for the Next request cookie store. Hoisted so the
// `next/headers` mock factory can capture it before any imports run.
const { cookieStore } = vi.hoisted(() => ({
  cookieStore: new Map<string, string>(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieStore.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string) => {
      cookieStore.set(name, value);
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  }),
}));

import { BbapiError } from "@/server/bbapi/errors";
import {
  credentialsStatus,
  decryptCredentials,
  encryptCredentials,
  resolveBbapiConfig,
  writeCredentialsCookie,
} from "@/server/bbapi/credentials";

const ORIGINAL_ENV = {
  CREDENTIALS_SECRET: process.env.CREDENTIALS_SECRET,
  BB_LOGIN: process.env.BB_LOGIN,
  BB_SECURITY_CODE: process.env.BB_SECURITY_CODE,
  BB_SECOND_TEAM: process.env.BB_SECOND_TEAM,
};

function clearEnvCredentials() {
  delete process.env.BB_LOGIN;
  delete process.env.BB_SECURITY_CODE;
  delete process.env.BB_SECOND_TEAM;
}

beforeEach(() => {
  cookieStore.clear();
  process.env.CREDENTIALS_SECRET = "test-secret-please-rotate";
  clearEnvCredentials();
});

afterEach(() => {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("credentials encryption", () => {
  it("round-trips login and security code", () => {
    const value = encryptCredentials({
      login: "manager",
      securityCode: "read-only-code",
    });

    expect(value).not.toContain("manager");
    expect(value).not.toContain("read-only-code");
    expect(decryptCredentials(value)).toEqual({
      login: "manager",
      securityCode: "read-only-code",
    });
  });

  it("returns null for a tampered value", () => {
    const value = encryptCredentials({
      login: "manager",
      securityCode: "read-only-code",
    });
    const tampered = `${value.slice(0, -2)}${value.endsWith("A") ? "B" : "A"}`;

    expect(decryptCredentials(tampered)).toBeNull();
  });

  it("returns null when decrypted with a different secret", () => {
    const value = encryptCredentials({
      login: "manager",
      securityCode: "read-only-code",
    });

    process.env.CREDENTIALS_SECRET = "a-completely-different-secret";
    expect(decryptCredentials(value)).toBeNull();
  });

  it("cannot encrypt and never decrypts without a secret", () => {
    delete process.env.CREDENTIALS_SECRET;
    expect(() =>
      encryptCredentials({ login: "manager", securityCode: "code" }),
    ).toThrow();
    expect(decryptCredentials("anything")).toBeNull();
  });
});

describe("resolveBbapiConfig precedence", () => {
  it("prefers environment credentials over the cookie", async () => {
    process.env.BB_LOGIN = "env-manager";
    process.env.BB_SECURITY_CODE = "env-code";
    await writeCredentialsCookie("cookie-manager", "cookie-code");

    await expect(resolveBbapiConfig()).resolves.toEqual({
      login: "env-manager",
      securityCode: "env-code",
      secondTeam: false,
    });
  });

  it("falls back to the cookie when env credentials are absent", async () => {
    await writeCredentialsCookie("cookie-manager", "cookie-code");

    await expect(resolveBbapiConfig()).resolves.toEqual({
      login: "cookie-manager",
      securityCode: "cookie-code",
      secondTeam: false,
    });
  });

  it("throws CredentialsRequired when neither source is present", async () => {
    await expect(resolveBbapiConfig()).rejects.toMatchObject({
      code: "CredentialsRequired",
      retryable: false,
    });
    await expect(resolveBbapiConfig()).rejects.toBeInstanceOf(BbapiError);
  });
});

describe("credentialsStatus", () => {
  it("reports the env source first", async () => {
    process.env.BB_LOGIN = "env-manager";
    process.env.BB_SECURITY_CODE = "env-code";
    await writeCredentialsCookie("cookie-manager", "cookie-code");

    expect(await credentialsStatus()).toEqual({
      configured: true,
      source: "env",
    });
  });

  it("reports the cookie source when only the cookie is present", async () => {
    await writeCredentialsCookie("cookie-manager", "cookie-code");

    expect(await credentialsStatus()).toEqual({
      configured: true,
      source: "cookie",
    });
  });

  it("reports no source when nothing is configured", async () => {
    expect(await credentialsStatus()).toEqual({
      configured: false,
      source: "none",
    });
  });
});
