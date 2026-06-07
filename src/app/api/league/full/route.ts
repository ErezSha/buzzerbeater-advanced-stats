import { NextResponse } from "next/server";
import type { LeagueApiResponse } from "@/lib/api-types";
import { toApiError } from "@/server/data/api-errors";
import { refreshLeagueDataFull } from "@/server/data/refresh-league-data-full";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse<LeagueApiResponse>> {
  try {
    const { data, refreshedAt } = await refreshLeagueDataFull();

    return NextResponse.json({
      ok: true,
      data,
      refreshedAt,
      cacheStatus: { source: "refreshed", refreshedAt },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: toApiError(error) },
      { status: 500 },
    );
  }
}
