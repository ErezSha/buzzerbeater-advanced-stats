import {
  BbapiError,
  createConfigurationError,
} from "@/server/bbapi/errors";

export interface BbapiConfig {
  readonly login: string;
  readonly securityCode: string;
  readonly secondTeam: boolean;
}

export interface PublicBbapiConfigStatus {
  readonly hasLogin: boolean;
  readonly hasSecurityCode: boolean;
  readonly secondTeam: boolean;
}

interface BbapiEnv {
  [key: string]: string | undefined;
  BB_LOGIN?: string;
  BB_SECURITY_CODE?: string;
  BB_SECOND_TEAM?: string;
}

export function getBbapiConfig(env: BbapiEnv = process.env): BbapiConfig {
  const login = normalizeEnvValue(env.BB_LOGIN);
  const securityCode = normalizeEnvValue(env.BB_SECURITY_CODE);
  const missingKeys: string[] = [];

  if (login === null) {
    missingKeys.push("BB_LOGIN");
  }

  if (securityCode === null) {
    missingKeys.push("BB_SECURITY_CODE");
  }

  if (missingKeys.length > 0 || login === null || securityCode === null) {
    throw createConfigurationError(missingKeys);
  }

  return Object.freeze({
    login,
    securityCode,
    secondTeam: env.BB_SECOND_TEAM === "1",
  });
}

/**
 * Reads BBAPI credentials from the environment without throwing.
 *
 * Returns `null` when either credential is missing, so callers can fall back to
 * another source (e.g. the encrypted credentials cookie in production). Unlike
 * {@link getBbapiConfig}, this never throws a {@link BbapiError}.
 */
export function readBbapiConfigFromEnv(
  env: BbapiEnv = process.env,
): BbapiConfig | null {
  const login = normalizeEnvValue(env.BB_LOGIN);
  const securityCode = normalizeEnvValue(env.BB_SECURITY_CODE);

  if (login === null || securityCode === null) {
    return null;
  }

  return Object.freeze({
    login,
    securityCode,
    secondTeam: env.BB_SECOND_TEAM === "1",
  });
}

export function getPublicBbapiConfigStatus(
  env: BbapiEnv = process.env,
): PublicBbapiConfigStatus {
  return Object.freeze({
    hasLogin: Boolean(normalizeEnvValue(env.BB_LOGIN)),
    hasSecurityCode: Boolean(normalizeEnvValue(env.BB_SECURITY_CODE)),
    secondTeam: env.BB_SECOND_TEAM === "1",
  });
}

export function isBbapiConfigError(error: unknown): error is BbapiError {
  return error instanceof BbapiError && error.code === "ConfigurationError";
}

function normalizeEnvValue(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
