import { NextResponse } from "next/server";
import type { ApiErrorShape } from "@/lib/api-types";
import { createBbapiClient } from "@/server/bbapi/client";
import {
  clearCredentialsCookie,
  credentialsStatus,
  isCredentialsSecretConfigured,
  writeCredentialsCookie,
  type CredentialsStatus,
} from "@/server/bbapi/credentials";
import { toApiError } from "@/server/data/api-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CredentialsResult = { ok: true } | { ok: false; error: ApiErrorShape };

export async function GET(): Promise<NextResponse<CredentialsStatus>> {
  return NextResponse.json(await credentialsStatus());
}

export async function POST(
  request: Request,
): Promise<NextResponse<CredentialsResult>> {
  let body: { login?: unknown; securityCode?: unknown };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "ServerError",
          message: "Invalid request body.",
          retryable: false,
        },
      },
      { status: 400 },
    );
  }

  const login = typeof body.login === "string" ? body.login.trim() : "";
  const securityCode =
    typeof body.securityCode === "string" ? body.securityCode.trim() : "";

  if (!login || !securityCode) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "CredentialsRequired",
          message: "Both login and access code are required.",
          retryable: false,
        },
      },
      { status: 400 },
    );
  }

  // Fail fast (and clearly) when the deployment is missing CREDENTIALS_SECRET —
  // otherwise the cookie write would throw an opaque 500 after a successful
  // BBAPI login.
  if (!isCredentialsSecretConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "ConfigurationError",
          message:
            "The server is missing CREDENTIALS_SECRET, so credentials cannot be stored. Set it in the deployment environment and try again.",
          retryable: false,
        },
      },
      { status: 500 },
    );
  }

  // Verify the credentials against BBAPI before storing them, so a typo'd code
  // surfaces immediately instead of failing on the next dashboard load.
  const client = createBbapiClient({
    config: { login, securityCode, secondTeam: false },
  });

  try {
    await client.login();
    await client.logout();
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: toApiError(error) },
      { status: 401 },
    );
  }

  try {
    await writeCredentialsCookie(login, securityCode);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: toApiError(error) },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(): Promise<NextResponse<CredentialsResult>> {
  await clearCredentialsCookie();
  return NextResponse.json({ ok: true });
}
