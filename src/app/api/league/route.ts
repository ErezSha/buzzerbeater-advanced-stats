import { NextResponse } from "next/server";
import type { LeagueApiResponse } from "@/lib/api-types";
import { toApiError } from "@/server/data/api-errors";
import { loadLeagueData } from "@/server/data/load-league-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<LeagueApiResponse>> {
  try {
    const { data, refreshedAt, cacheSource } = await loadLeagueData();

    return NextResponse.json({
      ok: true,
      data,
      refreshedAt,
      cacheStatus: {
        source: cacheSource === "refreshed" ? "refreshed" : "fresh-cache",
        refreshedAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: toApiError(error) },
      { status: 500 },
    );
  }
}
