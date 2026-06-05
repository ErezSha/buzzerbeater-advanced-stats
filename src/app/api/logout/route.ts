import { NextResponse } from "next/server";
import type { LogoutApiResponse } from "@/lib/api-types";
import { createBbapiClient } from "@/server/bbapi/client";
import { toApiError } from "@/server/data/api-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse<LogoutApiResponse>> {
  const client = createBbapiClient();

  try {
    await client.logout();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: toApiError(error),
      },
      { status: 500 },
    );
  }
}
