import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { cookies } from "next/headers";
import {
  readBbapiConfigFromEnv,
  type BbapiConfig,
} from "@/server/bbapi/config";
import { createCredentialsRequiredError } from "@/server/bbapi/errors";

/**
 * Runtime BBAPI credentials supplied through the UI when no `.env.local` is
 * available (e.g. on Vercel). They are stored in a Secure, httpOnly cookie whose
 * value is AES-256-GCM encrypted with the server-only `CREDENTIALS_SECRET`, so
 * the browser can hold the session without ever exposing the access code to JS.
 *
 * Credential resolution is env-first: when `BB_LOGIN`/`BB_SECURITY_CODE` are set
 * (local dev) the cookie is ignored entirely, so dev keeps using `.env.local`.
 */

export const CREDENTIALS_COOKIE_NAME = "bb_credentials";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export interface StoredCredentials {
  readonly login: string;
  readonly securityCode: string;
}

export type CredentialsSource = "env" | "cookie" | "none";

export interface CredentialsStatus {
  readonly configured: boolean;
  readonly source: CredentialsSource;
}

function getEncryptionKey(): Buffer | null {
  const secret = process.env.CREDENTIALS_SECRET?.trim();

  if (!secret) {
    return null;
  }

  // Derive a fixed 32-byte key from the secret so any-length secret is accepted.
  return createHash("sha256").update(secret).digest();
}

/**
 * True when `CREDENTIALS_SECRET` is set, i.e. the cookie path can encrypt and
 * store UI-supplied credentials. Lets routes fail fast with a clear message
 * instead of throwing when the secret is missing in the deployment.
 */
export function isCredentialsSecretConfigured(): boolean {
  return getEncryptionKey() !== null;
}

export function encryptCredentials(credentials: StoredCredentials): string {
  const key = getEncryptionKey();

  if (!key) {
    throw new Error(
      "CREDENTIALS_SECRET is not set; cannot encrypt BBAPI credentials.",
    );
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const plaintext = Buffer.from(
    JSON.stringify({
      login: credentials.login,
      securityCode: credentials.securityCode,
    }),
    "utf8",
  );
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, ciphertext]).toString("base64url");
}

export function decryptCredentials(value: string): StoredCredentials | null {
  const key = getEncryptionKey();

  if (!key) {
    return null;
  }

  try {
    const raw = Buffer.from(value, "base64url");

    if (raw.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
      return null;
    }

    const iv = raw.subarray(0, IV_LENGTH);
    const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");

    const parsed = JSON.parse(plaintext) as Partial<StoredCredentials>;

    if (
      typeof parsed.login !== "string" ||
      typeof parsed.securityCode !== "string" ||
      !parsed.login ||
      !parsed.securityCode
    ) {
      return null;
    }

    return { login: parsed.login, securityCode: parsed.securityCode };
  } catch {
    // Tampered value, wrong secret, or malformed payload — treat as no cookie.
    return null;
  }
}

export async function readCredentialsCookie(): Promise<BbapiConfig | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(CREDENTIALS_COOKIE_NAME)?.value;

  if (!value) {
    return null;
  }

  const stored = decryptCredentials(value);

  if (!stored) {
    return null;
  }

  return Object.freeze({
    login: stored.login,
    securityCode: stored.securityCode,
    secondTeam: false,
  });
}

export async function writeCredentialsCookie(
  login: string,
  securityCode: string,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    CREDENTIALS_COOKIE_NAME,
    encryptCredentials({ login, securityCode }),
    {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS,
    },
  );
}

export async function clearCredentialsCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CREDENTIALS_COOKIE_NAME);
}

/**
 * Resolves BBAPI credentials for the current request: environment variables
 * first (local dev), then the encrypted cookie (production UI sign-in). Throws a
 * typed {@link createCredentialsRequiredError} when neither is available so the
 * UI can prompt for sign-in.
 */
export async function resolveBbapiConfig(): Promise<BbapiConfig> {
  const fromEnv = readBbapiConfigFromEnv();

  if (fromEnv) {
    return fromEnv;
  }

  const fromCookie = await readCredentialsCookie();

  if (fromCookie) {
    return fromCookie;
  }

  throw createCredentialsRequiredError();
}

export async function credentialsStatus(): Promise<CredentialsStatus> {
  if (readBbapiConfigFromEnv()) {
    return { configured: true, source: "env" };
  }

  if (await readCredentialsCookie()) {
    return { configured: true, source: "cookie" };
  }

  return { configured: false, source: "none" };
}
